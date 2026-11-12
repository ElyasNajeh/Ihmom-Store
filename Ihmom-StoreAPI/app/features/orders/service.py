
import secrets
import hashlib
import json
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.config import settings
from app.core.security import OrderHistoryClaims, create_order_history_token
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.customers.service import get_or_create_customer
from app.features.delivery_areas.model import DeliveryArea
from app.features.orders.model import Order, OrderItem
from app.features.notifications.model import OrderNotification
from app.features.orders.schema import (
    CheckoutRequest,
    OrderQuery,
    OrderSortBy,
    OrderStatusUpdate,
)
from app.features.products.model import Product, ProductVariant
from app.shared import crud
from app.constants.common import ZERO_MONEY
from app.constants.orders import (
    ORDER_INITIAL_STATUS,
    ORDER_MONEY_MAX,
    ORDER_MONEY_QUANTUM,
    ORDER_NUMBER_ATTEMPTS,
    ORDER_NUMBER_PREFIX,
    ORDER_NUMBER_TOKEN_BYTES,
    ORDER_STATUS_TRANSITIONS,
)
from app.constants.products import DEFAULT_VARIANT_NAME
from app.constants.query import SortDirection
from app.shared.phone import normalize_phone, phone_identity
from app.shared.search import like_pattern
from app.shared.sorting import build_order_by


SORTABLE_FIELDS = {
    OrderSortBy.ID: Order.id,
    OrderSortBy.CREATED_AT: Order.created_at,
    OrderSortBy.TOTAL: Order.total,
    OrderSortBy.CUSTOMER_NAME: Order.customer_name,
    OrderSortBy.STATUS: Order.status,
}


def order_query(db: Session):
    return db.query(Order).options(
        joinedload(Order.delivery_area),
        selectinload(Order.items)
        .joinedload(OrderItem.product_variant)
        .joinedload(ProductVariant.product),
    )


def _generate_order_number() -> str:
    return f"{ORDER_NUMBER_PREFIX}{secrets.token_urlsafe(ORDER_NUMBER_TOKEN_BYTES)}"


def _is_order_number_collision(exc: IntegrityError) -> bool:
    diagnostic = getattr(exc.orig, "diag", None)
    constraint_name = getattr(diagnostic, "constraint_name", "") or ""
    if "order_number" in constraint_name.lower():
        return True
    return "order_number" in str(exc.orig).lower()


def _validate_money(value: Decimal, detail: str) -> Decimal:
    if not value.is_finite() or value < 0 or value > ORDER_MONEY_MAX:
        raise HTTPException(status_code=422, detail=detail)
    return value.quantize(ORDER_MONEY_QUANTUM)


def _checkout_order(order: Order) -> dict:
    return {
        "order_number": order.order_number,
        "status": order.status,
        "created_at": order.created_at,
        "customer_name": order.customer_name,
        "delivery_area_name_ar": order.delivery_area.name_ar,
        "delivery_area_name_en": order.delivery_area.name_en,
        "address": order.address,
        "items": order.items,
        "subtotal": order.subtotal,
        "delivery_fee": order.delivery_fee,
        "total": order.total,
    }


def _checkout_response(order: Order) -> dict:
    response = _checkout_order(order)
    response["history_access_token"] = create_order_history_token(
        order.customer_phone,
        order.order_number,
        timedelta(minutes=settings.ORDER_HISTORY_TOKEN_EXPIRE_MINUTES),
    )
    response["history_access_token_expires_in"] = (
        settings.ORDER_HISTORY_TOKEN_EXPIRE_MINUTES * 60
    )
    return response


def _request_fingerprint(checkout_data: CheckoutRequest) -> str:
    canonical = json.dumps(
        checkout_data.model_dump(mode="json"),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _get_idempotent_order(
    db: Session,
    idempotency_key: str,
    fingerprint: str,
) -> Order | None:
    order = (
        order_query(db)
        .filter(Order.idempotency_key == idempotency_key)
        .first()
    )
    if order is not None and order.request_fingerprint != fingerprint:
        raise HTTPException(
            status_code=409,
            detail="Idempotency key was already used with a different checkout payload",
        )
    return order


def _lock_checkout_catalog(
    db: Session,
    variant_ids: list[int],
):
    variant_references = (
        db.query(ProductVariant.id, ProductVariant.product_id)
        .filter(ProductVariant.id.in_(variant_ids))
        .all()
    )
    if len(variant_references) != len(variant_ids):
        raise HTTPException(
            status_code=422,
            detail="One or more selected items are unavailable",
        )

    product_ids = sorted({row.product_id for row in variant_references})
    products = (
        db.query(Product)
        .filter(Product.id.in_(product_ids))
        .order_by(Product.id.asc())
        .with_for_update()
        .all()
    )
    if len(products) != len(product_ids):
        raise HTTPException(
            status_code=422,
            detail="One or more selected items are unavailable",
        )

    category_ids = sorted({product.category_id for product in products})
    brand_ids = sorted({product.brand_id for product in products})
    categories = (
        db.query(Category)
        .filter(Category.id.in_(category_ids))
        .order_by(Category.id.asc())
        .with_for_update()
        .all()
    )
    brands = (
        db.query(Brand)
        .filter(Brand.id.in_(brand_ids))
        .order_by(Brand.id.asc())
        .with_for_update()
        .all()
    )
    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.id.in_(variant_ids))
        .order_by(ProductVariant.id.asc())
        .with_for_update()
        .all()
    )

    if (
        len(categories) != len(category_ids)
        or len(brands) != len(brand_ids)
        or len(variants) != len(variant_ids)
    ):
        raise HTTPException(
            status_code=422,
            detail="One or more selected items are unavailable",
        )

    product_by_id = {product.id: product for product in products}
    category_by_id = {category.id: category for category in categories}
    brand_by_id = {brand.id: brand for brand in brands}
    variant_by_id = {variant.id: variant for variant in variants}
    for variant_id in variant_ids:
        variant = variant_by_id[variant_id]
        product = product_by_id.get(variant.product_id)
        if (
            not variant.is_active
            or not product
            or not product.is_active
            or not category_by_id[product.category_id].is_active
            or not brand_by_id[product.brand_id].is_active
        ):
            raise HTTPException(
                status_code=422,
                detail="One or more selected items are unavailable",
            )
    return variant_by_id


def _build_order_items(
    checkout_data: CheckoutRequest,
    variant_by_id: dict[int, ProductVariant],
):
    item_values = []
    subtotal = ZERO_MONEY
    for item in checkout_data.items:
        variant = variant_by_id[item.product_variant_id]
        unit_price = _validate_money(
            Decimal(variant.price),
            "A selected item has an invalid price",
        )
        item_total = _validate_money(
            unit_price * item.quantity,
            "An order item total exceeds the supported monetary range",
        )
        subtotal = _validate_money(
            subtotal + item_total,
            "Order subtotal exceeds the supported monetary range",
        )
        item_values.append(
            {
                "product_variant_id": variant.id,
                "product_name_ar": variant.product.name_ar,
                "product_name_en": variant.product.name_en,
                "variant_name_ar": (
                    None
                    if variant.name_ar == DEFAULT_VARIANT_NAME
                    and variant.name_en == DEFAULT_VARIANT_NAME
                    else variant.name_ar
                ),
                "variant_name_en": (
                    None
                    if variant.name_ar == DEFAULT_VARIANT_NAME
                    and variant.name_en == DEFAULT_VARIANT_NAME
                    else variant.name_en
                ),
                "quantity": item.quantity,
                "unit_price": unit_price,
                "total": item_total,
            }
        )
    return item_values, subtotal


def _insert_order_with_number_retry(
    db: Session,
    order_values: dict,
    item_values: list[dict],
) -> Order:
    for _ in range(ORDER_NUMBER_ATTEMPTS):
        order = Order(
            order_number=_generate_order_number(),
            items=[OrderItem(**values) for values in item_values],
            **order_values,
        )
        try:
            with db.begin_nested():
                db.add(order)
                db.flush()
            return order
        except IntegrityError as exc:
            if not _is_order_number_collision(exc):
                raise

    raise HTTPException(
        status_code=409,
        detail="A unique order number could not be generated; please retry",
    )


def checkout(
    db: Session,
    checkout_data: CheckoutRequest,
    idempotency_key: str,
):
    fingerprint = _request_fingerprint(checkout_data)
    try:
        existing = _get_idempotent_order(db, idempotency_key, fingerprint)
        if existing is not None:
            return _checkout_response(existing)

        phone = normalize_phone(checkout_data.customer_phone)
        delivery_area = (
            db.query(DeliveryArea)
            .filter(
                DeliveryArea.id == checkout_data.delivery_area_id,
                DeliveryArea.is_active.is_(True),
            )
            .with_for_update()
            .first()
        )
        if not delivery_area:
            raise HTTPException(
                status_code=422,
                detail="Selected delivery area is unavailable",
            )

        variant_ids = sorted(
            item.product_variant_id for item in checkout_data.items
        )
        variant_by_id = _lock_checkout_catalog(db, variant_ids)
        item_values, subtotal = _build_order_items(
            checkout_data,
            variant_by_id,
        )
        delivery_fee = _validate_money(
            Decimal(delivery_area.delivery_fee),
            "Delivery fee exceeds the supported monetary range",
        )
        total = _validate_money(
            subtotal + delivery_fee,
            "Order total exceeds the supported monetary range",
        )

        customer = get_or_create_customer(
            db,
            phone,
            checkout_data.customer_name,
        )
        order_values = {
            "customer_id": customer.id,
            "customer_name": checkout_data.customer_name,
            "customer_phone": phone,
            "delivery_area_id": delivery_area.id,
            "address": checkout_data.address,
            "notes": checkout_data.notes,
            "subtotal": subtotal,
            "delivery_fee": delivery_fee,
            "total": total,
            "status": ORDER_INITIAL_STATUS,
            "idempotency_key": idempotency_key,
            "request_fingerprint": fingerprint,
        }
        order = _insert_order_with_number_retry(db, order_values, item_values)
        if settings.BIRD_NOTIFICATIONS_ENABLED:
            # Durable intent only: the worker performs all provider/config work.
            # This insert participates in the SAME commit as the order/items.
            db.add(OrderNotification(order_id=order.id))
        db.commit()
        order = get_order(db, order.id)
        return _checkout_response(order)
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as exc:
        diagnostic = getattr(exc.orig, "diag", None)
        constraint = getattr(diagnostic, "constraint_name", "") or ""
        db.rollback()
        if constraint == "uq_orders_idempotency_key":
            existing = _get_idempotent_order(db, idempotency_key, fingerprint)
            if existing is not None:
                return _checkout_response(existing)
        raise HTTPException(
            status_code=409,
            detail="Checkout could not be completed because related data changed",
        ) from exc
    except Exception:
        db.rollback()
        raise


def get_orders(db: Session, query_data: OrderQuery):
    query = order_query(db)

    if query_data.search:
        search_text = query_data.search
        plain_order_number = search_text.removeprefix("#").strip()
        term = like_pattern(search_text)
        order_number_term = like_pattern(plain_order_number)
        search_filters = [
            Order.customer_name.ilike(term, escape="\\"),
            Order.customer_phone.ilike(term, escape="\\"),
        ]
        if order_number_term is not None:
            search_filters.append(
                Order.order_number.ilike(order_number_term, escape="\\")
            )
        try:
            normalized_phone = normalize_phone(search_text)
        except ValueError:
            normalized_phone = None
        if normalized_phone and normalized_phone != search_text:
            normalized_term = like_pattern(normalized_phone)
            if normalized_term is not None:
                search_filters.append(
                    Order.customer_phone.ilike(normalized_term, escape="\\")
                )
        query = query.filter(or_(*search_filters))

    filters = query_data.filter
    if filters is not None:
        if filters.status is not None:
            query = query.filter(Order.status == filters.status)
        if filters.delivery_area_id is not None:
            query = query.filter(
                Order.delivery_area_id == filters.delivery_area_id
            )
        if filters.date_from is not None:
            start = datetime.combine(
                filters.date_from,
                time.min,
                tzinfo=timezone.utc,
            )
            query = query.filter(Order.created_at >= start)
        if filters.date_to is not None:
            end = datetime.combine(
                filters.date_to,
                time.min,
                tzinfo=timezone.utc,
            )
            query = query.filter(
                Order.created_at < end + timedelta(days=1)
            )
        if filters.min_total is not None:
            query = query.filter(Order.total >= filters.min_total)
        if filters.max_total is not None:
            query = query.filter(Order.total <= filters.max_total)

    sort_by = query_data.sort_by or OrderSortBy.CREATED_AT
    order = query_data.order or SortDirection.DESC

    return crud.paginate(
        query,
        query_data.page,
        query_data.page_size,
        order_by=build_order_by(
            SORTABLE_FIELDS[sort_by],
            order,
            Order.id,
            sort_is_id=sort_by == OrderSortBy.ID,
        ),
    )


def get_order(db: Session, order_id: int):
    order = order_query(db).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def get_order_items(db: Session, order_id: int):
    return get_order(db, order_id).items


def verify_order_history(
    db: Session,
    phone: str,
    order_number: str,
) -> Order:
    order = (
        db.query(Order)
        .filter(
            Order.order_number == order_number,
            Order.customer_phone == phone_identity(phone),
        )
        .first()
    )
    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order details could not be verified",
            headers={"Cache-Control": "no-store"},
        )
    return order


def get_verified_order_history(
    db: Session,
    claims: OrderHistoryClaims,
):
    order = get_verified_order(db, claims)
    return {
        "order_number": order.order_number,
        "status": order.status,
        "created_at": order.created_at,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "delivery_area_name_ar": order.delivery_area.name_ar,
        "delivery_area_name_en": order.delivery_area.name_en,
        "address": order.address,
        "notes": order.notes,
        "total_quantity": sum(item.quantity for item in order.items),
        "items": order.items,
        "subtotal": order.subtotal,
        "delivery_fee": order.delivery_fee,
        "total": order.total,
    }


def get_verified_order(
    db: Session,
    claims: OrderHistoryClaims,
):
    order = (
        order_query(db)
        .filter(
            Order.order_number == claims.order_number,
            Order.customer_phone == claims.phone,
        )
        .first()
    )
    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Verified order is no longer available",
            headers={"Cache-Control": "no-store"},
        )
    return order


def update_order_status(
    db: Session,
    order_id: int,
    status_data: OrderStatusUpdate,
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .with_for_update()
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    new_status = status_data.status
    if new_status == order.status:
        db.rollback()
        return get_order(db, order_id)
    if new_status not in ORDER_STATUS_TRANSITIONS[order.status]:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Order cannot transition from {order.status} to {new_status}",
        )

    try:
        order.status = new_status
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_order(db, order_id)
