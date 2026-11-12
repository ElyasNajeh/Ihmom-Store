"""Short PostgreSQL transactions around HTTP, with durable claims and fencing."""

from dataclasses import dataclass
from datetime import datetime, timedelta
import json
import random
from uuid import uuid4

from sqlalchemy import and_, or_, select, text

from app.constants.common import CURRENCY_CODE
from app.db.mixins import utcnow
from app.features.notifications.bird import BirdResult, safe_code
from app.features.notifications.config import (
    BirdConfig,
    LEASE_SECONDS,
    SAFE_REPLAY_SECONDS,
    recipient_hash,
)
from app.features.notifications.model import (
    BirdDeliveryEvent,
    NotificationAttempt,
    OrderNotification,
)
from app.features.orders.model import Order


@dataclass(frozen=True)
class Claim:
    notification_id: int
    token: str
    operation: str
    url: str | None = None
    body: str | None = None
    key: str | None = None
    message_id: str | None = None
    replay_deadline: datetime | None = None


def retry_delay(attempt: int, retry_after: float = 0) -> float:
    return max(
        retry_after, random.uniform(0.8, 1.2) * min(300, 5 * 2 ** min(attempt - 1, 10))
    )


def payload_for(order: Order, config: BirdConfig) -> str:
    return json.dumps(
        {
            "to": config.phone,
            "template": {
                "slug": config.template,
                "language": config.language,
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "name": "ref", "text": order.order_number},
                            {
                                "type": "text",
                                "name": "amount",
                                "text": f"{order.total:.2f} {CURRENCY_CODE}",
                            },
                        ],
                    }
                ],
            },
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def lock_message(db, provider_id):
    # Serialize message-ID attachment and receipt ingestion. Both paths take
    # this lock BEFORE the outbox row lock, eliminating the early-webhook race.
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:message_id, 71429))"),
        {"message_id": provider_id},
    )


def _release(row, now):
    row.lease_token = None
    row.lease_expires_at = None
    row.updated_at = now


def _stop(row, code, *, uncertain=False):
    row.status = "uncertain" if uncertain else "failed"
    row.last_error = code
    row.next_attempt_at = None


def claim_next(db, config: BirdConfig, now=None) -> Claim | None:
    now = now or utcnow()
    row = db.scalar(
        select(OrderNotification)
        .where(
            or_(
                and_(
                    OrderNotification.status.in_(
                        ["pending", "retry", "accepted", "sent"]
                    ),
                    OrderNotification.next_attempt_at <= now,
                ),
                and_(
                    OrderNotification.status == "processing",
                    OrderNotification.lease_expires_at <= now,
                ),
            ),
            or_(
                OrderNotification.lease_expires_at.is_(None),
                OrderNotification.lease_expires_at <= now,
            ),
        )
        .order_by(OrderNotification.next_attempt_at, OrderNotification.id)
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    if row is None:
        db.rollback()
        return None
    token = str(uuid4())
    apply_events(db, row, now)
    if row.status in {"delivered", "failed"}:
        _release(row, now)
        db.commit()
        return Claim(row.id, token, "noop")
    if row.status == "processing":
        # A process died after durable claim, potentially after provider acceptance.
        row.outcome_unknown = True
        previous = db.scalar(
            select(NotificationAttempt).where(
                NotificationAttempt.notification_id == row.id,
                NotificationAttempt.number == row.attempts,
            )
        )
        if previous and previous.finished_at is None:
            previous.finished_at = now
            previous.outcome = "uncertain"
            previous.error_code = "worker_lease_expired"
    if row.status in {"accepted", "sent"}:
        operation = "poll"
        if (
            row.delivery_checks >= config.status_max_checks
            or now >= row.accepted_at + timedelta(hours=24)
        ):
            _stop(row, "delivery_confirmation_exhausted", uncertain=True)
            operation = "noop"
        else:
            row.delivery_checks += 1
    else:
        operation = "send"
        if row.first_attempt_at and now >= row.first_attempt_at + timedelta(
            seconds=SAFE_REPLAY_SECONDS
        ):
            _stop(row, "idempotency_window_closed", uncertain=row.outcome_unknown)
            operation = "noop"
        elif row.attempts >= config.max_attempts:
            _stop(row, "attempts_exhausted", uncertain=row.outcome_unknown)
            operation = "noop"
        elif row.credential_hash and row.credential_hash != config.credential_hash:
            # A different key could refer to a different workspace/replay scope.
            _stop(row, "credentials_changed_requires_reconciliation", uncertain=True)
            operation = "noop"
        elif row.request_url and row.request_url != config.url:
            _stop(row, "endpoint_changed_requires_reconciliation", uncertain=True)
            operation = "noop"
        else:
            if row.request_body is None:
                order = db.get(Order, row.order_id)
                row.request_body = payload_for(order, config)
                row.request_url = config.url
                row.credential_hash = config.credential_hash
                row.recipient_hash = recipient_hash(config.phone)
            row.first_attempt_at = row.first_attempt_at or now
            row.attempts += 1
            row.status = "processing"
            db.add(
                NotificationAttempt(
                    notification_id=row.id, number=row.attempts, started_at=now
                )
            )
    if operation != "noop":
        row.lease_token = token
        row.lease_expires_at = now + timedelta(seconds=LEASE_SECONDS)
        row.updated_at = now
    else:
        _release(row, now)
    claim = Claim(
        row.id,
        token,
        operation,
        row.request_url,
        row.request_body,
        row.idempotency_key,
        row.bird_message_id,
        row.first_attempt_at + timedelta(seconds=SAFE_REPLAY_SECONDS)
        if row.first_attempt_at
        else None,
    )
    db.commit()
    return claim


def _provider_time(value, fallback):
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return timestamp if timestamp.tzinfo else fallback
    except (ValueError, TypeError, AttributeError):
        return fallback


def provider_status_time(payload, status):
    field = {
        "accepted": "created_at",
        "sent": "sent_at",
        "delivered": "delivered_at",
    }.get(status)
    raw = payload.get(field) if field else None
    error = payload.get("last_error")
    if status in {"failed", "rejected"} and isinstance(error, dict):
        raw = error.get("occurred_at")
    return _provider_time(raw, None)


def apply_status(row, status, occurred_at, *, error=None, now=None):
    """Never regress delivery evidence; failures terminate ordinary progression."""
    now = now or utcnow()
    if status not in {"accepted", "sent", "delivered", "failed", "rejected", "read"}:
        return
    if status == "read":
        status = "delivered"
    if row.status == "delivered":
        return
    if status != "delivered":
        if (
            occurred_at is not None
            and row.last_event_at
            and occurred_at < row.last_event_at
        ):
            return
        if row.delivery_status in {"failed", "rejected"} and status in {
            "accepted",
            "sent",
        }:
            return
        if row.delivery_status == "sent" and status == "accepted":
            return
    row.delivery_status = status
    row.status = "failed" if status == "rejected" else status
    # Local HTTP receipt time is NOT a provider event time. Inventing one can
    # reject real receipts that Bird generated while the request was in flight.
    if occurred_at is not None:
        row.last_event_at = occurred_at
    row.updated_at = now
    row.outcome_unknown = False
    row.accepted_at = row.accepted_at or now
    if status == "delivered":
        row.delivered_at = occurred_at or now
        row.last_error = None
    elif status in {"failed", "rejected"}:
        row.last_error = error or "provider_delivery_failed"
    if status in {"delivered", "failed", "rejected"}:
        row.next_attempt_at = None


def apply_events(db, row, now=None):
    if not row.bird_message_id or not row.request_body:
        return
    now = now or utcnow()
    expected_recipient = recipient_hash(json.loads(row.request_body)["to"])
    events = db.scalars(
        select(BirdDeliveryEvent)
        .where(
            BirdDeliveryEvent.bird_message_id == row.bird_message_id,
            BirdDeliveryEvent.applied_at.is_(None),
        )
        .order_by(BirdDeliveryEvent.occurred_at, BirdDeliveryEvent.event_id)
    ).all()
    for event in events:
        if event.recipient_hash == expected_recipient:
            apply_status(
                row,
                event.event_type.removeprefix("whatsapp."),
                event.occurred_at,
                error=event.error_code,
                now=now,
            )
        event.applied_at = now


def finish_claim(
    db, claim: Claim, result: BirdResult, config: BirdConfig, now=None
) -> bool:
    now = now or utcnow()
    if result.outcome == "success":
        lock_message(db, result.message["id"])
    row = db.scalar(
        select(OrderNotification)
        .where(
            OrderNotification.id == claim.notification_id,
            OrderNotification.lease_token == claim.token,
        )
        .with_for_update()
    )
    if row is None:
        db.rollback()
        return False  # stale worker: it may never overwrite another lease/result
    attempt = None
    if claim.operation == "send":
        attempt = db.scalar(
            select(NotificationAttempt).where(
                NotificationAttempt.notification_id == row.id,
                NotificationAttempt.number == row.attempts,
            )
        )
        attempt.finished_at = now
        attempt.http_status = result.status_code
        attempt.outcome = result.outcome
        attempt.error_code = result.code
    # A signed receipt may have arrived while this HTTP call was in flight.
    terminal = row.status in {"delivered", "failed"}
    if result.outcome == "success":
        payload = result.message
        provider_id = payload["id"]
        if row.bird_message_id and row.bird_message_id != provider_id:
            if not terminal:
                _stop(row, "provider_message_id_mismatch", uncertain=True)
        else:
            row.bird_message_id = provider_id
            row.accepted_at = row.accepted_at or now
            row.outcome_unknown = False
            status = payload.get("status")
            if status in {"accepted", "sent", "delivered", "failed", "rejected"}:
                evidence_time = provider_status_time(payload, status)
                error = payload.get("last_error")
                error = (
                    safe_code(error.get("code")) if isinstance(error, dict) else None
                )
                apply_status(row, status, evidence_time, error=error, now=now)
                read_at = _provider_time(payload.get("read_at"), None)
                if read_at is not None:
                    apply_status(row, "read", read_at, now=now)
                apply_events(db, row, now)
                if row.status in {"accepted", "sent"}:
                    delay = min(
                        3600,
                        config.status_poll_seconds * 2 ** min(row.delivery_checks, 6),
                    )
                    row.next_attempt_at = now + timedelta(seconds=delay)
            elif not terminal:
                _stop(row, "unknown_provider_status", uncertain=True)
    elif not terminal:
        row.last_error = result.code
        if claim.operation == "poll":
            # Never turn GET failures into a second POST, including 401/404.
            if (
                result.outcome == "permanent"
                or row.delivery_checks >= config.status_max_checks
            ):
                _stop(
                    row, "delivery_lookup_" + (result.code or "failed"), uncertain=True
                )
            else:
                row.next_attempt_at = now + timedelta(
                    seconds=max(
                        config.status_poll_seconds,
                        retry_delay(row.delivery_checks, result.retry_after),
                    )
                )
        else:
            row.outcome_unknown = row.outcome_unknown or result.outcome == "uncertain"
            if now >= row.first_attempt_at + timedelta(seconds=SAFE_REPLAY_SECONDS):
                _stop(row, "idempotency_window_closed", uncertain=row.outcome_unknown)
            elif result.outcome == "permanent":
                _stop(
                    row, result.code or "permanent_error", uncertain=row.outcome_unknown
                )
            elif row.attempts >= config.max_attempts:
                _stop(row, "attempts_exhausted", uncertain=row.outcome_unknown)
            else:
                row.status = "retry"
                row.next_attempt_at = now + timedelta(
                    seconds=retry_delay(row.attempts, result.retry_after)
                )
    _release(row, now)
    db.commit()
    return True
