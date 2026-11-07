from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

from app.constants.dashboard import DASHBOARD_GRANULARITIES, DASHBOARD_PERIODS
from app.features.orders.schema import OrderStatus

DashboardPeriod = Literal[*DASHBOARD_PERIODS]
DashboardGranularity = Literal[*DASHBOARD_GRANULARITIES]


class DashboardSeriesPoint(BaseModel):
    bucket: datetime
    orders: int
    revenue: Decimal
    customers: int


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
    series_granularity: DashboardGranularity
    series: list[DashboardSeriesPoint]
    recent_orders: list[RecentOrderResponse]
