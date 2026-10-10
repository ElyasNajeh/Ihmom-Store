from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.categories import service
from app.features.categories.schema import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=CategoryListResponse)
def get_active_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    sort_by: Literal["id", "created_at", "name_ar", "name_en"] = Query(
        "name_en"
    ),
    sort_order: Literal["asc", "desc"] = Query("asc"),
    db: Session = Depends(get_db),
):
    return service.get_active_categories(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
    )


@router.get("/admin/all", response_model=CategoryListResponse)
def get_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    is_active: bool | None = Query(None),
    sort_by: Literal["id", "created_at", "name_ar", "name_en"] = Query(
        "created_at"
    ),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_categories(
        db,
        page,
        page_size,
        search,
        is_active,
        sort_by,
        sort_order,
    )


@router.get("/admin/{category_id}", response_model=CategoryResponse)
def get_category_for_admin(
    category_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_category(db, category_id)


@router.post(
    "/",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.create_category(db, category_data)


@router.get("/{category_id}", response_model=CategoryResponse)
def get_active_category(
    category_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
):
    return service.get_active_category(db, category_id)


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: Annotated[int, Path(ge=1)],
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.update_category(db, category_id, category_data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_category(db, category_id)
