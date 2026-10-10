from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.delivery_areas.model import DeliveryArea
from app.features.delivery_areas.schema import DeliveryAreaCreate, DeliveryAreaUpdate
from app.features.orders.model import Order
from app.shared import crud


SORTABLE_FIELDS = {
    "id": DeliveryArea.id,
    "created_at": DeliveryArea.created_at,
    "name_ar": DeliveryArea.name_ar,
    "name_en": DeliveryArea.name_en,
    "delivery_fee": DeliveryArea.delivery_fee,
}


def _ensure_unique_names(
    db: Session,
    name_ar: str | None,
    name_en: str | None,
    area_id: int | None = None,
) -> None:
    name_filters = []
    if name_ar is not None:
        name_filters.append(DeliveryArea.name_ar == name_ar)
    if name_en is not None:
        name_filters.append(DeliveryArea.name_en == name_en)

    if not name_filters:
        return

    duplicate_filter = name_filters[0]
    if len(name_filters) == 2:
        duplicate_filter = duplicate_filter | name_filters[1]

    query = db.query(DeliveryArea.name_ar, DeliveryArea.name_en).filter(
        duplicate_filter
    )
    if area_id is not None:
        query = query.filter(DeliveryArea.id != area_id)

    existing_names = query.all()
    if name_ar is not None and any(row.name_ar == name_ar for row in existing_names):
        raise HTTPException(
            status_code=409,
            detail="A delivery area with this Arabic name already exists",
        )
    if name_en is not None and any(row.name_en == name_en for row in existing_names):
        raise HTTPException(
            status_code=409,
            detail="A delivery area with this English name already exists",
        )


def _list_delivery_areas(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    is_active: bool | None,
):
    query = db.query(DeliveryArea)

    if search and search.strip():
        escaped_search = (
            search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        term = f"%{escaped_search}%"
        query = query.filter(
            DeliveryArea.name_ar.ilike(term, escape="\\")
            | DeliveryArea.name_en.ilike(term, escape="\\")
        )

    if is_active is not None:
        query = query.filter(DeliveryArea.is_active.is_(is_active))

    sort_column = SORTABLE_FIELDS[sort_by]
    order_method = sort_column.asc if sort_order == "asc" else sort_column.desc
    id_order_method = (
        DeliveryArea.id.asc if sort_order == "asc" else DeliveryArea.id.desc
    )
    order_by = [order_method()]
    if sort_by != "id":
        order_by.append(id_order_method())

    return crud.paginate(query, page, page_size, order_by=order_by)


def create_delivery_area(db: Session, area_data: DeliveryAreaCreate):
    data = area_data.model_dump()
    _ensure_unique_names(db, data["name_ar"], data["name_en"])

    area = DeliveryArea(**data)
    try:
        return crud.create(db, area)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A delivery area with this name already exists",
        ) from exc


def get_active_delivery_areas(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
):
    return _list_delivery_areas(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
        is_active=True,
    )


def get_delivery_areas(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    is_active: bool | None,
    sort_by: str,
    sort_order: str,
):
    return _list_delivery_areas(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
        is_active,
    )


def get_delivery_area(db: Session, area_id: int):
    area = crud.get_by_id(db, DeliveryArea, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Delivery area not found")
    return area


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
    area = crud.get_by_id(db, DeliveryArea, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Delivery area not found")

    data = area_data.model_dump(exclude_unset=True)
    _ensure_unique_names(
        db,
        data.get("name_ar"),
        data.get("name_en"),
        area_id,
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
    area = crud.get_by_id(db, DeliveryArea, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Delivery area not found")

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
