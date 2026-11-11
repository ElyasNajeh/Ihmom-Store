from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.categories.model import Category
from app.features.categories.schema import (
    CategoryCreate,
    CategoryQuery,
    CategorySortBy,
    CategoryUpdate,
)
from app.features.products.model import Product
from app.shared import crud
from app.constants.images import CATEGORY_IMAGE_SUBDIRECTORY
from app.constants.query import SortDirection
from app.shared.image_cleanup import delete_unused_uploaded_image
from app.shared.images import delete_uploaded_image, optimize_category_upload
from app.shared.search import ilike_any
from app.shared.sorting import build_order_by
from app.shared.uniqueness import ensure_unique_names


SORTABLE_FIELDS = {
    CategorySortBy.ID: Category.id,
    CategorySortBy.CREATED_AT: Category.created_at,
    CategorySortBy.NAME_AR: Category.name_ar,
    CategorySortBy.NAME_EN: Category.name_en,
}


def _list_categories(
    db: Session,
    query_data: CategoryQuery,
    *,
    is_admin: bool,
):
    query = db.query(Category)

    if not is_admin:
        query = query.filter(Category.is_active.is_(True))

    search_filter = ilike_any(
        [Category.name_ar, Category.name_en],
        query_data.search,
    )
    if search_filter is not None:
        query = query.filter(search_filter)

    if is_admin and query_data.filter and query_data.filter.is_active is not None:
        query = query.filter(Category.is_active.is_(query_data.filter.is_active))

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
    )


def get_active_category(db: Session, category_id: int):
    category = (
        db.query(Category)
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
    category = _get_category_for_update(db, category_id)

    product_exists = (
        db.query(Product.id).filter(Product.category_id == category_id).first()
    )
    if product_exists:
        raise HTTPException(
            status_code=409,
            detail="Category cannot be deleted while it contains products",
        )

    try:
        image_path = category.image
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

    delete_unused_uploaded_image(
        db, Category.image, image_path, CATEGORY_IMAGE_SUBDIRECTORY
    )


def _get_category_for_update(db: Session, category_id: int) -> Category:
    return crud.get_locked_or_404(
        db,
        Category,
        category_id,
        detail="Category not found",
    )


def replace_category_image(
    db: Session, category_id: int, image: UploadFile | None
) -> Category:
    category = _get_category_for_update(db, category_id)
    previous = category.image
    uploaded = None
    try:
        if image is not None:
            filename = optimize_category_upload(image)
            uploaded = f"/uploads/{CATEGORY_IMAGE_SUBDIRECTORY}/{filename}"
        category.image = uploaded
        db.commit()
    except Exception:
        db.rollback()
        if uploaded:
            delete_uploaded_image(uploaded, CATEGORY_IMAGE_SUBDIRECTORY)
        raise
    delete_unused_uploaded_image(
        db, Category.image, previous, CATEGORY_IMAGE_SUBDIRECTORY
    )
    return category
