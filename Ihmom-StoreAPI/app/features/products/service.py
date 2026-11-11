
from decimal import Decimal

from fastapi import HTTPException, UploadFile
from sqlalchemy import and_, exists, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.orders.model import OrderItem
from app.features.products.model import Product, ProductImage, ProductVariant
from app.features.products.schema import (
    ProductCreate,
    ProductQuery,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantUpdate,
)
from app.shared import crud, image_collection
from app.constants.images import PRODUCT_IMAGE_SUBDIRECTORY
from app.constants.products import (
    DEFAULT_VARIANT_NAME,
    PRODUCT_SORT_CREATED_AT,
    PRODUCT_SORT_ID,
    PRODUCT_SORT_NAME_AR,
    PRODUCT_SORT_NAME_EN,
    PRODUCT_SORT_PRICE,
)
from app.shared.image_cleanup import delete_unused_uploaded_image
from app.shared.image_collection import ImageCollection
from app.shared.images import optimize_product_upload
from app.shared.search import ilike_any
from app.shared.sorting import build_order_by


PRODUCT_IMAGES = ImageCollection(
    image_model=ProductImage,
    owner_model=Product,
    owner_key="product_id",
    subdirectory=PRODUCT_IMAGE_SUBDIRECTORY,
    label="Product",
    save_upload=optimize_product_upload,
)


def product_query(db: Session):
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.brand),
        selectinload(Product.variants),
        selectinload(Product.images),
    )


def _active_starting_price():
    return (
        select(func.min(ProductVariant.price))
        .where(
            ProductVariant.product_id == Product.id,
            ProductVariant.is_active.is_(True),
        )
        .correlate(Product)
        .scalar_subquery()
    )


def _admin_starting_price():
    return (
        select(func.min(ProductVariant.price))
        .where(ProductVariant.product_id == Product.id)
        .correlate(Product)
        .scalar_subquery()
    )


def _is_default_variant(variant: ProductVariant) -> bool:
    return (
        variant.name_ar == DEFAULT_VARIANT_NAME
        and variant.name_en == DEFAULT_VARIANT_NAME
    )


def _is_simple_product(product: Product) -> bool:
    return len(product.variants) == 1 and _is_default_variant(product.variants[0])


def _public_product(product: Product) -> dict:
    active_variants = sorted(
        (variant for variant in product.variants if variant.is_active),
        key=lambda variant: variant.id,
    )
    simple_product = _is_simple_product(product)
    variants = []

    for variant in active_variants:
        item = {
            "id": variant.id,
            "price": variant.price,
        }
        if not simple_product:
            item["name_ar"] = variant.name_ar
            item["name_en"] = variant.name_en
        variants.append(item)

    images = sorted(
        product.images,
        key=lambda image: (not image.is_primary, image.id),
    )

    return {
        "id": product.id,
        "category_id": product.category_id,
        "brand_id": product.brand_id,
        "name_ar": product.name_ar,
        "name_en": product.name_en,
        "description_ar": product.description_ar,
        "description_en": product.description_en,
        "starting_price": min(variant.price for variant in active_variants),
        "has_selectable_variants": not simple_product,
        "category": product.category,
        "brand": product.brand,
        "variants": variants,
        "images": images,
    }


def _filter_products(
    query,
    category_id: int | None,
    brand_id: int | None,
    search: str | None,
):
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    if brand_id is not None:
        query = query.filter(Product.brand_id == brand_id)

    search_filter = ilike_any([Product.name_ar, Product.name_en], search)
    if search_filter is not None:
        query = query.filter(search_filter)

    return query


def _validate_price_range(
    min_price: Decimal | None,
    max_price: Decimal | None,
) -> None:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=422,
            detail="Minimum price must not exceed maximum price",
        )


def _ensure_category_and_brand(
    db: Session,
    category_id: int,
    brand_id: int,
) -> None:
    if not db.query(Category.id).filter(Category.id == category_id).first():
        raise HTTPException(status_code=404, detail="Category not found")

    if not db.query(Brand.id).filter(Brand.id == brand_id).first():
        raise HTTPException(status_code=404, detail="Brand not found")


def _ensure_skus_available(
    db: Session,
    skus: list[str | None],
    exclude_variant_id: int | None = None,
) -> None:
    values = [sku for sku in skus if sku is not None]
    if not values:
        return

    if len(values) != len(set(values)):
        raise HTTPException(status_code=409, detail="SKU already exists")

    query = db.query(ProductVariant.id).filter(ProductVariant.sku.in_(values))

    if exclude_variant_id is not None:
        query = query.filter(ProductVariant.id != exclude_variant_id)

    if query.first():
        raise HTTPException(status_code=409, detail="SKU already exists")


def _public_visibility_query(db: Session):
    return (
        product_query(db)
        .join(Category, Product.category_id == Category.id)
        .join(Brand, Product.brand_id == Brand.id)
        .filter(
            Product.is_active.is_(True),
            Category.is_active.is_(True),
            Brand.is_active.is_(True),
            Product.variants.any(ProductVariant.is_active.is_(True)),
        )
    )


def _price_filter_conditions(
    min_price: Decimal | None,
    max_price: Decimal | None,
    active_only: bool,
):
    conditions = [ProductVariant.product_id == Product.id]

    if active_only:
        conditions.append(ProductVariant.is_active.is_(True))

    if min_price is not None:
        conditions.append(ProductVariant.price >= min_price)

    if max_price is not None:
        conditions.append(ProductVariant.price <= max_price)

    return conditions


def _product_order_by(
    sort_by: str,
    sort_order: str,
    is_admin: bool,
):
    sortable_fields = {
        PRODUCT_SORT_ID: Product.id,
        PRODUCT_SORT_CREATED_AT: Product.created_at,
        PRODUCT_SORT_NAME_AR: Product.name_ar,
        PRODUCT_SORT_NAME_EN: Product.name_en,
        PRODUCT_SORT_PRICE: (
            _admin_starting_price()
            if is_admin
            else _active_starting_price()
        ),
    }

    return build_order_by(
        sortable_fields[sort_by],
        sort_order,
        Product.id,
        sort_is_id=sort_by == PRODUCT_SORT_ID,
        nulls_last=sort_by == PRODUCT_SORT_PRICE,
    )


def get_products_shared(
    db: Session,
    query_data: ProductQuery,
    is_admin: bool,
):
    filters = query_data.filter

    _validate_price_range(filters.min_price, filters.max_price)

    if is_admin:
        query = _filter_products(
            product_query(db),
            filters.category_id,
            filters.brand_id,
            query_data.search,
        )

        if filters.is_active is not None:
            query = query.filter(Product.is_active.is_(filters.is_active))

        if filters.min_price is not None or filters.max_price is not None:
            query = query.filter(
                exists().where(
                    and_(
                        *_price_filter_conditions(
                            filters.min_price,
                            filters.max_price,
                            active_only=False,
                        )
                    )
                )
            )

        if query_data.ids is not None:
            query = query.filter(Product.id.in_(set(query_data.ids)))

        return crud.paginate(
            query,
            query_data.page,
            query_data.page_size,
            order_by=_product_order_by(
                query_data.sort_by,
                query_data.order,
                is_admin=True,
            ),
        )

    query = _filter_products(
        _public_visibility_query(db),
        filters.category_id,
        filters.brand_id,
        query_data.search,
    )

    if query_data.ids is not None:
        query = query.filter(Product.id.in_(set(query_data.ids)))

    if filters.min_price is not None or filters.max_price is not None:
        query = query.filter(
            exists().where(
                and_(
                    *_price_filter_conditions(
                        filters.min_price,
                        filters.max_price,
                        active_only=True,
                    )
                )
            )
        )

    result = crud.paginate(
        query,
        query_data.page,
        query_data.page_size,
        order_by=_product_order_by(
            query_data.sort_by,
            query_data.order,
            is_admin=False,
        ),
    )

    result["items"] = [
        _public_product(product)
        for product in result["items"]
    ]
    return result


def get_product_shared(
    db: Session,
    product_id: int,
    is_admin: bool,
):
    if is_admin:
        return get_product_for_admin(db, product_id)

    return get_product(db, product_id)


def create_product(
    db: Session,
    product_data: ProductCreate,
    *,
    commit: bool = True,
):
    _ensure_category_and_brand(
        db,
        product_data.category_id,
        product_data.brand_id,
    )

    if product_data.variants is None:
        variant_values = [
            {
                "name_ar": DEFAULT_VARIANT_NAME,
                "name_en": DEFAULT_VARIANT_NAME,
                "sku": product_data.sku,
                "price": product_data.price,
                "is_active": True,
            }
        ]
    else:
        variant_values = [
            variant.model_dump()
            for variant in product_data.variants
        ]

    _ensure_skus_available(
        db,
        [variant["sku"] for variant in variant_values],
    )

    product_values = product_data.model_dump(
        exclude={"price", "sku", "variants"}
    )
    product = Product(**product_values)

    try:
        db.add(product)
        db.flush()
        db.add_all(
            ProductVariant(product_id=product.id, **values)
            for values in variant_values
        )
        if commit:
            db.commit()
        else:
            db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Product could not be created because related data or a SKU changed",
        ) from exc
    except Exception:
        db.rollback()
        raise

    return get_product_for_admin(db, product.id)


def get_product(db: Session, product_id: int):
    product = (
        _public_visibility_query(db)
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return _public_product(product)


def get_products_by_ids(db: Session, product_ids: list[int]):
    products = (
        _public_visibility_query(db)
        .filter(Product.id.in_(set(product_ids)))
        .order_by(Product.id.asc())
        .all()
    )
    return [_public_product(product) for product in products]


def get_product_recommendations(db: Session, product_id: int, limit: int):
    selected_product = (
        _public_visibility_query(db)
        .filter(Product.id == product_id)
        .first()
    )
    if not selected_product:
        raise HTTPException(status_code=404, detail="Product not found")

    products = (
        _public_visibility_query(db)
        .filter(Product.id != product_id)
        .order_by(
            (Product.category_id == selected_product.category_id).desc(),
            Product.created_at.desc(),
            Product.id.desc(),
        )
        .limit(limit)
        .all()
    )

    return [_public_product(product) for product in products]


def get_product_for_admin(db: Session, product_id: int):
    product = product_query(db).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


def update_product(db: Session, product_id: int, product_data: ProductUpdate):
    product = crud.get_locked_or_404(
        db,
        Product,
        product_id,
        detail="Product not found",
    )

    data = product_data.model_dump(exclude_unset=True)
    category_id = data.get("category_id", product.category_id)
    brand_id = data.get("brand_id", product.brand_id)

    if "category_id" in data or "brand_id" in data:
        _ensure_category_and_brand(db, category_id, brand_id)

    if not data:
        db.rollback()
        return get_product_for_admin(db, product_id)

    if data.get("is_active") is True:
        active_variant = (
            db.query(ProductVariant.id)
            .filter(
                ProductVariant.product_id == product_id,
                ProductVariant.is_active.is_(True),
            )
            .first()
        )
        if not active_variant:
            raise HTTPException(
                status_code=409,
                detail="An active product requires an active variant",
            )

    try:
        for field, value in data.items():
            setattr(product, field, value)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Product could not be updated because related data changed",
        ) from exc
    except Exception:
        db.rollback()
        raise

    return get_product_for_admin(db, product_id)


def delete_product(db: Session, product_id: int) -> None:
    product = crud.get_locked_or_404(
        db,
        Product,
        product_id,
        detail="Product not found",
    )

    variant_ids = [
        row.id
        for row in db.query(ProductVariant.id)
        .filter(ProductVariant.product_id == product_id)
        .all()
    ]

    if variant_ids and (
        db.query(OrderItem.id)
        .filter(OrderItem.product_variant_id.in_(variant_ids))
        .first()
    ):
        raise HTTPException(
            status_code=409,
            detail="Product cannot be deleted because it is referenced by orders",
        )

    image_paths = [
        row.image
        for row in db.query(ProductImage.image)
        .filter(ProductImage.product_id == product_id)
        .all()
    ]

    try:
        db.delete(product)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Product cannot be deleted because it is referenced by orders",
        ) from exc
    except Exception:
        db.rollback()
        raise

    for image_path in set(image_paths):
        delete_unused_uploaded_image(
            db,
            ProductImage.image,
            image_path,
            PRODUCT_IMAGE_SUBDIRECTORY,
        )


def list_variants(db: Session, product_id: int):
    if not db.query(Product.id).filter(Product.id == product_id).first():
        raise HTTPException(status_code=404, detail="Product not found")

    return (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product_id)
        .order_by(ProductVariant.id.asc())
        .all()
    )


def create_variant(
    db: Session,
    product_id: int,
    variant_data: ProductVariantCreate,
):
    product = crud.get_locked_or_404(
        db,
        Product,
        product_id,
        detail="Product not found",
    )

    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product_id)
        .order_by(ProductVariant.id.asc())
        .all()
    )
    default_variant = (
        variants[0]
        if len(variants) == 1 and _is_default_variant(variants[0])
        else None
    )

    if default_variant and (
        db.query(OrderItem.id)
        .filter(OrderItem.product_variant_id == default_variant.id)
        .first()
    ):
        raise HTTPException(
            status_code=409,
            detail="Selectable variants cannot replace a default variant used by orders",
        )

    data = variant_data.model_dump()
    _ensure_skus_available(
        db,
        [data["sku"]],
        exclude_variant_id=default_variant.id if default_variant else None,
    )

    remaining_active = any(
        variant.is_active and variant is not default_variant
        for variant in variants
    )
    if product.is_active and not (remaining_active or data["is_active"]):
        raise HTTPException(
            status_code=409,
            detail="An active product requires an active variant",
        )

    variant = ProductVariant(product_id=product_id, **data)

    try:
        if default_variant:
            db.delete(default_variant)
            db.flush()

        db.add(variant)
        db.commit()
        return variant
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="SKU already exists") from exc
    except Exception:
        db.rollback()
        raise


def update_variant(
    db: Session,
    product_id: int,
    variant_id: int,
    variant_data: ProductVariantUpdate,
):
    product = crud.get_locked_or_404(
        db,
        Product,
        product_id,
        detail="Product not found",
    )

    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        )
        .first()
    )
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found")

    data = variant_data.model_dump(exclude_unset=True)
    if not data:
        db.rollback()
        return (
            db.query(ProductVariant)
            .filter(ProductVariant.id == variant_id)
            .first()
        )

    if _is_default_variant(variant) and (
        ("name_ar" in data and data["name_ar"] != DEFAULT_VARIANT_NAME)
        or ("name_en" in data and data["name_en"] != DEFAULT_VARIANT_NAME)
    ):
        raise HTTPException(
            status_code=409,
            detail="The internal default variant name cannot be changed",
        )

    if not _is_default_variant(variant) and (
        data.get("name_ar", variant.name_ar) == DEFAULT_VARIANT_NAME
        and data.get("name_en", variant.name_en) == DEFAULT_VARIANT_NAME
    ):
        raise HTTPException(
            status_code=409,
            detail="The internal default variant name is reserved",
        )

    if "sku" in data:
        _ensure_skus_available(
            db,
            [data["sku"]],
            exclude_variant_id=variant_id,
        )

    effective_active = data.get("is_active", variant.is_active)
    if product.is_active and not effective_active:
        other_active = (
            db.query(ProductVariant.id)
            .filter(
                ProductVariant.product_id == product_id,
                ProductVariant.id != variant_id,
                ProductVariant.is_active.is_(True),
            )
            .first()
        )
        if not other_active:
            raise HTTPException(
                status_code=409,
                detail="An active product requires an active variant",
            )

    try:
        for field, value in data.items():
            setattr(variant, field, value)
        db.commit()
        return variant
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="SKU already exists") from exc
    except Exception:
        db.rollback()
        raise


def delete_variant(db: Session, product_id: int, variant_id: int) -> None:
    product = crud.get_locked_or_404(
        db,
        Product,
        product_id,
        detail="Product not found",
    )

    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        )
        .first()
    )
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found")

    variant_count = (
        db.query(func.count(ProductVariant.id))
        .filter(ProductVariant.product_id == product_id)
        .scalar()
    )
    if variant_count <= 1:
        raise HTTPException(
            status_code=409,
            detail="The last product variant cannot be deleted",
        )

    if (
        db.query(OrderItem.id)
        .filter(OrderItem.product_variant_id == variant_id)
        .first()
    ):
        raise HTTPException(
            status_code=409,
            detail="Product variant cannot be deleted because it is referenced by orders",
        )

    if product.is_active and variant.is_active:
        other_active = (
            db.query(ProductVariant.id)
            .filter(
                ProductVariant.product_id == product_id,
                ProductVariant.id != variant_id,
                ProductVariant.is_active.is_(True),
            )
            .first()
        )
        if not other_active:
            raise HTTPException(
                status_code=409,
                detail="An active product requires an active variant",
            )

    try:
        db.delete(variant)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Product variant cannot be deleted because it is referenced by orders",
        ) from exc
    except Exception:
        db.rollback()
        raise


def list_product_images(db: Session, product_id: int):
    return image_collection.list_images(db, PRODUCT_IMAGES, product_id)


def upload_product_images(
    db: Session,
    product_id: int,
    files: list[UploadFile],
):
    crud.get_locked_or_404(
        db,
        Product,
        product_id,
        detail="Product not found",
    )
    return image_collection.upload_images(
        db,
        PRODUCT_IMAGES,
        product_id,
        files,
    )


def set_primary_image(db: Session, product_id: int, image_id: int):
    crud.get_locked_or_404(
        db,
        Product,
        product_id,
        detail="Product not found",
    )
    return image_collection.set_primary_image(
        db,
        PRODUCT_IMAGES,
        product_id,
        image_id,
    )


def delete_product_image(db: Session, product_id: int, image_id: int) -> None:
    crud.get_locked_or_404(
        db,
        Product,
        product_id,
        detail="Product not found",
    )
    image_collection.delete_image(db, PRODUCT_IMAGES, product_id, image_id)
