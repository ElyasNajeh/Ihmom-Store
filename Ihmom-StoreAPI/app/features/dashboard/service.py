from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.features.admins.model import Admin
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.customers.model import Customer
from app.features.dashboard.schema import DashboardPeriod
from app.features.orders.model import Order
from app.features.products.model import Product, ProductVariant
from app.features.sliders.model import Slider

ORDER_STATUSES = (
    "pending",
    "confirmed",
    "out_for_delivery",
    "delivered",
    "cancelled",
)
PERIOD_DAYS = {
    "week": 7,
    "month": 30,
    "year": 365,
}


def get_period_start(period: DashboardPeriod) -> datetime | None:
    now = datetime.now(timezone.utc)

    if period == "all":
        return None

    if period == "day":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)

    return now - timedelta(days=PERIOD_DAYS[period])


def get_dashboard_stats(db: Session, period: DashboardPeriod = "day"):
    order_totals = {
        status: {
            "count": 0,
            "subtotal": Decimal("0.00"),
            "total": Decimal("0.00"),
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
                "subtotal": subtotal or Decimal("0.00"),
                "total": total or Decimal("0.00"),
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
    ).limit(5).all()

    total_orders = sum(values["count"] for values in order_totals.values())
    total_order_value = sum(
        (values["total"] for values in order_totals.values()),
        Decimal("0.00"),
    )

    return {
        "admins": db.query(Admin).count(),
        "brands": db.query(Brand).count(),
        "categories": db.query(Category).count(),
        "active_categories": db.query(Category)
        .filter(Category.is_active.is_(True))
        .count(),
        "customers": db.query(Customer).count(),
        "sliders": db.query(Slider).count(),
        "active_sliders": db.query(Slider)
        .filter(Slider.is_active.is_(True))
        .count(),
        "products": db.query(Product).count(),
        "variants": db.query(ProductVariant).count(),
        "total_orders": total_orders,
        "pending_orders": order_totals["pending"]["count"],
        "confirmed_orders": order_totals["confirmed"]["count"],
        "out_for_delivery_orders": order_totals["out_for_delivery"]["count"],
        "delivered_orders": order_totals["delivered"]["count"],
        "cancelled_orders": order_totals["cancelled"]["count"],
        "pending_subtotal": order_totals["pending"]["subtotal"],
        "confirmed_subtotal": order_totals["confirmed"]["subtotal"],
        "out_for_delivery_subtotal": order_totals["out_for_delivery"][
            "subtotal"
        ],
        "delivered_subtotal": order_totals["delivered"]["subtotal"],
        "cancelled_subtotal": order_totals["cancelled"]["subtotal"],
        "total_order_value": total_order_value,
        "delivered_revenue": order_totals["delivered"]["total"],
        "cancelled_order_value": order_totals["cancelled"]["total"],
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
