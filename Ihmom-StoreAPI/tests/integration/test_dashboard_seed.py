from copy import deepcopy
from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.db import seed as seed_module
from app.db.seed import seed_static_data
from app.db.seed_data import BRANDS, CATEGORIES, DELIVERY_AREAS, PRODUCTS
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.delivery_areas.model import DeliveryArea
from app.features.products.model import Product, ProductVariant
from tests.helpers import post_checkout


pytestmark = pytest.mark.integration


def _checkout(client, payload):
    response = post_checkout(client, payload)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.parametrize(
    ("period", "granularity", "points"),
    [
        ("day", "hour", 24),
        ("week", "day", 7),
        ("month", "day", 30),
        ("year", "month", 12),
    ],
)
def test_empty_dashboard_period_shapes(client, auth_headers, period, granularity, points):
    response = client.get(
        "/dashboard/stats", headers=auth_headers, params={"period": period}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total_orders"] == 0
    assert Decimal(body["total_order_value"]) == Decimal("0")
    assert body["series_granularity"] == granularity
    assert len(body["series"]) == points
    assert all(point["orders"] == 0 for point in body["series"])


def test_dashboard_counts_revenue_statuses_and_recent_orders(
    client, auth_headers, checkout_payload
):
    first = _checkout(client, checkout_payload)
    second = _checkout(client, checkout_payload)
    listing = client.get("/orders/admin/all", headers=auth_headers).json()["items"]
    by_number = {item["order_number"]: item for item in listing}
    assert client.patch(
        f"/orders/admin/{by_number[first['order_number']]['id']}/status",
        headers=auth_headers,
        json={"status": "confirmed"},
    ).status_code == 200
    assert client.patch(
        f"/orders/admin/{by_number[first['order_number']]['id']}/status",
        headers=auth_headers,
        json={"status": "out_for_delivery"},
    ).status_code == 200
    assert client.patch(
        f"/orders/admin/{by_number[first['order_number']]['id']}/status",
        headers=auth_headers,
        json={"status": "delivered"},
    ).status_code == 200
    assert client.patch(
        f"/orders/admin/{by_number[second['order_number']]['id']}/status",
        headers=auth_headers,
        json={"status": "cancelled"},
    ).status_code == 200

    stats = client.get(
        "/dashboard/stats", headers=auth_headers, params={"period": "all"}
    ).json()
    assert stats["total_orders"] == 2
    assert stats["delivered_orders"] == 1
    assert stats["cancelled_orders"] == 1
    assert Decimal(stats["delivered_revenue"]) == Decimal("25.45")
    assert Decimal(stats["cancelled_order_value"]) == Decimal("25.45")
    assert Decimal(stats["total_order_value"]) == Decimal("50.90")
    assert sum(point["orders"] for point in stats["series"]) == 2
    assert len(stats["recent_orders"]) == 2


def test_dashboard_requires_admin_and_valid_period(client, auth_headers):
    assert client.get("/dashboard/stats").status_code == 401
    assert client.get(
        "/dashboard/stats", headers=auth_headers, params={"period": "quarter"}
    ).status_code == 422


@pytest.mark.integration
def test_seed_populates_empty_database_and_is_idempotent(db_session):
    first = seed_static_data(db_session)
    assert first["categories"]["created"] == len(CATEGORIES)
    assert first["brands"]["created"] == len(BRANDS)
    assert first["delivery areas"]["created"] == len(DELIVERY_AREAS)
    assert first["products"]["created"] == len(PRODUCTS)
    counts = {
        Category: db_session.scalar(select(func.count(Category.id))),
        Brand: db_session.scalar(select(func.count(Brand.id))),
        DeliveryArea: db_session.scalar(select(func.count(DeliveryArea.id))),
        Product: db_session.scalar(select(func.count(Product.id))),
        ProductVariant: db_session.scalar(select(func.count(ProductVariant.id))),
    }
    second = seed_static_data(db_session)
    assert all(value["created"] == 0 for value in second.values())
    assert second["products"]["skipped"] == len(PRODUCTS)
    assert counts == {
        model: db_session.scalar(select(func.count(model.id))) for model in counts
    }


def test_seed_preserves_existing_records(db_session):
    existing = Category(
        name_ar=CATEGORIES[0]["name_ar"],
        name_en=CATEGORIES[0]["name_en"],
        is_active=False,
    )
    db_session.add(existing)
    db_session.commit()
    seed_static_data(db_session)
    db_session.refresh(existing)
    assert existing.is_active is False
    assert db_session.scalar(
        select(func.count(Category.id)).where(Category.name_en == CATEGORIES[0]["name_en"])
    ) == 1


def test_seed_handles_partial_existing_data(db_session):
    existing = Brand(name_ar=BRANDS[0]["name_ar"], name_en=BRANDS[0]["name_en"])
    db_session.add(existing)
    db_session.commit()
    summary = seed_static_data(db_session)
    assert summary["brands"] == {"created": len(BRANDS) - 1, "skipped": 1}
    assert summary["products"]["created"] == len(PRODUCTS)


@pytest.mark.security
def test_seed_failure_is_atomic(db_session, monkeypatch):
    malformed = deepcopy(PRODUCTS[0])
    malformed["name_en"] = "Broken reference product"
    malformed["category"] = "Category that does not exist"
    monkeypatch.setattr(seed_module, "PRODUCTS", [malformed])
    with pytest.raises(KeyError):
        seed_static_data(db_session)
    db_session.rollback()
    # A failed initialization should not leave a partially seeded database.
    assert db_session.scalar(select(func.count(Category.id))) == 0
    assert db_session.scalar(select(func.count(Brand.id))) == 0
    assert db_session.scalar(select(func.count(DeliveryArea.id))) == 0
