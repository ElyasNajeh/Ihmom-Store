from collections.abc import Mapping, Sequence
from typing import Any, TypeVar

from sqlalchemy.orm import Query, Session


ModelType = TypeVar("ModelType")


def get_by_id(
    db: Session,
    model: type[ModelType],
    record_id: Any,
) -> ModelType | None:
    return db.query(model).filter(model.id == record_id).first()


def paginate(
    query: Query,
    page: int,
    page_size: int,
    *,
    order_by: Sequence[Any] = (),
) -> dict[str, Any]:
    if page < 1:
        raise ValueError("page must be greater than or equal to 1")
    if page_size < 1:
        raise ValueError("page_size must be greater than or equal to 1")

    total = query.order_by(None).count()

    if order_by:
        query = query.order_by(*order_by)

    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


def create(db: Session, db_obj: ModelType) -> ModelType:
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_by_id(
    db: Session,
    model: type[ModelType],
    record_id: Any,
    values: Mapping[str, Any],
    *,
    db_obj: ModelType | None = None,
) -> ModelType | None:
    target = db_obj if db_obj is not None else get_by_id(db, model, record_id)
    if target is None:
        return None

    for field, value in values.items():
        setattr(target, field, value)

    db.commit()
    db.refresh(target)
    return target


def delete_by_id(
    db: Session,
    model: type[ModelType],
    record_id: Any,
    *,
    db_obj: ModelType | None = None,
) -> ModelType | None:
    target = db_obj if db_obj is not None else get_by_id(db, model, record_id)
    if target is None:
        return None

    db.delete(target)
    db.commit()
    return target
