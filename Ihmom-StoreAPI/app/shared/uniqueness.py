from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session


def ensure_unique_names(
    db: Session,
    model: Any,
    *,
    name_ar: str | None,
    name_en: str | None,
    label: str,
    exclude_id: int | None = None,
) -> None:
    """Reject duplicate bilingual names on models that expose name_ar/name_en."""
    name_filters = []
    if name_ar is not None:
        name_filters.append(model.name_ar == name_ar)
    if name_en is not None:
        name_filters.append(model.name_en == name_en)

    if not name_filters:
        return

    duplicate_filter = name_filters[0]
    if len(name_filters) == 2:
        duplicate_filter = duplicate_filter | name_filters[1]

    query = db.query(model.name_ar, model.name_en).filter(duplicate_filter)
    if exclude_id is not None:
        query = query.filter(model.id != exclude_id)

    existing_names = query.all()
    if name_ar is not None and any(row.name_ar == name_ar for row in existing_names):
        raise HTTPException(
            status_code=409,
            detail=f"A {label} with this Arabic name already exists",
        )
    if name_en is not None and any(row.name_en == name_en for row in existing_names):
        raise HTTPException(
            status_code=409,
            detail=f"A {label} with this English name already exists",
        )
