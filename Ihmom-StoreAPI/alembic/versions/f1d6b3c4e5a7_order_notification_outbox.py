"""Durable owner-only WhatsApp notifications, attempts and delivery receipts.

Revision ID: f1d6b3c4e5a7
Revises: e9c5a2b3d4f6
"""

from alembic import op
import sqlalchemy as sa


revision = "f1d6b3c4e5a7"
down_revision = "e9c5a2b3d4f6"
branch_labels = None
depends_on = None


def upgrade():
    # Additive only. Historical orders are NOT backfilled or notified.
    op.create_table(
        "order_notifications",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "order_id",
            sa.BigInteger(),
            sa.ForeignKey("orders.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(16), server_default="pending", nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("delivery_checks", sa.Integer(), server_default="0", nullable=False),
        sa.Column("idempotency_key", sa.String(80), nullable=False),
        sa.Column("request_body", sa.Text()),
        sa.Column("request_url", sa.String(255)),
        sa.Column("credential_hash", sa.String(64)),
        sa.Column("recipient_hash", sa.String(64)),
        sa.Column("bird_message_id", sa.String(128)),
        sa.Column("delivery_status", sa.String(16)),
        sa.Column(
            "outcome_unknown",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True)),
        sa.Column("first_attempt_at", sa.DateTime(timezone=True)),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column("last_event_at", sa.DateTime(timezone=True)),
        sa.Column("lease_token", sa.String(36)),
        sa.Column("lease_expires_at", sa.DateTime(timezone=True)),
        sa.Column("last_error", sa.String(96)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("order_id", name="uq_order_notifications_order"),
        sa.UniqueConstraint("idempotency_key", name="uq_order_notifications_key"),
        sa.UniqueConstraint("bird_message_id", name="uq_order_notifications_message"),
        sa.CheckConstraint(
            "status IN ('pending','processing','retry','accepted','sent','delivered','failed','uncertain')",
            name="ck_order_notifications_status",
        ),
        sa.CheckConstraint(
            "attempts >= 0 AND delivery_checks >= 0",
            name="ck_order_notifications_counts",
        ),
    )
    op.create_index(
        "ix_order_notifications_due",
        "order_notifications",
        ["status", "next_attempt_at"],
    )
    op.create_index(
        "ix_order_notifications_lease", "order_notifications", ["lease_expires_at"]
    )
    op.create_index(
        "ix_order_notifications_recipient", "order_notifications", ["recipient_hash"]
    )
    op.create_table(
        "notification_attempts",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "notification_id",
            sa.BigInteger(),
            sa.ForeignKey("order_notifications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("outcome", sa.String(24)),
        sa.Column("http_status", sa.Integer()),
        sa.Column("error_code", sa.String(96)),
        sa.UniqueConstraint(
            "notification_id", "number", name="uq_notification_attempt_number"
        ),
    )
    op.create_table(
        "bird_delivery_events",
        sa.Column("event_id", sa.String(255), primary_key=True),
        sa.Column("bird_message_id", sa.String(128), nullable=False),
        sa.Column("event_type", sa.String(32), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recipient_hash", sa.String(64), nullable=False),
        sa.Column("error_code", sa.String(80)),
        sa.Column("applied_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_bird_delivery_events_message", "bird_delivery_events", ["bird_message_id"]
    )


def downgrade():
    # Explicit operator rollback removes notification metadata only, never orders.
    op.drop_table("bird_delivery_events")
    op.drop_table("notification_attempts")
    op.drop_table("order_notifications")
