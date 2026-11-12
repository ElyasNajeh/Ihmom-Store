"""Local operator diagnostics/reconciliation. No command sends WhatsApp."""

import argparse
import asyncio
import json

from sqlalchemy import select

from app.core.config import settings
from app.db.mixins import utcnow
from app.features.notifications.bird import BirdClient, message_id, safe_code
from app.features.notifications.config import bird_config, owner_phone
from app.features.notifications.model import OrderNotification
from app.features.notifications.service import (
    apply_events,
    apply_status,
    lock_message,
    provider_status_time,
    _provider_time,
)
from app.features.notifications.worker import worker_database


def matches_snapshot(message, body):
    try:
        expected = json.loads(body)
        if (
            message.get("direction") != "outbound"
            or owner_phone(message["to"]["phone_number"]) != expected["to"]
        ):
            return False
        template = message["template"]
        if (
            template["slug"] != expected["template"]["slug"]
            or template.get("language") != expected["template"]["language"]
        ):
            return False
        values = template.get("parameters", {})
        for component in template.get("components", []):
            if component.get("type") == "body":
                values = {
                    **values,
                    **{
                        p["name"]: p["text"]
                        for p in component["parameters"]
                        if p.get("type") == "text"
                    },
                }
        return all(
            values.get(p["name"]) == p["text"]
            for p in expected["template"]["components"][0]["parameters"]
        )
    except (KeyError, TypeError, ValueError, AttributeError):
        return False


async def reconcile(factory, provider, notification_id, provider_id):
    if not message_id(provider_id):
        raise ValueError("Invalid provider message ID")
    with factory() as db:
        row = db.get(OrderNotification, notification_id)
        if row is None or row.status != "uncertain" or not row.request_body:
            raise ValueError("Only attempted uncertain notifications can be reconciled")
        body, url = row.request_body, row.request_url
    result = await provider.lookup(url, provider_id)
    if (
        result.outcome != "success"
        or result.message["id"] != provider_id
        or not matches_snapshot(result.message, body)
    ):
        raise ValueError(
            "Provider record could not be matched to the frozen owner/order/template"
        )
    payload = result.message
    status = payload.get("status")
    if status not in {"accepted", "sent", "delivered", "failed", "rejected"}:
        raise ValueError("Provider delivery status is not recognized")
    with factory() as db:
        lock_message(db, provider_id)
        row = db.scalar(
            select(OrderNotification)
            .where(OrderNotification.id == notification_id)
            .with_for_update()
        )
        if (
            row.status != "uncertain"
            or row.request_body != body
            or (row.bird_message_id and row.bird_message_id != provider_id)
        ):
            raise ValueError("Notification changed during reconciliation")
        row.bird_message_id = provider_id
        now = utcnow()
        row.accepted_at = row.accepted_at or now
        row.delivery_checks = 0
        error = payload.get("last_error")
        error = safe_code(error.get("code")) if isinstance(error, dict) else None
        apply_status(
            row, status, provider_status_time(payload, status), error=error, now=now
        )
        read_at = _provider_time(payload.get("read_at"), None)
        if read_at is not None:
            apply_status(row, "read", read_at, now=now)
        apply_events(db, row, now)
        if row.status in {"accepted", "sent"}:
            row.next_attempt_at = now
        row.lease_token = None
        row.lease_expires_at = None
        db.commit()
        return row.status


async def main():
    parser = argparse.ArgumentParser(
        description="Owner-notification diagnostics; never sends a message"
    )
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("list")
    command = commands.add_parser("reconcile")
    command.add_argument("notification_id", type=int)
    command.add_argument("--message-id", required=True)
    args = parser.parse_args()
    engine, factory = worker_database()
    try:
        if args.command == "list":
            with factory() as db:
                for row in db.scalars(
                    select(OrderNotification)
                    .order_by(OrderNotification.id.desc())
                    .limit(100)
                ):
                    print(
                        json.dumps(
                            {
                                "id": row.id,
                                "order_id": row.order_id,
                                "status": row.status,
                                "attempts": row.attempts,
                                "delivery_checks": row.delivery_checks,
                                "bird_message_id": row.bird_message_id,
                                "last_error": row.last_error,
                            }
                        )
                    )
        else:
            config, _ = bird_config(settings)
            if config is None:
                parser.error(
                    "Enable valid Bird configuration for read-only reconciliation"
                )
            provider = BirdClient(config)
            try:
                status = await reconcile(
                    factory, provider, args.notification_id, args.message_id
                )
                print(json.dumps({"id": args.notification_id, "status": status}))
            except ValueError as exc:
                parser.error(str(exc))
            finally:
                await provider.close()
    finally:
        engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
