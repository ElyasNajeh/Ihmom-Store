from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.shared.image_cleanup import delete_unused_uploaded_image
from app.shared.images import delete_uploaded_image


@dataclass(frozen=True)
class ImageCollection:
    """Describes an owned image table managed by upload/primary/delete rules."""

    image_model: type
    owner_model: type
    owner_key: str
    subdirectory: str
    label: str
    save_upload: Callable[[UploadFile], str]

    @property
    def image_column(self) -> Any:
        return getattr(self.image_model, "image")

    @property
    def owner_column(self) -> Any:
        return getattr(self.image_model, self.owner_key)

    def url_for(self, filename: str) -> str:
        return f"/uploads/{self.subdirectory}/{filename}"

    def not_found(self) -> HTTPException:
        return HTTPException(
            status_code=404,
            detail=f"{self.label} not found",
        )

    def image_not_found(self) -> HTTPException:
        return HTTPException(
            status_code=404,
            detail=f"{self.label} image not found",
        )


def ensure_owner_exists(db: Session, collection: ImageCollection, owner_id: int) -> None:
    owner = (
        db.query(collection.owner_model.id)
        .filter(collection.owner_model.id == owner_id)
        .first()
    )
    if not owner:
        raise collection.not_found()


def _owner_images(db: Session, collection: ImageCollection, owner_id: int):
    return db.query(collection.image_model).filter(
        collection.owner_column == owner_id
    )


def _get_image(
    db: Session,
    collection: ImageCollection,
    owner_id: int,
    image_id: int,
):
    image = (
        _owner_images(db, collection, owner_id)
        .filter(collection.image_model.id == image_id)
        .first()
    )
    if not image:
        raise collection.image_not_found()
    return image


def list_images(db: Session, collection: ImageCollection, owner_id: int):
    ensure_owner_exists(db, collection, owner_id)

    return (
        _owner_images(db, collection, owner_id)
        .order_by(
            collection.image_model.is_primary.desc(),
            collection.image_model.id.asc(),
        )
        .all()
    )


def upload_images(
    db: Session,
    collection: ImageCollection,
    owner_id: int,
    files: list[UploadFile],
):
    if not files:
        raise HTTPException(status_code=422, detail="At least one image is required")

    has_images = (
        db.query(collection.image_model.id)
        .filter(collection.owner_column == owner_id)
        .first()
        is not None
    )
    has_primary = (
        db.query(collection.image_model.id)
        .filter(
            collection.owner_column == owner_id,
            collection.image_model.is_primary.is_(True),
        )
        .first()
        is not None
    )

    uploaded_paths: list[str] = []
    images = []

    try:
        for index, file in enumerate(files):
            image_path = collection.url_for(collection.save_upload(file))
            uploaded_paths.append(image_path)

            make_primary = not has_primary and (not has_images or index == 0)
            images.append(
                collection.image_model(
                    **{
                        collection.owner_key: owner_id,
                        "image": image_path,
                        "is_primary": make_primary,
                    }
                )
            )

            if make_primary:
                has_primary = True

        db.add_all(images)
        db.commit()
        return images
    except HTTPException:
        db.rollback()
        _remove_new_uploads(collection, uploaded_paths)
        raise
    except IntegrityError as exc:
        db.rollback()
        _remove_new_uploads(collection, uploaded_paths)
        raise HTTPException(
            status_code=409,
            detail=f"{collection.label} images could not be saved",
        ) from exc
    except Exception:
        db.rollback()
        _remove_new_uploads(collection, uploaded_paths)
        raise


def set_primary_image(
    db: Session,
    collection: ImageCollection,
    owner_id: int,
    image_id: int,
):
    image = _get_image(db, collection, owner_id, image_id)

    try:
        (
            _owner_images(db, collection, owner_id)
            .filter(
                collection.image_model.id != image_id,
                collection.image_model.is_primary.is_(True),
            )
            .update({"is_primary": False}, synchronize_session=False)
        )

        image.is_primary = True
        db.commit()
        return image
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                f"The primary {collection.label.lower()} image could not be changed"
            ),
        ) from exc
    except Exception:
        db.rollback()
        raise


def delete_image(
    db: Session,
    collection: ImageCollection,
    owner_id: int,
    image_id: int,
) -> None:
    image = _get_image(db, collection, owner_id, image_id)
    image_path = image.image

    try:
        if image.is_primary:
            replacement = (
                _owner_images(db, collection, owner_id)
                .filter(collection.image_model.id != image_id)
                .order_by(collection.image_model.id.asc())
                .with_for_update()
                .first()
            )
            if replacement:
                image.is_primary = False
                db.flush()
                replacement.is_primary = True

        db.delete(image)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"{collection.label} image could not be deleted",
        ) from exc
    except Exception:
        db.rollback()
        raise

    delete_unused_uploaded_image(
        db,
        collection.image_column,
        image_path,
        collection.subdirectory,
    )


def _remove_new_uploads(
    collection: ImageCollection,
    image_paths: list[str],
) -> None:
    for image_path in image_paths:
        delete_uploaded_image(image_path, collection.subdirectory)
