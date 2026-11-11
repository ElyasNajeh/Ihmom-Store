import asyncio

import pytest
from fastapi import HTTPException
from redis import Redis
from redis.exceptions import RedisError

from app.core import rate_limit
from app.core.config import settings

pytestmark = [pytest.mark.integration, pytest.mark.security]


def test_history_limit_is_atomic_under_concurrency_and_expires(client, monkeypatch):
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_IP", 3)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_PHONE", 100)
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_GLOBAL", 100)

    async def attempt():
        try:
            await rate_limit.enforce_order_history_limit(
                "concurrent-test", "+970599123456"
            )
            return 200
        except HTTPException as exc:
            assert exc.headers["Cache-Control"] == "no-store"
            assert int(exc.headers["Retry-After"]) > 0
            return exc.status_code

    async def burst():
        return await asyncio.gather(*(attempt() for _ in range(12)))

    statuses = client.portal.call(burst)
    assert statuses.count(200) == 3
    assert statuses.count(429) == 9
    with Redis.from_url(settings.REDIS_URL) as redis:
        keys = list(
            redis.scan_iter(f"{settings.RATE_LIMIT_KEY_PREFIX}:order_history:*")
        )
        assert len(keys) == 3
        assert all(
            0 < redis.ttl(key) <= settings.ORDER_HISTORY_RATE_WINDOW_SECONDS
            for key in keys
        )
        for key in keys:
            assert "+970599123456" not in key.decode()
            redis.pexpire(key, 1)

    # Wait for Redis expiration without sleeping the test process.
    async def wait_for_expiration():
        for _ in range(100):
            if not await rate_limit.redis_client.exists(*[k.decode() for k in keys]):
                return
            await asyncio.sleep(0.01)
        raise AssertionError("Rate-limit keys did not expire")

    client.portal.call(wait_for_expiration)
    assert client.portal.call(attempt) == 200


def test_history_phone_and_global_limits_cannot_be_bypassed_with_new_ips(
    client, monkeypatch
):
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_PER_PHONE", 1)
    client.portal.call(rate_limit.enforce_order_history_limit, "first-ip", "0599123456")
    with pytest.raises(HTTPException) as limited:
        client.portal.call(
            rate_limit.enforce_order_history_limit, "second-ip", "+970599123456"
        )
    assert limited.value.status_code == 429
    monkeypatch.setattr(settings, "ORDER_HISTORY_RATE_LIMIT_GLOBAL", 1)
    with pytest.raises(HTTPException) as limited:
        client.portal.call(
            rate_limit.enforce_order_history_limit, "third-ip", "+972599123456"
        )
    assert limited.value.status_code == 429


def test_history_verification_fails_closed_when_redis_is_unavailable(
    client, monkeypatch
):
    async def unavailable(*args, **kwargs):
        raise RedisError("test outage")

    monkeypatch.setattr(rate_limit.redis_client, "eval", unavailable)
    response = client.post(
        "/orders/history/verify",
        json={"phone": "0599123456", "order_number": "unknown"},
    )
    assert response.status_code == 503
    assert response.headers["retry-after"] == "5"
    assert response.headers["cache-control"] == "no-store"
