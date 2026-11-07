
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Path,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.categories import service
from app.features.categories.schema import (
    CategoryCreate,
    CategoryImageResponse,
    CategoryListResponse,
    CategoryQuery,
    CategoryResponse,
    CategorySortBy,
    CategoryUpdate,
)
from app.constants.query import SortDirection
from app.shared.query import QueryRules, parse_query


router = APIRouter(prefix="/categories", tags=["Categories"])


def validate_category_query(
    request: Request,
    page: int = Query(1, ge=1, le=1000),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
    filter_is_active: bool | None = Query(None, alias="filter[is_active]"),
    sort_by: CategorySortBy | None = Query(None),
    order: SortDirection | None = Query(None),
) -> CategoryQuery:
    return parse_query(
        request,
        CategoryQuery,
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


@router.get("/", response_model=CategoryListResponse)
def get_active_categories(
    query_data: Annotated[CategoryQuery, Depends(validate_category_query)],
    db: Session = Depends(get_db),
):
    return service.get_active_categories(db, query_data)


@router.get("/admin/all", response_model=CategoryListResponse)
def get_categories(
    query_data: Annotated[CategoryQuery, Depends(validate_category_query)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_categories(db, query_data)


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


@router.get(
    "/{category_id}/images",
    response_model=list[CategoryImageResponse],
)
def list_category_images(
    category_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.list_category_images(db, category_id)


@router.post(
    "/{category_id}/images",
    response_model=list[CategoryImageResponse],
    status_code=status.HTTP_201_CREATED,
)
def upload_category_images(
    category_id: Annotated[int, Path(ge=1)],
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.upload_category_images(db, category_id, files)


@router.patch(
    "/{category_id}/images/{image_id}/set-primary",
    response_model=CategoryImageResponse,
)
def set_primary_category_image(
    category_id: Annotated[int, Path(ge=1)],
    image_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.set_primary_category_image(db, category_id, image_id)


@router.delete(
    "/{category_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_category_image(
    category_id: Annotated[int, Path(ge=1)],
    image_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_category_image(db, category_id, image_id)
