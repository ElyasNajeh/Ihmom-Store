import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Area,
    AreaChart,
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from 'recharts';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart.tsx';
import { AdminEmptyState } from '@/components/admin/admin-states.tsx';
import { DASHBOARD_STATUS_COLORS } from '@/constants/dashboard.ts';
import { ORDER_STATUS, ORDER_STATUSES, type OrderStatus } from '@/constants/orders.ts';
import type {
    DashboardGranularity,
    DashboardSeriesPoint,
    DashboardStats,
} from '@/models/dashboard.ts';
import { formatNumber, formatOrderMoney } from '@/utils/order-format.ts';

interface DashboardChartsProps {
    data: DashboardStats;
    locale: string;
    periodLabel: string;
}

function formatBucket(value: string, granularity: DashboardGranularity, locale: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    if (granularity === 'hour') {
        return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).format(date);
    }

    if (granularity === 'month') {
        return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(date);
    }

    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

function formatCompact(value: number, locale: string) {
    return new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);
}

function hasSeriesActivity(
    series: DashboardSeriesPoint[],
    selector: (point: DashboardSeriesPoint) => number,
) {
    return series.some((point) => selector(point) > 0);
}

export default function DashboardCharts({ data, locale, periodLabel }: DashboardChartsProps) {
    const { t } = useTranslation('admin');

    const statusCounts = useMemo<Record<OrderStatus, number>>(
        () => ({
            [ORDER_STATUS.PENDING]: data.pending_orders,
            [ORDER_STATUS.CONFIRMED]: data.confirmed_orders,
            [ORDER_STATUS.OUT_FOR_DELIVERY]: data.out_for_delivery_orders,
            [ORDER_STATUS.DELIVERED]: data.delivered_orders,
            [ORDER_STATUS.CANCELLED]: data.cancelled_orders,
        }),
        [data],
    );

    const statusData = useMemo(
        () => ORDER_STATUSES.map((status) => ({ status, count: statusCounts[status] })),
        [statusCounts],
    );

    const statusChartConfig = useMemo<ChartConfig>(() => {
        return ORDER_STATUSES.reduce<ChartConfig>((config, status) => {
            config[status] = {
                label: t(`statuses.${status}`),
                color: DASHBOARD_STATUS_COLORS[status],
            };

            return config;
        }, {});
    }, [t]);

    const ordersChartConfig = useMemo<ChartConfig>(
        () => ({
            orders: { label: t('dashboard.ordersSeries'), color: 'var(--chart-1)' },
            revenue: { label: t('dashboard.revenueSeries'), color: 'var(--chart-2)' },
        }),
        [t],
    );

    const customersChartConfig = useMemo<ChartConfig>(
        () => ({
            customers: { label: t('dashboard.customersSeries'), color: 'var(--chart-3)' },
        }),
        [t],
    );

    const seriesData = useMemo(
        () =>
            data.series.map((point) => ({
                label: formatBucket(point.bucket, data.series_granularity, locale),
                orders: point.orders,
                revenue: Number(point.revenue),
                customers: point.customers,
            })),
        [data.series, data.series_granularity, locale],
    );

    const hasOrdersActivity = useMemo(
        () => hasSeriesActivity(data.series, (point) => point.orders),
        [data.series],
    );

    const hasCustomersActivity = useMemo(
        () => hasSeriesActivity(data.series, (point) => point.customers),
        [data.series],
    );

    const hasStatusActivity = data.total_orders > 0;

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            <Card className="shadow-xs">
                <CardHeader>
                    <CardTitle className="text-base">{t('dashboard.ordersOverTime')}</CardTitle>
                    <CardDescription>
                        {t('dashboard.ordersOverTimeDescription')} · {periodLabel}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {hasOrdersActivity ? (
                        <ChartContainer config={ordersChartConfig} className="h-64 w-full">
                            <ComposedChart data={seriesData} margin={{ left: 4, right: 4 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />

                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={16}
                                    tickMargin={8}
                                />

                                <YAxis
                                    yAxisId="orders"
                                    allowDecimals={false}
                                    width={36}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => formatCompact(Number(value), locale)}
                                />

                                <YAxis
                                    yAxisId="revenue"
                                    orientation="right"
                                    width={56}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => formatCompact(Number(value), locale)}
                                />

                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value, name) => {
                                                const isRevenue = name === 'revenue';
                                                const label = isRevenue
                                                    ? t('dashboard.revenueSeries')
                                                    : t('dashboard.ordersSeries');
                                                const display = isRevenue
                                                    ? formatOrderMoney(Number(value), locale)
                                                    : formatNumber(Number(value), locale);

                                                return (
                                                    <div className="flex w-full items-center justify-between gap-3">
                                                        <span className="text-muted-foreground flex items-center gap-2">
                                                            <span
                                                                className="size-2 rounded-full"
                                                                style={{
                                                                    backgroundColor: isRevenue
                                                                        ? 'var(--chart-2)'
                                                                        : 'var(--chart-1)',
                                                                }}
                                                                aria-hidden="true"
                                                            />
                                                            {label}
                                                        </span>
                                                        <span className="text-foreground font-mono font-medium tabular-nums">
                                                            {display}
                                                        </span>
                                                    </div>
                                                );
                                            }}
                                        />
                                    }
                                />

                                <Bar
                                    yAxisId="orders"
                                    dataKey="orders"
                                    fill="var(--color-orders)"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={36}
                                />

                                <Line
                                    yAxisId="revenue"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="var(--color-revenue)"
                                    strokeWidth={2}
                                    dot={false}
                                />

                                <ChartLegend content={<ChartLegendContent />} />
                            </ComposedChart>
                        </ChartContainer>
                    ) : (
                        <AdminEmptyState
                            title={t('dashboard.chartEmpty')}
                            description={periodLabel}
                            className="border-0 py-10"
                        />
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-xs">
                <CardHeader>
                    <CardTitle className="text-base">{t('dashboard.orderStatus')}</CardTitle>
                    <CardDescription>{periodLabel}</CardDescription>
                </CardHeader>

                <CardContent>
                    {hasStatusActivity ? (
                        <div className="flex flex-col gap-4">
                            <ChartContainer
                                config={statusChartConfig}
                                className="mx-auto aspect-square h-48 w-full"
                            >
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        dataKey="count"
                                        nameKey="status"
                                        innerRadius={54}
                                        outerRadius={84}
                                        paddingAngle={2}
                                        strokeWidth={0}
                                    >
                                        {statusData.map((entry) => (
                                            <Cell
                                                key={entry.status}
                                                fill={DASHBOARD_STATUS_COLORS[entry.status]}
                                            />
                                        ))}
                                    </Pie>

                                    <ChartTooltip
                                        content={<ChartTooltipContent nameKey="status" hideLabel />}
                                    />
                                </PieChart>
                            </ChartContainer>

                            <ul className="grid gap-2">
                                {statusData.map((entry) => (
                                    <li
                                        key={entry.status}
                                        className="flex items-center justify-between gap-3 text-sm"
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span
                                                className="size-2.5 shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        DASHBOARD_STATUS_COLORS[entry.status],
                                                }}
                                                aria-hidden="true"
                                            />
                                            <span className="text-muted-foreground truncate">
                                                {t(`statuses.${entry.status}`)}
                                            </span>
                                        </span>

                                        <span className="font-medium tabular-nums">
                                            {formatNumber(entry.count, locale)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <AdminEmptyState
                            title={t('dashboard.chartEmpty')}
                            description={periodLabel}
                            className="border-0 py-10"
                        />
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-xs xl:col-span-2">
                <CardHeader>
                    <CardTitle className="text-base">{t('dashboard.customersOverTime')}</CardTitle>
                    <CardDescription>
                        {t('dashboard.customersOverTimeDescription')} · {periodLabel}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {hasCustomersActivity ? (
                        <ChartContainer config={customersChartConfig} className="h-52 w-full">
                            <AreaChart data={seriesData} margin={{ left: 4, right: 4 }}>
                                <defs>
                                    <linearGradient
                                        id="dashboard-customers-fill"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="var(--color-customers)"
                                            stopOpacity={0.35}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--color-customers)"
                                            stopOpacity={0.02}
                                        />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid vertical={false} strokeDasharray="3 3" />

                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={16}
                                    tickMargin={8}
                                />

                                <YAxis
                                    allowDecimals={false}
                                    width={36}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => formatCompact(Number(value), locale)}
                                />

                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) => (
                                                <div className="flex w-full items-center justify-between gap-3">
                                                    <span className="text-muted-foreground flex items-center gap-2">
                                                        <span
                                                            className="size-2 rounded-full"
                                                            style={{
                                                                backgroundColor: 'var(--chart-3)',
                                                            }}
                                                            aria-hidden="true"
                                                        />
                                                        {t('dashboard.customersSeries')}
                                                    </span>
                                                    <span className="text-foreground font-mono font-medium tabular-nums">
                                                        {formatNumber(Number(value), locale)}
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />

                                <Area
                                    type="monotone"
                                    dataKey="customers"
                                    stroke="var(--color-customers)"
                                    strokeWidth={2}
                                    fill="url(#dashboard-customers-fill)"
                                />
                            </AreaChart>
                        </ChartContainer>
                    ) : (
                        <AdminEmptyState
                            title={t('dashboard.chartEmpty')}
                            description={periodLabel}
                            className="border-0 py-10"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
