from dataclasses import dataclass
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import engine, get_db
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.delivery_areas.model import DeliveryArea
from app.features.products.model import Product, ProductVariant
from app.main import app
from app.constants.products import DEFAULT_VARIANT_NAME


@dataclass(frozen=True)
class TestCatalog:
    delivery_area_id: int
    variant_id: int


@pytest.fixture()
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
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
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture()
def catalog(db_session) -> TestCatalog:
    category = Category(
        name_ar="Test Category AR",
        name_en="Test Category EN",
    )
    brand = Brand(
        name_ar="Test Brand AR",
        name_en="Test Brand EN",
    )
    delivery_area = DeliveryArea(
        name_ar="Test Area AR",
        name_en="Test Area EN",
        delivery_fee=Decimal("5.00"),
    )
    db_session.add_all([category, brand, delivery_area])
    db_session.flush()

    product = Product(
        category_id=category.id,
        brand_id=brand.id,
        name_ar="Test Product AR",
        name_en="Test Product EN",
        is_active=True,
    )
    db_session.add(product)
    db_session.flush()

    variant = ProductVariant(
        product_id=product.id,
        name_ar=DEFAULT_VARIANT_NAME,
        name_en=DEFAULT_VARIANT_NAME,
        price=Decimal("10.00"),
        is_active=True,
    )
    db_session.add(variant)
    db_session.commit()

    return TestCatalog(
        delivery_area_id=delivery_area.id,
        variant_id=variant.id,
    )
