import { Suspense, lazy, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    BadgeCheck,
    Banknote,
    LayoutGrid,
    Package,
    RefreshCw,
    ShieldCheck,
    ShoppingCart,
    Tags,
    Truck,
    UserRound,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select.tsx';
import { AdminPageHeader } from '@/shared/components/admin/admin-page-header.tsx';
import { AdminTable } from '@/shared/components/admin/admin-table.tsx';
import { AdminErrorState } from '@/shared/components/admin/admin-states.tsx';
import { StatCard } from '@/features/dashboard/components/stat-card.tsx';
import { OrderStatusBadge } from '@/shared/components/admin/status-badges.tsx';
import type { ColumnDef } from '@/shared/components/data/views/table-view.tsx';
import {
    DASHBOARD_DEFAULT_PERIOD,
    DASHBOARD_PERIODS,
    DASHBOARD_STATUS_COLORS,
    type DashboardPeriod,
} from '@/features/dashboard/constants/dashboard.ts';
import {
    ORDER_STATUS,
    ORDER_STATUSES,
    type OrderStatus,
} from '@/features/orders/constants/orders.ts';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboard.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import type { DashboardStats, RecentOrder } from '@/features/dashboard/types/dashboard.ts';
import {
    formatNumber,
    formatOrderDate,
    formatOrderMoney,
} from '@/features/orders/utils/order-format.ts';

const DashboardCharts = lazy(() => import('@/features/dashboard/components/dashboard-charts.tsx'));

function getStatusSubtotals(data: DashboardStats): Record<OrderStatus, string> {
    return {
        [ORDER_STATUS.PENDING]: data.pending_subtotal,
        [ORDER_STATUS.CONFIRMED]: data.confirmed_subtotal,
        [ORDER_STATUS.OUT_FOR_DELIVERY]: data.out_for_delivery_subtotal,
        [ORDER_STATUS.DELIVERED]: data.delivered_subtotal,
        [ORDER_STATUS.CANCELLED]: data.cancelled_subtotal,
    };
}

function DashboardChartsSkeleton() {
    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            <Skeleton className="h-[22rem] w-full rounded-xl" />
            <Skeleton className="h-[22rem] w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl xl:col-span-2" />
        </div>
    );
}

export default function AdminDashboardPage() {
    const { t } = useTranslation('admin');
    const [period, setPeriod] = useState<DashboardPeriod>(DASHBOARD_DEFAULT_PERIOD);

    const { locale } = useLocale();
    const { data, isPending, isError, refetch, isFetching } = useDashboardStats(period);

    const periodItems = DASHBOARD_PERIODS.map((option) => ({
        value: option,
        label: t(`dashboard.periods.${option}`),
    }));

    const columns = useMemo<ColumnDef<RecentOrder>[]>(
        () => [
            {
                id: 'order',
                header: t('orders.orderNumber'),
                cell: (order) => (
                    <span className="font-mono text-sm font-medium">{order.order_number}</span>
                ),
            },
            {
                id: 'customer',
                header: t('orders.customer'),
                cell: (order) => (
                    <span className="block max-w-[14rem] truncate">{order.customer_name}</span>
                ),
            },
            {
                id: 'total',
                header: t('orders.total'),
                className: 'text-end whitespace-nowrap',
                cell: (order) => (
                    <span className="tabular-nums">{formatOrderMoney(order.total, locale)}</span>
                ),
            },
            {
                id: 'status',
                header: t('orders.status'),
                cell: (order) => <OrderStatusBadge status={order.status} />,
            },
            {
                id: 'placed',
                header: t('orders.placedAt'),
                className: 'hidden whitespace-nowrap md:table-cell',
                cell: (order) => (
                    <span className="text-muted-foreground text-xs">
                        {formatOrderDate(order.created_at, locale)}
                    </span>
                ),
            },
        ],
        [locale, t],
    );

    const recentOrders = data?.recent_orders ?? [];
    const statusSubtotals = useMemo(() => (data ? getStatusSubtotals(data) : null), [data]);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={t('dashboard.title')}
                description={t('dashboard.description')}
                actions={
                    <>
                        <div className="flex items-center gap-2">
                            <label htmlFor="dashboard-period" className="sr-only">
                                {t('dashboard.period')}
                            </label>

                            <Select
                                items={periodItems}
                                value={period}
                                onValueChange={(value) => setPeriod(value as DashboardPeriod)}
                            >
                                <SelectTrigger id="dashboard-period" className="w-40">
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    {DASHBOARD_PERIODS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {t(`dashboard.periods.${option}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            disabled={isFetching}
                            onClick={() => void refetch()}
                        >
                            <RefreshCw
                                className={isFetching ? 'animate-spin' : undefined}
                                aria-hidden="true"
                            />
                            {t('common.refresh')}
                        </Button>
                    </>
                }
            />

            {isError ? (
                <AdminErrorState onRetry={() => void refetch()} />
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t('dashboard.totalOrders')}
                            value={data ? formatNumber(data.total_orders, locale) : '-'}
                            hint={
                                data
                                    ? t('dashboard.activeCount', {
                                          count: data.pending_orders,
                                      })
                                    : undefined
                            }
                            icon={ShoppingCart}
                            tone="brand"
                            isLoading={isPending}
                        />
                        <StatCard
                            label={t('dashboard.totalOrderValue')}
                            value={data ? formatOrderMoney(data.total_order_value, locale) : '-'}
                            hint={
                                data
                                    ? `${t('dashboard.pendingOrders')}: ${data.pending_orders}`
                                    : undefined
                            }
                            icon={Banknote}
                            tone="default"
                            isLoading={isPending}
                        />
                        <StatCard
                            label={t('dashboard.deliveredRevenue')}
                            value={data ? formatOrderMoney(data.delivered_revenue, locale) : '-'}
                            hint={
                                data
                                    ? t('dashboard.activeCount', {
                                          count: data.delivered_orders,
                                      })
                                    : undefined
                            }
                            icon={Truck}
                            tone="success"
                            isLoading={isPending}
                        />
                        <StatCard
                            label={t('dashboard.cancelledValue')}
                            value={
                                data ? formatOrderMoney(data.cancelled_order_value, locale) : '-'
                            }
                            hint={
                                data
                                    ? t('dashboard.activeCount', {
                                          count: data.cancelled_orders,
                                      })
                                    : undefined
                            }
                            icon={LayoutGrid}
                            tone="danger"
                            isLoading={isPending}
                        />
                    </div>

                    <div className="grid auto-rows-fr items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t('dashboard.customers')}
                            value={data ? formatNumber(data.customers, locale) : '-'}
                            icon={UserRound}
                            isLoading={isPending}
                        />
                        <StatCard
                            label={t('dashboard.products')}
                            value={data ? formatNumber(data.products, locale) : '-'}
                            hint={data ? t('dashboard.variants') + `: ${data.variants}` : undefined}
                            icon={Package}
                            isLoading={isPending}
                        />
                        <StatCard
                            label={t('dashboard.categories')}
                            value={data ? formatNumber(data.categories, locale) : '-'}
                            hint={
                                data
                                    ? t('dashboard.activeCount', {
                                          count: data.active_categories,
                                      })
                                    : undefined
                            }
                            icon={Tags}
                            isLoading={isPending}
                        />
                        <StatCard
                            label={t('dashboard.brands')}
                            value={data ? formatNumber(data.brands, locale) : '-'}
                            icon={BadgeCheck}
                            isLoading={isPending}
                        />
                        <StatCard
                            label={t('dashboard.sliders')}
                            value={data ? formatNumber(data.sliders, locale) : '-'}
                            icon={LayoutGrid}
                            isLoading={isPending}
                            className="xl:col-start-2"
                        />
                        <StatCard
                            label={t('dashboard.admins')}
                            value={data ? formatNumber(data.admins, locale) : '-'}
                            icon={ShieldCheck}
                            isLoading={isPending}
                            className="xl:col-start-3"
                        />
                    </div>

                    {data ? (
                        <Suspense fallback={<DashboardChartsSkeleton />}>
                            <DashboardCharts
                                data={data}
                                locale={locale}
                                periodLabel={t(`dashboard.periods.${period}`)}
                            />
                        </Suspense>
                    ) : (
                        <DashboardChartsSkeleton />
                    )}

                    <AdminTable
                        items={recentOrders}
                        columns={columns}
                        keyExtractor={(order) => order.order_number}
                        isLoading={isPending}
                        isError={false}
                        skeletonRowCount={5}
                        toolbar={
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t('dashboard.recentOrders')}
                                    </h2>
                                    <p className="text-muted-foreground text-xs">
                                        {t(`dashboard.periods.${period}`)}
                                    </p>
                                </div>

                                <Button variant="outline" size="sm" asChild>
                                    <Link to="/admin/orders">{t('dashboard.viewAllOrders')}</Link>
                                </Button>
                            </div>
                        }
                        emptyTitle={t('dashboard.recentOrdersEmpty')}
                        emptyDescription={t('dashboard.description')}
                    />

                    <Card className="shadow-xs">
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('dashboard.orderValueByStatus')}
                            </CardTitle>
                            <CardDescription>{t('dashboard.description')}</CardDescription>
                        </CardHeader>

                        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            {isPending || !data
                                ? Array.from({ length: ORDER_STATUSES.length }).map((_, index) => (
                                      <Skeleton key={index} className="h-16 w-full rounded-lg" />
                                  ))
                                : ORDER_STATUSES.map((status) => (
                                      <div
                                          key={status}
                                          className="bg-muted/40 rounded-lg px-3 py-2.5"
                                      >
                                          <p className="text-muted-foreground flex items-center gap-2 text-xs">
                                              <span
                                                  className="size-2 rounded-full"
                                                  style={{
                                                      backgroundColor:
                                                          DASHBOARD_STATUS_COLORS[status],
                                                  }}
                                                  aria-hidden="true"
                                              />
                                              {t(`statuses.${status}`)}
                                          </p>
                                          <p className="mt-1 text-sm font-semibold tabular-nums">
                                              {statusSubtotals &&
                                                  formatOrderMoney(statusSubtotals[status], locale)}
                                          </p>
                                      </div>
                                  ))}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
