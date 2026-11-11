"""Store one category image, archiving legacy associations before removal.

Revision ID: d8b4f1a2c3e5
Revises: c7a9e2b4d6f8
"""

from alembic import op
import sqlalchemy as sa

revision = "d8b4f1a2c3e5"
down_revision = "c7a9e2b4d6f8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("categories", sa.Column("image", sa.String(500), nullable=True))
    op.execute("LOCK TABLE category_images IN ACCESS EXCLUSIVE MODE")
    # Migration-owned archive: no application model, relationship or API.
    op.create_table(
        "category_image_migration_archive",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=False),
        sa.Column("category_id", sa.BigInteger(), nullable=False),
        sa.Column("image", sa.String(500), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute("""
        INSERT INTO category_image_migration_archive
            (id, category_id, image, is_primary, created_at)
        SELECT id, category_id, image, is_primary, created_at FROM category_images
    """)
    op.execute("""
        UPDATE categories AS c SET image = chosen.image
        FROM (
            SELECT DISTINCT ON (category_id) category_id, image
            FROM category_images
            ORDER BY category_id, is_primary DESC, created_at ASC, id ASC
        ) AS chosen WHERE c.id = chosen.category_id
    """)
    op.drop_table("category_images")


def downgrade():
    op.create_table(
        "category_images",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "category_id",
            sa.BigInteger(),
            sa.ForeignKey("categories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("image", sa.String(500), nullable=False),
        sa.Column(
            "is_primary", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute("""
        INSERT INTO category_images (id, category_id, image, is_primary, created_at)
        SELECT a.id, a.category_id, a.image, false, a.created_at
        FROM category_image_migration_archive a
        JOIN categories c ON c.id = a.category_id
        WHERE c.image IS NOT NULL
    """)
    op.execute("""
        SELECT setval(pg_get_serial_sequence('category_images', 'id'),
                      COALESCE((SELECT max(id) FROM category_images), 0) + 1, false)
    """)
    op.execute("""
        UPDATE category_images AS i SET is_primary = true
        FROM (
            SELECT DISTINCT ON (i.category_id) i.id
            FROM category_images i JOIN categories c ON c.id = i.category_id
            WHERE i.image = c.image ORDER BY i.category_id, i.id
        ) chosen WHERE i.id = chosen.id
    """)
    # Include new/replaced images created since upgrade.
    op.execute("""
        INSERT INTO category_images (category_id, image, is_primary, created_at)
        SELECT c.id, c.image, true, now() FROM categories c
        WHERE c.image IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM category_images i WHERE i.category_id = c.id AND i.is_primary
        )
    """)
    op.create_index(
        "uq_category_images_primary_per_category",
        "category_images",
        ["category_id"],
        unique=True,
        postgresql_where=sa.text("is_primary = true"),
    )
    op.drop_table("category_image_migration_archive")
    op.drop_column("categories", "image")
