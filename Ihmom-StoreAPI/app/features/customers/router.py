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
from app.features.customers import service
from app.features.customers.schema import (
    CustomerCreate,
    CustomerListResponse,
    CustomerQuery,
    CustomerResponse,
    CustomerSortBy,
    CustomerUpdate,
)
from app.constants.query import SortDirection
from app.shared.query import QueryRules, parse_query

router = APIRouter(prefix="/customers", tags=["Customers"])

def validate_customer_query(
    request: Request,
    page: int = Query(1, ge=1, le=1000),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=150),
    sort_by: CustomerSortBy | None = Query(None),
    order: SortDirection | None = Query(None),
) -> CustomerQuery:
    return parse_query(
        request,
        CustomerQuery,
        values={
            "page": page,
            "page_size": page_size,
            "search": search,
            "sort_by": sort_by,
            "order": order,
        },
        rules=QueryRules.create(
            declared={"page", "page_size", "search", "sort_by", "order"},
            sort_order_alias=True,
        ),
    )
    
@router.get("/", response_model=CustomerListResponse)
def get_customers(
    query_data: Annotated[CustomerQuery, Depends(validate_customer_query)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_customers(db, query_data)


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_customer(db, customer_id)


@router.post(
    "/",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.create_customer(db, customer_data)


@router.patch("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: Annotated[int, Path(ge=1)],
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.update_customer(db, customer_id, customer_data)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_customer(db, customer_id)
