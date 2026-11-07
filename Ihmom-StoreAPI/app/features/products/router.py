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
from pydantic import Field
from sqlalchemy.orm import Session

from app.constants.query import SortDirection
from app.core.security import get_current_admin, get_optional_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.products import service
from app.features.products.schema import (
    ProductCreate,
    ProductImageResponse,
    ProductListResponse,
    ProductQuery,
    ProductResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
    PublicProductListResponse,
    PublicProductResponse, ProductSortBy,
)
from app.shared.query import QueryRules, parse_query

router = APIRouter(prefix="/products", tags=["Products"])

ProductId = Annotated[int, Field(ge=1)]

def validate_product_query(
    request: Request,
    page: int = Query(1, ge=1, le=1000),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=200),
    category_id: int | None = Query(
        None,
        ge=1,
        alias="filter[category_id]",
    ),
    brand_id: int | None = Query(
        None,
        ge=1,
        alias="filter[brand_id]",
    ),
    is_active: bool | None = Query(None, alias="filter[is_active]"),
    min_price: str | None = Query(None, alias="filter[min_price]"),
    max_price: str | None = Query(None, alias="filter[max_price]"),
    sort_by: ProductSortBy | None = Query(None),
    order: SortDirection | None = Query(None),
    ids: list[int] | None = Query(None, min_length=1, max_length=100),
) -> ProductQuery:
    return parse_query(
        request,
        ProductQuery,
        values={
            "page": page,
            "page_size": page_size,
            "search": search,
            "sort_by": sort_by,
            "order": order,
            "ids": ids,
        },
        filters={
            "category_id": category_id,
            "brand_id": brand_id,
            "is_active": is_active,
            "min_price": min_price,
            "max_price": max_price,
        },
        rules=QueryRules.create(
            declared={
                "page",
                "page_size",
                "search",
                "filter[category_id]",
                "filter[brand_id]",
                "filter[is_active]",
                "filter[min_price]",
                "filter[max_price]",
                "sort_by",
                "order",
                "ids",
            },
            filter_fields={
                "category_id",
                "brand_id",
                "is_active",
                "min_price",
                "max_price",
            },
            repeatable={"ids"},
        ),
    )


@router.get(
    "/",
    response_model=ProductListResponse | PublicProductListResponse,
    response_model_exclude_none=True,
)
def get_products(
    query: Annotated[ProductQuery, Depends(validate_product_query)],
    db: Session = Depends(get_db),
    current_admin: Admin | None = Depends(get_optional_current_admin),
):
    return service.get_products_shared(
        db,
        query,
        is_admin=current_admin is not None,
    )


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=ProductResponse,
)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.create_product(db, product_data)


@router.get(
    "/{product_id}/recommendations",
    response_model=list[PublicProductResponse],
    response_model_exclude_none=True,
)
def get_product_recommendations(
    product_id: Annotated[int, Path(ge=1)],
    limit: int = Query(4, ge=1, le=20),
    db: Session = Depends(get_db),
):
    return service.get_product_recommendations(db, product_id, limit)


@router.get(
    "/{product_id}",
    response_model=ProductResponse | PublicProductResponse,
    response_model_exclude_none=True,
)
def get_product(
    product_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin | None = Depends(get_optional_current_admin),
):
    return service.get_product_shared(
        db,
        product_id,
        is_admin=current_admin is not None,
    )


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: Annotated[int, Path(ge=1)],
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.update_product(db, product_id, product_data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_product(db, product_id)


@router.get(
    "/{product_id}/variants",
    response_model=list[ProductVariantResponse],
)
def list_variants(
    product_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.list_variants(db, product_id)


@router.post(
    "/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_variant(
    product_id: Annotated[int, Path(ge=1)],
    variant_data: ProductVariantCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.create_variant(db, product_id, variant_data)


@router.patch(
    "/{product_id}/variants/{variant_id}",
    response_model=ProductVariantResponse,
)
def update_variant(
    product_id: Annotated[int, Path(ge=1)],
    variant_id: Annotated[int, Path(ge=1)],
    variant_data: ProductVariantUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.update_variant(
        db,
        product_id,
        variant_id,
        variant_data,
    )


@router.delete(
    "/{product_id}/variants/{variant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_variant(
    product_id: Annotated[int, Path(ge=1)],
    variant_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_variant(db, product_id, variant_id)


@router.get(
    "/{product_id}/images",
    response_model=list[ProductImageResponse],
)
def list_product_images(
    product_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.list_product_images(db, product_id)


@router.post(
    "/{product_id}/images",
    response_model=list[ProductImageResponse],
    status_code=status.HTTP_201_CREATED,
)
def upload_product_images(
    product_id: Annotated[int, Path(ge=1)],
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.upload_product_images(db, product_id, files)


@router.patch(
    "/{product_id}/images/{image_id}/set-primary",
    response_model=ProductImageResponse,
)
def set_primary_image(
    product_id: Annotated[int, Path(ge=1)],
    image_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.set_primary_image(db, product_id, image_id)


@router.delete(
    "/{product_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product_image(
    product_id: Annotated[int, Path(ge=1)],
    image_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_product_image(db, product_id, image_id)
