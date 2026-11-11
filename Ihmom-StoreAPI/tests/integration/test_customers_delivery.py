from decimal import Decimal

import pytest
from sqlalchemy import select

from app.features.customers.model import Customer


pytestmark = pytest.mark.integration


def test_customer_crud_normalizes_phone_and_rejects_duplicates(
    client, auth_headers, db_session
):
    response = client.post(
        "/customers/",
        headers=auth_headers,
        json={"name": "  Lina Ahmad  ", "phone": "970599123456"},
    )
    assert response.status_code == 201, response.text
    customer = response.json()
    assert customer["name"] == "Lina Ahmad"
    assert customer["phone"] == "+970599123456"
    assert db_session.scalar(select(Customer).where(Customer.id == customer["id"])).phone == "+970599123456"

    duplicate = client.post(
        "/customers/",
        headers=auth_headers,
        json={"name": "Other", "phone": "970599123456"},
    )
    assert duplicate.status_code == 409
    assert client.get(f"/customers/{customer['id']}", headers=auth_headers).status_code == 200
    updated = client.patch(
        f"/customers/{customer['id']}",
        headers=auth_headers,
        json={"name": "ليان أحمد"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "ليان أحمد"
    assert client.delete(f"/customers/{customer['id']}", headers=auth_headers).status_code == 204
    assert client.get(f"/customers/{customer['id']}", headers=auth_headers).status_code == 404


@pytest.mark.parametrize(
    "payload",
    [
        {"name": " ", "phone": "0599123456"},
        {"name": "Name", "phone": "123"},
        {"name": "Name", "phone": "0599123456", "extra": True},
    ],
)
def test_customer_validation(client, auth_headers, payload):
    assert client.post("/customers/", headers=auth_headers, json=payload).status_code == 422


def test_customer_search_pagination_and_auth(client, auth_headers):
    assert client.get("/customers/").status_code == 401
    for index in range(3):
        client.post(
            "/customers/",
            headers=auth_headers,
            json={"name": f"Literal%_{index}", "phone": f"05990000{index:02d}"},
        )
    result = client.get(
        "/customers/", headers=auth_headers, params={"search": "%_", "page_size": 2}
    )
    assert result.status_code == 200
    assert result.json()["total"] == 3
    assert len(result.json()["items"]) == 2
    assert client.get("/customers/?page_size=101", headers=auth_headers).status_code == 422


def test_delivery_area_public_projection_crud_filters(client, auth_headers):
    created = client.post(
        "/delivery-areas/",
        headers=auth_headers,
        json={
            "name_ar": "منطقة الاختبار",
            "name_en": "Test area",
            "delivery_fee": "7.35",
            "is_active": False,
        },
    )
    assert created.status_code == 201, created.text
    area = created.json()
    assert client.get(f"/delivery-areas/{area['id']}").status_code == 404
    admin_view = client.get(f"/delivery-areas/admin/{area['id']}", headers=auth_headers)
    assert admin_view.status_code == 200
    assert admin_view.json()["is_active"] is False

    activated = client.patch(
        f"/delivery-areas/{area['id']}", headers=auth_headers, json={"is_active": True}
    )
    assert activated.status_code == 200
    public = client.get(f"/delivery-areas/{area['id']}")
    assert public.status_code == 200
    assert "is_active" not in public.json()
    assert Decimal(public.json()["delivery_fee"]) == Decimal("7.35")
    filtered = client.get(
        "/delivery-areas/admin/all",
        headers=auth_headers,
        params={"filter[min_delivery_fee]": "7", "filter[max_delivery_fee]": "8"},
    )
    assert filtered.status_code == 200
    assert area["id"] in {item["id"] for item in filtered.json()["items"]}
    assert client.delete(f"/delivery-areas/{area['id']}", headers=auth_headers).status_code == 204


@pytest.mark.parametrize(
    "payload",
    [
        {"name_ar": "", "name_en": "Area", "delivery_fee": "1.00"},
        {"name_ar": "منطقة", "name_en": "Area", "delivery_fee": "-0.01"},
        {"name_ar": "منطقة", "name_en": "Area", "delivery_fee": "1.001"},
    ],
)
def test_delivery_area_validation(client, auth_headers, payload):
    assert client.post("/delivery-areas/", headers=auth_headers, json=payload).status_code == 422


def test_delivery_area_duplicate_and_invalid_range(client, auth_headers, catalog):
    existing = client.get(f"/delivery-areas/admin/{catalog.delivery_area_id}", headers=auth_headers).json()
    duplicate = client.post(
        "/delivery-areas/",
        headers=auth_headers,
        json={
            "name_ar": existing["name_ar"],
            "name_en": "Unique name",
            "delivery_fee": "1.00",
        },
    )
    assert duplicate.status_code == 409
    bad_range = client.get(
        "/delivery-areas/",
        params={"filter[min_delivery_fee]": "10", "filter[max_delivery_fee]": "2"},
    )
    assert bad_range.status_code == 422
