import { ORDER_STATUS, type OrderStatus } from '@/features/orders/constants/orders.ts';

export const DASHBOARD_PERIOD = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year',
    ALL: 'all',
} as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIOD)[keyof typeof DASHBOARD_PERIOD];

export const DASHBOARD_PERIODS = [
    DASHBOARD_PERIOD.DAY,
    DASHBOARD_PERIOD.WEEK,
    DASHBOARD_PERIOD.MONTH,
    DASHBOARD_PERIOD.YEAR,
    DASHBOARD_PERIOD.ALL,
] as const satisfies readonly DashboardPeriod[];

export const DASHBOARD_DEFAULT_PERIOD: DashboardPeriod = DASHBOARD_PERIOD.MONTH;

export const DASHBOARD_RECENT_ORDERS_LIMIT = 5;

export const DASHBOARD_STATUS_COLORS: Record<OrderStatus, string> = {
    [ORDER_STATUS.PENDING]: 'var(--chart-4)',
    [ORDER_STATUS.CONFIRMED]: 'var(--chart-3)',
    [ORDER_STATUS.OUT_FOR_DELIVERY]: 'var(--chart-5)',
    [ORDER_STATUS.DELIVERED]: 'var(--chart-2)',
    [ORDER_STATUS.CANCELLED]: 'var(--chart-1)',
};
