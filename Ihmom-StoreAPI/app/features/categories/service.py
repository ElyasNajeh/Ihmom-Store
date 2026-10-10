from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.categories.model import Category
from app.features.categories.schema import CategoryCreate, CategoryUpdate
from app.features.products.model import Product
from app.shared import crud


SORTABLE_FIELDS = {
    "id": Category.id,
    "created_at": Category.created_at,
    "name_ar": Category.name_ar,
    "name_en": Category.name_en,
}


def _ensure_unique_names(
    db: Session,
    name_ar: str | None,
    name_en: str | None,
    category_id: int | None = None,
) -> None:
    name_filters = []
    if name_ar is not None:
        name_filters.append(Category.name_ar == name_ar)
    if name_en is not None:
        name_filters.append(Category.name_en == name_en)

    if not name_filters:
        return

    duplicate_filter = name_filters[0]
    if len(name_filters) == 2:
        duplicate_filter = duplicate_filter | name_filters[1]

    query = db.query(Category.name_ar, Category.name_en).filter(duplicate_filter)
    if category_id is not None:
        query = query.filter(Category.id != category_id)

    existing_names = query.all()
    if name_ar is not None and any(row.name_ar == name_ar for row in existing_names):
        raise HTTPException(
            status_code=409,
            detail="A category with this Arabic name already exists",
        )
    if name_en is not None and any(row.name_en == name_en for row in existing_names):
        raise HTTPException(
            status_code=409,
            detail="A category with this English name already exists",
        )


def _list_categories(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    is_active: bool | None,
):
    query = db.query(Category)

    if search and search.strip():
        escaped_search = (
            search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        term = f"%{escaped_search}%"
        query = query.filter(
            Category.name_ar.ilike(term, escape="\\")
            | Category.name_en.ilike(term, escape="\\")
        )

    if is_active is not None:
        query = query.filter(Category.is_active.is_(is_active))

    sort_column = SORTABLE_FIELDS[sort_by]
    order_method = sort_column.asc if sort_order == "asc" else sort_column.desc
    id_order_method = Category.id.asc if sort_order == "asc" else Category.id.desc
    order_by = [order_method()]
    if sort_by != "id":
        order_by.append(id_order_method())

    return crud.paginate(query, page, page_size, order_by=order_by)


def create_category(db: Session, category_data: CategoryCreate):
    data = category_data.model_dump()
    _ensure_unique_names(db, data["name_ar"], data["name_en"])

    category = Category(**data)
    try:
        return crud.create(db, category)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists",
        ) from exc


def get_active_categories(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
):
    return _list_categories(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
        is_active=True,
    )


def get_categories(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    is_active: bool | None,
    sort_by: str,
    sort_order: str,
):
    return _list_categories(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
        is_active,
    )


def get_category(db: Session, category_id: int):
    category = crud.get_by_id(db, Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


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
    category = crud.get_by_id(db, Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    data = category_data.model_dump(exclude_unset=True)
    _ensure_unique_names(
        db,
        data.get("name_ar"),
        data.get("name_en"),
        category_id,
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
    category = crud.get_by_id(db, Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    product_exists = (
        db.query(Product.id).filter(Product.category_id == category_id).first()
    )
    if product_exists:
        raise HTTPException(
            status_code=409,
            detail="Category cannot be deleted while it contains products",
        )

    try:
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
