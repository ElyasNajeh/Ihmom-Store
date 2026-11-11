
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Path,
    Query,
    Request,
    status,
)
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.brands import service
from app.features.brands.schema import (
    BrandCreate,
    BrandListResponse,
    BrandQuery,
    BrandResponse,
    BrandUpdate, BrandSortBy,
)
from app.constants.query import SortDirection
from app.shared.query import QueryRules, parse_query

router = APIRouter(prefix="/brands", tags=["Brands"])


def validate_brand_query(
    request: Request,
    page: int = Query(1, ge=1, le=1000),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
    filter_is_active: bool | None = Query(
        None,
        alias="filter[is_active]",
    ),
    sort_by: BrandSortBy | None = Query(None),
    order: SortDirection | None = Query(None),
) -> BrandQuery:
    return parse_query(
        request,
        BrandQuery,
        values={
            "page": page,
            "page_size": page_size,
            "search": search,
            "sort_by": sort_by,
            "order": order,
        },
        filters={"is_active": filter_is_active},
        rules=QueryRules.create(
            declared={
                "page",
                "page_size",
                "search",
                "filter[is_active]",
                "sort_by",
                "order",
            },
            filter_fields={"is_active"},
            bare_filter_aliases=True,
            sort_order_alias=True,
        ),
    )

@router.get("/", response_model=BrandListResponse)
def get_active_brands(
    query_data: Annotated[BrandQuery, Depends(validate_brand_query)],
    db: Session = Depends(get_db),
):
    return service.get_active_brands(db, query_data)


@router.get("/admin/all", response_model=BrandListResponse)
def get_brands(
    query_data: Annotated[BrandQuery, Depends(validate_brand_query)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_brands(db, query_data)


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
