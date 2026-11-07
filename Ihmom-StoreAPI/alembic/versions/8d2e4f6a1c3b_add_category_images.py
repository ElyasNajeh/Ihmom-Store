"""add category images

Revision ID: 8d2e4f6a1c3b
Revises: 5f4d3c2b1a09
Create Date: 2026-11-06 23:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d2e4f6a1c3b'
down_revision: Union[str, Sequence[str], None] = '5f4d3c2b1a09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'category_images',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('category_id', sa.BigInteger(), nullable=False),
        sa.Column('image', sa.String(length=500), nullable=False),
        sa.Column(
            'is_primary',
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['category_id'],
            ['categories.id'],
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'uq_category_images_primary_per_category',
        'category_images',
        ['category_id'],
        unique=True,
        postgresql_where=sa.text('is_primary = true'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        'uq_category_images_primary_per_category',
        table_name='category_images',
    )
    op.drop_table('category_images')
