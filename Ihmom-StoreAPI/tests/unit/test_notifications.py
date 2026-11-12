import asyncio
from datetime import timedelta
import json

import httpx
import pytest

from app.core.config import Settings
from app.db.mixins import utcnow
from app.features.notifications.bird import BirdClient, safe_code
from app.features.notifications.config import (
    BIRD_MESSAGES_URL,
    bird_config,
    owner_phone,
)
from app.features.notifications.manage import matches_snapshot
from app.features.notifications.model import OrderNotification
from app.features.notifications.service import apply_status, retry_delay
from app.features.notifications.webhook import verify_signature
from app.features.notifications.worker import run_worker, schema_ready
from pydantic import SecretStr
from tests.notification_helpers import TEST_CONFIG, TEST_OWNER, signed_headers


pytestmark = pytest.mark.unit


def configured(**values):
    return Settings(
        _env_file=None,
        BIRD_NOTIFICATIONS_ENABLED=True,
        BIRD_API_KEY="mock-only-key",
        BIRD_ORDER_NOTIFICATION_PHONE=TEST_OWNER,
        **values,
    )


@pytest.mark.parametrize(
    "raw, expected",
    [
        (" +1 (555) 555-0123 ", TEST_OWNER),
        ("0015555550123", TEST_OWNER),
        ("+970599000123", "+970599000123"),
    ],
)
def test_owner_phone_normalization(raw, expected):
    assert owner_phone(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "0599000123",
        "+0abc",
        "+123",
        "+1;DROP TABLE",
        "+1234567890123456",
        "customer@example.com",
    ],
)
def test_invalid_owner_phone_rejected_without_guessing_country(raw):
    with pytest.raises(ValueError, match="invalid_owner_phone"):
        owner_phone(raw)


@pytest.mark.parametrize(
    "field, value, error",
    [
        ("BIRD_API_URL", "http://127.0.0.1:8000/", "invalid_api_url"),
        ("BIRD_API_URL", BIRD_MESSAGES_URL + "?secret=x", "invalid_api_url"),
        ("BIRD_ORDER_TEMPLATE", "../wrong", "invalid_template"),
        ("BIRD_ORDER_TEMPLATE_LANGUAGE", "", "invalid_language"),
        ("BIRD_MAX_ATTEMPTS", "bad", "invalid_worker_policy"),
        ("BIRD_READ_TIMEOUT_SECONDS", "0", "invalid_worker_policy"),
    ],
)
def test_optional_bad_config_does_not_break_settings_initialization(
    field, value, error
):
    config, reason = bird_config(configured(**{field: value}))
    assert config is None and reason == error


def test_secrets_and_owner_are_redacted_from_configuration_repr():
    config, error = bird_config(configured())
    assert error is None
    assert TEST_OWNER not in repr(config)
    assert "mock-only-key" not in repr(config)
    assert "mock-only-key" not in repr(configured())
    assert bird_config(Settings(_env_file=None, BIRD_NOTIFICATIONS_ENABLED="typo")) == (
        None,
        "disabled",
    )


@pytest.mark.parametrize(
    "status, code, expected",
    [
        (401, "E02001", "permanent"),
        (403, "E02002", "permanent"),
        (402, "E07001", "permanent"),
        (422, "E01001", "permanent"),
        (409, "E01004", "uncertain"),
        (409, "E01005", "permanent"),
        (429, "E01002", "transient"),
        (500, "E01003", "uncertain"),
        (503, "E01033", "transient"),
        (302, "E01001", "permanent"),
    ],
)
def test_provider_http_failures_classified_without_leaking_body(status, code, expected):
    async def exercise():
        def handler(request):
            return httpx.Response(
                status,
                json={
                    "error": {"code": code, "message": "sensitive provider description"}
                },
                headers={"Retry-After": "23", "Location": "https://elsewhere.invalid/"},
            )

        provider = BirdClient(TEST_CONFIG, httpx.MockTransport(handler))
        try:
            result = await provider.send(
                BIRD_MESSAGES_URL, "{}", "unit-notification-key"
            )
            assert result.outcome == expected
            assert result.code == code
            assert result.retry_after == 23
            assert "sensitive" not in repr(result)
        finally:
            await provider.close()

    asyncio.run(exercise())


@pytest.mark.parametrize(
    "exception, outcome",
    [
        (httpx.ConnectTimeout, "transient"),
        (httpx.ConnectError, "transient"),
        (httpx.ReadTimeout, "uncertain"),
        (httpx.WriteTimeout, "uncertain"),
        (httpx.ReadError, "uncertain"),
    ],
)
def test_transport_errors_preserve_unknown_outcomes(exception, outcome):
    async def exercise():
        def handler(request):
            raise exception("private network diagnostic", request=request)

        provider = BirdClient(TEST_CONFIG, httpx.MockTransport(handler))
        try:
            result = await provider.send(
                BIRD_MESSAGES_URL, "{}", "unit-notification-key"
            )
            assert result.outcome == outcome
            assert "private" not in repr(result)
        finally:
            await provider.close()

    asyncio.run(exercise())


def test_http_contract_and_no_redirect_or_untrusted_proxy_environment():
    async def exercise():
        calls = []

        def handler(request):
            calls.append(request)
            assert str(request.url) == BIRD_MESSAGES_URL
            assert request.headers["authorization"] == "Bearer " + TEST_CONFIG.api_key
            assert request.headers["content-type"] == "application/json"
            assert request.headers["idempotency-key"] == "unit-notification-key"
            assert request.content == b'{"frozen":"bytes"}'
            return httpx.Response(202, json={"id": "wam_unit", "status": "accepted"})

        provider = BirdClient(TEST_CONFIG, httpx.MockTransport(handler))
        try:
            result = await provider.send(
                BIRD_MESSAGES_URL, '{"frozen":"bytes"}', "unit-notification-key"
            )
            assert result.message == {"id": "wam_unit", "status": "accepted"}
            assert (
                provider.client.timeout.connect == 5
                and provider.client.timeout.read == 10
            )
            assert provider.client.follow_redirects is False
            blocked = await provider.send(
                "https://elsewhere.invalid/", "{}", "unit-notification-key"
            )
            assert blocked.outcome == "permanent" and len(calls) == 1
        finally:
            await provider.close()

    asyncio.run(exercise())


@pytest.mark.parametrize(
    "payload",
    [None, [], {"status": "accepted"}, {"id": "../../evil", "status": "accepted"}],
)
def test_invalid_success_responses_are_uncertain(payload):
    async def exercise():
        provider = BirdClient(
            TEST_CONFIG,
            httpx.MockTransport(lambda _: httpx.Response(202, json=payload)),
        )
        try:
            assert (
                await provider.send(BIRD_MESSAGES_URL, "{}", "unit-key")
            ).outcome == "uncertain"
        finally:
            await provider.close()

    asyncio.run(exercise())


def test_backoff_is_bounded_exponential_jitter_and_respects_retry_after():
    for attempt in range(1, 12):
        base = min(300, 5 * 2 ** (attempt - 1))
        assert base * 0.8 <= retry_delay(attempt) <= base * 1.2
    assert retry_delay(1, 120) >= 120
    assert safe_code(TEST_CONFIG.api_key) == "provider_error"


@pytest.mark.parametrize(
    "statuses, final",
    [
        (["accepted", "sent", "delivered"], "delivered"),
        (["delivered", "sent", "accepted", "failed"], "delivered"),
        (["accepted", "failed", "sent"], "failed"),
        (["sent", "read"], "delivered"),
        (["accepted", "rejected"], "failed"),
    ],
)
def test_status_progression_does_not_confuse_acceptance_with_delivery(statuses, final):
    row = OrderNotification(status="pending", outcome_unknown=False)
    now = utcnow()
    for step, status in enumerate(statuses):
        apply_status(row, status, now + timedelta(seconds=step))
        if status == "accepted":
            assert row.delivered_at is None or row.status == "delivered"
    assert row.status == final


def test_stale_failure_cannot_override_newer_sent_status():
    now = utcnow()
    row = OrderNotification(status="sent", delivery_status="sent", last_event_at=now)
    apply_status(row, "failed", now - timedelta(seconds=1))
    assert row.status == "sent"


def test_standard_webhooks_raw_bytes_rotation_and_timestamp_validation():
    body = b'{ "type": "whatsapp.delivered" }'
    headers, secret = signed_headers(body)
    assert verify_signature(body, headers, secret, now=1_800_000_000)
    assert not verify_signature(
        body.replace(b" ", b""), headers, secret, now=1_800_000_000
    )
    assert not verify_signature(body, headers, secret, now=1_800_000_301)
    assert not verify_signature(body, headers, secret, now=1_799_999_699)
    headers["webhook-signature"] = "v1,bad v2,unknown " + headers["webhook-signature"]
    assert verify_signature(body, headers, secret, now=1_800_000_000)
    assert not verify_signature(body, {}, secret, now=1_800_000_000)
    assert not verify_signature(
        body, headers, "not-a-signing-secret", now=1_800_000_000
    )


def test_disabled_worker_shutdown_is_prompt_and_does_not_contact_provider(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", False)

    async def exercise():
        stop = asyncio.Event()
        task = asyncio.create_task(run_worker(stop))
        await asyncio.sleep(0.01)
        stop.set()
        await asyncio.wait_for(task, 1)

    asyncio.run(exercise())


def test_reconciliation_rejects_wrong_recipient_or_wrong_order():
    body = json.dumps(
        {
            "to": TEST_OWNER,
            "template": {
                "slug": "bird_order_confirmation",
                "language": "en",
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"name": "ref", "type": "text", "text": "IHM-real"},
                            {"name": "amount", "type": "text", "text": "50.00 ILS"},
                        ],
                    }
                ],
            },
        }
    )
    message = {
        "direction": "outbound",
        "to": {"phone_number": TEST_OWNER},
        "template": json.loads(body)["template"],
    }
    assert matches_snapshot(message, body)
    message["to"]["phone_number"] = "+15555550999"
    assert not matches_snapshot(message, body)
    message["to"]["phone_number"] = TEST_OWNER
    message["template"]["components"][0]["parameters"][0]["text"] = "different-order"
    assert not matches_snapshot(message, body)


def test_request_deadline_bounds_a_stalled_provider(monkeypatch):
    from app.features.notifications import bird

    monkeypatch.setattr(bird, "REQUEST_DEADLINE_SECONDS", 0.01)

    async def exercise():
        async def stalled(request):
            await asyncio.sleep(2)
            return httpx.Response(202, json={"id": "wam_late", "status": "accepted"})

        provider = BirdClient(TEST_CONFIG, httpx.MockTransport(stalled))
        try:
            result = await provider.send(BIRD_MESSAGES_URL, "{}", "test-deadline")
            assert result.outcome == "uncertain"
        finally:
            await provider.close()

    asyncio.run(exercise())


@pytest.mark.parametrize(
    "retry_after, expected", [("7200", 7200), ("NaN", 0), ("invalid", 0)]
)
def test_retry_after_is_not_shortened_and_invalid_headers_are_safe(
    retry_after, expected
):
    async def exercise():
        provider = BirdClient(
            TEST_CONFIG,
            httpx.MockTransport(
                lambda _: httpx.Response(429, headers={"Retry-After": retry_after})
            ),
        )
        try:
            result = await provider.send(BIRD_MESSAGES_URL, "{}", "test-retry-after")
            assert result.retry_after == expected
        finally:
            await provider.close()

    asyncio.run(exercise())


def test_schema_gate_waits_on_database_errors():
    def missing_database():
        raise RuntimeError("no database")

    assert not schema_ready(missing_database)


def test_worker_recovers_from_iteration_failure_without_logging_secrets(
    monkeypatch, caplog
):
    from app.core.config import settings
    from app.features.notifications import worker

    monkeypatch.setattr(settings, "BIRD_NOTIFICATIONS_ENABLED", True)
    monkeypatch.setattr(settings, "BIRD_API_KEY", SecretStr(TEST_CONFIG.api_key))
    monkeypatch.setattr(settings, "BIRD_ORDER_NOTIFICATION_PHONE", TEST_OWNER)
    # Alembic's fileConfig disables pre-existing loggers in the test process.
    # The standalone worker never runs Alembic; restore that logger for this test.
    monkeypatch.setattr(worker.logger, "disabled", False)
    caplog.set_level("ERROR", logger=worker.logger.name)
    calls = []

    async def exercise():
        stop = asyncio.Event()

        async def recover(*args):
            calls.append(True)
            if len(calls) == 1:
                raise RuntimeError(TEST_CONFIG.api_key)
            stop.set()
            return False

        async def immediate_wait(*args):
            pass

        monkeypatch.setattr(worker, "process_one", recover)
        monkeypatch.setattr(worker, "_wait", immediate_wait)
        await run_worker(
            stop, factory=lambda: None, transport=httpx.MockTransport(lambda _: None)
        )

    asyncio.run(exercise())
    assert len(calls) == 2
    assert "notification_worker_iteration_failed" in caplog.text
    assert TEST_CONFIG.api_key not in caplog.text and TEST_OWNER not in caplog.text
