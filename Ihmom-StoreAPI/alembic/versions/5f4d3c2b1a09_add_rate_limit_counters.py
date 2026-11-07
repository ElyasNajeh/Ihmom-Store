"""add rate limit counters

Revision ID: 5f4d3c2b1a09
Revises: b870b6c4c78d
Create Date: 2026-11-06 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f4d3c2b1a09'
down_revision: Union[str, Sequence[str], None] = 'b870b6c4c78d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'rate_limit_counters',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('bucket_key', sa.String(length=128), nullable=False),
        sa.Column('window_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'bucket_key',
            'window_start',
            name='uq_rate_limit_counters_bucket_window',
        ),
    )
    op.create_index(
        'ix_rate_limit_counters_expires_at',
        'rate_limit_counters',
        ['expires_at'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        'ix_rate_limit_counters_expires_at',
        table_name='rate_limit_counters',
    )
    op.drop_table('rate_limit_counters')
