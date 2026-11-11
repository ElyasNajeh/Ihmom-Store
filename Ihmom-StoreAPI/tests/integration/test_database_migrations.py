from decimal import Decimal
from uuid import uuid4

import psycopg2
import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from psycopg2 import sql
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db.base import Base
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.orders.model import OrderItem
from app.features.products.model import ProductVariant
from tests.conftest import API_ROOT, TEST_DATABASE


pytestmark = [pytest.mark.integration, pytest.mark.migration]


def _config() -> Config:
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(API_ROOT / "alembic"))
    return config


def _admin_connection(database="postgres"):
    return psycopg2.connect(
        host=TEST_DATABASE.host,
        port=TEST_DATABASE.port,
        user=TEST_DATABASE.username,
        password=TEST_DATABASE.password,
        dbname=database,
    )


def test_migrated_schema_matches_sqlalchemy_metadata(test_engine):
    with test_engine.connect() as connection:
        context = MigrationContext.configure(
            connection,
            opts={
                "compare_type": True,
                "compare_server_default": True,
                "include_object": lambda obj, name, type_, reflected, compare_to: not (
                    type_ == "table" and name == "category_image_migration_archive"
                ),
            },
        )
        differences = compare_metadata(context, Base.metadata)
    assert differences == []


def test_expected_constraints_are_present(test_engine):
    inspector = inspect(test_engine)
    assert {fk["referred_table"] for fk in inspector.get_foreign_keys("orders")} == {
        "customers",
        "delivery_areas",
    }
    assert any(
        item["column_names"] == ["sku"]
        for item in inspector.get_unique_constraints("product_variants")
    )
    assert any(
        item["name"] == "ck_order_items_quantity_positive"
        for item in inspector.get_check_constraints("order_items")
    )
    assert inspector.get_columns("orders")[0]["nullable"] is False


def test_unique_foreign_key_and_check_constraints_enforced(db_session, catalog):
    db_session.add(Category(name_ar="Unique Arabic", name_en="Duplicate English"))
    db_session.commit()
    db_session.add(Category(name_ar="Other Arabic", name_en="Duplicate English"))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(
        ProductVariant(
            product_id=999999999,
            name_ar="Missing",
            name_en="Missing",
            sku=f"FK-{uuid4().hex}",
            price=Decimal("1.00"),
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(
        OrderItem(
            order_id=999999999,
            product_variant_id=catalog.variant_id,
            product_name_ar="Snapshot",
            product_name_en="Snapshot",
            quantity=0,
            unit_price=Decimal("1.00"),
            total=Decimal("0.00"),
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_transaction_rollback_removes_uncommitted_rows(db_session):
    marker = f"Rollback-{uuid4().hex}"
    db_session.add(Brand(name_ar=marker, name_en=marker))
    db_session.flush()
    assert db_session.scalar(select(Brand).where(Brand.name_en == marker)) is not None
    db_session.rollback()
    assert db_session.scalar(select(Brand).where(Brand.name_en == marker)) is None


def test_migrations_upgrade_and_downgrade_disposable_database(monkeypatch):
    database_name = f"ihmom_migration_{uuid4().hex[:10]}_test"
    assert database_name.endswith("_test")
    admin = _admin_connection()
    admin.autocommit = True
    try:
        with admin.cursor() as cursor:
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
            )
        monkeypatch.setattr(settings, "DATABASE_NAME", database_name)
        command.upgrade(_config(), "c7a9e2b4d6f8")
        engine = create_engine(settings.DATABASE_URL, poolclass=NullPool)
        try:
            with engine.begin() as connection:
                connection.execute(
                    text("""
                    INSERT INTO categories (id, name_ar, name_en, is_active, created_at) VALUES
                        (9001, 'Primary', 'Primary', true, now()),
                        (9002, 'Fallback', 'Fallback', true, now()),
                        (9003, 'Empty', 'Empty', true, now());
                    INSERT INTO category_images (id, category_id, image, is_primary, created_at) VALUES
                        (9101, 9001, '/uploads/categories/old.webp', false, now() - interval '2 days'),
                        (9102, 9001, '/uploads/categories/primary.webp', true, now()),
                        (9103, 9002, '/uploads/categories/first.webp', false, now() - interval '1 day'),
                        (9104, 9002, '/uploads/categories/last.webp', false, now());
                    INSERT INTO rate_limit_counters (bucket_key, window_start, count, expires_at)
                        VALUES ('test-only', now(), 1, now() + interval '1 minute');
                """)
                )
        finally:
            engine.dispose()
        command.upgrade(_config(), "head")
        engine = create_engine(settings.DATABASE_URL, poolclass=NullPool)
        try:
            assert "orders" in inspect(engine).get_table_names()
            assert "rate_limit_counters" not in inspect(engine).get_table_names()
            assert "category_images" not in inspect(engine).get_table_names()
            assert "image" in {
                c["name"] for c in inspect(engine).get_columns("categories")
            }
            with engine.connect() as connection:
                images = dict(
                    connection.execute(text("SELECT id, image FROM categories")).all()
                )
                assert images == {
                    9001: "/uploads/categories/primary.webp",
                    9002: "/uploads/categories/first.webp",
                    9003: None,
                }
                assert (
                    connection.scalar(
                        text("SELECT count(*) FROM category_image_migration_archive")
                    )
                    == 4
                )
        finally:
            engine.dispose()
        command.downgrade(_config(), "c7a9e2b4d6f8")
        engine = create_engine(settings.DATABASE_URL, poolclass=NullPool)
        try:
            with engine.connect() as connection:
                assert (
                    connection.scalar(text("SELECT count(*) FROM category_images")) == 4
                )
                assert (
                    connection.scalar(
                        text("SELECT image FROM category_images WHERE id=9102")
                    )
                    == "/uploads/categories/primary.webp"
                )
            assert "rate_limit_counters" in inspect(engine).get_table_names()
        finally:
            engine.dispose()
        command.upgrade(_config(), "head")
        command.downgrade(_config(), "base")
        engine = create_engine(settings.DATABASE_URL, poolclass=NullPool)
        try:
            assert inspect(engine).get_table_names() == ["alembic_version"]
        finally:
            engine.dispose()
    finally:
        with admin.cursor() as cursor:
            cursor.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s",
                (database_name,),
            )
            cursor.execute(
                sql.SQL("DROP DATABASE IF EXISTS {}").format(
                    sql.Identifier(database_name)
                )
            )
        admin.close()


def test_migration_chain_has_one_head_and_no_orphans():
    from alembic.script import ScriptDirectory

    scripts = ScriptDirectory.from_config(_config())
    assert len(scripts.get_heads()) == 1
    revisions = list(scripts.walk_revisions())
    assert len(revisions) == 6
    assert revisions[-1].down_revision is None
