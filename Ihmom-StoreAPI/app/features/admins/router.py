
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Request, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins import service
from app.features.admins.model import Admin
from app.features.admins.schema import AdminCreate, AdminResponse, AdminQuery, AdminSortBy
from app.constants.query import SortDirection
from app.constants.query import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.shared.query import QueryRules, parse_query
from app.shared.schema import PageResponse


router = APIRouter(
    prefix='/admins',
    tags=['Admins'],
    dependencies=[Depends(get_current_admin)],
)


def validate_admin_query(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    search: str | None = Query(None, min_length=1, max_length=200),
    sort_by: AdminSortBy | None = Query(None),
    order: SortDirection | None = Query(None),
) -> AdminQuery:
    return parse_query(
        request,
        AdminQuery,
        values={
            "page": page,
            "page_size": page_size,
            "search": search,
            "sort_by": sort_by,
            "order": order,
        },
        rules=QueryRules.create(
            declared={"page", "page_size", "search", "sort_by", "order"},
        ),
    )


@router.post(
    '/',
    response_model=AdminResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admin(
    admin_data: AdminCreate,
    db: Session = Depends(get_db),
):
    return service.create_admin(db, admin_data)


@router.get('/', response_model=PageResponse[AdminResponse])
def get_admins(
    query: Annotated[AdminQuery, Depends(validate_admin_query)],
    db: Session = Depends(get_db),
):
    return service.get_admins(db, query)


@router.get('/{admin_id}', response_model=AdminResponse)
def get_admin(
    admin_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
):
    return service.get_admin(db, admin_id)


@router.delete(
    '/{admin_id}',
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_admin(
    admin_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_admin(db, admin_id, current_admin.id)
