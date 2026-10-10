from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

from app.features.orders.schema import OrderStatus

DashboardPeriod = Literal["day", "week", "month", "year", "all"]


class RecentOrderResponse(BaseModel):
    order_number: str
    customer_name: str
    total: Decimal
    status: OrderStatus
    created_at: datetime


class DashboardStatsResponse(BaseModel):
    admins: int
    brands: int
    categories: int
    active_categories: int
    customers: int
    sliders: int
    active_sliders: int
    products: int
    variants: int
    total_orders: int
    pending_orders: int
    confirmed_orders: int
    out_for_delivery_orders: int
    delivered_orders: int
    cancelled_orders: int
    pending_subtotal: Decimal
    confirmed_subtotal: Decimal
    out_for_delivery_subtotal: Decimal
    delivered_subtotal: Decimal
    cancelled_subtotal: Decimal
    total_order_value: Decimal
    delivered_revenue: Decimal
    cancelled_order_value: Decimal
    recent_orders: list[RecentOrderResponse]
