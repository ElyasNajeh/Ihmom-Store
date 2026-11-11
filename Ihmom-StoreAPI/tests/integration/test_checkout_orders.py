from copy import deepcopy
from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.features.customers.model import Customer
from app.features.orders import service as order_service
from app.features.orders.model import Order, OrderItem
from tests.helpers import post_checkout


pytestmark = pytest.mark.integration


def _checkout(client, payload):
    response = post_checkout(client, payload)
    assert response.status_code == 201, response.text
    return response.json()


def _admin_order(client, auth_headers, order_number):
    listing = client.get(
        "/orders/admin/all", headers=auth_headers, params={"search": order_number}
    )
    assert listing.status_code == 200, listing.text
    return listing.json()["items"][0]


def test_checkout_calculates_and_persists_server_prices(
    client, checkout_payload, db_session
):
    order = _checkout(client, checkout_payload)
    assert order["status"] == "pending"
    assert Decimal(order["subtotal"]) == Decimal("20.20")
    assert Decimal(order["delivery_fee"]) == Decimal("5.25")
    assert Decimal(order["total"]) == Decimal("25.45")
    assert order["items"][0]["quantity"] == 2
    assert Decimal(order["items"][0]["unit_price"]) == Decimal("10.10")
    assert order["history_access_token"]

    persisted = db_session.scalar(select(Order).where(Order.order_number == order["order_number"]))
    assert persisted is not None
    assert persisted.customer.phone == "+970599123456"
    assert len(persisted.items) == 1


def test_checkout_rejects_client_price_fields_and_malformed_payloads(
    client, checkout_payload
):
    manipulated = deepcopy(checkout_payload)
    manipulated["total"] = "0.01"
    assert post_checkout(client, manipulated).status_code == 422

    cases = []
    empty = deepcopy(checkout_payload)
    empty["items"] = []
    cases.append(empty)
    duplicate = deepcopy(checkout_payload)
    duplicate["items"] = duplicate["items"] * 2
    cases.append(duplicate)
    whitespace = deepcopy(checkout_payload)
    whitespace["address"] = "   "
    cases.append(whitespace)
    for quantity in (0, -1, True, 2.5, "2"):
        invalid = deepcopy(checkout_payload)
        invalid["items"][0]["quantity"] = quantity
        cases.append(invalid)
    for payload in cases:
        assert post_checkout(client, payload).status_code == 422


@pytest.mark.parametrize("field", ["product_variant_id", "delivery_area_id"])
def test_checkout_rejects_missing_catalog_references(client, checkout_payload, field):
    payload = deepcopy(checkout_payload)
    if field == "product_variant_id":
        payload["items"][0][field] = 2147483647
    else:
        payload[field] = 2147483647
    response = post_checkout(client, payload)
    assert response.status_code == 422


def test_checkout_rejects_inactive_area_product_and_variant(
    client, auth_headers, checkout_payload, catalog
):
    assert client.patch(
        f"/delivery-areas/{catalog.delivery_area_id}",
        headers=auth_headers,
        json={"is_active": False},
    ).status_code == 200
    assert post_checkout(client, checkout_payload).status_code == 422

    assert client.patch(
        f"/delivery-areas/{catalog.delivery_area_id}",
        headers=auth_headers,
        json={"is_active": True},
    ).status_code == 200
    assert client.patch(
        f"/products/{catalog.product_id}",
        headers=auth_headers,
        json={"is_active": False},
    ).status_code == 200
    assert post_checkout(client, checkout_payload).status_code == 422


def test_checkout_reuses_customer_but_snapshots_contact_details(
    client, checkout_payload, db_session
):
    first = _checkout(client, checkout_payload)
    second_payload = deepcopy(checkout_payload)
    second_payload["customer_name"] = "Lina New Name"
    second_payload["address"] = "A different address"
    second = _checkout(client, second_payload)
    assert first["order_number"] != second["order_number"]
    assert db_session.scalar(select(func.count(Customer.id))) == 1
    records = db_session.scalars(select(Order).order_by(Order.id)).all()
    assert [record.customer_name for record in records] == ["Lina Ahmad", "Lina New Name"]
    assert records[0].address != records[1].address


@pytest.mark.security
def test_new_idempotency_keys_create_distinct_orders(
    client, checkout_payload, db_session
):
    first = _checkout(client, checkout_payload)
    second = _checkout(client, checkout_payload)
    assert first["order_number"] != second["order_number"]
    assert db_session.scalar(select(func.count(Order.id))) == 2


def test_same_idempotency_key_returns_original_order(client, checkout_payload, db_session):
    key = "6f8db4a4-c1a8-4dd0-984d-a246e84cb58c"
    first_response = post_checkout(client, checkout_payload, key)
    second_response = post_checkout(client, checkout_payload, key)
    assert first_response.status_code == second_response.status_code == 201
    assert first_response.json()["order_number"] == second_response.json()["order_number"]
    assert db_session.scalar(select(func.count(Order.id))) == 1


def test_idempotency_key_rejects_different_payload(client, checkout_payload, db_session):
    key = "b46c2d58-969f-403b-88ea-6a25e46be1b9"
    assert post_checkout(client, checkout_payload, key).status_code == 201
    changed = deepcopy(checkout_payload)
    changed["address"] = "A different delivery address"
    conflict = post_checkout(client, changed, key)
    assert conflict.status_code == 409
    assert db_session.scalar(select(func.count(Order.id))) == 1


def test_checkout_requires_uuid_idempotency_key(client, checkout_payload):
    assert client.post("/orders/checkout", json=checkout_payload).status_code == 422
    assert client.post(
        "/orders/checkout",
        json=checkout_payload,
        headers={"Idempotency-Key": "not-a-uuid"},
    ).status_code == 422


def test_checkout_rolls_back_all_records_on_unexpected_failure(
    client, checkout_payload, db_session, monkeypatch
):
    before = {
        "customers": db_session.scalar(select(func.count(Customer.id))),
        "orders": db_session.scalar(select(func.count(Order.id))),
        "items": db_session.scalar(select(func.count(OrderItem.id))),
    }

    def fail_insert(*args, **kwargs):
        raise RuntimeError("simulated insert failure")

    monkeypatch.setattr(order_service, "_insert_order_with_number_retry", fail_insert)
    response = post_checkout(client, checkout_payload)
    assert response.status_code == 500
    assert db_session.scalar(select(func.count(Customer.id))) == before["customers"]
    assert db_session.scalar(select(func.count(Order.id))) == before["orders"]
    assert db_session.scalar(select(func.count(OrderItem.id))) == before["items"]


def test_admin_order_listing_details_items_and_filters(
    client, auth_headers, checkout_payload, catalog
):
    checkout = _checkout(client, checkout_payload)
    assert client.get("/orders/admin/all").status_code == 401
    listing = client.get(
        "/orders/admin/all",
        headers=auth_headers,
        params={
            "search": f"#{checkout['order_number']}",
            "filter[status]": "pending",
            "filter[delivery_area_id]": catalog.delivery_area_id,
            "filter[min_total]": "25.00",
            "filter[max_total]": "26.00",
        },
    )
    assert listing.status_code == 200, listing.text
    assert listing.json()["total"] == 1
    order = listing.json()["items"][0]
    assert client.get(f"/orders/admin/{order['id']}", headers=auth_headers).status_code == 200
    items = client.get(f"/orders/admin/{order['id']}/items", headers=auth_headers)
    assert items.status_code == 200 and len(items.json()) == 1
    assert client.get("/orders/admin/999999", headers=auth_headers).status_code == 404
    assert client.get(
        "/orders/admin/all?filter[date_from]=2026-12-01&filter[date_to]=2026-01-01",
        headers=auth_headers,
    ).status_code == 422


def test_all_valid_and_invalid_order_status_transitions(
    client, auth_headers, checkout_payload
):
    checkout = _checkout(client, checkout_payload)
    order = _admin_order(client, auth_headers, checkout["order_number"])
    endpoint = f"/orders/admin/{order['id']}/status"
    for status in ("confirmed", "out_for_delivery", "delivered"):
        response = client.patch(endpoint, headers=auth_headers, json={"status": status})
        assert response.status_code == 200, response.text
        assert response.json()["status"] == status
    assert client.patch(endpoint, headers=auth_headers, json={"status": "pending"}).status_code == 409
    assert client.patch(endpoint, headers=auth_headers, json={"status": "cancelled"}).status_code == 409
    assert client.patch(endpoint, headers=auth_headers, json={"status": "bogus"}).status_code == 422
    assert client.patch(endpoint, json={"status": "delivered"}).status_code == 401


@pytest.mark.parametrize("start", ["pending", "confirmed", "out_for_delivery"])
def test_cancellation_from_each_supported_state(client, auth_headers, checkout_payload, start):
    checkout = _checkout(client, checkout_payload)
    order = _admin_order(client, auth_headers, checkout["order_number"])
    endpoint = f"/orders/admin/{order['id']}/status"
    if start in {"confirmed", "out_for_delivery"}:
        assert client.patch(endpoint, headers=auth_headers, json={"status": "confirmed"}).status_code == 200
    if start == "out_for_delivery":
        assert client.patch(endpoint, headers=auth_headers, json={"status": "out_for_delivery"}).status_code == 200
    cancelled = client.patch(endpoint, headers=auth_headers, json={"status": "cancelled"})
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"


def test_order_prices_and_names_are_historical_snapshots(
    client, auth_headers, checkout_payload, catalog
):
    checkout = _checkout(client, checkout_payload)
    assert client.patch(
        f"/products/{catalog.product_id}/variants/{catalog.variant_id}",
        headers=auth_headers,
        json={"price": "99.99"},
    ).status_code == 200
    assert client.patch(
        f"/products/{catalog.product_id}",
        headers=auth_headers,
        json={"name_en": "Renamed after checkout"},
    ).status_code == 200
    order = _admin_order(client, auth_headers, checkout["order_number"])
    assert Decimal(order["items"][0]["unit_price"]) == Decimal("10.10")
    assert order["items"][0]["product_name_en"] != "Renamed after checkout"


def test_referenced_catalog_records_cannot_be_deleted(
    client, auth_headers, checkout_payload, catalog
):
    _checkout(client, checkout_payload)
    assert client.delete(
        f"/products/{catalog.product_id}/variants/{catalog.variant_id}", headers=auth_headers
    ).status_code == 409
    assert client.delete(f"/products/{catalog.product_id}", headers=auth_headers).status_code == 409
    assert client.delete(
        f"/delivery-areas/{catalog.delivery_area_id}", headers=auth_headers
    ).status_code == 409
