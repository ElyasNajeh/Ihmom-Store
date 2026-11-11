
from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.features.categories.model import Category, CategoryImage
from app.features.categories.schema import (
    CategoryCreate,
    CategoryQuery,
    CategorySortBy,
    CategoryUpdate,
)
from app.features.products.model import Product
from app.shared import crud, image_collection
from app.constants.images import CATEGORY_IMAGE_SUBDIRECTORY
from app.constants.query import SortDirection
from app.shared.image_cleanup import delete_unused_uploaded_image
from app.shared.image_collection import ImageCollection
from app.shared.images import optimize_category_upload
from app.shared.search import ilike_any
from app.shared.sorting import build_order_by
from app.shared.uniqueness import ensure_unique_names


SORTABLE_FIELDS = {
    CategorySortBy.ID: Category.id,
    CategorySortBy.CREATED_AT: Category.created_at,
    CategorySortBy.NAME_AR: Category.name_ar,
    CategorySortBy.NAME_EN: Category.name_en,
}

CATEGORY_IMAGES = ImageCollection(
    image_model=CategoryImage,
    owner_model=Category,
    owner_key="category_id",
    subdirectory=CATEGORY_IMAGE_SUBDIRECTORY,
    label="Category",
    save_upload=optimize_category_upload,
)


def _list_categories(
    db: Session,
    query_data: CategoryQuery,
    *,
    is_admin: bool,
):
    query = db.query(Category).options(selectinload(Category.images))

    if not is_admin:
        query = query.filter(Category.is_active.is_(True))

    search_filter = ilike_any(
        [Category.name_ar, Category.name_en],
        query_data.search,
    )
    if search_filter is not None:
        query = query.filter(search_filter)

    if is_admin and query_data.filter and query_data.filter.is_active is not None:
        query = query.filter(
            Category.is_active.is_(query_data.filter.is_active)
        )

    if is_admin:
        sort_by = query_data.sort_by or CategorySortBy.CREATED_AT
        order = query_data.order or SortDirection.DESC
    else:
        sort_by = query_data.sort_by or CategorySortBy.NAME_EN
        order = query_data.order or SortDirection.ASC

    return crud.paginate(
        query,
        query_data.page,
        query_data.page_size,
        order_by=build_order_by(
            SORTABLE_FIELDS[sort_by],
            order,
            Category.id,
            sort_is_id=sort_by == CategorySortBy.ID,
        ),
    )


def create_category(
    db: Session,
    category_data: CategoryCreate,
    *,
    commit: bool = True,
):
    data = category_data.model_dump()
    ensure_unique_names(
        db,
        Category,
        name_ar=data["name_ar"],
        name_en=data["name_en"],
        label="category",
    )

    category = Category(**data)
    try:
        return crud.create(db, category, commit=commit)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists",
        ) from exc


def get_active_categories(db: Session, query_data: CategoryQuery):
    return _list_categories(db, query_data, is_admin=False)


def get_categories(db: Session, query_data: CategoryQuery):
    return _list_categories(db, query_data, is_admin=True)


def get_category(db: Session, category_id: int):
    return crud.get_or_404(
        db,
        Category,
        category_id,
        detail="Category not found",
        options=[selectinload(Category.images)],
    )


def get_active_category(db: Session, category_id: int):
    category = (
        db.query(Category)
        .options(selectinload(Category.images))
        .filter(Category.id == category_id, Category.is_active.is_(True))
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


def update_category(
    db: Session,
    category_id: int,
    category_data: CategoryUpdate,
):
    category = crud.get_or_404(
        db,
        Category,
        category_id,
        detail="Category not found",
    )

    data = category_data.model_dump(exclude_unset=True)
    ensure_unique_names(
        db,
        Category,
        name_ar=data.get("name_ar"),
        name_en=data.get("name_en"),
        exclude_id=category_id,
        label="category",
    )

    if not data:
        return category

    try:
        return crud.update_by_id(
            db,
            Category,
            category_id,
            data,
            db_obj=category,
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists",
        ) from exc
    except Exception:
        db.rollback()
        raise


def delete_category(db: Session, category_id: int) -> None:
    category = crud.get_or_404(
        db,
        Category,
        category_id,
        detail="Category not found",
    )

    product_exists = (
        db.query(Product.id).filter(Product.category_id == category_id).first()
    )
    if product_exists:
        raise HTTPException(
            status_code=409,
            detail="Category cannot be deleted while it contains products",
        )

    try:
        image_paths = [image.image for image in category.images]
        db.delete(category)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Category cannot be deleted while it contains products",
        ) from exc
    except Exception:
        db.rollback()
        raise

    for image_path in image_paths:
        delete_unused_uploaded_image(
            db,
            CategoryImage.image,
            image_path,
            CATEGORY_IMAGE_SUBDIRECTORY,
        )


def _get_category_for_update(db: Session, category_id: int) -> Category:
    return crud.get_locked_or_404(
        db,
        Category,
        category_id,
        detail="Category not found",
    )


def list_category_images(db: Session, category_id: int):
    return image_collection.list_images(db, CATEGORY_IMAGES, category_id)


def upload_category_images(
    db: Session,
    category_id: int,
    files: list[UploadFile],
):
    _get_category_for_update(db, category_id)
    return image_collection.upload_images(
        db,
        CATEGORY_IMAGES,
        category_id,
        files,
    )


def set_primary_category_image(db: Session, category_id: int, image_id: int):
    _get_category_for_update(db, category_id)
    return image_collection.set_primary_image(
        db,
        CATEGORY_IMAGES,
        category_id,
        image_id,
    )


def delete_category_image(db: Session, category_id: int, image_id: int) -> None:
    _get_category_for_update(db, category_id)
    image_collection.delete_image(db, CATEGORY_IMAGES, category_id, image_id)
