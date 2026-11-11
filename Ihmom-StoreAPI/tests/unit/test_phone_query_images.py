import pytest
from fastapi import HTTPException, UploadFile

from app.shared.images import (
    optimize_upload,
    resolve_uploaded_image,
    validate_uploaded_image_url,
)
from app.shared.phone import normalize_phone
from app.shared.search import escape_like, like_pattern


pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    ("raw", "canonical"),
    [
        ("0599123456", "+970599123456"),
        ("970599123456", "+970599123456"),
        ("+970599123456", "+970599123456"),
        ("972599123456", "+972599123456"),
        ("  +972599123456  ", "+972599123456"),
    ],
)
def test_phone_normalization(raw, canonical):
    assert normalize_phone(raw) == canonical


@pytest.mark.parametrize(
    "raw",
    ["", "12345", "+970499123456", "+97059912345", "+9705991234567", "0599 123 456"],
)
def test_phone_rejects_invalid_formats(raw):
    with pytest.raises(ValueError):
        normalize_phone(raw)


def test_like_search_escapes_wildcards_and_backslashes():
    assert escape_like(r"  50%_off\today  ") == r"50\%\_off\\today"
    assert like_pattern("_") == r"%\_%"
    assert like_pattern("   ") is None


@pytest.mark.parametrize(
    "value",
    [
        "/uploads/products/../../secret.webp",
        "/uploads/categories/00000000-0000-0000-0000-000000000000.webp",
        "/uploads/products/not-a-uuid.webp",
        "/uploads/products/00000000-0000-0000-0000-000000000000.png",
        "https://evil.example/image.webp",
    ],
)
def test_uploaded_image_url_validation_rejects_wrong_directory_or_name(value):
    with pytest.raises(ValueError):
        validate_uploaded_image_url(value, "products")


def test_uploaded_image_url_accepts_canonical_uuid():
    value = "/uploads/products/00000000-0000-0000-0000-000000000000.webp"
    assert validate_uploaded_image_url(value, "products") == value


def test_path_resolution_confines_files_to_subdirectory(monkeypatch, tmp_path):
    from app.shared import images

    monkeypatch.setattr(images, "UPLOAD_ROOT", tmp_path)
    assert resolve_uploaded_image("../secret.webp", "products") is None
    assert resolve_uploaded_image("/uploads/products/../../secret.webp", "products") is None
    safe = resolve_uploaded_image("/uploads/products/image.webp", "products")
    assert safe == (tmp_path / "products" / "image.webp").resolve()


def test_empty_upload_is_rejected_and_leaves_no_file(monkeypatch, tmp_path):
    from app.shared import images

    monkeypatch.setattr(images, "UPLOAD_ROOT", tmp_path)
    upload = UploadFile(filename="empty.png", file=__import__("io").BytesIO(b""))
    with pytest.raises(HTTPException) as exc:
        optimize_upload(upload, "products", (100, 100), 80)
    assert exc.value.status_code == 400
    assert list(tmp_path.rglob("*")) == [tmp_path / "products"]


def test_content_is_decoded_instead_of_trusting_extension(monkeypatch, tmp_path, png_bytes):
    from app.shared import images

    monkeypatch.setattr(images, "UPLOAD_ROOT", tmp_path)
    upload = UploadFile(
        filename="payload.exe",
        file=__import__("io").BytesIO(png_bytes),
        headers={"content-type": "application/octet-stream"},
    )
    filename = optimize_upload(upload, "products", (100, 100), 80)
    assert filename.endswith(".webp")
    assert (tmp_path / "products" / filename).is_file()
