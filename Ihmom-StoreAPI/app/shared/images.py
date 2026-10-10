import logging
import os
from io import BytesIO
from pathlib import Path
from tempfile import NamedTemporaryFile, SpooledTemporaryFile
from typing import Callable
import warnings
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
import pillow_heif

from app.core.config import settings

logger = logging.getLogger(__name__)
UPLOAD_ROOT = settings.UPLOAD_ROOT
READ_CHUNK_SIZE = 1024 * 1024

# Phone cameras commonly produce HEIC/HEIF (and increasingly AVIF) files.
# Register those formats with Pillow. Uploads are normalized to the
# resource-specific WebP dimensions below.
pillow_heif.register_heif_opener()
register_avif_opener = getattr(pillow_heif, "register_avif_opener", None)
if register_avif_opener:
    register_avif_opener()

CATEGORY_MAX_SIZE = (1200, 1200)
CATEGORY_WEBP_QUALITY = 82
PRODUCT_MAX_SIZE = (1600, 1600)
PRODUCT_WEBP_QUALITY = 84
SLIDER_MAX_SIZE = (2560, 1440)
SLIDER_WEBP_QUALITY = 82

ImageProcessor = Callable[[Image.Image], Image.Image]


def optimize_upload(
    upload: UploadFile,
    subdirectory: str,
    max_size: tuple[int, int],
    quality: int,
    processor: ImageProcessor | None = None,
) -> str:
    """Validate and atomically save an uploaded image as an optimized WebP."""
    destination_dir = UPLOAD_ROOT / subdirectory
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / f"{uuid4()}.webp"

    with SpooledTemporaryFile(max_size=5 * 1024 * 1024) as source:
        _copy_upload(upload, source)
        try:
            _write_optimized_webp(
                source,
                destination,
                max_size,
                quality,
                processor,
            )
        except (
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
        ):
            raise HTTPException(
                status_code=400,
                detail="Image exceeds Pillow's safety limit",
            )
        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
        ):
            raise HTTPException(status_code=400, detail="Invalid or corrupted image")

    return destination.name


def preview_product_upload(upload: UploadFile) -> bytes:
    """Convert an uploaded product image to an in-memory browser preview."""
    with SpooledTemporaryFile(max_size=5 * 1024 * 1024) as source:
        _copy_upload(upload, source)

        try:
            image, has_alpha = _prepare_image(source, PRODUCT_MAX_SIZE)
            try:
                preview = BytesIO()
                image.save(
                    preview,
                    format="WEBP",
                    quality=PRODUCT_WEBP_QUALITY,
                    method=6,
                    exact=has_alpha,
                )
                return preview.getvalue()
            finally:
                image.close()
        except (
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
        ):
            raise HTTPException(
                status_code=400,
                detail="Image exceeds Pillow's safety limit",
            )
        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
        ):
            raise HTTPException(status_code=400, detail="Invalid or corrupted image")


def optimize_slider_upload(upload: UploadFile) -> str:
    """Resize and save a slider image using the standard WebP preset."""
    return optimize_upload(
        upload,
        "sliders",
        SLIDER_MAX_SIZE,
        SLIDER_WEBP_QUALITY,
    )


def optimize_category_upload(upload: UploadFile) -> str:
    """Resize and save a category image using the standard WebP preset."""
    return optimize_upload(
        upload,
        "categories",
        CATEGORY_MAX_SIZE,
        CATEGORY_WEBP_QUALITY,
    )


def optimize_product_upload(upload: UploadFile) -> str:
    """Resize and save a product image using the standard WebP preset."""
    return optimize_upload(
        upload,
        "products",
        PRODUCT_MAX_SIZE,
        PRODUCT_WEBP_QUALITY,
    )


def validate_uploaded_image_url(value: str, subdirectory: str) -> str:
    """Normalize and validate a URL produced by this application's uploader."""
    normalized = value.strip().replace("\\", "/")
    expected_prefix = f"/uploads/{subdirectory}/"
    if not normalized.startswith(expected_prefix):
        raise ValueError(f"Image must be uploaded under {expected_prefix}")

    relative_name = normalized.removeprefix(expected_prefix)
    if (
        not relative_name
        or "/" in relative_name
        or relative_name in {".", ".."}
        or not relative_name.lower().endswith(".webp")
    ):
        raise ValueError("Image must reference a valid WebP upload")

    try:
        image_id = UUID(relative_name[:-5])
    except ValueError as exc:
        raise ValueError("Image must reference a valid WebP upload") from exc
    if str(image_id) != relative_name[:-5].lower():
        raise ValueError("Image must reference a valid WebP upload")

    return f"{expected_prefix}{relative_name}"


def optimize_image_file(
    source: Path,
    destination: Path,
    max_size: tuple[int, int],
    quality: int,
) -> None:
    """Optimize an existing image using the same atomic path as uploads."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        with source.open("rb") as source_file:
            _write_optimized_webp(source_file, destination, max_size, quality)
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise ValueError(f"Invalid or corrupted image: {source}") from exc


def delete_uploaded_image(value: str | None, subdirectory: str) -> None:
    path = resolve_uploaded_image(value, subdirectory)
    if not path or not path.is_file():
        return

    try:
        path.unlink()
    except OSError:
        logger.warning("Could not delete uploaded image %s", path, exc_info=True)


def resolve_uploaded_image(value: str | None, subdirectory: str) -> Path | None:
    if not value or "://" in value:
        return None

    normalized = value.replace("\\", "/").lstrip("/")
    if normalized.startswith("uploads/"):
        normalized = normalized[len("uploads/") :]
    if "/" not in normalized:
        normalized = f"{subdirectory}/{normalized}"

    root = (UPLOAD_ROOT / subdirectory).resolve()
    candidate = (UPLOAD_ROOT / normalized).resolve()
    if not candidate.is_relative_to(root):
        return None
    return candidate


def upload_url(path: Path) -> str:
    relative = path.resolve().relative_to(UPLOAD_ROOT.resolve())
    return f"/uploads/{relative.as_posix()}"


def _write_optimized_webp(
    source,
    destination: Path,
    max_size,
    quality: int,
    processor: ImageProcessor | None = None,
) -> None:
    temporary_path: Path | None = None
    image: Image.Image | None = None
    try:
        image, has_alpha = _prepare_image(source, max_size, processor)

        with NamedTemporaryFile(
            mode="wb",
            suffix=".webp.tmp",
            prefix=f".{destination.stem}-",
            dir=destination.parent,
            delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)

        image.save(
            temporary_path,
            format="WEBP",
            quality=quality,
            method=6,
            exact=has_alpha,
        )
        os.replace(temporary_path, destination)
        temporary_path = None
    finally:
        if image:
            image.close()
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()


def _copy_upload(upload: UploadFile, destination) -> None:
    has_content = False
    while chunk := upload.file.read(READ_CHUNK_SIZE):
        has_content = True
        destination.write(chunk)

    if not has_content:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    destination.seek(0)


def _prepare_image(
    source,
    max_size: tuple[int, int],
    processor: ImageProcessor | None = None,
) -> tuple[Image.Image, bool]:
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(source) as opened:
            opened.seek(0)
            image = ImageOps.exif_transpose(opened)
            has_alpha = image.mode in {"RGBA", "LA"} or (
                image.mode == "P" and "transparency" in image.info
            )
            image = image.convert("RGBA" if has_alpha else "RGB")
            image.thumbnail(max_size, Image.Resampling.LANCZOS)

            try:
                if processor:
                    processed_image = processor(image)
                    if processed_image is not image:
                        image.close()
                    image = processed_image
                    has_alpha = image.mode in {"RGBA", "LA"}
            except Exception:
                image.close()
                raise

            return image, has_alpha
