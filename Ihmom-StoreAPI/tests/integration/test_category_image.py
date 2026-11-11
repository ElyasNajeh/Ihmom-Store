import pytest
from PIL import Image

from app.features.categories.model import Category
from tests.conftest import TEST_UPLOAD_ROOT

pytestmark = pytest.mark.integration


def disk(url):
    return TEST_UPLOAD_ROOT / url.removeprefix("/uploads/")


def test_single_category_image_replacement_public_projection_and_removal(
    client, auth_headers, catalog, png_bytes
):
    path = f"/categories/{catalog.category_id}/image"
    assert client.get(f"/categories/{catalog.category_id}").json()["image"] is None
    first = client.put(
        path,
        headers=auth_headers,
        files={"image": ("first.png", png_bytes, "image/png")},
    )
    assert first.status_code == 200, first.text
    assert "images" not in first.json()
    old = first.json()["image"]
    with Image.open(disk(old)) as image:
        assert image.format == "WEBP"
    assert client.get(old).headers["content-type"] == "image/webp"
    second = client.put(
        path,
        headers=auth_headers,
        files={"image": ("second.png", png_bytes, "image/png")},
    )
    assert second.status_code == 200
    new = second.json()["image"]
    assert old != new and disk(new).is_file() and not disk(old).exists()
    assert client.get(f"/categories/{catalog.category_id}").json()["image"] == new
    assert client.delete(path, headers=auth_headers).json()["image"] is None
    assert not disk(new).exists()
    assert client.delete(path, headers=auth_headers).status_code == 200


def test_category_image_auth_invalid_upload_and_removed_gallery(
    client, auth_headers, catalog, png_bytes
):
    path = f"/categories/{catalog.category_id}/image"
    assert (
        client.put(
            path, files={"image": ("photo.png", png_bytes, "image/png")}
        ).status_code
        == 401
    )
    assert client.delete(path).status_code == 401
    assert client.put(path, headers=auth_headers).status_code == 422
    for data in (b"", b"invalid"):
        assert (
            client.put(
                path,
                headers=auth_headers,
                files={"image": ("bad.png", data, "image/png")},
            ).status_code
            == 400
        )
    assert (
        client.put(
            "/categories/999999999/image",
            headers=auth_headers,
            files={"image": ("photo.png", png_bytes, "image/png")},
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/categories/{catalog.category_id}/images", headers=auth_headers
        ).status_code
        == 404
    )


def test_category_image_failed_commit_keeps_original_and_removes_new_file(
    client, auth_headers, catalog, png_bytes, db_session, monkeypatch
):
    path = f"/categories/{catalog.category_id}/image"
    first = client.put(
        path,
        headers=auth_headers,
        files={"image": ("first.png", png_bytes, "image/png")},
    ).json()["image"]
    before = set((TEST_UPLOAD_ROOT / "categories").glob("*.webp"))

    def fail():
        raise RuntimeError("simulated database failure")

    with monkeypatch.context() as patch:
        patch.setattr(db_session, "commit", fail)
        assert (
            client.put(
                path,
                headers=auth_headers,
                files={"image": ("second.png", png_bytes, "image/png")},
            ).status_code
            == 500
        )
    assert set((TEST_UPLOAD_ROOT / "categories").glob("*.webp")) == before
    assert db_session.get(Category, catalog.category_id).image == first


def test_category_deletion_cleans_its_single_image(client, auth_headers, png_bytes):
    category = client.post(
        "/categories/",
        headers=auth_headers,
        json={"name_ar": "صورة واحدة", "name_en": "Single image category"},
    ).json()
    path = f"/categories/{category['id']}"
    image = client.put(
        f"{path}/image",
        headers=auth_headers,
        files={"image": ("one.png", png_bytes, "image/png")},
    ).json()["image"]
    assert client.delete(path, headers=auth_headers).status_code == 204
    assert not disk(image).exists()
