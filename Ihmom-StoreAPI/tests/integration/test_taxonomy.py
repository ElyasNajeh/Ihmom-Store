from uuid import uuid4

import pytest

from app.features.brands.model import Brand
from app.features.categories.model import Category


pytestmark = pytest.mark.integration


@pytest.mark.parametrize(
    ("resource", "model"),
    [("categories", Category), ("brands", Brand)],
)
def test_taxonomy_crud_public_visibility_and_admin_listing(
    client, auth_headers, db_session, resource, model
):
    suffix = uuid4().hex[:8]
    payload = {"name_ar": f"اسم {suffix}", "name_en": f"Name {suffix}", "is_active": False}
    created = client.post(f"/{resource}/", headers=auth_headers, json=payload)
    assert created.status_code == 201
    record_id = created.json()["id"]
    assert client.get(f"/{resource}/{record_id}").status_code == 404

    admin_get = client.get(f"/{resource}/admin/{record_id}", headers=auth_headers)
    assert admin_get.status_code == 200
    listing = client.get(
        f"/{resource}/admin/all",
        headers=auth_headers,
        params={"filter[is_active]": "false", "search": suffix},
    )
    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()["items"]] == [record_id]

    updated = client.patch(
        f"/{resource}/{record_id}",
        headers=auth_headers,
        json={"is_active": True, "name_en": f"Updated {suffix}"},
    )
    assert updated.status_code == 200
    assert client.get(f"/{resource}/{record_id}").status_code == 200
    assert client.delete(f"/{resource}/{record_id}", headers=auth_headers).status_code == 204
    assert db_session.get(model, record_id) is None


@pytest.mark.parametrize("resource", ["categories", "brands"])
def test_taxonomy_duplicate_bilingual_names_are_independently_rejected(client, auth_headers, resource):
    suffix = uuid4().hex[:8]
    first = {"name_ar": f"عربي {suffix}", "name_en": f"English {suffix}"}
    assert client.post(f"/{resource}/", headers=auth_headers, json=first).status_code == 201
    ar_conflict = {"name_ar": first["name_ar"], "name_en": f"Other {suffix}"}
    en_conflict = {"name_ar": f"آخر {suffix}", "name_en": first["name_en"]}
    assert client.post(f"/{resource}/", headers=auth_headers, json=ar_conflict).status_code == 409
    assert client.post(f"/{resource}/", headers=auth_headers, json=en_conflict).status_code == 409


@pytest.mark.parametrize("resource", ["categories", "brands"])
def test_taxonomy_search_escapes_sql_wildcards(client, auth_headers, resource):
    suffix = uuid4().hex[:6]
    literal = {"name_ar": f"نسبة {suffix}", "name_en": f"100%_{suffix}"}
    ordinary = {"name_ar": f"عادي {suffix}", "name_en": f"100AB{suffix}"}
    assert client.post(f"/{resource}/", headers=auth_headers, json=literal).status_code == 201
    assert client.post(f"/{resource}/", headers=auth_headers, json=ordinary).status_code == 201
    result = client.get(f"/{resource}/", params={"search": "%_"})
    assert result.status_code == 200
    assert [item["name_en"] for item in result.json()["items"]] == [literal["name_en"]]


@pytest.mark.parametrize("resource", ["categories", "brands"])
def test_taxonomy_query_validation(resource, client):
    assert client.get(f"/{resource}/", params={"page": 0}).status_code == 422
    assert client.get(f"/{resource}/", params={"page_size": 101}).status_code == 422
    assert client.get(f"/{resource}/?page=1&page=2").status_code == 422
    assert client.get(f"/{resource}/?unknown=value").status_code == 422


def test_category_and_brand_cannot_be_deleted_while_product_exists(client, auth_headers, catalog):
    category = client.delete(f"/categories/{catalog.category_id}", headers=auth_headers)
    brand = client.delete(f"/brands/{catalog.brand_id}", headers=auth_headers)
    assert category.status_code == 409
    assert brand.status_code == 409
