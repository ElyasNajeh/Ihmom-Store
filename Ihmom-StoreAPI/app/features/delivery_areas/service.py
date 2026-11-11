
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.delivery_areas.model import DeliveryArea
from app.features.delivery_areas.schema import (
    DeliveryAreaCreate,
    DeliveryAreaQuery,
    DeliveryAreaSortBy,
    DeliveryAreaUpdate,
)
from app.shared import crud
from app.features.orders.model import Order
from app.constants.query import SortDirection
from app.shared.search import ilike_any
from app.shared.sorting import build_order_by
from app.shared.uniqueness import ensure_unique_names


SORTABLE_FIELDS = {
    DeliveryAreaSortBy.ID: DeliveryArea.id,
    DeliveryAreaSortBy.CREATED_AT: DeliveryArea.created_at,
    DeliveryAreaSortBy.NAME_AR: DeliveryArea.name_ar,
    DeliveryAreaSortBy.NAME_EN: DeliveryArea.name_en,
    DeliveryAreaSortBy.DELIVERY_FEE: DeliveryArea.delivery_fee,
}


def _list_delivery_areas(
    db: Session,
    query_data: DeliveryAreaQuery,
    is_admin: bool,
):
    query = db.query(DeliveryArea)

    if not is_admin:
        query = query.filter(DeliveryArea.is_active.is_(True))

    filters = query_data.filter
    if filters is not None:
        if is_admin and filters.is_active is not None:
            query = query.filter(
                DeliveryArea.is_active.is_(filters.is_active)
            )

        if filters.min_delivery_fee is not None:
            query = query.filter(
                DeliveryArea.delivery_fee >= filters.min_delivery_fee
            )

        if filters.max_delivery_fee is not None:
            query = query.filter(
                DeliveryArea.delivery_fee <= filters.max_delivery_fee
            )

    search_filter = ilike_any(
        [DeliveryArea.name_ar, DeliveryArea.name_en],
        query_data.search,
    )
    if search_filter is not None:
        query = query.filter(search_filter)

    if is_admin:
        sort_by = query_data.sort_by or DeliveryAreaSortBy.CREATED_AT
        order = query_data.order or SortDirection.DESC
    else:
        sort_by = query_data.sort_by or DeliveryAreaSortBy.NAME_EN
        order = query_data.order or SortDirection.ASC

    return crud.paginate(
        query,
        query_data.page,
        query_data.page_size,
        order_by=build_order_by(
            SORTABLE_FIELDS[sort_by],
            order,
            DeliveryArea.id,
            sort_is_id=sort_by == DeliveryAreaSortBy.ID,
        ),
    )


def create_delivery_area(
    db: Session,
    area_data: DeliveryAreaCreate,
    *,
    commit: bool = True,
):
    data = area_data.model_dump()
    ensure_unique_names(
        db,
        DeliveryArea,
        name_ar=data["name_ar"],
        name_en=data["name_en"],
        label="delivery area",
    )

    area = DeliveryArea(**data)
    try:
        return crud.create(db, area, commit=commit)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A delivery area with this name already exists",
        ) from exc


def get_active_delivery_areas(
    db: Session,
    query_data: DeliveryAreaQuery,
):
    return _list_delivery_areas(
        db,
        query_data,
        is_admin=False,
    )


def get_delivery_areas(
    db: Session,
    query_data: DeliveryAreaQuery,
):
    return _list_delivery_areas(
        db,
        query_data,
        is_admin=True,
    )


def get_delivery_area(db: Session, area_id: int):
    return crud.get_or_404(
        db,
        DeliveryArea,
        area_id,
        detail="Delivery area not found",
    )


def get_active_delivery_area(db: Session, area_id: int):
    area = (
        db.query(DeliveryArea)
        .filter(
            DeliveryArea.id == area_id,
            DeliveryArea.is_active.is_(True),
        )
        .first()
    )
    if not area:
        raise HTTPException(status_code=404, detail="Delivery area not found")
    return area


def update_delivery_area(
    db: Session,
    area_id: int,
    area_data: DeliveryAreaUpdate,
):
    area = crud.get_or_404(
        db,
        DeliveryArea,
        area_id,
        detail="Delivery area not found",
    )

    data = area_data.model_dump(exclude_unset=True)
    ensure_unique_names(
        db,
        DeliveryArea,
        name_ar=data.get("name_ar"),
        name_en=data.get("name_en"),
        exclude_id=area_id,
        label="delivery area",
    )

    if not data:
        return area

    try:
        return crud.update_by_id(
            db,
            DeliveryArea,
            area_id,
            data,
            db_obj=area,
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A delivery area with this name already exists",
        ) from exc
    except Exception:
        db.rollback()
        raise


def delete_delivery_area(db: Session, area_id: int) -> None:
    area = crud.get_or_404(
        db,
        DeliveryArea,
        area_id,
        detail="Delivery area not found",
    )

    order_exists = (
        db.query(Order.id).filter(Order.delivery_area_id == area_id).first()
    )
    if order_exists:
        raise HTTPException(
            status_code=409,
            detail="Delivery area cannot be deleted while it is used by orders",
        )

    try:
        db.delete(area)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Delivery area cannot be deleted while it is used by orders",
        ) from exc
    except Exception:
        db.rollback()
        raise
