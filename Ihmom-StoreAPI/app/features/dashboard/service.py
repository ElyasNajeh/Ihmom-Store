from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.constants.common import ZERO_MONEY
from app.constants.dashboard import (
    DASHBOARD_DEFAULT_PERIOD,
    DASHBOARD_GRANULARITY_DAY,
    DASHBOARD_GRANULARITY_HOUR,
    DASHBOARD_PERIOD_ALL,
    DASHBOARD_PERIOD_DAYS,
    DASHBOARD_PERIOD_DAY,
    DASHBOARD_RECENT_ORDERS_LIMIT,
    DASHBOARD_SERIES_GRANULARITY,
    DASHBOARD_SERIES_POINT_COUNT,
)
from app.constants.orders import ORDER_STATUSES, OrderStatus
from app.features.admins.model import Admin
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.customers.model import Customer
from app.features.dashboard.schema import DashboardPeriod
from app.features.orders.model import Order
from app.features.products.model import Product, ProductVariant
from app.features.sliders.model import Sliders


def get_period_start(period: DashboardPeriod) -> datetime | None:
    now = datetime.now(timezone.utc)

    if period == DASHBOARD_PERIOD_ALL:
        return None

    if period == DASHBOARD_PERIOD_DAY:
        return now.replace(hour=0, minute=0, second=0, microsecond=0)

    return now - timedelta(days=DASHBOARD_PERIOD_DAYS[period])


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _shift_months(value: datetime, months: int) -> datetime:
    month_index = value.year * 12 + (value.month - 1) + months
    year, month = divmod(month_index, 12)

    return value.replace(year=year, month=month + 1, day=1)


def _series_window(db: Session, period: DashboardPeriod):
    now = datetime.now(timezone.utc)
    granularity = DASHBOARD_SERIES_GRANULARITY[period]

    if granularity == DASHBOARD_GRANULARITY_HOUR:
        start = now.replace(minute=0, second=0, microsecond=0) - timedelta(
            hours=DASHBOARD_SERIES_POINT_COUNT[period] - 1
        )
    elif granularity == DASHBOARD_GRANULARITY_DAY:
        start = (
            now - timedelta(days=DASHBOARD_SERIES_POINT_COUNT[period] - 1)
        ).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start = _shift_months(
            start,
            -(DASHBOARD_SERIES_POINT_COUNT[period] - 1),
        )

        if period == DASHBOARD_PERIOD_ALL:
            first_order = db.query(func.min(Order.created_at)).scalar()
            first_customer = db.query(func.min(Customer.created_at)).scalar()
            candidates = [
                _as_utc(value)
                for value in (first_order, first_customer)
                if value is not None
            ]

            if candidates:
                earliest = min(candidates).replace(
                    day=1,
                    hour=0,
                    minute=0,
                    second=0,
                    microsecond=0,
                )
                start = max(start, earliest)

    return start, now, granularity


def _iter_buckets(start: datetime, end: datetime, granularity: str):
    cursor = start

    while cursor <= end:
        yield cursor

        if granularity == DASHBOARD_GRANULARITY_HOUR:
            cursor += timedelta(hours=1)
        elif granularity == DASHBOARD_GRANULARITY_DAY:
            cursor += timedelta(days=1)
        else:
            cursor = _shift_months(cursor, 1)


def _bucket_key(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc)


def _build_series(
    db: Session,
    start: datetime,
    end: datetime,
    granularity: str,
):
    # Truncate in UTC so buckets are stable regardless of the database session timezone.
    order_bucket = func.date_trunc(
        granularity, func.timezone("UTC", Order.created_at)
    ).label("bucket")
    customer_bucket = func.date_trunc(
        granularity, func.timezone("UTC", Customer.created_at)
    ).label("bucket")

    order_rows = (
        db.query(
            order_bucket,
            func.count(Order.id),
            func.coalesce(func.sum(Order.total), 0),
        )
        .filter(Order.created_at >= start)
        .group_by(order_bucket)
        .all()
    )
    customer_rows = (
        db.query(customer_bucket, func.count(Customer.id))
        .filter(Customer.created_at >= start)
        .group_by(customer_bucket)
        .all()
    )

    orders_by_bucket = {
        _bucket_key(bucket): (order_count, revenue)
        for bucket, order_count, revenue in order_rows
    }
    customers_by_bucket = {
        _bucket_key(bucket): customer_count
        for bucket, customer_count in customer_rows
    }

    series = []

    for bucket in _iter_buckets(start, end, granularity):
        order_count, revenue = orders_by_bucket.get(bucket, (0, 0))
        series.append(
            {
                "bucket": bucket,
                "orders": order_count,
                "revenue": Decimal(revenue or 0),
                "customers": customers_by_bucket.get(bucket, 0),
            }
        )

    return series


def get_dashboard_stats(
    db: Session,
    period: DashboardPeriod = DASHBOARD_DEFAULT_PERIOD,
):
    order_totals = {
        status: {
            "count": 0,
            "subtotal": ZERO_MONEY,
            "total": ZERO_MONEY,
        }
        for status in ORDER_STATUSES
    }
    orders_query = db.query(
        Order.status,
        func.count(Order.id),
        func.sum(Order.subtotal),
        func.sum(Order.total),
    )
    period_start = get_period_start(period)
    if period_start is not None:
        orders_query = orders_query.filter(Order.created_at >= period_start)

    grouped_orders = orders_query.group_by(Order.status).all()

    for status, order_count, subtotal, total in grouped_orders:
        if status in order_totals:
            order_totals[status] = {
                "count": order_count,
                "subtotal": subtotal or ZERO_MONEY,
                "total": total or ZERO_MONEY,
            }

    recent_orders_query = db.query(
        Order.order_number,
        Order.customer_name,
        Order.total,
        Order.status,
        Order.created_at,
    )
    if period_start is not None:
        recent_orders_query = recent_orders_query.filter(
            Order.created_at >= period_start
        )
    recent_orders = recent_orders_query.order_by(
        Order.created_at.desc(),
        Order.id.desc(),
    ).limit(DASHBOARD_RECENT_ORDERS_LIMIT).all()

    total_orders = sum(values["count"] for values in order_totals.values())
    total_order_value = sum(
        (values["total"] for values in order_totals.values()),
        ZERO_MONEY,
    )

    series_start, series_end, series_granularity = _series_window(db, period)
    series = _build_series(db, series_start, series_end, series_granularity)

    return {
        "admins": db.query(Admin).count(),
        "brands": db.query(Brand).count(),
        "categories": db.query(Category).count(),
        "active_categories": db.query(Category)
        .filter(Category.is_active.is_(True))
        .count(),
        "customers": db.query(Customer).count(),
        "sliders": db.query(Sliders).count(),
        "active_sliders": db.query(Sliders)
        .filter(Sliders.is_active.is_(True))
        .count(),
        "products": db.query(Product).count(),
        "variants": db.query(ProductVariant).count(),
        "total_orders": total_orders,
        "pending_orders": order_totals[OrderStatus.PENDING]["count"],
        "confirmed_orders": order_totals[OrderStatus.CONFIRMED]["count"],
        "out_for_delivery_orders": order_totals[OrderStatus.OUT_FOR_DELIVERY][
            "count"
        ],
        "delivered_orders": order_totals[OrderStatus.DELIVERED]["count"],
        "cancelled_orders": order_totals[OrderStatus.CANCELLED]["count"],
        "pending_subtotal": order_totals[OrderStatus.PENDING]["subtotal"],
        "confirmed_subtotal": order_totals[OrderStatus.CONFIRMED]["subtotal"],
        "out_for_delivery_subtotal": order_totals[OrderStatus.OUT_FOR_DELIVERY][
            "subtotal"
        ],
        "delivered_subtotal": order_totals[OrderStatus.DELIVERED]["subtotal"],
        "cancelled_subtotal": order_totals[OrderStatus.CANCELLED]["subtotal"],
        "total_order_value": total_order_value,
        "delivered_revenue": order_totals[OrderStatus.DELIVERED]["total"],
        "cancelled_order_value": order_totals[OrderStatus.CANCELLED]["total"],
        "series_granularity": series_granularity,
        "series": series,
        "recent_orders": [
            {
                "order_number": order.order_number,
                "customer_name": order.customer_name,
                "total": order.total,
                "status": order.status,
                "created_at": order.created_at,
            }
            for order in recent_orders
        ],
    }
