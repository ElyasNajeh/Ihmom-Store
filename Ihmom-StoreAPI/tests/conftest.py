from __future__ import annotations

import os
import shutil
import sys
import tempfile
from dataclasses import dataclass
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool


API_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

DEFAULT_TEST_DATABASE_URL = (
    "postgresql+psycopg2://ihmom_test:ihmom_test_only_password@"
    "127.0.0.1:55432/ihmom_store_test"
)
TEST_DATABASE_URL = os.environ.get(
    "IHMOM_TEST_DATABASE_URL",
    DEFAULT_TEST_DATABASE_URL,
)
TEST_DATABASE = make_url(TEST_DATABASE_URL)

if not TEST_DATABASE.database or not TEST_DATABASE.database.lower().endswith("_test"):
    raise RuntimeError(
        "Refusing to run: IHMOM_TEST_DATABASE_URL must name a database ending in '_test'"
    )

# Override settings before importing any application module. This ensures even
# module-level SQLAlchemy engines can never point at the development database.
os.environ.update(
    {
        "DATABASE_HOST": str(TEST_DATABASE.host or "127.0.0.1"),
        "DATABASE_PORT": str(TEST_DATABASE.port or 5432),
        "DATABASE_USER": str(TEST_DATABASE.username or "ihmom_test"),
        "DATABASE_PASSWORD": str(TEST_DATABASE.password or ""),
        "DATABASE_NAME": TEST_DATABASE.database,
        "APP_NAME": os.environ.get("APP_NAME", "Ihmom Store API Test"),
        "SECRET_KEY": os.environ.get(
            "IHMOM_TEST_SECRET_KEY",
            "test-only-secret-key-that-must-never-be-used-in-production",
        ),
        "CORS_ORIGINS": "http://localhost:5173,https://admin.test.example",
        "COOKIE_SECURE": "false",
        "COOKIE_SAMESITE": "strict",
        "REDIS_URL": "redis://127.0.0.1:57279/15",
    }
)

TEST_UPLOAD_ROOT = Path(tempfile.gettempdir()) / f"ihmom-store-tests-{os.getpid()}"
os.environ["UPLOAD_ROOT"] = str(TEST_UPLOAD_ROOT)

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.features.admins.model import Admin  # noqa: E402
from app.features.brands.model import Brand  # noqa: E402
from app.features.categories.model import Category  # noqa: E402
from app.features.delivery_areas.model import DeliveryArea  # noqa: E402
from app.features.products.model import Product, ProductVariant  # noqa: E402
from app.main import app  # noqa: E402


@dataclass(frozen=True)
class Catalog:
    category_id: int
    brand_id: int
    delivery_area_id: int
    product_id: int
    variant_id: int


def _alembic_config() -> Config:
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(API_ROOT / "alembic"))
    return config


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(TEST_DATABASE_URL, poolclass=NullPool, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            database_name = connection.execute(text("select current_database()")).scalar_one()
            if not database_name.lower().endswith("_test"):
                raise RuntimeError(
                    f"Safety check failed: connected database {database_name!r} is not a test database"
                )
        command.upgrade(_alembic_config(), "head")
        yield engine
    finally:
        engine.dispose()
        shutil.rmtree(TEST_UPLOAD_ROOT, ignore_errors=True)


@pytest.fixture()
def db_session(test_engine):
    connection = test_engine.connect()
    outer_transaction = connection.begin()
    session = Session(
        bind=connection,
        autoflush=False,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        yield session
    finally:
        session.close()
        if outer_transaction.is_active:
            outer_transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session, monkeypatch):
    def override_get_db():
        yield db_session

    # The images module caches UPLOAD_ROOT at import time.
    from app.shared import images

    monkeypatch.setattr(images, "UPLOAD_ROOT", TEST_UPLOAD_ROOT)
    from redis import Redis

    redis = Redis.from_url(settings.REDIS_URL)
    redis.flushdb()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    redis.flushdb()
    redis.close()


@pytest.fixture()
def admin(db_session) -> Admin:
    password = "Test-password-123!"
    record = Admin(
        username=f"admin-{uuid4().hex[:12]}",
        email=f"{uuid4().hex}@example.com",
        hashed_password=hash_password(password),
    )
    db_session.add(record)
    db_session.commit()
    record.plain_password = password
    return record


@pytest.fixture()
def auth_headers(client, admin) -> dict[str, str]:
    response = client.post(
        "/auth/login",
        json={"username": admin.username, "password": admin.plain_password},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture()
def catalog(db_session) -> Catalog:
    suffix = uuid4().hex[:10]
    category = Category(name_ar=f"فئة {suffix}", name_en=f"Category {suffix}")
    brand = Brand(name_ar=f"علامة {suffix}", name_en=f"Brand {suffix}")
    area = DeliveryArea(
        name_ar=f"منطقة {suffix}",
        name_en=f"Area {suffix}",
        delivery_fee=Decimal("5.25"),
    )
    db_session.add_all([category, brand, area])
    db_session.flush()
    product = Product(
        category_id=category.id,
        brand_id=brand.id,
        name_ar=f"منتج {suffix}",
        name_en=f"Product {suffix}",
        is_active=True,
    )
    db_session.add(product)
    db_session.flush()
    variant = ProductVariant(
        product_id=product.id,
        name_ar="__default__",
        name_en="__default__",
        sku=f"SKU-{suffix}",
        price=Decimal("10.10"),
        is_active=True,
    )
    db_session.add(variant)
    db_session.commit()
    return Catalog(category.id, brand.id, area.id, product.id, variant.id)


@pytest.fixture()
def png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGBA", (32, 24), (120, 30, 200, 255)).save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture()
def checkout_payload(catalog) -> dict:
    return {
        "customer_name": "Lina Ahmad",
        "customer_phone": "0599123456",
        "delivery_area_id": catalog.delivery_area_id,
        "address": "Nablus, Main Street",
        "notes": "Call on arrival",
        "items": [{"product_variant_id": catalog.variant_id, "quantity": 2}],
    }
