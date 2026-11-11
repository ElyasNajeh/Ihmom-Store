import asyncio

import pytest
from fastapi import HTTPException
from redis.exceptions import RedisError

from app.core import rate_limit

pytestmark = [pytest.mark.unit, pytest.mark.security]


def test_history_redis_failure_is_fail_closed(monkeypatch):
    async def unavailable(*args, **kwargs):
        raise RedisError("simulated outage")

    monkeypatch.setattr(rate_limit.redis_client, "eval", unavailable)
    with pytest.raises(HTTPException) as error:
        asyncio.run(rate_limit.enforce_order_history_limit("test-ip", "0599123456"))
    assert error.value.status_code == 503
    assert error.value.headers == {"Retry-After": "5", "Cache-Control": "no-store"}


def test_history_redis_rejection_has_retry_and_no_store(monkeypatch):
    async def reject(*args, **kwargs):
        return 15

    monkeypatch.setattr(rate_limit.redis_client, "eval", reject)
    with pytest.raises(HTTPException) as error:
        asyncio.run(rate_limit.enforce_order_history_limit("test-ip", "0599123456"))
    assert error.value.status_code == 429
    assert error.value.headers == {"Retry-After": "15", "Cache-Control": "no-store"}


def test_history_redis_uses_private_keys_and_canonical_phone_identity(monkeypatch):
    calls = []

    async def allow(script, number, *values):
        calls.append((number, values))
        return 0

    monkeypatch.setattr(rate_limit.redis_client, "eval", allow)
    asyncio.run(rate_limit.enforce_order_history_limit("test-ip", "0599123456"))
    asyncio.run(rate_limit.enforce_order_history_limit("other-ip", "+970599123456"))
    assert [number for number, _ in calls] == [3, 3]
    first, second = calls[0][1], calls[1][1]
    assert first[0] != second[0]
    assert first[1:3] == second[1:3]
    assert "599123456" not in str(first[:3])
    assert "test-ip" not in str(first[:3])
