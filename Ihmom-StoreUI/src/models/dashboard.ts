import type { OrderStatus } from './order.ts';

export type DashboardGranularity = 'hour' | 'day' | 'month';

export interface DashboardSeriesPoint {
    bucket: string;
    orders: number;
    revenue: string;
    customers: number;
}

export interface RecentOrder {
    order_number: string;
    customer_name: string;
    total: string;
    status: OrderStatus;
    created_at: string;
}

export interface DashboardStats {
    admins: number;
    brands: number;
    categories: number;
    active_categories: number;
    customers: number;
    sliders: number;
    active_sliders: number;
    products: number;
    variants: number;
    total_orders: number;
    pending_orders: number;
    confirmed_orders: number;
    out_for_delivery_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    pending_subtotal: string;
    confirmed_subtotal: string;
    out_for_delivery_subtotal: string;
    delivered_subtotal: string;
    cancelled_subtotal: string;
    total_order_value: string;
    delivered_revenue: string;
    cancelled_order_value: string;
    series_granularity: DashboardGranularity;
    series: DashboardSeriesPoint[];
    recent_orders: RecentOrder[];
}
