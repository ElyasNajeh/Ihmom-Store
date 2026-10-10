from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, File, Path, Query, UploadFile, status
from pydantic import Field
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.products import service
from app.features.products.schema import (
    ProductAdminSort,
    ProductCreate,
    ProductImageResponse,
    ProductListResponse,
    ProductResponse,
    ProductSort,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
    PublicProductListResponse,
    PublicProductResponse,
    SortOrder,
)

router = APIRouter(prefix="/products", tags=["Products"])

ProductId = Annotated[int, Field(ge=1)]


@router.get(
    "/",
    response_model=PublicProductListResponse,
    response_model_exclude_none=True,
)
def get_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    category_id: int | None = Query(None, ge=1),
    brand_id: int | None = Query(None, ge=1),
    search: str | None = Query(None, max_length=200),
    min_price: Decimal | None = Query(
        None,
        ge=0,
        max_digits=10,
        decimal_places=2,
    ),
    max_price: Decimal | None = Query(
        None,
        ge=0,
        max_digits=10,
        decimal_places=2,
    ),
    sort: ProductSort = Query("newest"),
    ids: Annotated[list[ProductId] | None, Query()] = None,
    db: Session = Depends(get_db),
):
    return service.get_products(
        db,
        page,
        page_size,
        category_id,
        brand_id,
        search,
        min_price,
        max_price,
        sort,
        ids,
    )


@router.get("/admin/all", response_model=ProductListResponse)
def get_products_for_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    category_id: int | None = Query(None, ge=1),
    brand_id: int | None = Query(None, ge=1),
    search: str | None = Query(None, max_length=200),
    is_active: bool | None = Query(None),
    sort_by: ProductAdminSort = Query("created_at"),
    sort_order: SortOrder = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_products_for_admin(
        db,
        page,
        page_size,
        category_id,
        brand_id,
        search,
        is_active,
        sort_by,
        sort_order,
    )


@router.get("/admin/{product_id}", response_model=ProductResponse)
def get_product_for_admin(
    product_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_product_for_admin(db, product_id)


@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.create_product(db, product_data)


@router.get(
    "/by-ids",
    response_model=list[PublicProductResponse],
    response_model_exclude_none=True,
)
def get_products_by_ids(
    ids: Annotated[list[ProductId], Query(min_length=1, max_length=100)],
    db: Session = Depends(get_db),
):
    return service.get_products_by_ids(db, ids)


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
    response_model=PublicProductResponse,
    response_model_exclude_none=True,
)
def get_product(
    product_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
):
    return service.get_product(db, product_id)


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
    return service.update_variant(db, product_id, variant_id, variant_data)


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
