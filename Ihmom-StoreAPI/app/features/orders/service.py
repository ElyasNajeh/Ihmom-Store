import secrets
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.customers.service import get_or_create_customer
from app.features.delivery_areas.model import DeliveryArea
from app.features.orders.model import Order, OrderItem
from app.features.orders.schema import (
    CheckoutRequest,
    OrderFilters,
    OrderSort,
    OrderStatusUpdate,
    SortOrder,
)
from app.features.products.model import Product, ProductVariant
from app.shared import crud
from app.shared.phone import normalize_phone, phone_identity


MAX_MONEY = Decimal("99999999.99")
MONEY_QUANTUM = Decimal("0.01")
ORDER_NUMBER_ATTEMPTS = 5
DEFAULT_VARIANT_NAME = "__default__"

STATUS_TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"out_for_delivery", "cancelled"},
    "out_for_delivery": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}

SORTABLE_FIELDS = {
    "id": Order.id,
    "created_at": Order.created_at,
    "total": Order.total,
    "customer_name": Order.customer_name,
    "status": Order.status,
}


def order_query(db: Session):
    return db.query(Order).options(
        joinedload(Order.delivery_area),
        selectinload(Order.items)
        .joinedload(OrderItem.product_variant)
        .joinedload(ProductVariant.product),
    )


def _escape_search(value: str) -> str:
    return (
        value.strip()
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )


def _generate_order_number() -> str:
    return f"IHM-{secrets.token_urlsafe(18)}"


def _is_order_number_collision(exc: IntegrityError) -> bool:
    diagnostic = getattr(exc.orig, "diag", None)
    constraint_name = getattr(diagnostic, "constraint_name", "") or ""
    if "order_number" in constraint_name.lower():
        return True
    return "order_number" in str(exc.orig).lower()


def _validate_money(value: Decimal, detail: str) -> Decimal:
    if not value.is_finite() or value < 0 or value > MAX_MONEY:
        raise HTTPException(status_code=422, detail=detail)
    return value.quantize(MONEY_QUANTUM)


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
    subtotal = Decimal("0.00")
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


def checkout(db: Session, checkout_data: CheckoutRequest):
    try:
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
            "status": "pending",
        }
        order = _insert_order_with_number_retry(db, order_values, item_values)
        db.commit()
        order = get_order(db, order.id)
        return _checkout_order(order)
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Checkout could not be completed because related data changed",
        ) from exc
    except Exception:
        db.rollback()
        raise


def get_orders(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    filters: OrderFilters,
    sort_by: OrderSort,
    sort_order: SortOrder,
):
    query = order_query(db)
    if search and search.strip():
        search_text = search.strip()
        plain_order_number = search_text.removeprefix("#").strip()
        term = f"%{_escape_search(search_text)}%"
        order_number_term = f"%{_escape_search(plain_order_number)}%"
        search_filters = [
            Order.order_number.ilike(order_number_term, escape="\\"),
            Order.customer_name.ilike(term, escape="\\"),
            Order.customer_phone.ilike(term, escape="\\"),
        ]
        try:
            normalized_phone = normalize_phone(search_text)
        except ValueError:
            normalized_phone = None
        if normalized_phone and normalized_phone != search_text:
            normalized_term = f"%{_escape_search(normalized_phone)}%"
            search_filters.append(
                Order.customer_phone.ilike(normalized_term, escape="\\")
            )
        query = query.filter(or_(*search_filters))

    if filters.status is not None:
        query = query.filter(Order.status == filters.status)
    if filters.delivery_area_id is not None:
        query = query.filter(Order.delivery_area_id == filters.delivery_area_id)
    if filters.date_from is not None:
        start = datetime.combine(filters.date_from, time.min, tzinfo=timezone.utc)
        query = query.filter(Order.created_at >= start)
    if filters.date_to is not None:
        end = datetime.combine(filters.date_to, time.min, tzinfo=timezone.utc)
        query = query.filter(Order.created_at < end + timedelta(days=1))
    if filters.min_total is not None:
        query = query.filter(Order.total >= filters.min_total)
    if filters.max_total is not None:
        query = query.filter(Order.total <= filters.max_total)

    sort_column = SORTABLE_FIELDS[sort_by]
    order_method = sort_column.asc if sort_order == "asc" else sort_column.desc
    id_order_method = Order.id.asc if sort_order == "asc" else Order.id.desc
    order_by = [order_method()]
    if sort_by != "id":
        order_by.append(id_order_method())
    return crud.paginate(
        query,
        page,
        page_size,
        order_by=order_by,
    )


def get_order(db: Session, order_id: int):
    order = order_query(db).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def get_order_items(db: Session, order_id: int):
    return get_order(db, order_id).items


def get_order_history(
    db: Session,
    phone: str,
    page: int,
    page_size: int,
):
    identity = phone_identity(phone)
    query = (
        db.query(
            Order.order_number.label("order_number"),
            Order.status.label("status"),
            Order.created_at.label("created_at"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label(
                "total_quantity"
            ),
            Order.subtotal.label("subtotal"),
            Order.delivery_fee.label("delivery_fee"),
            Order.total.label("total"),
        )
        .outerjoin(OrderItem, OrderItem.order_id == Order.id)
        .filter(Order.customer_phone == identity)
        .group_by(
            Order.id,
            Order.order_number,
            Order.status,
            Order.created_at,
            Order.subtotal,
            Order.delivery_fee,
            Order.total,
        )
    )
    return crud.paginate(
        query,
        page,
        page_size,
        order_by=(Order.created_at.desc(), Order.id.desc()),
    )


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
    if new_status not in STATUS_TRANSITIONS[order.status]:
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
