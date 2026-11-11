"""add admin sessions, checkout idempotency, and order item snapshots

Revision ID: c7a9e2b4d6f8
Revises: 8d2e4f6a1c3b
Create Date: 2026-11-11 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7a9e2b4d6f8"
down_revision: Union[str, Sequence[str], None] = "8d2e4f6a1c3b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_sessions",
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("admin_id", sa.BigInteger(), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["admin_id"], ["admins.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("session_id"),
    )
    op.create_index("ix_admin_sessions_admin_id", "admin_sessions", ["admin_id"])
    op.create_index("ix_admin_sessions_expires_at", "admin_sessions", ["expires_at"])
    op.create_index("ix_admin_sessions_revoked_at", "admin_sessions", ["revoked_at"])

    op.add_column("orders", sa.Column("idempotency_key", sa.String(length=36), nullable=True))
    op.add_column("orders", sa.Column("request_fingerprint", sa.String(length=64), nullable=True))
    op.create_index(
        "uq_orders_idempotency_key",
        "orders",
        ["idempotency_key"],
        unique=True,
    )

    op.add_column("order_items", sa.Column("product_name_ar", sa.String(length=200), nullable=True))
    op.add_column("order_items", sa.Column("product_name_en", sa.String(length=200), nullable=True))
    op.add_column("order_items", sa.Column("variant_name_ar", sa.String(length=100), nullable=True))
    op.add_column("order_items", sa.Column("variant_name_en", sa.String(length=100), nullable=True))
    op.execute(
        """
        UPDATE order_items AS oi
        SET product_name_ar = p.name_ar,
            product_name_en = p.name_en,
            variant_name_ar = CASE
                WHEN pv.name_ar = '__default__' AND pv.name_en = '__default__' THEN NULL
                ELSE pv.name_ar
            END,
            variant_name_en = CASE
                WHEN pv.name_ar = '__default__' AND pv.name_en = '__default__' THEN NULL
                ELSE pv.name_en
            END
        FROM product_variants AS pv
        JOIN products AS p ON p.id = pv.product_id
        WHERE oi.product_variant_id = pv.id
        """
    )
    op.alter_column("order_items", "product_name_ar", nullable=False)
    op.alter_column("order_items", "product_name_en", nullable=False)


def downgrade() -> None:
    op.drop_column("order_items", "variant_name_en")
    op.drop_column("order_items", "variant_name_ar")
    op.drop_column("order_items", "product_name_en")
    op.drop_column("order_items", "product_name_ar")
    op.drop_index("uq_orders_idempotency_key", table_name="orders")
    op.drop_column("orders", "request_fingerprint")
    op.drop_column("orders", "idempotency_key")
    op.drop_index("ix_admin_sessions_revoked_at", table_name="admin_sessions")
    op.drop_index("ix_admin_sessions_expires_at", table_name="admin_sessions")
    op.drop_index("ix_admin_sessions_admin_id", table_name="admin_sessions")
    op.drop_table("admin_sessions")
