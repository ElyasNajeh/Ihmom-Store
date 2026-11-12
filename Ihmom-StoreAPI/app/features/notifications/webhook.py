"""Bird's documented Standard Webhooks verification and durable deduplication."""

import base64
import binascii
from datetime import datetime
import hashlib
import hmac
import json
import re
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.db.mixins import utcnow
from app.db.session import get_db
from app.features.notifications.bird import message_id, safe_code
from app.features.notifications.config import recipient_hash
from app.features.notifications.model import BirdDeliveryEvent, OrderNotification
from app.features.notifications.service import apply_events, lock_message


router = APIRouter(prefix="/notifications/bird", tags=["Notifications"])
EVENTS = {
    "whatsapp." + value
    for value in ("accepted", "sent", "delivered", "read", "failed", "rejected")
}


def verify_signature(body, headers, secret, now=None):
    """https://bird.com/docs/guides/webhooks#verify-signatures"""
    try:
        delivery_id = headers["webhook-id"]
        timestamp = headers["webhook-timestamp"]
        signatures = headers["webhook-signature"]
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,255}", delivery_id):
            return False
        if (
            not re.fullmatch(r"[0-9]{1,12}", timestamp)
            or abs((time.time() if now is None else now) - int(timestamp)) > 300
        ):
            return False
        if not secret.startswith("whsec_"):
            return False
        key = base64.b64decode(secret[6:], validate=True)
        if len(key) < 16:
            return False
        expected = hmac.new(
            key, f"{delivery_id}.{timestamp}.".encode() + body, hashlib.sha256
        ).digest()
        for signature in signatures.split():
            if signature.startswith("v1,"):
                try:
                    actual = base64.b64decode(signature[3:], validate=True)
                except (ValueError, binascii.Error):
                    continue
                if hmac.compare_digest(expected, actual):
                    return True
    except (KeyError, TypeError, ValueError, binascii.Error):
        pass
    return False


def record_event(db, event, event_id):
    kind = event.get("type")
    if event.get("test") is True or (isinstance(kind, str) and kind not in EVENTS):
        return
    data = event.get("data")
    try:
        if (
            not isinstance(kind, str)
            or not isinstance(data, dict)
            or data.get("direction") not in {"outbound", "inbound"}
        ):
            raise ValueError()
        if data.get("direction") == "inbound":
            return
        provider_id = data["whatsapp_id"]
        if not message_id(provider_id):
            raise ValueError()
        phone_hash = recipient_hash(data["to"]["phone_number"])
        occurred_at = datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
        if occurred_at.tzinfo is None:
            raise ValueError()
        error = data.get("error")
        error = safe_code(error.get("code")) if isinstance(error, dict) else None
    except (KeyError, TypeError, ValueError, AttributeError):
        raise HTTPException(
            status_code=400, detail="Invalid notification event"
        ) from None
    # No raw body, customer phone, provider description or header signatures are
    # stored. Orphan receipts survive a send-response/webhook ordering race.
    try:
        lock_message(db, provider_id)
        row = db.scalar(
            select(OrderNotification)
            .where(
                OrderNotification.bird_message_id == provider_id,
            )
            .with_for_update()
        )
        if row and row.recipient_hash != phone_hash:
            db.rollback()
            return
        if row is None and not db.scalar(
            select(OrderNotification.id)
            .where(
                OrderNotification.recipient_hash == phone_hash,
                OrderNotification.status.in_(["processing", "retry", "uncertain"]),
            )
            .limit(1)
        ):
            # Ignore other messages in the workspace. No customer information
            # from unrelated Bird traffic is retained, even in hashed form.
            db.rollback()
            return
        db.execute(
            insert(BirdDeliveryEvent)
            .values(
                event_id=event_id,
                bird_message_id=provider_id,
                event_type=kind,
                occurred_at=occurred_at,
                recipient_hash=phone_hash,
                error_code=error,
                created_at=utcnow(),
            )
            .on_conflict_do_nothing(index_elements=["event_id"])
        )
        if row:
            apply_events(db, row)
        db.commit()
    except Exception:
        db.rollback()
        raise


@router.post("/webhook", include_in_schema=False)
async def bird_webhook(request: Request, db=Depends(get_db)):
    secret = settings.BIRD_WEBHOOK_SECRET.get_secret_value()
    if not secret:
        raise HTTPException(status_code=503, detail="Notification receiver unavailable")
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > 65_536:
            raise HTTPException(status_code=413, detail="Notification event too large")
        body.extend(chunk)
    body = bytes(body)
    if not verify_signature(body, request.headers, secret):
        raise HTTPException(status_code=400, detail="Invalid notification signature")
    try:
        event = json.loads(body)
        if not isinstance(event, dict):
            raise ValueError()
    except (ValueError, UnicodeError):
        raise HTTPException(
            status_code=400, detail="Invalid notification event"
        ) from None
    await run_in_threadpool(record_event, db, event, request.headers["webhook-id"])
    return {"received": True}
