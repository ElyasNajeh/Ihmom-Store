"""Retire transient PostgreSQL rate counters after moving enforcement to Redis.

Revision ID: e9c5a2b3d4f6
Revises: d8b4f1a2c3e5
"""

from alembic import op
import sqlalchemy as sa

revision = "e9c5a2b3d4f6"
down_revision = "d8b4f1a2c3e5"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("rate_limit_counters")


def downgrade():
    op.create_table(
        "rate_limit_counters",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("bucket_key", sa.String(128), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "bucket_key", "window_start", name="uq_rate_limit_counters_bucket_window"
        ),
    )
    op.create_index(
        "ix_rate_limit_counters_expires_at", "rate_limit_counters", ["expires_at"]
    )
