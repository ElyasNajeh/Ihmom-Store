from uuid import uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)

from app.db.base import Base
from app.db.mixins import BigIntIdMixin, CreatedAtMixin, utcnow


class OrderNotification(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "order_notifications"
    __table_args__ = (
        UniqueConstraint("order_id", name="uq_order_notifications_order"),
        UniqueConstraint("idempotency_key", name="uq_order_notifications_key"),
        UniqueConstraint("bird_message_id", name="uq_order_notifications_message"),
        CheckConstraint(
            "status IN ('pending','processing','retry','accepted','sent','delivered','failed','uncertain')",
            name="ck_order_notifications_status",
        ),
        CheckConstraint(
            "attempts >= 0 AND delivery_checks >= 0",
            name="ck_order_notifications_counts",
        ),
        Index("ix_order_notifications_due", "status", "next_attempt_at"),
        Index("ix_order_notifications_lease", "lease_expires_at"),
        Index("ix_order_notifications_recipient", "recipient_hash"),
    )

    order_id = Column(
        BigInteger, ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False
    )
    status = Column(
        String(16), nullable=False, default="pending", server_default="pending"
    )
    attempts = Column(Integer, nullable=False, default=0, server_default="0")
    delivery_checks = Column(Integer, nullable=False, default=0, server_default="0")
    idempotency_key = Column(
        String(80), nullable=False, default=lambda: f"ihmom-owner-order/{uuid4()}"
    )
    # Frozen before the first HTTP call; contains only the configured owner,
    # template and persisted order ref/amount. Never a key or customer phone.
    request_body = Column(Text)
    request_url = Column(String(255))
    credential_hash = Column(String(64))
    recipient_hash = Column(String(64))
    bird_message_id = Column(String(128))
    delivery_status = Column(String(16))
    outcome_unknown = Column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    next_attempt_at = Column(DateTime(timezone=True), nullable=True, default=utcnow)
    first_attempt_at = Column(DateTime(timezone=True))
    accepted_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    last_event_at = Column(DateTime(timezone=True))
    lease_token = Column(String(36))
    lease_expires_at = Column(DateTime(timezone=True))
    last_error = Column(String(96))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class NotificationAttempt(BigIntIdMixin, Base):
    __tablename__ = "notification_attempts"
    __table_args__ = (
        UniqueConstraint(
            "notification_id", "number", name="uq_notification_attempt_number"
        ),
    )

    notification_id = Column(
        BigInteger,
        ForeignKey("order_notifications.id", ondelete="CASCADE"),
        nullable=False,
    )
    number = Column(Integer, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    finished_at = Column(DateTime(timezone=True))
    outcome = Column(String(24))
    http_status = Column(Integer)
    error_code = Column(String(96))


class BirdDeliveryEvent(CreatedAtMixin, Base):
    __tablename__ = "bird_delivery_events"
    __table_args__ = (Index("ix_bird_delivery_events_message", "bird_message_id"),)

    event_id = Column(String(255), primary_key=True)
    bird_message_id = Column(String(128), nullable=False)
    event_type = Column(String(32), nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    recipient_hash = Column(String(64), nullable=False)
    error_code = Column(String(80))
    applied_at = Column(DateTime(timezone=True))
