from uuid import uuid4

import pytest

from app.constants.products import DEFAULT_VARIANT_NAME
from app.features.products.model import Product, ProductVariant


pytestmark = pytest.mark.integration


def simple_payload(catalog, suffix: str, **overrides):
    payload = {
        "category_id": catalog.category_id,
        "brand_id": catalog.brand_id,
        "name_ar": f"منتج بسيط {suffix}",
        "name_en": f"Simple Product {suffix}",
        "description_en": "Description",
        "price": "12.34",
        "sku": f"SIMPLE-{suffix}",
    }
    payload.update(overrides)
    return payload


def variant_payload(catalog, suffix: str, **overrides):
    payload = {
        "category_id": catalog.category_id,
        "brand_id": catalog.brand_id,
        "name_ar": f"منتج خيارات {suffix}",
        "name_en": f"Variant Product {suffix}",
        "variants": [
            {"name_ar": "صغير", "name_en": "Small", "sku": f"VAR-S-{suffix}", "price": "9.99"},
            {"name_ar": "كبير", "name_en": "Large", "sku": f"VAR-L-{suffix}", "price": "19.99"},
        ],
    }
    payload.update(overrides)
    return payload


def test_create_simple_product_internal_default_and_public_projection(client, auth_headers, catalog):
    suffix = uuid4().hex[:8]
    created = client.post("/products/", headers=auth_headers, json=simple_payload(catalog, suffix))
    assert created.status_code == 201, created.text
    admin = created.json()
    assert len(admin["variants"]) == 1
    assert admin["variants"][0]["name_en"] == DEFAULT_VARIANT_NAME
    assert admin["variants"][0]["price"] == "12.34"

    public = client.get(f"/products/{admin['id']}")
    assert public.status_code == 200
    body = public.json()
    assert body["starting_price"] == "12.34"
    assert body["has_selectable_variants"] is False
    assert "name_en" not in body["variants"][0]
    assert "sku" not in body["variants"][0]


def test_create_multivariant_product_and_price_filter(client, auth_headers, catalog):
    suffix = uuid4().hex[:8]
    created = client.post("/products/", headers=auth_headers, json=variant_payload(catalog, suffix))
    assert created.status_code == 201, created.text
    product_id = created.json()["id"]
    public = client.get(f"/products/{product_id}")
    assert public.status_code == 200
    assert public.json()["has_selectable_variants"] is True
    assert public.json()["starting_price"] == "9.99"
    listing = client.get(
        "/products/",
        params={"filter[min_price]": "19.00", "filter[max_price]": "20.00", "ids": product_id},
    )
    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()["items"]] == [product_id]


def test_product_invalid_relations_and_duplicate_skus(client, auth_headers, catalog):
    suffix = uuid4().hex[:8]
    missing_category = simple_payload(catalog, suffix, category_id=9_999_999)
    assert client.post("/products/", headers=auth_headers, json=missing_category).status_code == 404
    first = client.post("/products/", headers=auth_headers, json=simple_payload(catalog, suffix))
    assert first.status_code == 201
    duplicate = simple_payload(catalog, uuid4().hex[:8], sku=f"SIMPLE-{suffix}")
    assert client.post("/products/", headers=auth_headers, json=duplicate).status_code == 409


def test_product_update_relationship_and_visibility(client, auth_headers, catalog, db_session):
    response = client.patch(
        f"/products/{catalog.product_id}",
        headers=auth_headers,
        json={"name_en": "Updated Product", "description_en": "  ", "is_active": False},
    )
    assert response.status_code == 200
    assert response.json()["description_en"] is None
    assert client.get(f"/products/{catalog.product_id}").status_code == 404
    admin = client.get(f"/products/admin/{catalog.product_id}", headers=auth_headers)
    assert admin.status_code == 200
    assert admin.json()["name_en"] == "Updated Product"
    assert db_session.get(Product, catalog.product_id).is_active is False


def test_public_visibility_requires_active_product_category_brand_and_variant(
    client, catalog, db_session
):
    assert client.get(f"/products/{catalog.product_id}").status_code == 200
    variant = db_session.get(ProductVariant, catalog.variant_id)
    variant.is_active = False
    db_session.commit()
    assert client.get(f"/products/{catalog.product_id}").status_code == 404


def test_variant_crud_and_active_product_invariant(client, auth_headers, catalog, db_session):
    suffix = uuid4().hex[:8]
    created = client.post(
        f"/products/{catalog.product_id}/variants",
        headers=auth_headers,
        json={"name_ar": "أحمر", "name_en": "Red", "sku": f"RED-{suffix}", "price": "15.00"},
    )
    assert created.status_code == 201, created.text
    variant_id = created.json()["id"]
    variants = client.get(f"/products/{catalog.product_id}/variants", headers=auth_headers).json()
    assert [item["id"] for item in variants] == [variant_id]
    assert db_session.get(ProductVariant, catalog.variant_id) is None

    update = client.patch(
        f"/products/{catalog.product_id}/variants/{variant_id}",
        headers=auth_headers,
        json={"price": "16.50", "sku": None},
    )
    assert update.status_code == 200
    assert update.json()["price"] == "16.50"
    assert update.json()["sku"] is None

    deactivate = client.patch(
        f"/products/{catalog.product_id}/variants/{variant_id}",
        headers=auth_headers,
        json={"is_active": False},
    )
    assert deactivate.status_code == 409
    delete = client.delete(
        f"/products/{catalog.product_id}/variants/{variant_id}", headers=auth_headers
    )
    assert delete.status_code == 409


def test_variant_relation_idor_is_blocked(client, auth_headers, catalog):
    suffix = uuid4().hex[:8]
    other = client.post("/products/", headers=auth_headers, json=simple_payload(catalog, suffix)).json()
    other_variant = other["variants"][0]["id"]
    update = client.patch(
        f"/products/{catalog.product_id}/variants/{other_variant}",
        headers=auth_headers,
        json={"price": "1.00"},
    )
    delete = client.delete(
        f"/products/{catalog.product_id}/variants/{other_variant}", headers=auth_headers
    )
    assert update.status_code == 404
    assert delete.status_code == 404


def test_product_search_pagination_sort_and_repeated_ids(client, auth_headers, catalog):
    created_ids = []
    for index, price in enumerate(("30.00", "10.00", "20.00")):
        suffix = f"{uuid4().hex[:6]}-{index}"
        response = client.post(
            "/products/",
            headers=auth_headers,
            json=simple_payload(catalog, suffix, name_en=f"Audit Match {index}", price=price),
        )
        created_ids.append(response.json()["id"])
    listing = client.get(
        "/products/",
        params=[("search", "Audit Match"), ("sort_by", "price"), ("order", "asc"), ("page_size", "2")],
    )
    assert listing.status_code == 200
    assert [item["starting_price"] for item in listing.json()["items"]] == ["10.00", "20.00"]
    by_ids = client.get(
        "/products/",
        params=[("ids", str(created_ids[0])), ("ids", str(created_ids[2]))],
    )
    assert by_ids.status_code == 200
    assert {item["id"] for item in by_ids.json()["items"]} == {created_ids[0], created_ids[2]}


@pytest.mark.security
def test_sql_injection_search_is_data_not_sql(client):
    response = client.get("/products/", params={"search": "' OR 1=1 --"})
    assert response.status_code == 200
    assert response.json()["items"] == []


def test_recommendations_exclude_source_and_prioritize_same_category(client, auth_headers, catalog):
    suffix = uuid4().hex[:8]
    created = client.post("/products/", headers=auth_headers, json=simple_payload(catalog, suffix)).json()
    response = client.get(f"/products/{catalog.product_id}/recommendations", params={"limit": 1})
    assert response.status_code == 200
    assert response.json()[0]["id"] == created["id"]
    assert response.json()[0]["id"] != catalog.product_id


def test_authenticated_storefront_product_response_keeps_public_contract(
    client, auth_headers, catalog
):
    """Frontend public calls share the admin Axios token and require public fields."""
    response = client.get(
        "/products/",
        headers=auth_headers,
        params={"filter[is_active]": "true", "ids": catalog.product_id},
    )
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert "starting_price" in item
    assert "has_selectable_variants" in item
    assert "sku" not in item["variants"][0]


def test_dedicated_admin_product_routes_include_inactive_products(
    client, auth_headers, catalog
):
    assert client.patch(
        f"/products/{catalog.product_id}",
        headers=auth_headers,
        json={"is_active": False},
    ).status_code == 200
    assert client.get(
        f"/products/{catalog.product_id}", headers=auth_headers
    ).status_code == 404
    admin = client.get(
        f"/products/admin/{catalog.product_id}", headers=auth_headers
    )
    assert admin.status_code == 200
    assert admin.json()["is_active"] is False
    listing = client.get(
        "/products/admin/all",
        headers=auth_headers,
        params={"filter[is_active]": "false"},
    )
    assert listing.status_code == 200
    assert catalog.product_id in {item["id"] for item in listing.json()["items"]}


def test_product_query_rejects_invalid_ranges_unknown_fields_and_too_many_ids(client):
    assert client.get("/products/", params={"filter[min_price]": 10, "filter[max_price]": 1}).status_code == 422
    assert client.get("/products/?unknown=x").status_code == 422
    response = client.get("/products/", params=[("ids", str(i)) for i in range(1, 102)])
    assert response.status_code == 422
