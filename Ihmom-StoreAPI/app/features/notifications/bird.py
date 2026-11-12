"""The verified Bird REST contract; no SDK retries, redirects or raw error logs."""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import re
import math

import httpx

from app.features.notifications.config import (
    BIRD_MESSAGES_URL,
    BirdConfig,
    REQUEST_DEADLINE_SECONDS,
)


def safe_code(value, fallback="provider_error") -> str:
    # Whitelist wire error codes, never reflected credentials/descriptions.
    delivery_codes = {
        "internal_error",
        "service_window_expired",
        "insufficient_balance",
        "price_not_found",
        "media_rejected",
        "recipient_unavailable",
        "undeliverable",
    }
    if isinstance(value, str) and (
        re.fullmatch(r"E[0-9]{5}", value) or value in delivery_codes
    ):
        return value
    return fallback


def message_id(value) -> bool:
    return isinstance(value, str) and bool(re.fullmatch(r"[A-Za-z0-9_-]{1,128}", value))


@dataclass(frozen=True)
class BirdResult:
    outcome: str
    code: str | None = None
    status_code: int | None = None
    message: dict | None = None
    retry_after: float = 0


class BirdClient:
    def __init__(self, config: BirdConfig, transport=None):
        self.config = config
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(
                config.read_timeout, connect=config.connect_timeout, write=5, pool=5
            ),
            follow_redirects=False,
            trust_env=False,
            transport=transport,
        )

    async def close(self):
        await self.client.aclose()

    async def send(self, url: str, body: str, key: str) -> BirdResult:
        if url != BIRD_MESSAGES_URL:
            return BirdResult("permanent", "invalid_provider_endpoint")
        return await self._request(
            "POST", url, content=body.encode("utf-8"), headers={"Idempotency-Key": key}
        )

    async def lookup(self, url: str, provider_id: str) -> BirdResult:
        if url != BIRD_MESSAGES_URL or not message_id(provider_id):
            return BirdResult("permanent", "invalid_message_id")
        return await self._request("GET", f"{url}/{provider_id}")

    async def _request(self, method, url, **kwargs):
        try:
            response = await asyncio.wait_for(
                self.client.request(method, url, **kwargs),
                timeout=REQUEST_DEADLINE_SECONDS,
            )
        except (httpx.ConnectTimeout, httpx.ConnectError, httpx.PoolTimeout):
            return BirdResult("transient", "connection_unavailable")
        except (httpx.TransportError, TimeoutError):
            return BirdResult("uncertain", "transport_outcome_unknown")
        try:
            payload = response.json()
        except ValueError:
            payload = None
        if 200 <= response.status_code < 300:
            if isinstance(payload, dict) and message_id(payload.get("id")):
                return BirdResult(
                    "success", status_code=response.status_code, message=payload
                )
            return BirdResult(
                "uncertain", "invalid_provider_response", response.status_code
            )
        code = "provider_http_error"
        if isinstance(payload, dict):
            # Bird's common error envelope uses error.code. Store no description.
            error = payload.get("error")
            if isinstance(error, dict):
                code = safe_code(error.get("code"))
        retry_after = 0
        try:
            raw_retry = response.headers.get("retry-after", "0")
            retry_after = float(raw_retry)
        except ValueError:
            try:
                retry_after = (
                    parsedate_to_datetime(raw_retry) - datetime.now(timezone.utc)
                ).total_seconds()
            except (ValueError, TypeError, OverflowError):
                pass
        # Never shorten a valid Retry-After. A delay beyond replay retention
        # will expire safely without another POST rather than violate a limit.
        retry_after = (
            min(2_592_000, max(0, retry_after)) if math.isfinite(retry_after) else 0
        )
        if response.status_code in {425, 429} or (
            response.status_code == 503 and code == "E01033"
        ):
            outcome = "transient"
        elif (
            response.status_code >= 500
            or response.status_code in {408, 499}
            or (response.status_code == 409 and code == "E01004")
        ):
            outcome = "uncertain"
        else:
            outcome = "permanent"
        return BirdResult(outcome, code, response.status_code, retry_after=retry_after)
