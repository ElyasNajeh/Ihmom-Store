from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.brands import service
from app.features.brands.schema import (
    BrandCreate,
    BrandListResponse,
    BrandResponse,
    BrandUpdate,
)

router = APIRouter(prefix="/brands", tags=["Brands"])


@router.get("/", response_model=BrandListResponse)
def get_active_brands(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    sort_by: Literal["id", "created_at", "name_ar", "name_en"] = Query(
        "name_en"
    ),
    sort_order: Literal["asc", "desc"] = Query("asc"),
    db: Session = Depends(get_db),
):
    return service.get_active_brands(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
    )


@router.get("/admin/all", response_model=BrandListResponse)
def get_brands(
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
    return service.get_brands(
        db,
        page,
        page_size,
        search,
        is_active,
        sort_by,
        sort_order,
    )


@router.get("/admin/{brand_id}", response_model=BrandResponse)
def get_brand_for_admin(
    brand_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_brand(db, brand_id)


@router.post(
    "/",
    response_model=BrandResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_brand(
    brand_data: BrandCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.create_brand(db, brand_data)


@router.get("/{brand_id}", response_model=BrandResponse)
def get_active_brand(
    brand_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
):
    return service.get_active_brand(db, brand_id)


@router.patch("/{brand_id}", response_model=BrandResponse)
def update_brand(
    brand_id: Annotated[int, Path(ge=1)],
    brand_data: BrandUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.update_brand(db, brand_id, brand_data)


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_brand(db, brand_id)
