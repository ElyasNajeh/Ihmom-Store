from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.features.customers.model import Customer
from app.features.orders.model import Order, OrderItem
from tests.helpers import post_checkout


pytestmark = pytest.mark.e2e


def test_admin_catalog_management_session_flow(client, admin, png_bytes):
    login = client.post(
        "/auth/login",
        json={"username": admin.username, "password": admin.plain_password},
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/auth/me", headers=headers).status_code == 200
    suffix = uuid4().hex[:8]
    category = client.post(
        "/categories/",
        headers=headers,
        json={"name_ar": f"فئة {suffix}", "name_en": f"E2E Category {suffix}"},
    )
    brand = client.post(
        "/brands/",
        headers=headers,
        json={"name_ar": f"علامة {suffix}", "name_en": f"E2E Brand {suffix}"},
    )
    assert category.status_code == brand.status_code == 201
    product = client.post(
        "/products/",
        headers=headers,
        json={
            "category_id": category.json()["id"],
            "brand_id": brand.json()["id"],
            "name_ar": f"منتج {suffix}",
            "name_en": f"E2E Product {suffix}",
            "variants": [
                {"name_ar": "صغير", "name_en": "Small", "sku": f"E2E-S-{suffix}", "price": "12.00"},
                {"name_ar": "كبير", "name_en": "Large", "sku": f"E2E-L-{suffix}", "price": "18.00"},
            ],
        },
    )
    assert product.status_code == 201, product.text
    product_id = product.json()["id"]
    upload = client.post(
        f"/products/{product_id}/images",
        headers=headers,
        files={"files": ("product.png", png_bytes, "image/png")},
    )
    assert upload.status_code == 201
    public = client.get(f"/products/{product_id}")
    assert public.status_code == 200
    assert public.json()["category"]["id"] == category.json()["id"]
    assert public.json()["brand"]["id"] == brand.json()["id"]
    assert len(public.json()["variants"]) == 2
    updated = client.patch(
        f"/products/{product_id}", headers=headers, json={"description_en": "Managed end to end"}
    )
    assert updated.status_code == 200

    refresh = client.post("/auth/refresh")
    assert refresh.status_code == 200
    refreshed_headers = {"Authorization": f"Bearer {refresh.json()['access_token']}"}
    assert client.get("/auth/me", headers=refreshed_headers).status_code == 200
    logout = client.post("/auth/logout")
    assert logout.status_code == 200
    assert client.cookies.get("refresh_token") is None


def test_customer_checkout_history_processing_and_invoice_flow(
    client, auth_headers, checkout_payload
):
    catalog = client.get("/products/")
    assert catalog.status_code == 200
    checkout = post_checkout(client, checkout_payload)
    assert checkout.status_code == 201, checkout.text
    order = checkout.json()
    assert Decimal(order["total"]) == Decimal("25.45")
    history_headers = {"Authorization": f"Bearer {order['history_access_token']}"}
    assert client.get("/orders/history", headers=history_headers).json()["status"] == "pending"

    admin_list = client.get(
        "/orders/admin/all", headers=auth_headers, params={"search": order["order_number"]}
    )
    order_id = admin_list.json()["items"][0]["id"]
    for status in ("confirmed", "out_for_delivery", "delivered"):
        response = client.patch(
            f"/orders/admin/{order_id}/status",
            headers=auth_headers,
            json={"status": status},
        )
        assert response.status_code == 200
    assert client.get("/orders/history", headers=history_headers).json()["status"] == "delivered"
    invoice = client.get(
        f"/orders/admin/{order_id}/invoice?language=en", headers=auth_headers
    )
    assert invoice.status_code == 200
    assert invoice.content.startswith(b"%PDF-")


def test_checkout_error_recovery_has_no_partial_records(
    client, checkout_payload, db_session
):
    baseline = (
        db_session.scalar(select(func.count(Customer.id))),
        db_session.scalar(select(func.count(Order.id))),
        db_session.scalar(select(func.count(OrderItem.id))),
    )
    invalid = dict(checkout_payload)
    invalid["items"] = [{"product_variant_id": 999999999, "quantity": 1}]
    failure = post_checkout(client, invalid)
    assert failure.status_code == 422
    assert baseline == (
        db_session.scalar(select(func.count(Customer.id))),
        db_session.scalar(select(func.count(Order.id))),
        db_session.scalar(select(func.count(OrderItem.id))),
    )
    retry = post_checkout(client, checkout_payload)
    assert retry.status_code == 201
    assert db_session.scalar(select(func.count(Customer.id))) == baseline[0] + 1
    assert db_session.scalar(select(func.count(Order.id))) == baseline[1] + 1
    assert db_session.scalar(select(func.count(OrderItem.id))) == baseline[2] + 1
