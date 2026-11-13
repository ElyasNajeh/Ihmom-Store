from datetime import datetime, timezone
from decimal import Decimal
from hashlib import md5
from uuid import uuid4

import pytest

from app.constants.products import DEFAULT_VARIANT_NAME
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.products import service
from app.features.products.model import Product, ProductVariant
from app.features.products.schema import PublicProductQuery


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


RANDOM_SEEDS = ("0123456789abcdef0123456789abcdef", "fedcba9876543210fedcba9876543210")


@pytest.fixture()
def randomized_catalog(db_session, catalog):
    suffix = uuid4().hex
    category = Category(name_ar=suffix, name_en=suffix)
    brand = Brand(name_ar=suffix, name_en=suffix)
    db_session.add_all([category, brand])
    db_session.flush()
    products = []
    for index in range(12):
        product = Product(
            category_id=catalog.category_id if index % 2 else category.id,
            brand_id=catalog.brand_id if index % 3 else brand.id,
            name_ar=f"Random {index:02} {suffix}",
            name_en=f"Random {index:02} {suffix}",
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
            is_active=index != 10,
        )
        db_session.add(product)
        db_session.flush()
        db_session.add(ProductVariant(
            product_id=product.id,
            name_ar=DEFAULT_VARIANT_NAME,
            name_en=DEFAULT_VARIANT_NAME,
            price=Decimal(index // 2 + 1),
            is_active=index != 11,
        ))
        products.append(product)
    db_session.commit()
    return products


def hash_order(ids, seed):
    return sorted(ids, key=lambda product_id: (
        md5(f"{seed}:{product_id}".encode()).hexdigest(), product_id,
    ))


def listing_ids(client, **params):
    response = client.get("/products/", params=params)
    assert response.status_code == 200, response.text
    return [item["id"] for item in response.json()["items"]]


def test_randomized_listing_seed_pagination_and_visibility(client, randomized_catalog):
    ids = [product.id for product in randomized_catalog]
    visible_ids = ids[:10]
    orders = []
    for seed in RANDOM_SEEDS:
        params = dict(ids=ids, randomize=True, random_seed=seed, page_size=100)
        ordered = listing_ids(client, **params)
        assert ordered == hash_order(visible_ids, seed)
        assert listing_ids(client, **params) == ordered
        pages = [listing_ids(client, **{**params, "page_size": 5, "page": page})
                 for page in (1, 2)]
        assert not set(pages[0]) & set(pages[1])
        assert pages[0] + pages[1] == ordered
        orders.append(ordered)
    assert orders[0] != orders[1]


@pytest.mark.parametrize("filter_kind", ["category", "brand", "price", "search", "ids", "active"])
def test_randomized_filters_preserve_subset_order(client, catalog, randomized_catalog, filter_kind):
    products = randomized_catalog[:10]
    params = dict(ids=[p.id for p in randomized_catalog], randomize=True,
                  random_seed=RANDOM_SEEDS[0], page_size=100)
    ordered = listing_ids(client, **params)
    if filter_kind == "category":
        params["filter[category_id]"] = catalog.category_id
        expected = {p.id for p in products if p.category_id == catalog.category_id}
    elif filter_kind == "brand":
        params["filter[brand_id]"] = catalog.brand_id
        expected = {p.id for p in products if p.brand_id == catalog.brand_id}
    elif filter_kind == "price":
        params.update({"filter[min_price]": "2", "filter[max_price]": "3"})
        expected = {p.id for p in products[2:6]}
    elif filter_kind == "search":
        params["search"] = "Random 03"
        expected = {products[3].id}
    elif filter_kind == "ids":
        params["ids"] = [p.id for p in products[::2]]
        expected = set(params["ids"])
    else:
        # Public visibility must remain active-only even with this legacy filter.
        params["filter[is_active]"] = False
        expected = {p.id for p in products}
    assert listing_ids(client, **params) == [i for i in ordered if i in expected]


@pytest.mark.parametrize("sort_by", ["id", "created_at", "name_ar", "name_en", "price"])
@pytest.mark.parametrize("order", ["asc", "desc"])
def test_randomization_disabled_preserves_exact_sort(client, randomized_catalog, sort_by, order):
    products = randomized_catalog[:10]
    ids = [p.id for p in randomized_catalog]
    params = dict(ids=ids, sort_by=sort_by, order=order, page_size=100)
    baseline = listing_ids(client, **params)
    key = {
        "id": lambda p: p.id,
        "created_at": lambda p: p.created_at,
        "name_ar": lambda p: p.name_ar,
        "name_en": lambda p: p.name_en,
        "price": lambda p: Decimal(products.index(p) // 2 + 1),
    }[sort_by]
    expected = sorted(products, key=lambda p: (key(p), p.id), reverse=order == "desc")
    assert baseline == [p.id for p in expected]
    assert listing_ids(client, **params, randomize=False) == baseline
    assert listing_ids(client, **params, randomize=False, random_seed=RANDOM_SEEDS[0]) == baseline
    assert listing_ids(client, **params, random_seed=RANDOM_SEEDS[1]) == baseline


@pytest.mark.parametrize("params", [
    {"randomize": "true"},
    {"randomize": "invalid", "random_seed": RANDOM_SEEDS[0]},
    *[{"randomize": enabled, "random_seed": seed}
      for enabled in ("true", "false")
      for seed in ("", "a" * 31, "a" * 33, "A" * 32, "g" * 32,
                   " " + RANDOM_SEEDS[0], RANDOM_SEEDS[0] + "\n", "' OR 1=1 --")],
])
def test_randomization_rejects_invalid_or_missing_seed(client, catalog, params):
    for path in ("/products/", f"/products/{catalog.product_id}/recommendations"):
        assert client.get(path, params=params).status_code == 422


@pytest.mark.parametrize("params", [
    {"randomize": "false"}, {"randomize": "true", "random_seed": RANDOM_SEEDS[0]},
    {"random_seed": RANDOM_SEEDS[0]},
])
def test_admin_rejects_public_randomization(client, auth_headers, params):
    response = client.get("/products/admin/all", headers=auth_headers, params=params)
    assert response.status_code == 422


def test_admin_service_ignores_public_randomization(db_session, randomized_catalog):
    ids = [p.id for p in randomized_catalog]
    query = PublicProductQuery(ids=ids, sort_by="id", order="desc", page_size=100,
                               randomize=True, random_seed=RANDOM_SEEDS[0])
    result = service.get_products_shared(db_session, query, is_admin=True)
    assert [p.id for p in result["items"]] == sorted(ids, reverse=True)


def test_randomized_recommendations_keep_category_priority(
    client, catalog, randomized_catalog, db_session,
):
    path = f"/products/{catalog.product_id}/recommendations"
    visible = listing_ids(client, page_size=100)
    candidates = [db_session.get(Product, i) for i in visible if i != catalog.product_id]
    baseline = client.get(path, params={"limit": 20})
    assert baseline.status_code == 200
    expected_old = sorted(candidates, key=lambda p: (
        p.category_id == catalog.category_id, p.created_at, p.id,
    ), reverse=True)[:20]
    assert [p["id"] for p in baseline.json()] == [p.id for p in expected_old]
    disabled = client.get(path, params={"limit": 20, "randomize": False,
                                       "random_seed": RANDOM_SEEDS[0]})
    assert disabled.json() == baseline.json()
    orders = []
    for seed in RANDOM_SEEDS:
        params = {"limit": 20, "randomize": True, "random_seed": seed}
        response = client.get(path, params=params)
        assert response.status_code == 200, response.text
        expected = sorted(candidates, key=lambda p: (
            p.category_id != catalog.category_id,
            md5(f"{seed}:{p.id}".encode()).hexdigest(), p.id,
        ))[:20]
        ordered = [p["id"] for p in response.json()]
        assert ordered == [p.id for p in expected]
        assert client.get(path, params=params).json() == response.json()
        assert client.get(path, params={**params, "limit": 4}).json() == response.json()[:4]
        orders.append(ordered)
    assert orders[0] != orders[1]
