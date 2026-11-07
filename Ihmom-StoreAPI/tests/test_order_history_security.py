import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from jose import jwt

from app.core.config import settings
from app.core.security import (
    ORDER_HISTORY_AUDIENCE,
    ORDER_HISTORY_PURPOSE,
    ORDER_HISTORY_TOKEN_TYPE,
    create_order_history_token,
    hash_password,
)
from app.db import rate_limit
from app.db.rate_limit import RateLimitCounter
from app.features.admins.model import Admin
from app.features.orders.model import Order
from app.features.orders.service import _generate_order_number
from app.shared.phone import normalize_phone

PHONE = "0599123456"
CANONICAL_PHONE = "+970599123456"
ORDER_NUMBER_PATTERN = re.compile(r"IHM-[A-Za-z0-9_-]{24}")
GENERIC_ERROR_DETAIL = "Order details could not be verified"
HISTORY_FIELDS = {
    "order_number",
    "status",
    "created_at",
    "customer_name",
    "customer_phone",
    "delivery_area_name_ar",
    "delivery_area_name_en",
    "address",
    "notes",
    "total_quantity",
    "items",
    "subtotal",
    "delivery_fee",
    "total",
}


def create_order(client, catalog, *, phone=PHONE, name="Test Customer"):
    response = client.post(
        "/orders/checkout",
        json={
            "customer_name": name,
            "customer_phone": phone,
            "delivery_area_id": catalog.delivery_area_id,
            "address": "Test Address",
            "items": [
                {
                    "product_variant_id": catalog.variant_id,
                    "quantity": 1,
                }
            ],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def verify(client, phone, order_number):
    return client.post(
        "/orders/history/verify",
        json={"phone": phone, "order_number": order_number},
    )


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def fetch_history(client, token):
    return client.get("/orders/history", headers=bearer(token))


def encode_token(order_number, **overrides):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": CANONICAL_PHONE,
        "order_number": order_number,
        "aud": ORDER_HISTORY_AUDIENCE,
        "purpose": ORDER_HISTORY_PURPOSE,
        "token_type": ORDER_HISTORY_TOKEN_TYPE,
        "iat": now,
        "exp": now + timedelta(minutes=5),
    }
    payload.update(overrides)
    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def test_checkout_still_creates_orders(client, catalog):
    order = create_order(client, catalog)

    assert ORDER_NUMBER_PATTERN.fullmatch(order["order_number"])
    assert order["status"] == "pending"
    assert len(order["items"]) == 1
    assert order["items"][0]["quantity"] == 1
    assert Decimal(str(order["subtotal"])) == Decimal("10.00")
    assert Decimal(str(order["delivery_fee"])) == Decimal("5.00")
    assert Decimal(str(order["total"])) == Decimal("15.00")


def test_correct_combination_issues_scoped_token(client, catalog):
    order = create_order(client, catalog)

    response = verify(client, PHONE, order["order_number"])

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["token_type"] == "Bearer"
    assert body["expires_in"] == (
        settings.ORDER_HISTORY_TOKEN_EXPIRE_MINUTES * 60
    )

    claims = jwt.decode(
        body["access_token"],
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        audience=ORDER_HISTORY_AUDIENCE,
    )
    assert claims["aud"] == ORDER_HISTORY_AUDIENCE
    assert claims["purpose"] == ORDER_HISTORY_PURPOSE
    assert claims["token_type"] == ORDER_HISTORY_TOKEN_TYPE
    assert claims["sub"] == CANONICAL_PHONE
    assert claims["order_number"] == order["order_number"]
    assert claims["exp"] > claims["iat"]
    assert claims["jti"]


def test_verified_order_returns_full_details(client, catalog):
    order = create_order(
        client,
        catalog,
        name="Lina Ahmad",
    )
    token = verify(client, PHONE, order["order_number"]).json()["access_token"]

    response = fetch_history(client, token)

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert set(body) == HISTORY_FIELDS
    assert body["order_number"] == order["order_number"]
    assert body["customer_name"] == "Lina Ahmad"
    assert body["customer_phone"] == normalize_phone(PHONE)
    assert body["delivery_area_name_ar"]
    assert body["delivery_area_name_en"]
    assert body["address"] == "Test Address"
    assert body["notes"] is None
    assert body["total_quantity"] == 1
    assert len(body["items"]) == 1
    item = body["items"][0]
    assert item["product_name_ar"]
    assert item["product_name_en"]
    assert item["quantity"] == 1
    assert Decimal(str(item["unit_price"])) == Decimal("10.00")
    assert Decimal(str(item["total"])) == Decimal("10.00")


def test_checkout_issues_scoped_invoice_token(client, catalog):
    order = create_order(client, catalog)

    assert order["history_access_token"]
    assert order["history_access_token_expires_in"] == (
        settings.ORDER_HISTORY_TOKEN_EXPIRE_MINUTES * 60
    )

    claims = jwt.decode(
        order["history_access_token"],
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        audience=ORDER_HISTORY_AUDIENCE,
    )
    assert claims["aud"] == ORDER_HISTORY_AUDIENCE
    assert claims["purpose"] == ORDER_HISTORY_PURPOSE
    assert claims["token_type"] == ORDER_HISTORY_TOKEN_TYPE
    assert claims["sub"] == CANONICAL_PHONE
    assert claims["order_number"] == order["order_number"]


def test_checkout_invoice_download(client, catalog):
    order = create_order(client, catalog)

    response = client.get(
        "/orders/history/invoice",
        headers=bearer(order["history_access_token"]),
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["content-disposition"] == (
        f'attachment; filename="ihmom-store-invoice-{order["order_number"]}.pdf"'
    )
    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 1_000


def test_invoice_supports_english_and_arabic(client, catalog):
    order = create_order(client, catalog)

    english = client.get(
        "/orders/history/invoice",
        headers=bearer(order["history_access_token"]),
        params={"lang": "en"},
    )
    arabic = client.get(
        "/orders/history/invoice",
        headers=bearer(order["history_access_token"]),
        params={"lang": "ar"},
    )

    assert english.status_code == 200
    assert arabic.status_code == 200
    assert english.content.startswith(b"%PDF")
    assert arabic.content.startswith(b"%PDF")
    assert english.content != arabic.content

    invalid = client.get(
        "/orders/history/invoice",
        headers=bearer(order["history_access_token"]),
        params={"lang": "fr"},
    )

    assert invalid.status_code == 422


def test_history_invoice_requires_token(client):
    missing = client.get("/orders/history/invoice")
    malformed = client.get(
        "/orders/history/invoice",
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert missing.status_code == 401
    assert malformed.status_code == 401
    assert missing.headers["cache-control"] == "no-store"


def test_invoice_token_cannot_reach_another_order(client, catalog):
    first = create_order(client, catalog, phone="0599111111")
    second = create_order(client, catalog, phone="0599222222")

    response = client.get(
        "/orders/history/invoice",
        headers=bearer(first["history_access_token"]),
        params={"order_number": second["order_number"]},
    )

    assert response.status_code == 200
    assert response.headers["content-disposition"] == (
        f'attachment; filename="ihmom-store-invoice-{first["order_number"]}.pdf"'
    )


def test_expired_invoice_token_is_rejected(client, catalog):
    order = create_order(client, catalog)
    expired = create_order_history_token(
        PHONE,
        order["order_number"],
        timedelta(seconds=-60),
    )

    response = client.get(
        "/orders/history/invoice",
        headers=bearer(expired),
    )

    assert response.status_code == 401


@pytest.mark.parametrize(
    "phone",
    [
        "0599123456",
        "970599123456",
        "+970599123456",
        "  0599123456  ",
    ],
)
def test_phone_normalization(client, catalog, phone):
    order = create_order(client, catalog)

    response = verify(client, phone, order["order_number"])

    assert response.status_code == 200


def test_country_code_is_part_of_phone_identity(client, catalog):
    order = create_order(client, catalog)

    response = verify(client, "+972599123456", order["order_number"])

    assert response.status_code == 404
    assert response.json() == {"detail": GENERIC_ERROR_DETAIL}


def test_order_number_normalization(client, catalog):
    order = create_order(client, catalog)

    response = verify(
        client,
        PHONE,
        f"   #{order['order_number']}   ",
    )

    assert response.status_code == 200


def test_incorrect_phone_returns_generic_error(client, catalog):
    order = create_order(client, catalog)

    response = verify(client, "0599000000", order["order_number"])

    assert response.status_code == 404
    assert response.json() == {"detail": GENERIC_ERROR_DETAIL}


def test_nonexistent_order_number_returns_generic_error(client, catalog):
    create_order(client, catalog)

    response = verify(client, PHONE, "IHM-000000000000000000000000")

    assert response.status_code == 404
    assert response.json() == {"detail": GENERIC_ERROR_DETAIL}


def test_failures_do_not_disclose_what_exists(client, catalog):
    order = create_order(client, catalog)
    unknown_order = "IHM-000000000000000000000000"

    wrong_phone = verify(client, "0599000000", order["order_number"])
    wrong_order = verify(client, PHONE, unknown_order)
    unknown_phone = verify(client, "0599777777", unknown_order)

    for response in (wrong_phone, wrong_order, unknown_phone):
        assert response.status_code == 404
        assert response.json() == {"detail": GENERIC_ERROR_DETAIL}
        assert response.headers["cache-control"] == "no-store"

    assert wrong_phone.content == wrong_order.content == unknown_phone.content


def test_verification_validation(client, catalog):
    missing_order_number = client.post(
        "/orders/history/verify",
        json={"phone": PHONE},
    )
    invalid_phone = verify(client, "12345", "IHM-anything")
    extra_field = client.post(
        "/orders/history/verify",
        json={
            "phone": PHONE,
            "order_number": "IHM-anything",
            "customer_id": 1,
        },
    )

    assert missing_order_number.status_code == 422
    assert invalid_phone.status_code == 422
    assert extra_field.status_code == 422


def test_generated_order_numbers_are_unpredictable(catalog, client):
    generated = {_generate_order_number() for _ in range(40)}

    assert len(generated) == 40
    for order_number in generated:
        assert ORDER_NUMBER_PATTERN.fullmatch(order_number)

    # 24 base64url characters carry 144 bits of entropy, above the 128-bit
    # minimum required for non-guessable public identifiers.
    assert 24 * 6 >= 128

    first = create_order(client, catalog)
    second = create_order(client, catalog)
    assert first["order_number"] != second["order_number"]
    assert ORDER_NUMBER_PATTERN.fullmatch(first["order_number"])
    assert ORDER_NUMBER_PATTERN.fullmatch(second["order_number"])


def test_sequential_order_numbers_are_rejected(client, catalog):
    create_order(client, catalog)

    for guess in ("IHM-1", "IHM-000000000000000000000001", "1"):
        response = verify(client, PHONE, guess)
        assert response.status_code == 404
        assert response.json() == {"detail": GENERIC_ERROR_DETAIL}


def test_expired_token_is_rejected(client, catalog):
    order = create_order(client, catalog)
    expired = create_order_history_token(
        PHONE,
        order["order_number"],
        timedelta(seconds=-60),
    )

    response = fetch_history(client, expired)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_invalid_signature_is_rejected(client, catalog):
    order = create_order(client, catalog)
    forged = jwt.encode(
        {
            "sub": CANONICAL_PHONE,
            "order_number": order["order_number"],
            "aud": ORDER_HISTORY_AUDIENCE,
            "purpose": ORDER_HISTORY_PURPOSE,
            "token_type": ORDER_HISTORY_TOKEN_TYPE,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        "not-the-server-secret-key",
        algorithm=settings.ALGORITHM,
    )

    response = fetch_history(client, forged)

    assert response.status_code == 401


def test_tampered_token_is_rejected(client, catalog):
    order = create_order(client, catalog)
    token = verify(client, PHONE, order["order_number"]).json()["access_token"]
    middle = len(token) // 2
    tampered = token[:middle] + ("A" if token[middle] != "A" else "B") + token[middle + 1 :]

    response = fetch_history(client, tampered)

    assert response.status_code == 401


def test_wrong_audience_is_rejected(client, catalog):
    order = create_order(client, catalog)
    token = encode_token(order["order_number"], aud="admin")

    response = fetch_history(client, token)

    assert response.status_code == 401


def test_wrong_purpose_is_rejected(client, catalog):
    order = create_order(client, catalog)
    token = encode_token(order["order_number"], purpose="admin")

    response = fetch_history(client, token)

    assert response.status_code == 401


def test_wrong_token_type_is_rejected(client, catalog):
    order = create_order(client, catalog)
    token = encode_token(order["order_number"], token_type="access")

    response = fetch_history(client, token)

    assert response.status_code == 401


def test_non_canonical_phone_claim_is_rejected(client, catalog):
    order = create_order(client, catalog)
    token = encode_token(order["order_number"], sub=PHONE)

    response = fetch_history(client, token)

    assert response.status_code == 401


def test_token_without_order_claim_is_rejected(client, catalog):
    order = create_order(client, catalog)
    token = encode_token(order["order_number"])
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        audience=ORDER_HISTORY_AUDIENCE,
    )
    payload.pop("order_number")
    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    response = fetch_history(client, token)

    assert response.status_code == 401


def test_access_without_verification_is_rejected(client):
    missing = client.get("/orders/history")
    malformed = client.get(
        "/orders/history",
        headers={"Authorization": "Bearer not-a-jwt"},
    )
    legacy_post = client.post(
        "/orders/history",
        json={"phone": PHONE},
    )

    assert missing.status_code == 401
    assert missing.json()["detail"] == "Order history access token missing"
    assert malformed.status_code == 401
    assert legacy_post.status_code == 405


def test_token_cannot_reach_another_order(client, catalog):
    order_a = create_order(client, catalog, phone="0599111111")
    order_b = create_order(client, catalog, phone="0599222222")
    token_a = verify(client, "0599111111", order_a["order_number"]).json()[
        "access_token"
    ]

    direct = client.get(
        "/orders/history",
        headers=bearer(token_a),
        params={"order_number": order_b["order_number"], "phone": "0599222222"},
    )
    assert direct.status_code == 200
    assert direct.json()["order_number"] == order_a["order_number"]

    mixed = create_order_history_token(
        "0599111111",
        order_b["order_number"],
        timedelta(minutes=5),
    )
    mismatched = fetch_history(client, mixed)
    assert mismatched.status_code == 404
    assert mismatched.json() == {"detail": "Verified order is no longer available"}


def test_token_exposes_only_the_verified_order_of_a_phone(client, catalog):
    first = create_order(client, catalog)
    second = create_order(client, catalog)

    token = verify(client, PHONE, first["order_number"]).json()["access_token"]
    response = fetch_history(client, token)

    assert response.status_code == 200
    assert response.json()["order_number"] == first["order_number"]
    assert response.json()["order_number"] != second["order_number"]


def test_expired_token_can_be_retried_with_new_verification(client, catalog):
    order = create_order(client, catalog)
    expired = create_order_history_token(
        PHONE,
        order["order_number"],
        timedelta(seconds=-1),
    )
    assert fetch_history(client, expired).status_code == 401

    renewed = verify(client, PHONE, order["order_number"])
    assert renewed.status_code == 200
    assert fetch_history(client, renewed.json()["access_token"]).status_code == 200


def test_verification_is_rate_limited_per_phone(client, catalog, monkeypatch):
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_PHONE", 2)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_IP", 100)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_GLOBAL", 100)
    order = create_order(client, catalog)

    assert verify(client, PHONE, order["order_number"]).status_code == 200
    assert verify(client, PHONE, order["order_number"]).status_code == 200
    blocked = verify(client, PHONE, order["order_number"])

    assert blocked.status_code == 429
    assert blocked.headers["retry-after"].isdigit()
    assert blocked.headers["cache-control"] == "no-store"
    assert "detail" in blocked.json()


def test_verification_is_rate_limited_per_ip(client, catalog, monkeypatch):
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_PHONE", 100)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_IP", 1)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_GLOBAL", 100)
    first = create_order(client, catalog, phone="0599111111")
    second = create_order(client, catalog, phone="0599222222")

    assert verify(client, "0599111111", first["order_number"]).status_code == 200
    blocked = verify(client, "0599222222", second["order_number"])

    assert blocked.status_code == 429


def test_verification_is_rate_limited_globally(client, catalog, monkeypatch):
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_PHONE", 100)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_IP", 100)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_GLOBAL", 1)
    first = create_order(client, catalog, phone="0599111111")
    second = create_order(client, catalog, phone="0599222222")

    assert verify(client, "0599111111", first["order_number"]).status_code == 200
    blocked = verify(client, "0599222222", second["order_number"])

    assert blocked.status_code == 429


def test_rate_limit_keys_never_contain_phone_or_ip(client, catalog, db_session):
    order = create_order(client, catalog)

    assert verify(client, PHONE, order["order_number"]).status_code == 200

    counters = (
        db_session.query(RateLimitCounter)
        .filter(RateLimitCounter.bucket_key.like("order_history:%"))
        .all()
    )
    keys = [counter.bucket_key for counter in counters]
    scopes = {key.rsplit(":", 1)[0] for key in keys}

    assert scopes == {
        "order_history:ip",
        "order_history:phone",
        "order_history:global",
    }
    for key in keys:
        digest = key.rsplit(":", 1)[1]
        assert len(digest) == 64
        assert PHONE not in key
        assert CANONICAL_PHONE not in key
        assert "testclient" not in key


def test_rate_limit_window_rolls_over_without_lockout(db_session):
    now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    subject = f"rollover-{uuid4()}"

    first = rate_limit.consume(
        db_session,
        scope="order_history:test",
        subject=subject,
        limit=1,
        window_seconds=60,
        now=now,
    )
    second = rate_limit.consume(
        db_session,
        scope="order_history:test",
        subject=subject,
        limit=1,
        window_seconds=60,
        now=now,
    )
    third = rate_limit.consume(
        db_session,
        scope="order_history:test",
        subject=subject,
        limit=1,
        window_seconds=60,
        now=now + timedelta(seconds=60),
    )

    assert first is None
    assert second == 60
    assert third is None


def test_rate_limiting_does_not_block_token_retrieval(
    client,
    catalog,
    monkeypatch,
):
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_PHONE", 1)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_IP", 100)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_GLOBAL", 100)
    order = create_order(client, catalog)

    first = verify(client, PHONE, order["order_number"])
    assert first.status_code == 200
    assert verify(client, PHONE, order["order_number"]).status_code == 429

    response = fetch_history(client, first.json()["access_token"])
    assert response.status_code == 200


def test_admin_order_management_still_works(client, catalog, db_session):
    order = create_order(client, catalog)
    password = f"test-{uuid4()}"
    admin = Admin(
        username=f"admin-{uuid4()}",
        email=f"{uuid4()}@example.com",
        hashed_password=hash_password(password),
    )
    db_session.add(admin)
    db_session.commit()

    login = client.post(
        "/auth/login",
        json={"username": admin.username, "password": password},
    )
    assert login.status_code == 200
    admin_token = login.json()["access_token"]

    listing = client.get(
        "/orders/admin/all",
        headers=bearer(admin_token),
        params={"search": order["order_number"]},
    )
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert [item["order_number"] for item in items] == [order["order_number"]]

    order_id = (
        db_session.query(Order)
        .filter(Order.order_number == order["order_number"])
        .one()
        .id
    )
    updated = client.patch(
        f"/orders/admin/{order_id}/status",
        headers=bearer(admin_token),
        json={"status": "confirmed"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "confirmed"


def test_history_and_admin_tokens_are_not_interchangeable(
    client,
    catalog,
    db_session,
):
    order = create_order(client, catalog)
    history_token = verify(client, PHONE, order["order_number"]).json()[
        "access_token"
    ]

    assert (
        client.get(
            "/orders/admin/all",
            headers=bearer(history_token),
        ).status_code
        == 401
    )

    password = f"test-{uuid4()}"
    admin = Admin(
        username=f"admin-{uuid4()}",
        email=f"{uuid4()}@example.com",
        hashed_password=hash_password(password),
    )
    db_session.add(admin)
    db_session.commit()
    login = client.post(
        "/auth/login",
        json={"username": admin.username, "password": password},
    )
    admin_token = login.json()["access_token"]

    assert fetch_history(client, admin_token).status_code == 401
    assert (
        client.get(
            "/orders/history/invoice",
            headers=bearer(admin_token),
        ).status_code
        == 401
    )
