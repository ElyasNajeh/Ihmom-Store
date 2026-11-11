from io import BytesIO
from unittest.mock import MagicMock

import pytest
from fastapi import UploadFile
from PIL import Image

from app.features.categories import service
from app.features.categories.model import Category
from app.shared import images

pytestmark = pytest.mark.unit


def test_category_replacement_encodes_webp_and_cleans_old_file_after_commit(
    tmp_path, monkeypatch, png_bytes
):
    monkeypatch.setattr(images, "UPLOAD_ROOT", tmp_path)
    category = Category(id=1, name_ar="صورة", name_en="Image", image=None)
    monkeypatch.setattr(service, "_get_category_for_update", lambda *args: category)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    first = service.replace_category_image(
        db, 1, UploadFile(filename="first.png", file=BytesIO(png_bytes))
    ).image
    old_file = tmp_path / first.removeprefix("/uploads/")
    assert old_file.is_file()
    db.commit.side_effect = lambda: old_file.is_file() or pytest.fail(
        "Old file deleted before commit"
    )
    result = service.replace_category_image(
        db, 1, UploadFile(filename="second.png", file=BytesIO(png_bytes))
    )
    new_file = tmp_path / result.image.removeprefix("/uploads/")
    assert not old_file.exists() and new_file.is_file()
    with Image.open(new_file) as encoded:
        assert encoded.format == "WEBP"


def test_category_upload_commit_failure_removes_new_file_and_preserves_original(
    tmp_path, monkeypatch, png_bytes
):
    monkeypatch.setattr(images, "UPLOAD_ROOT", tmp_path)
    category = Category(id=1, name_ar="صورة", name_en="Image", image=None)
    monkeypatch.setattr(service, "_get_category_for_update", lambda *args: category)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    service.replace_category_image(
        db, 1, UploadFile(filename="first.png", file=BytesIO(png_bytes))
    )
    original_files = set(tmp_path.rglob("*.webp"))
    db.commit.side_effect = RuntimeError("simulated commit failure")
    with pytest.raises(RuntimeError, match="commit failure"):
        service.replace_category_image(
            db, 1, UploadFile(filename="second.png", file=BytesIO(png_bytes))
        )
    assert set(tmp_path.rglob("*.webp")) == original_files
    db.rollback.assert_called_once()
