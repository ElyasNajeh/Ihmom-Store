import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import timedelta
from decimal import Decimal
import json
from threading import Barrier
from unittest.mock import Mock
import time
from uuid import uuid4

import httpx
from pydantic import SecretStr
import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.mixins import utcnow
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.customers.model import Customer
from app.features.delivery_areas.model import DeliveryArea
from app.features.notifications.bird import BirdClient, BirdResult
from app.features.notifications.config import SAFE_REPLAY_SECONDS, bird_config
from app.features.notifications.manage import reconcile
from app.features.notifications.model import (
    BirdDeliveryEvent,
    NotificationAttempt,
    OrderNotification,
)
from app.features.notifications.service import claim_next, finish_claim
from app.features.notifications.webhook import record_event
from app.features.notifications.worker import process_one, run_worker
from app.features.orders import service as order_service
from app.features.orders.model import Order, OrderItem
from app.features.orders.schema import CheckoutRequest
from app.features.products.model import Product, ProductVariant
from tests.helpers import post_checkout
from tests.notification_helpers import TEST_CONFIG, TEST_OWNER, signed_headers


pytestmark = pytest.mark.integration
WEBHOOK = "/notifications/bird/webhook"


@pytest.fixture
def notification(client, checkout_payload, db_session, monkeypatch):
    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", True)
    response = post_checkout(client, checkout_payload)
    assert response.status_code == 201, response.text
    row = db_session.scalar(select(OrderNotification))
    assert row is not None
    return row


def claim(db, config=TEST_CONFIG, now=None):
    return claim_next(db, config, now or utcnow() + timedelta(seconds=1))


def accepted(db, row):
    work = claim(db)
    assert work.notification_id == row.id and work.operation == "send"
    finish_claim(
        db,
        work,
        BirdResult(
            "success",
            status_code=202,
            message={"id": "wam_integration", "status": "accepted"},
        ),
        TEST_CONFIG,
    )
    return work


def delivery_event(
    kind="delivered", provider_id="wam_integration", *, when=None, phone=TEST_OWNER
):
    return {
        "type": "whatsapp." + kind,
        "timestamp": (when or utcnow()).isoformat(),
        "data": {
            "direction": "outbound",
            "whatsapp_id": provider_id,
            "to": {"phone_number": phone},
            "from": {"phone_number": "+15555550000"},
            "workspace_id": "ws_test_only",
            **(
                {
                    "error": {
                        "code": "service_window_expired",
                        "description": "private failure details",
                    }
                }
                if kind in {"failed", "rejected"}
                else {}
            ),
        },
    }


def webhook(client, monkeypatch, payload, event_id=None):
    body = json.dumps(payload).encode()
    headers, secret = signed_headers(
        body, timestamp=int(time.time()), event_id=event_id or "evt_" + uuid4().hex
    )
    monkeypatch.setattr(settings, "BIRD_WEBHOOK_SECRET", SecretStr(secret))
    return client.post(
        WEBHOOK, content=body, headers={**headers, "content-type": "application/json"}
    )


def test_disabled_notifications_preserve_checkout_contract(
    client, checkout_payload, db_session
):
    response = post_checkout(client, checkout_payload)
    assert response.status_code == 201
    assert response.json()["total"] == "25.45"
    assert response.json()["history_access_token"]
    assert "notification" not in response.text
    assert db_session.scalar(select(func.count()).select_from(OrderNotification)) == 0


@pytest.mark.parametrize(
    "field, value",
    [
        ("BIRD_API_KEY", SecretStr("")),
        ("BIRD_ORDER_NOTIFICATION_PHONE", "invalid"),
        ("BIRD_API_URL", "http://localhost/"),
        ("BIRD_MAX_ATTEMPTS", "wrong"),
    ],
)
def test_invalid_bird_configuration_does_not_block_order_or_lose_pending_intent(
    client, checkout_payload, db_session, monkeypatch, field, value
):
    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", True)
    monkeypatch.setattr(settings, field, value)
    response = post_checkout(client, checkout_payload)
    assert response.status_code == 201
    row = db_session.scalar(select(OrderNotification))
    assert row.status == "pending" and row.attempts == 0 and row.request_body is None
    assert bird_config(settings)[0] is None


def test_outbox_is_unique_and_idempotent_checkout_does_not_enqueue_again(
    client, checkout_payload, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", True)
    key = str(uuid4())
    first = post_checkout(client, checkout_payload, key)
    second = post_checkout(client, checkout_payload, key)
    assert first.status_code == second.status_code == 201
    assert first.json()["order_number"] == second.json()["order_number"]
    row = db_session.scalar(select(OrderNotification))
    assert db_session.scalar(select(func.count()).select_from(OrderNotification)) == 1
    db_session.add(OrderNotification(order_id=row.order_id))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
    assert db_session.scalar(select(func.count()).select_from(OrderNotification)) == 1


def test_enabling_notifications_does_not_notify_a_previous_disabled_checkout(
    client, checkout_payload, db_session, monkeypatch
):
    key = str(uuid4())
    first = post_checkout(client, checkout_payload, key)
    assert first.status_code == 201
    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", True)
    retried = post_checkout(client, checkout_payload, key)
    assert (
        retried.status_code == 201
        and retried.json()["order_number"] == first.json()["order_number"]
    )
    assert db_session.scalar(select(func.count()).select_from(OrderNotification)) == 0


def test_checkout_failure_rolls_back_order_and_outbox_together(
    client, checkout_payload, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", True)

    def failed_commit():
        db_session.flush()  # both order and outbox have reached PostgreSQL
        raise RuntimeError("simulated commit failure")

    monkeypatch.setattr(db_session, "commit", failed_commit)
    assert post_checkout(client, checkout_payload).status_code == 500
    for model in (Order, OrderItem, OrderNotification, Customer):
        assert db_session.scalar(select(func.count()).select_from(model)) == 0


def test_outbox_database_failure_is_atomic_not_a_false_checkout_success(
    client, checkout_payload, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", True)
    monkeypatch.setattr(
        order_service,
        "OrderNotification",
        lambda **_: OrderNotification(order_id=999999999),
    )
    response = post_checkout(client, checkout_payload)
    assert response.status_code == 409
    for model in (Order, OrderItem, OrderNotification, Customer):
        assert db_session.scalar(select(func.count()).select_from(model)) == 0


def test_invalid_checkout_never_creates_outbox(
    client, checkout_payload, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", True)
    checkout_payload["delivery_area_id"] = 999999999
    assert post_checkout(client, checkout_payload).status_code == 422
    assert db_session.scalar(select(func.count()).select_from(OrderNotification)) == 0


def test_payload_uses_persisted_reference_total_currency_and_owner_only(
    notification, db_session
):
    work = claim(db_session)
    order = db_session.get(Order, notification.order_id)
    payload = json.loads(work.body)
    assert payload == {
        "to": TEST_OWNER,
        "template": {
            "slug": "bird_order_confirmation",
            "language": "en",
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "name": "ref", "text": order.order_number},
                        {"type": "text", "name": "amount", "text": "25.45 ILS"},
                    ],
                }
            ],
        },
    }
    assert order.customer_phone != payload["to"]
    assert order.customer_phone not in work.body
    assert TEST_CONFIG.api_key not in work.body
    assert notification.attempts == 1
    assert db_session.scalar(select(NotificationAttempt)).finished_at is None


@pytest.mark.parametrize(
    "failure", ["unavailable", "timeout", "unauthorized", "rate_limit", "server_error"]
)
def test_provider_failures_after_commit_leave_order_saved_and_visible(
    notification, db_session, client, auth_headers, failure
):
    calls = []

    def handler(request):
        calls.append(request)
        if failure == "unavailable":
            raise httpx.ConnectError("mock", request=request)
        if failure == "timeout":
            raise httpx.ReadTimeout("mock", request=request)
        return httpx.Response(
            {"unauthorized": 401, "rate_limit": 429, "server_error": 503}[failure],
            json={"error": {"code": "E01001"}},
        )

    work = claim(db_session)

    async def exercise():
        provider = BirdClient(TEST_CONFIG, httpx.MockTransport(handler))
        try:
            return await provider.send(work.url, work.body, work.key)
        finally:
            await provider.close()

    finish_claim(db_session, work, asyncio.run(exercise()), TEST_CONFIG)
    assert len(calls) == 1
    persisted = db_session.get(Order, notification.order_id)
    assert persisted.status == "pending" and persisted.total == Decimal("25.45")
    assert len(persisted.items) == 1
    assert persisted.items[0].unit_price == Decimal("10.10")
    response = client.get(f"/orders/admin/{persisted.id}", headers=auth_headers)
    assert response.status_code == 200, response.text
    assert notification.status == ("failed" if failure == "unauthorized" else "retry")


def test_accepted_is_not_delivered_and_status_lookup_is_a_get(notification, db_session):
    accepted(db_session, notification)
    assert notification.status == "accepted" and notification.delivered_at is None
    assert notification.bird_message_id == "wam_integration"
    work = claim(db_session, now=notification.next_attempt_at + timedelta(seconds=1))
    assert work.operation == "poll"

    async def exercise():
        def handler(request):
            assert request.method == "GET" and request.url.path.endswith(
                "/wam_integration"
            )
            assert "idempotency-key" not in request.headers
            return httpx.Response(
                200,
                json={
                    "id": "wam_integration",
                    "status": "delivered",
                    "delivered_at": utcnow().isoformat(),
                },
            )

        provider = BirdClient(TEST_CONFIG, httpx.MockTransport(handler))
        try:
            return await provider.lookup(work.url, work.message_id)
        finally:
            await provider.close()

    finish_claim(db_session, work, asyncio.run(exercise()), TEST_CONFIG)
    assert notification.status == "delivered" and notification.delivered_at is not None
    assert notification.attempts == 1 and notification.delivery_checks == 1
    assert claim(db_session) is None


def test_delivery_lookup_failure_never_reenqueues_send(notification, db_session):
    accepted(db_session, notification)
    work = claim(db_session, now=notification.next_attempt_at + timedelta(seconds=1))
    finish_claim(db_session, work, BirdResult("permanent", "E02001", 401), TEST_CONFIG)
    assert (
        notification.status == "uncertain"
        and notification.bird_message_id == "wam_integration"
    )
    assert notification.attempts == 1 and claim(db_session) is None


@pytest.mark.parametrize(
    "read_at, expected",
    [
        (True, "sent"),
        ("not-a-date", "sent"),
        ("2026-11-12T15:00:00", "sent"),
        ("2026-11-12T15:00:00+00:00", "delivered"),
    ],
)
def test_only_valid_read_receipt_proves_delivery(
    notification, db_session, read_at, expected
):
    work = claim(db_session)
    finish_claim(
        db_session,
        work,
        BirdResult(
            "success", message={"id": "wam_read", "status": "sent", "read_at": read_at}
        ),
        TEST_CONFIG,
    )
    assert notification.status == expected
    assert (notification.delivered_at is not None) == (expected == "delivered")


def test_exact_request_is_reused_after_timeout_even_if_owner_or_template_changes(
    notification, db_session
):
    first = claim(db_session)
    finish_claim(
        db_session,
        first,
        BirdResult("uncertain", "transport_outcome_unknown"),
        TEST_CONFIG,
    )
    changed = replace(
        TEST_CONFIG, phone="+15555550999", template="bird_delivery_update"
    )
    second = claim(
        db_session, changed, notification.next_attempt_at + timedelta(seconds=1)
    )
    assert (
        second.key == first.key
        and second.body == first.body
        and second.url == first.url
    )
    assert json.loads(second.body)["to"] == TEST_OWNER


@pytest.mark.parametrize(
    "outcome, final", [("transient", "failed"), ("uncertain", "uncertain")]
)
def test_retry_exhaustion_preserves_failed_or_ambiguous_record(
    notification, db_session, outcome, final
):
    config = replace(TEST_CONFIG, max_attempts=2)
    for _ in range(2):
        work = claim(
            db_session, config, notification.next_attempt_at + timedelta(seconds=1)
        )
        finish_claim(db_session, work, BirdResult(outcome, "mock_failure"), config)
    assert notification.attempts == 2 and notification.status == final
    assert db_session.scalar(select(func.count()).select_from(NotificationAttempt)) == 2
    assert claim(db_session, config) is None


def test_crash_recovery_replays_same_key_and_fences_stale_worker(
    notification, db_session
):
    now = utcnow() + timedelta(seconds=1)
    abandoned = claim(db_session, now=now)
    recovered = claim(db_session, now=now + timedelta(seconds=91))
    assert recovered.key == abandoned.key and recovered.body == abandoned.body
    assert recovered.token != abandoned.token and notification.attempts == 2
    stale_result = BirdResult(
        "success", message={"id": "wam_stale", "status": "accepted"}
    )
    assert not finish_claim(db_session, abandoned, stale_result, TEST_CONFIG)
    assert notification.bird_message_id is None
    first_attempt = db_session.scalar(
        select(NotificationAttempt).where(NotificationAttempt.number == 1)
    )
    assert (
        first_attempt.outcome == "uncertain"
        and first_attempt.error_code == "worker_lease_expired"
    )


def test_unknown_outcome_after_retention_is_not_resent(notification, db_session):
    now = utcnow() + timedelta(seconds=1)
    claim(db_session, now=now)
    stopped = claim(db_session, now=now + timedelta(seconds=SAFE_REPLAY_SECONDS + 1))
    assert stopped.operation == "noop" and notification.status == "uncertain"
    assert (
        notification.last_error == "idempotency_window_closed"
        and notification.attempts == 1
    )


def test_key_rotation_stops_ambiguous_replay_to_a_potential_new_workspace(
    notification, db_session
):
    first = claim(db_session)
    finish_claim(
        db_session,
        first,
        BirdResult("uncertain", "transport_outcome_unknown"),
        TEST_CONFIG,
    )
    stopped = claim(
        db_session,
        replace(TEST_CONFIG, api_key="different-mock-key"),
        notification.next_attempt_at + timedelta(seconds=1),
    )
    assert stopped.operation == "noop" and notification.status == "uncertain"


def test_status_polling_is_bounded(notification, db_session):
    accepted(db_session, notification)
    notification.delivery_checks = TEST_CONFIG.status_max_checks
    db_session.commit()
    stopped = claim(db_session, now=notification.next_attempt_at + timedelta(seconds=1))
    assert stopped.operation == "noop" and notification.status == "uncertain"
    assert notification.last_error == "delivery_confirmation_exhausted"


def test_signed_webhook_delivers_and_deduplicates_without_customer_data(
    notification, db_session, client, monkeypatch
):
    accepted(db_session, notification)
    payload = delivery_event()
    event_id = "evt_" + uuid4().hex
    assert webhook(client, monkeypatch, payload, event_id).status_code == 200
    assert webhook(client, monkeypatch, payload, event_id).status_code == 200
    db_session.refresh(notification)
    assert notification.status == "delivered"
    receipts = db_session.scalars(select(BirdDeliveryEvent)).all()
    assert len(receipts) == 1 and receipts[0].applied_at is not None
    assert not hasattr(receipts[0], "body") and not hasattr(receipts[0], "phone")


def test_receipt_before_http_response_is_durable_and_applied_on_acceptance(
    notification, db_session, client, monkeypatch
):
    work = claim(db_session)
    assert webhook(client, monkeypatch, delivery_event()).status_code == 200
    assert notification.status == "processing"
    assert db_session.scalar(select(BirdDeliveryEvent)).applied_at is None
    finish_claim(
        db_session,
        work,
        BirdResult("success", message={"id": "wam_integration", "status": "accepted"}),
        TEST_CONFIG,
    )
    assert (
        notification.status == "delivered"
        and notification.bird_message_id == "wam_integration"
    )


@pytest.mark.parametrize("kind", ["sent", "failed"])
def test_real_provider_receipt_is_not_rejected_by_a_local_response_timestamp(
    notification, db_session, client, monkeypatch, kind
):
    accepted(db_session, notification)  # response intentionally has no created_at
    # Bird generated the receipt before our process received the HTTP response.
    payload = delivery_event(kind, when=utcnow() - timedelta(seconds=1))
    assert webhook(client, monkeypatch, payload).status_code == 200
    db_session.refresh(notification)
    assert notification.status == kind


def test_signed_out_of_order_receipts_cannot_regress_delivery(
    notification, db_session, client, monkeypatch
):
    accepted(db_session, notification)
    now = utcnow()
    for kind, delta in [("sent", 0), ("read", 2), ("accepted", -1), ("failed", 1)]:
        assert (
            webhook(
                client,
                monkeypatch,
                delivery_event(kind, when=now + timedelta(seconds=delta)),
            ).status_code
            == 200
        )
    db_session.refresh(notification)
    assert (
        notification.status == "delivered"
        and notification.delivery_status == "delivered"
    )
    assert db_session.scalar(select(func.count()).select_from(BirdDeliveryEvent)) == 4


@pytest.mark.parametrize("kind", ["failed", "rejected"])
def test_delivery_failure_is_preserved_and_does_not_retry_post(
    notification, db_session, client, monkeypatch, kind
):
    accepted(db_session, notification)
    assert webhook(client, monkeypatch, delivery_event(kind)).status_code == 200
    db_session.refresh(notification)
    assert notification.status == "failed" and notification.delivery_status == kind
    assert notification.last_error == "service_window_expired"
    assert claim(db_session) is None
    assert db_session.get(Order, notification.order_id).status == "pending"


def test_untrusted_webhook_cannot_change_delivery(
    notification, db_session, client, monkeypatch
):
    accepted(db_session, notification)
    monkeypatch.setattr(settings, "BIRD_WEBHOOK_SECRET", SecretStr("whsec_" + "A" * 44))
    assert client.post(WEBHOOK, json=delivery_event()).status_code == 400
    assert client.post(WEBHOOK, content=b"x" * 65537).status_code == 413
    assert notification.status == "accepted"
    assert db_session.scalar(select(func.count()).select_from(BirdDeliveryEvent)) == 0


def test_wrong_recipient_and_other_workspace_messages_are_ignored(
    notification, db_session, client, monkeypatch
):
    accepted(db_session, notification)
    assert (
        webhook(client, monkeypatch, delivery_event(phone="+15555550999")).status_code
        == 200
    )
    assert (
        webhook(
            client,
            monkeypatch,
            delivery_event(provider_id="wam_unrelated", phone="+15555550999"),
        ).status_code
        == 200
    )
    db_session.refresh(notification)
    assert notification.status == "accepted"
    assert db_session.scalar(select(func.count()).select_from(BirdDeliveryEvent)) == 0


def test_synthetic_and_future_events_are_acknowledged_without_false_delivery(
    notification, db_session, client, monkeypatch
):
    assert (
        webhook(
            client, monkeypatch, {"type": "whatsapp.delivered", "test": True}
        ).status_code
        == 200
    )
    assert webhook(client, monkeypatch, {"type": "future.event"}).status_code == 200
    assert webhook(client, monkeypatch, {"type": ["invalid"]}).status_code == 400
    assert notification.status == "pending"


@pytest.fixture
def committed_notification(test_engine, monkeypatch):
    """Own committed fixture for independent PostgreSQL worker connections."""
    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", True)
    suffix = uuid4().hex[:12]
    with Session(test_engine, expire_on_commit=False) as db:
        category = Category(name_ar="Category " + suffix, name_en="Category " + suffix)
        brand = Brand(name_ar="Brand " + suffix, name_en="Brand " + suffix)
        area = DeliveryArea(
            name_ar="Area " + suffix,
            name_en="Area " + suffix,
            delivery_fee=Decimal("5.25"),
        )
        db.add_all([category, brand, area])
        db.flush()
        product = Product(
            name_ar="Product " + suffix,
            name_en="Product " + suffix,
            category_id=category.id,
            brand_id=brand.id,
        )
        db.add(product)
        db.flush()
        variant = ProductVariant(
            product_id=product.id,
            name_ar="__default__",
            name_en="__default__",
            sku=suffix,
            price=Decimal("10.10"),
        )
        db.add(variant)
        db.commit()
        payload = CheckoutRequest(
            customer_name="Worker fixture",
            customer_phone="0599000123",
            address="Isolated test address",
            delivery_area_id=area.id,
            items=[{"product_variant_id": variant.id, "quantity": 2}],
        )
        order_service.checkout(db, payload, str(uuid4()))
        row = db.scalar(
            select(OrderNotification)
            .join(Order, Order.id == OrderNotification.order_id)
            .where(Order.customer_phone == "+970599000123")
        )
        ids = row.id, row.order_id, product.id, category.id, brand.id, area.id

    def factory():
        return Session(test_engine, expire_on_commit=False)

    try:
        yield ids[0], factory
    finally:
        with factory() as db:
            customer_id = db.get(Order, ids[1]).customer_id
            messages = db.scalars(
                select(OrderNotification.bird_message_id).where(
                    OrderNotification.id == ids[0]
                )
            ).all()
            db.query(BirdDeliveryEvent).filter(
                BirdDeliveryEvent.bird_message_id.in_([m for m in messages if m])
            ).delete()
            db.query(OrderNotification).filter(OrderNotification.id == ids[0]).delete()
            db.query(Order).filter(Order.id == ids[1]).delete()
            db.query(Customer).filter(Customer.id == customer_id).delete()
            db.query(Product).filter(Product.id == ids[2]).delete()
            db.query(Category).filter(Category.id == ids[3]).delete()
            db.query(Brand).filter(Brand.id == ids[4]).delete()
            db.query(DeliveryArea).filter(DeliveryArea.id == ids[5]).delete()
            db.commit()


def test_concurrent_workers_claim_only_one_notification(committed_notification):
    row_id, factory = committed_notification
    barrier = Barrier(2)

    def take():
        with factory() as db:
            barrier.wait(timeout=5)
            return claim(db)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: take(), range(2)))
    assert len([r for r in results if r is not None]) == 1
    with factory() as db:
        assert db.get(OrderNotification, row_id).attempts == 1


def test_concurrent_checkout_creates_exactly_one_outbox_for_the_new_order(
    committed_notification,
):
    original_id, factory = committed_notification
    with factory() as db:
        original = db.get(Order, db.get(OrderNotification, original_id).order_id)
        payload = CheckoutRequest(
            customer_name=original.customer_name,
            customer_phone=original.customer_phone,
            address=original.address,
            delivery_area_id=original.delivery_area_id,
            items=[
                {
                    "product_variant_id": original.items[0].product_variant_id,
                    "quantity": 2,
                }
            ],
        )
    key = str(uuid4())
    barrier = Barrier(2)

    def checkout_once():
        with factory() as db:
            barrier.wait(timeout=5)
            return order_service.checkout(db, payload, key)["order_number"]

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            numbers = list(pool.map(lambda _: checkout_once(), range(2)))
        assert numbers[0] == numbers[1]
        with factory() as db:
            order = db.scalar(select(Order).where(Order.idempotency_key == key))
            assert (
                db.scalar(
                    select(func.count())
                    .select_from(OrderNotification)
                    .where(OrderNotification.order_id == order.id)
                )
                == 1
            )
    finally:
        with factory() as db:
            created_ids = select(Order.id).where(Order.idempotency_key == key)
            db.query(OrderNotification).filter(
                OrderNotification.order_id.in_(created_ids)
            ).delete(synchronize_session=False)
            db.query(Order).filter(Order.idempotency_key == key).delete()
            db.commit()


def test_worker_executes_async_http_outside_any_open_transaction(
    committed_notification,
):
    row_id, factory = committed_notification

    async def exercise():
        def handler(request):
            with factory() as db:
                row = db.scalar(
                    select(OrderNotification)
                    .where(OrderNotification.id == row_id)
                    .with_for_update(nowait=True)
                )
                # Separate connection sees both committed order AND frozen intent.
                assert (
                    row.status == "processing"
                    and row.request_body == request.content.decode()
                )
                assert db.get(Order, row.order_id) is not None
            return httpx.Response(202, json={"id": "wam_worker", "status": "accepted"})

        provider = BirdClient(TEST_CONFIG, httpx.MockTransport(handler))
        try:
            assert await process_one(factory, TEST_CONFIG, provider)
            assert not await process_one(factory, TEST_CONFIG, provider)
        finally:
            await provider.close()

    asyncio.run(exercise())
    with factory() as db:
        assert db.get(OrderNotification, row_id).status == "accepted"


def test_concurrent_receipt_and_send_result_always_preserve_delivery(
    committed_notification,
):
    row_id, factory = committed_notification
    with factory() as db:
        work = claim(db)
    barrier = Barrier(2)

    def receipt():
        with factory() as db:
            barrier.wait(timeout=5)
            record_event(db, delivery_event(provider_id="wam_race"), "evt_race")

    def response():
        with factory() as db:
            barrier.wait(timeout=5)
            finish_claim(
                db,
                work,
                BirdResult("success", message={"id": "wam_race", "status": "accepted"}),
                TEST_CONFIG,
            )

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(receipt), pool.submit(response)]
        for future in futures:
            future.result(timeout=10)
    with factory() as db:
        assert db.get(OrderNotification, row_id).status == "delivered"


def test_reconcile_unknown_outcome_uses_verified_get_not_another_send(
    committed_notification,
):
    row_id, factory = committed_notification
    with factory() as db:
        work = claim(db)
        finish_claim(
            db,
            work,
            BirdResult("uncertain", "transport_outcome_unknown"),
            replace(TEST_CONFIG, max_attempts=1),
        )
        body = json.loads(work.body)

    async def exercise():
        def handler(request):
            assert request.method == "GET"
            return httpx.Response(
                200,
                json={
                    "id": "wam_reconciled",
                    "direction": "outbound",
                    "to": {"phone_number": body["to"]},
                    "template": body["template"],
                    "status": "delivered",
                },
            )

        provider = BirdClient(TEST_CONFIG, httpx.MockTransport(handler))
        try:
            assert (
                await reconcile(factory, provider, row_id, "wam_reconciled")
                == "delivered"
            )
        finally:
            await provider.close()

    asyncio.run(exercise())
    with factory() as db:
        row = db.get(OrderNotification, row_id)
        assert row.bird_message_id == "wam_reconciled" and row.attempts == 1


def test_graceful_shutdown_finishes_current_send_and_closes_http(
    committed_notification, monkeypatch
):
    row_id, factory = committed_notification
    monkeypatch.setattr(settings, "BIRD_API_KEY", SecretStr(TEST_CONFIG.api_key))
    monkeypatch.setattr(settings, "BIRD_ORDER_NOTIFICATION_PHONE", TEST_OWNER)

    async def exercise():
        stop = asyncio.Event()

        async def handler(request):
            stop.set()  # signal while a send is in flight, not a cancellation
            await asyncio.sleep(0.01)
            return httpx.Response(
                202, json={"id": "wam_shutdown", "status": "accepted"}
            )

        await asyncio.wait_for(
            run_worker(stop, factory=factory, transport=httpx.MockTransport(handler)), 5
        )

    asyncio.run(exercise())
    with factory() as db:
        row = db.get(OrderNotification, row_id)
        assert row.status == "accepted" and row.lease_token is None


def test_diagnostic_cli_lists_no_recipient_payload_or_credentials(
    committed_notification, monkeypatch, capsys
):
    from app.features.notifications import manage

    row_id, factory = committed_notification
    with factory() as db:
        claim(db)
    engine = Mock()
    monkeypatch.setattr(manage, "worker_database", lambda: (engine, factory))
    monkeypatch.setattr("sys.argv", ["notifications.manage", "list"])
    asyncio.run(manage.main())
    output = capsys.readouterr().out
    assert json.loads(output)["id"] == row_id
    assert TEST_CONFIG.api_key not in output and TEST_OWNER not in output
    assert "request_body" not in output and "customer" not in output
    engine.dispose.assert_called_once()


def test_expired_claim_is_not_posted_even_if_it_expires_before_http(
    committed_notification, monkeypatch
):
    from app.features.notifications import worker, service

    row_id, factory = committed_notification
    with factory() as db:
        work = claim(db)
    expired = work.replay_deadline + timedelta(seconds=1)
    monkeypatch.setattr(worker, "_claim", lambda *args: work)
    monkeypatch.setattr(worker, "utcnow", lambda: expired)
    monkeypatch.setattr(service, "utcnow", lambda: expired)

    async def exercise():
        def unexpected(request):
            pytest.fail("Expired claim must never reach Bird")

        provider = BirdClient(TEST_CONFIG, httpx.MockTransport(unexpected))
        try:
            assert await process_one(factory, TEST_CONFIG, provider)
        finally:
            await provider.close()

    asyncio.run(exercise())
    with factory() as db:
        assert db.get(OrderNotification, row_id).status == "uncertain"
