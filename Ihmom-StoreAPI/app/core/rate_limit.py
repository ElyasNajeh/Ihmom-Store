import hashlib
import hmac
from uuid import uuid4

from fastapi import HTTPException, Request
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings
from app.shared.phone import phone_identity


redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

_PEEK_SCRIPT = """
local now = redis.call('TIME')
local now_ms = (now[1] * 1000) + math.floor(now[2] / 1000)
local cutoff = now_ms - tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', cutoff)
local count = redis.call('ZCARD', KEYS[1])
if count < tonumber(ARGV[2]) then
  return 0
end
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return math.max(1, math.ceil((tonumber(oldest[2]) + tonumber(ARGV[1]) - now_ms) / 1000))
"""

_FAILURE_SCRIPT = """
local now = redis.call('TIME')
local now_ms = (now[1] * 1000) + math.floor(now[2] / 1000)
local cutoff = now_ms - tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', cutoff)
redis.call('ZADD', KEYS[1], now_ms, ARGV[3])
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1]))
local count = redis.call('ZCARD', KEYS[1])
if count <= tonumber(ARGV[2]) then
  return 0
end
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return math.max(1, math.ceil((tonumber(oldest[2]) + tonumber(ARGV[1]) - now_ms) / 1000))
"""

_CHECKOUT_SCRIPT = """
local now = redis.call('TIME')
local now_ms = (now[1] * 1000) + math.floor(now[2] / 1000)
local cutoff = now_ms - tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', cutoff)
if redis.call('ZSCORE', KEYS[1], ARGV[3]) then
  return {1, 0}
end
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[2]) then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  local retry_after = math.max(1, math.ceil((tonumber(oldest[2]) + tonumber(ARGV[1]) - now_ms) / 1000))
  return {0, retry_after}
end
redis.call('ZADD', KEYS[1], now_ms, ARGV[3])
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1]))
return {1, 0}
"""


def client_ip(request: Request) -> str:
    """Use only the ASGI peer address; forwarded headers are not trusted here."""
    return request.client.host if request.client else "unknown"


def _identity(scope: str, value: str) -> str:
    digest = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        value.strip().casefold().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{settings.RATE_LIMIT_KEY_PREFIX}:{scope}:{digest}"


async def _eval(script: str, keys: list[str], args: list[object]):
    try:
        return await redis_client.eval(script, len(keys), *keys, *args)
    except RedisError as exc:
        raise HTTPException(
            status_code=503,
            detail="Security rate-limit service is unavailable",
            headers={"Retry-After": "5"},
        ) from exc


def _limited(retry_after: int) -> HTTPException:
    return HTTPException(
        status_code=429,
        detail="Too many attempts. Please try again later.",
        headers={"Retry-After": str(max(1, retry_after))},
    )


async def enforce_login_limit(account: str, ip_address: str) -> None:
    window_ms = settings.LOGIN_RATE_WINDOW_SECONDS * 1000
    checks = (
        (
            _identity("login:account", account),
            settings.LOGIN_RATE_LIMIT_PER_ACCOUNT,
        ),
        (_identity("login:ip", ip_address), settings.LOGIN_RATE_LIMIT_PER_IP),
    )
    retry_after = 0
    for key, limit in checks:
        retry_after = max(
            retry_after,
            int(await _eval(_PEEK_SCRIPT, [key], [window_ms, limit])),
        )
    if retry_after:
        raise _limited(retry_after)


async def record_login_failure(account: str, ip_address: str) -> None:
    window_ms = settings.LOGIN_RATE_WINDOW_SECONDS * 1000
    checks = (
        (
            _identity("login:account", account),
            settings.LOGIN_RATE_LIMIT_PER_ACCOUNT,
        ),
        (_identity("login:ip", ip_address), settings.LOGIN_RATE_LIMIT_PER_IP),
    )
    retry_after = 0
    for key, limit in checks:
        retry_after = max(
            retry_after,
            int(
                await _eval(
                    _FAILURE_SCRIPT,
                    [key],
                    [window_ms, limit, str(uuid4())],
                )
            ),
        )
    if retry_after:
        raise _limited(retry_after)


async def clear_login_account_failures(account: str) -> None:
    try:
        await redis_client.delete(_identity("login:account", account))
    except RedisError as exc:
        raise HTTPException(
            status_code=503,
            detail="Security rate-limit service is unavailable",
            headers={"Retry-After": "5"},
        ) from exc


async def enforce_checkout_limit(ip_address: str, idempotency_key: str) -> None:
    window_ms = settings.CHECKOUT_RATE_WINDOW_SECONDS * 1000
    key = _identity("checkout:ip", ip_address)
    member = _identity("checkout:key", idempotency_key)
    allowed, retry_after = await _eval(
        _CHECKOUT_SCRIPT,
        [key],
        [window_ms, settings.CHECKOUT_RATE_LIMIT_PER_IP, member],
    )
    if not int(allowed):
        raise _limited(int(retry_after))


async def verify_redis() -> None:
    try:
        await redis_client.ping()
    except RedisError as exc:
        raise RuntimeError("Redis is required for security rate limiting") from exc


_HISTORY_SCRIPT = """
local now = redis.call('TIME')
local now_ms = (now[1] * 1000) + math.floor(now[2] / 1000)
local window = tonumber(ARGV[1])
local retry_after = 0
for i, key in ipairs(KEYS) do
  redis.call('ZREMRANGEBYSCORE', key, '-inf', now_ms - window)
  if redis.call('ZCARD', key) >= tonumber(ARGV[i + 2]) then
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    retry_after = math.max(retry_after, math.ceil((tonumber(oldest[2]) + window - now_ms) / 1000))
  end
end
if retry_after > 0 then return retry_after end
for _, key in ipairs(KEYS) do
  redis.call('ZADD', key, now_ms, ARGV[2])
  redis.call('PEXPIRE', key, window)
end
return 0
"""


async def enforce_order_history_limit(ip_address: str, phone: str) -> None:
    keys = [
        _identity("order_history:ip", ip_address),
        _identity("order_history:phone", phone_identity(phone)),
        _identity("order_history:global", "global"),
    ]
    try:
        retry_after = int(
            await _eval(
                _HISTORY_SCRIPT,
                keys,
                [
                    settings.ORDER_HISTORY_RATE_WINDOW_SECONDS * 1000,
                    str(uuid4()),
                    settings.ORDER_HISTORY_RATE_LIMIT_PER_IP,
                    settings.ORDER_HISTORY_RATE_LIMIT_PER_PHONE,
                    settings.ORDER_HISTORY_RATE_LIMIT_GLOBAL,
                ],
            )
        )
    except HTTPException as exc:
        exc.headers = {**(exc.headers or {}), "Cache-Control": "no-store"}
        raise
    if retry_after:
        raise HTTPException(
            status_code=429,
            detail="Too many verification attempts. Please try again later.",
            headers={
                "Retry-After": str(max(1, retry_after)),
                "Cache-Control": "no-store",
            },
        )


async def close_redis() -> None:
    await redis_client.aclose()
