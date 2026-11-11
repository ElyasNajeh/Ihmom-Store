from pathlib import Path
from uuid import UUID

import pytest
from PIL import Image

from tests.conftest import TEST_UPLOAD_ROOT


pytestmark = pytest.mark.integration


def _disk_path(url: str) -> Path:
    return TEST_UPLOAD_ROOT / url.removeprefix("/uploads/")


def test_image_collection_lifecycle(client, auth_headers, catalog, png_bytes):
    owner_id = catalog.product_id
    path = f"/products/{owner_id}/images"
    response = client.post(
        path,
        headers=auth_headers,
        files=[
            ("files", ("first.png", png_bytes, "image/png")),
            ("files", ("second.bin", png_bytes, "application/octet-stream")),
        ],
    )
    assert response.status_code == 201, response.text
    images = response.json()
    assert len(images) == 2
    assert [image["is_primary"] for image in images] == [True, False]
    assert all(image["image"].endswith(".webp") for image in images)
    assert all(UUID(Path(image["image"]).stem) for image in images)
    assert all(_disk_path(image["image"]).is_file() for image in images)
    with Image.open(_disk_path(images[0]["image"])) as saved:
        assert saved.format == "WEBP"
    served = client.get(images[0]["image"])
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/webp"
    assert served.content[:4] == b"RIFF"
    assert served.content[8:12] == b"WEBP"
    assert served.content != png_bytes

    promoted = client.patch(
        f"/products/{owner_id}/images/{images[1]['id']}/set-primary",
        headers=auth_headers,
    )
    assert promoted.status_code == 200
    assert promoted.json()["is_primary"] is True

    old_file = _disk_path(images[1]["image"])
    deleted = client.delete(
        f"/products/{owner_id}/images/{images[1]['id']}", headers=auth_headers
    )
    assert deleted.status_code == 204
    assert not old_file.exists()
    remaining = client.get(path, headers=auth_headers).json()
    assert len(remaining) == 1
    assert remaining[0]["is_primary"] is True


def test_image_upload_rejects_missing_empty_and_corrupt_files(
    client, auth_headers, catalog
):
    owner_id = catalog.product_id
    path = f"/products/{owner_id}/images"
    assert client.post(path, headers=auth_headers).status_code == 422
    for content in (b"", b"not an image"):
        response = client.post(
            path,
            headers=auth_headers,
            files={"files": ("attack.exe", content, "application/x-msdownload")},
        )
        assert response.status_code == 400


def test_image_endpoints_enforce_auth_and_ownership(client, auth_headers, catalog, png_bytes):
    assert client.get(f"/products/{catalog.product_id}/images").status_code == 401
    uploaded = client.post(
        f"/products/{catalog.product_id}/images",
        headers=auth_headers,
        files={"files": ("photo.png", png_bytes, "image/png")},
    ).json()[0]
    other = client.post(
        "/products/",
        headers=auth_headers,
        json={
            "category_id": catalog.category_id,
            "brand_id": catalog.brand_id,
            "name_ar": "منتج آخر",
            "name_en": "Other product",
            "sku": "OTHER-IMAGE",
            "price": "2.00",
        },
    ).json()
    response = client.delete(
        f"/products/{other['id']}/images/{uploaded['id']}", headers=auth_headers
    )
    assert response.status_code == 404
    assert _disk_path(uploaded["image"]).exists()


def test_slider_crud_visibility_replacement_and_cleanup(
    client, auth_headers, png_bytes
):
    created = client.post(
        "/sliders/",
        headers=auth_headers,
        data={
            "title_ar": "عرض تجريبي",
            "title_en": "Test offer",
            "display_order": "7",
            "is_active": "false",
        },
        files={"image": ("offer.png", png_bytes, "image/png")},
    )
    assert created.status_code == 201, created.text
    slider = created.json()
    old_file = _disk_path(slider["image"])
    assert old_file.is_file()
    assert client.get(f"/sliders/{slider['id']}").status_code == 404
    assert client.get(f"/sliders/{slider['id']}", headers=auth_headers).status_code == 200

    updated = client.patch(
        f"/sliders/{slider['id']}",
        headers=auth_headers,
        json={"is_active": True, "title_en": "Updated offer"},
    )
    assert updated.status_code == 200
    assert client.get(f"/sliders/{slider['id']}").json()["title_en"] == "Updated offer"

    replaced = client.patch(
        f"/sliders/{slider['id']}/image",
        headers=auth_headers,
        files={"image": ("replacement.jpg", png_bytes, "image/jpeg")},
    )
    assert replaced.status_code == 200
    new_file = _disk_path(replaced.json()["image"])
    assert new_file.is_file() and new_file != old_file
    assert not old_file.exists()

    assert client.delete(f"/sliders/{slider['id']}", headers=auth_headers).status_code == 204
    assert not new_file.exists()


def test_slider_invalid_upload_and_query_contract(client, auth_headers):
    invalid = client.post(
        "/sliders/",
        headers=auth_headers,
        data={"title_ar": "صورة", "title_en": "Image"},
        files={"image": ("bad.svg", b"<svg/>", "image/svg+xml")},
    )
    assert invalid.status_code == 400
    assert client.get("/sliders/?unexpected=true").status_code == 422


@pytest.mark.security
def test_slider_page_size_is_capped(client):
    # Regression contract: all list endpoints should reject unbounded page sizes.
    assert client.get("/sliders/?page_size=101").status_code == 422
