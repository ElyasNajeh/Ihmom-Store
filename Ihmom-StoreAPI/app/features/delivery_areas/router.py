
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
from app.features.delivery_areas import service
from app.features.delivery_areas.schema import (
    DeliveryAreaCreate,
    DeliveryAreaListResponse,
    DeliveryAreaQuery,
    DeliveryAreaResponse,
    DeliveryAreaSortBy,
    DeliveryAreaUpdate,
    PublicDeliveryAreaListResponse,
    PublicDeliveryAreaResponse,
)
from app.constants.query import SortDirection
from app.shared.query import QueryRules, parse_query


router = APIRouter(prefix="/delivery-areas", tags=["Delivery Areas"])


def validate_delivery_area_query(
    request: Request,
    page: int = Query(1, ge=1, le=1000),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=150),
    is_active: bool | None = Query(None, alias="filter[is_active]"),
    min_delivery_fee: Annotated[
        str | None,
        Query(alias="filter[min_delivery_fee]"),
    ] = None,
    max_delivery_fee: Annotated[
        str | None,
        Query(alias="filter[max_delivery_fee]"),
    ] = None,
    sort_by: DeliveryAreaSortBy | None = Query(None),
    order: SortDirection | None = Query(None),
) -> DeliveryAreaQuery:
    return parse_query(
        request,
        DeliveryAreaQuery,
        values={
            "page": page,
            "page_size": page_size,
            "search": search,
            "sort_by": sort_by,
            "order": order,
        },
        filters={
            "is_active": is_active,
            "min_delivery_fee": min_delivery_fee,
            "max_delivery_fee": max_delivery_fee,
        },
        rules=QueryRules.create(
            declared={
                "page",
                "page_size",
                "search",
                "filter[is_active]",
                "filter[min_delivery_fee]",
                "filter[max_delivery_fee]",
                "sort_by",
                "order",
            },
            filter_fields={
                "is_active",
                "min_delivery_fee",
                "max_delivery_fee",
            },
            sort_order_alias=True,
        ),
    )


@router.get("/", response_model=PublicDeliveryAreaListResponse)
def get_active_delivery_areas(
    query_data: Annotated[
        DeliveryAreaQuery,
        Depends(validate_delivery_area_query),
    ],
    db: Session = Depends(get_db),
):
    return service.get_active_delivery_areas(db, query_data)


@router.get("/admin/all", response_model=DeliveryAreaListResponse)
def get_delivery_areas(
    query_data: Annotated[
        DeliveryAreaQuery,
        Depends(validate_delivery_area_query),
    ],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_delivery_areas(db, query_data)


@router.get("/admin/{area_id}", response_model=DeliveryAreaResponse)
def get_delivery_area_for_admin(
    area_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_delivery_area(db, area_id)


@router.post(
    "/",
    response_model=DeliveryAreaResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_delivery_area(
    area_data: DeliveryAreaCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.create_delivery_area(db, area_data)


@router.get("/{area_id}", response_model=PublicDeliveryAreaResponse)
def get_active_delivery_area(
    area_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
):
    return service.get_active_delivery_area(db, area_id)


@router.patch("/{area_id}", response_model=DeliveryAreaResponse)
def update_delivery_area(
    area_id: Annotated[int, Path(ge=1)],
    area_data: DeliveryAreaUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.update_delivery_area(db, area_id, area_data)


@router.delete("/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_area(
    area_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_delivery_area(db, area_id)
