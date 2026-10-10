from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.brands.model import Brand
from app.features.brands.schema import BrandCreate, BrandUpdate
from app.features.products.model import Product
from app.shared import crud


SORTABLE_FIELDS = {
    "id": Brand.id,
    "created_at": Brand.created_at,
    "name_ar": Brand.name_ar,
    "name_en": Brand.name_en,
}


def _ensure_unique_names(
    db: Session,
    name_ar: str | None,
    name_en: str | None,
    brand_id: int | None = None,
) -> None:
    name_filters = []
    if name_ar is not None:
        name_filters.append(Brand.name_ar == name_ar)
    if name_en is not None:
        name_filters.append(Brand.name_en == name_en)

    if not name_filters:
        return

    duplicate_filter = name_filters[0]
    if len(name_filters) == 2:
        duplicate_filter = duplicate_filter | name_filters[1]

    query = db.query(Brand.name_ar, Brand.name_en).filter(duplicate_filter)
    if brand_id is not None:
        query = query.filter(Brand.id != brand_id)

    existing_names = query.all()
    if name_ar is not None and any(row.name_ar == name_ar for row in existing_names):
        raise HTTPException(
            status_code=409,
            detail="A brand with this Arabic name already exists",
        )
    if name_en is not None and any(row.name_en == name_en for row in existing_names):
        raise HTTPException(
            status_code=409,
            detail="A brand with this English name already exists",
        )


def _list_brands(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    is_active: bool | None,
):
    query = db.query(Brand)

    if search and search.strip():
        escaped_search = (
            search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        term = f"%{escaped_search}%"
        query = query.filter(
            Brand.name_ar.ilike(term, escape="\\")
            | Brand.name_en.ilike(term, escape="\\")
        )

    if is_active is not None:
        query = query.filter(Brand.is_active.is_(is_active))

    sort_column = SORTABLE_FIELDS[sort_by]
    order_method = sort_column.asc if sort_order == "asc" else sort_column.desc
    id_order_method = Brand.id.asc if sort_order == "asc" else Brand.id.desc
    order_by = [order_method()]
    if sort_by != "id":
        order_by.append(id_order_method())

    return crud.paginate(query, page, page_size, order_by=order_by)


def create_brand(db: Session, brand_data: BrandCreate):
    data = brand_data.model_dump()
    _ensure_unique_names(db, data["name_ar"], data["name_en"])

    brand = Brand(**data)
    try:
        return crud.create(db, brand)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A brand with this name already exists",
        ) from exc


def get_active_brands(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
):
    return _list_brands(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
        is_active=True,
    )


def get_brands(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    is_active: bool | None,
    sort_by: str,
    sort_order: str,
):
    return _list_brands(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
        is_active,
    )


def get_brand(db: Session, brand_id: int):
    brand = crud.get_by_id(db, Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


def get_active_brand(db: Session, brand_id: int):
    brand = (
        db.query(Brand)
        .filter(Brand.id == brand_id, Brand.is_active.is_(True))
        .first()
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


def update_brand(
    db: Session,
    brand_id: int,
    brand_data: BrandUpdate,
):
    brand = crud.get_by_id(db, Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    data = brand_data.model_dump(exclude_unset=True)
    _ensure_unique_names(
        db,
        data.get("name_ar"),
        data.get("name_en"),
        brand_id,
    )

    if not data:
        return brand

    try:
        return crud.update_by_id(
            db,
            Brand,
            brand_id,
            data,
            db_obj=brand,
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A brand with this name already exists",
        ) from exc
    except Exception:
        db.rollback()
        raise


def delete_brand(db: Session, brand_id: int) -> None:
    brand = crud.get_by_id(db, Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    product_exists = (
        db.query(Product.id).filter(Product.brand_id == brand_id).first()
    )
    if product_exists:
        raise HTTPException(
            status_code=409,
            detail="Brand cannot be deleted while it contains products",
        )

    try:
        db.delete(brand)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Brand cannot be deleted while it contains products",
        ) from exc
    except Exception:
        db.rollback()
        raise
