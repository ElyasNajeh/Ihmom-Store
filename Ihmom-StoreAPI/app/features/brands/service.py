
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.brands.model import Brand
from app.features.brands.schema import (
    BrandCreate,
    BrandQuery,
    BrandSortBy,
    BrandUpdate,
)
from app.features.products.model import Product
from app.shared import crud
from app.constants.query import SortDirection
from app.shared.search import ilike_any
from app.shared.sorting import build_order_by
from app.shared.uniqueness import ensure_unique_names


SORTABLE_FIELDS = {
    BrandSortBy.ID: Brand.id,
    BrandSortBy.CREATED_AT: Brand.created_at,
    BrandSortBy.NAME_AR: Brand.name_ar,
    BrandSortBy.NAME_EN: Brand.name_en,
}


def _list_brands(
    db: Session,
    query_data: BrandQuery,
    *,
    is_admin: bool,
):
    query = db.query(Brand)

    if not is_admin:
        query = query.filter(Brand.is_active.is_(True))

    search_filter = ilike_any([Brand.name_ar, Brand.name_en], query_data.search)
    if search_filter is not None:
        query = query.filter(search_filter)

    if is_admin and query_data.filter and query_data.filter.is_active is not None:
        query = query.filter(
            Brand.is_active.is_(query_data.filter.is_active)
        )

    if is_admin:
        sort_by = query_data.sort_by or BrandSortBy.CREATED_AT
        order = query_data.order or SortDirection.DESC
    else:
        sort_by = query_data.sort_by or BrandSortBy.NAME_EN
        order = query_data.order or SortDirection.ASC

    return crud.paginate(
        query,
        query_data.page,
        query_data.page_size,
        order_by=build_order_by(
            SORTABLE_FIELDS[sort_by],
            order,
            Brand.id,
            sort_is_id=sort_by == BrandSortBy.ID,
        ),
    )


def create_brand(db: Session, brand_data: BrandCreate):
    data = brand_data.model_dump()
    ensure_unique_names(
        db,
        Brand,
        name_ar=data["name_ar"],
        name_en=data["name_en"],
        label="brand",
    )

    brand = Brand(**data)
    try:
        return crud.create(db, brand)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A brand with this name already exists",
        ) from exc


def get_active_brands(db: Session, query_data: BrandQuery):
    return _list_brands(db, query_data, is_admin=False)


def get_brands(db: Session, query_data: BrandQuery):
    return _list_brands(db, query_data, is_admin=True)


def get_brand(db: Session, brand_id: int):
    return crud.get_or_404(db, Brand, brand_id, detail="Brand not found")


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
    brand = crud.get_or_404(db, Brand, brand_id, detail="Brand not found")

    data = brand_data.model_dump(exclude_unset=True)
    ensure_unique_names(
        db,
        Brand,
        name_ar=data.get("name_ar"),
        name_en=data.get("name_en"),
        exclude_id=brand_id,
        label="brand",
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
    brand = crud.get_or_404(db, Brand, brand_id, detail="Brand not found")

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
