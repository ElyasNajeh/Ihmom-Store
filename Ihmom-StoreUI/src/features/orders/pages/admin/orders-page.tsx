import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Eye, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { SearchableSelect } from '@/shared/components/ui/searchable-select.tsx';
import { Separator } from '@/shared/components/ui/separator.tsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select.tsx';
import { useToastManager } from '@/shared/components/ui/toast.tsx';
import { AdminPageHeader } from '@/shared/components/admin/admin-page-header.tsx';
import { AdminTable } from '@/shared/components/admin/admin-table.tsx';
import { AdminPagination } from '@/shared/components/admin/admin-pagination.tsx';
import { AdminSearchInput } from '@/shared/components/admin/admin-search-input.tsx';
import { AdminSortSelect } from '@/shared/components/admin/admin-sort-select.tsx';
import { OrderStatusBadge } from '@/shared/components/admin/status-badges.tsx';
import type { ColumnDef } from '@/shared/components/data/views/table-view.tsx';
import { useAdminOrders, useOrderInvoice } from '@/features/orders/hooks/useOrders.ts';
import { useAdminDeliveryAreas } from '@/features/delivery/hooks/useDeliveryAreas.ts';
import { useDebounce } from '@/shared/hooks/useDebounce.ts';
import type { Order, OrderFilters, QueryOrder } from '@/features/orders/types/order.ts';
import { DELIVERY_AREA_SORTED_LOOKUP_PARAMS } from '@/features/delivery/constants/delivery-areas.ts';
import {
    INVOICE_FILENAME_PREFIX,
    ORDER_DEFAULT_SORT,
    ORDER_SORT_OPTIONS,
    ORDER_SORT_PARAMS,
    ORDER_STATUSES,
    type OrderSortValue,
    type OrderStatus,
} from '@/features/orders/constants/orders.ts';
import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    FILTER_ALL,
    resolveSortParams,
    SEARCH_DEBOUNCE_MS,
} from '@/shared/constants/query.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import { localizeOptions } from '@/shared/utils/localized-options.ts';
import { formatOrderDate, formatOrderMoney } from '@/features/orders/utils/order-format.ts';
import { localizedName } from '@/shared/utils/localized.ts';
import { getApiErrorMessage } from '@/shared/utils/api-error.ts';
import { downloadBlob } from '@/shared/utils/download.ts';

type StatusFilter = typeof FILTER_ALL | OrderStatus;

export default function AdminOrdersPage() {
    const { t } = useTranslation('admin');
    const toastManager = useToastManager();
    const { isArabic, locale, language } = useLocale();

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<StatusFilter>(FILTER_ALL);
    const [areaId, setAreaId] = useState<string>(FILTER_ALL);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [minTotal, setMinTotal] = useState('');
    const [maxTotal, setMaxTotal] = useState('');
    const [sort, setSort] = useState<OrderSortValue>(ORDER_DEFAULT_SORT);
    const [page, setPage] = useState(DEFAULT_PAGE);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const debouncedSearch = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS);
    const debouncedMinTotal = useDebounce(minTotal.trim(), SEARCH_DEBOUNCE_MS);
    const debouncedMaxTotal = useDebounce(maxTotal.trim(), SEARCH_DEBOUNCE_MS);

    const updateSearch = (value: string) => {
        setSearch(value);
        setPage(DEFAULT_PAGE);
    };

    const updateStatus = (value: string) => {
        if (value === FILTER_ALL || ORDER_STATUSES.includes(value as OrderStatus)) {
            setStatus(value as StatusFilter);
            setPage(DEFAULT_PAGE);
        }
    };

    const updateArea = (value: string) => {
        setAreaId(value);
        setPage(DEFAULT_PAGE);
    };

    const updateDateFrom = (value: string) => {
        setDateFrom(value);
        setPage(DEFAULT_PAGE);
    };

    const updateDateTo = (value: string) => {
        setDateTo(value);
        setPage(DEFAULT_PAGE);
    };

    const updateMinTotal = (value: string) => {
        setMinTotal(value);
        setPage(DEFAULT_PAGE);
    };

    const updateMaxTotal = (value: string) => {
        setMaxTotal(value);
        setPage(DEFAULT_PAGE);
    };

    const updateSort = (value: OrderSortValue) => {
        setSort(value);
        setPage(DEFAULT_PAGE);
    };

    const updatePageSize = (value: number) => {
        setPageSize(value);
        setPage(DEFAULT_PAGE);
    };

    const params = useMemo<QueryOrder>(() => {
        const filters: OrderFilters = {};
        const min = debouncedMinTotal === '' ? undefined : Number(debouncedMinTotal);
        const max = debouncedMaxTotal === '' ? undefined : Number(debouncedMaxTotal);
        const validRange =
            min === undefined ||
            max === undefined ||
            (Number.isFinite(min) && Number.isFinite(max) && min <= max);

        if (status !== FILTER_ALL) filters.status = status;
        if (areaId !== FILTER_ALL) filters.delivery_area_id = Number(areaId);
        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo) filters.date_to = dateTo;
        if (validRange && min !== undefined && Number.isFinite(min) && min >= 0) {
            filters.min_total = min;
        }
        if (validRange && max !== undefined && Number.isFinite(max) && max >= 0) {
            filters.max_total = max;
        }

        return {
            page,
            page_size: pageSize,
            search: debouncedSearch || undefined,
            ...resolveSortParams(sort, ORDER_SORT_PARAMS),
            filter: Object.keys(filters).length ? filters : undefined,
        };
    }, [
        areaId,
        dateFrom,
        dateTo,
        debouncedMaxTotal,
        debouncedMinTotal,
        debouncedSearch,
        page,
        pageSize,
        sort,
        status,
    ]);

    const query = useAdminOrders(params);
    const areasQuery = useAdminDeliveryAreas(DELIVERY_AREA_SORTED_LOOKUP_PARAMS);
    const invoiceMutation = useOrderInvoice();

    const orders = query.data?.items ?? [];
    const total = query.data?.total ?? 0;
    const totalPages = query.data?.total_pages ?? 0;
    const areas = areasQuery.data?.items ?? [];

    const [invoiceOrderId, setInvoiceOrderId] = useState<number | null>(null);

    const hasFilters =
        search !== '' ||
        status !== FILTER_ALL ||
        areaId !== FILTER_ALL ||
        dateFrom !== '' ||
        dateTo !== '' ||
        minTotal !== '' ||
        maxTotal !== '';

    const clearFilters = () => {
        setSearch('');
        setStatus(FILTER_ALL);
        setAreaId(FILTER_ALL);
        setDateFrom('');
        setDateTo('');
        setMinTotal('');
        setMaxTotal('');
        setPage(DEFAULT_PAGE);
    };

    const handleInvoice = useCallback(
        async (order: Order) => {
            if (invoiceMutation.isPending) return;

            setInvoiceOrderId(order.id);

            try {
                const blob = await invoiceMutation.mutateAsync({
                    orderId: order.id,
                    language,
                });
                downloadBlob(blob, `${INVOICE_FILENAME_PREFIX}-${order.order_number}.pdf`);
            } catch (error) {
                toastManager.add({
                    type: 'error',
                    title: t('common.errorTitle'),
                    description: getApiErrorMessage(error) ?? t('orders.invoiceError'),
                });
            } finally {
                setInvoiceOrderId(null);
            }
        },
        [invoiceMutation, language, t, toastManager],
    );

    const columns = useMemo<ColumnDef<Order>[]>(
        () => [
            {
                id: 'order',
                header: t('orders.orderNumber'),
                cell: (order) => (
                    <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">{order.order_number}</p>
                        <p className="text-muted-foreground text-xs">
                            {t('orders.itemsCount', { count: order.items.length })}
                        </p>
                    </div>
                ),
            },
            {
                id: 'customer',
                header: t('orders.customer'),
                cell: (order) => (
                    <div className="min-w-0">
                        <p className="truncate">{order.customer_name}</p>
                        <p className="text-muted-foreground font-mono text-xs" dir="ltr">
                            {order.customer_phone}
                        </p>
                    </div>
                ),
            },
            {
                id: 'area',
                header: t('orders.area'),
                className: 'hidden whitespace-nowrap xl:table-cell',
                cell: (order) => localizedName(order.delivery_area, isArabic),
            },
            {
                id: 'total',
                header: t('orders.total'),
                className: 'whitespace-nowrap tabular-nums',
                cell: (order) => formatOrderMoney(order.total, locale),
            },
            {
                id: 'status',
                header: t('orders.status'),
                cell: (order) => <OrderStatusBadge status={order.status} />,
            },
            {
                id: 'placed',
                header: t('orders.placedAt'),
                className: 'hidden whitespace-nowrap lg:table-cell',
                cell: (order) => (
                    <span className="text-muted-foreground text-xs">
                        {formatOrderDate(order.created_at, locale)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: t('common.actions'),
                className: 'w-24 text-end',
                cell: (order) => (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            asChild
                            aria-label={`${t('orders.viewOrder')}: ${order.order_number}`}
                        >
                            <Link to={`/admin/orders/${order.id}`}>
                                <Eye aria-hidden="true" />
                            </Link>
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${t('orders.downloadInvoice')}: ${order.order_number}`}
                            disabled={invoiceMutation.isPending && invoiceOrderId === order.id}
                            onClick={() => void handleInvoice(order)}
                        >
                            {invoiceMutation.isPending && invoiceOrderId === order.id ? (
                                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                <Download aria-hidden="true" />
                            )}
                        </Button>
                    </div>
                ),
            },
        ],
        [handleInvoice, invoiceMutation.isPending, invoiceOrderId, isArabic, locale, t],
    );

    const sortOptions = localizeOptions(ORDER_SORT_OPTIONS, t);

    const statusItems = [
        { value: FILTER_ALL, label: t('orders.allStatuses') },
        ...ORDER_STATUSES.map((option) => ({ value: option, label: t(`statuses.${option}`) })),
    ];

    const areaItems = [
        { value: FILTER_ALL, label: t('orders.allAreas') },
        ...areas.map((area) => ({
            value: String(area.id),
            label: localizedName(area, isArabic),
        })),
    ];

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader title={t('orders.title')} description={t('orders.description')} />

            <AdminTable
                items={orders}
                columns={columns}
                keyExtractor={(order) => order.id}
                isLoading={query.isPending}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                emptyTitle={hasFilters ? t('common.noResults') : t('orders.empty')}
                emptyDescription={
                    hasFilters ? t('common.noResultsDescription') : t('orders.emptyDescription')
                }
                emptyAction={
                    hasFilters ? (
                        <Button type="button" variant="outline" onClick={clearFilters}>
                            <X aria-hidden="true" />
                            {t('common.clearFilters')}
                        </Button>
                    ) : undefined
                }
                toolbar={
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <AdminSearchInput
                                value={search}
                                onChange={updateSearch}
                                placeholder={t('orders.searchPlaceholder')}
                            />

                            <Separator
                                orientation="vertical"
                                className="hidden h-8 self-center lg:block"
                            />

                            <div className="flex flex-wrap items-center gap-2">
                                <Select
                                    items={statusItems}
                                    value={status}
                                    onValueChange={(value) => {
                                        if (value) updateStatus(value);
                                    }}
                                >
                                    <SelectTrigger
                                        size="sm"
                                        aria-label={t('orders.status')}
                                        className="w-40"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {statusItems.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <SearchableSelect
                                    options={areaItems}
                                    value={areaId}
                                    onChange={(value) => {
                                        if (value) updateArea(value);
                                    }}
                                    placeholder={t('orders.allAreas')}
                                    searchPlaceholder={t('orders.searchAreas')}
                                    emptyMessage={t('orders.noAreasFound')}
                                    openLabel={t('orders.deliveryArea')}
                                    clearable={false}
                                    className="w-44"
                                    inputClassName="h-9"
                                />

                                <AdminSortSelect
                                    value={sort}
                                    onChange={updateSort}
                                    options={sortOptions}
                                />
                            </div>
                        </div>

                        <div className="border-border grid gap-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="grid gap-1">
                                <label
                                    htmlFor="orders-date-from"
                                    className="text-muted-foreground text-xs"
                                >
                                    {t('orders.dateFrom')}
                                </label>
                                <Input
                                    id="orders-date-from"
                                    type="date"
                                    value={dateFrom}
                                    max={dateTo || undefined}
                                    onChange={(event) => updateDateFrom(event.target.value)}
                                    className="h-8"
                                />
                            </div>

                            <div className="grid gap-1">
                                <label
                                    htmlFor="orders-date-to"
                                    className="text-muted-foreground text-xs"
                                >
                                    {t('orders.dateTo')}
                                </label>
                                <Input
                                    id="orders-date-to"
                                    type="date"
                                    value={dateTo}
                                    min={dateFrom || undefined}
                                    onChange={(event) => updateDateTo(event.target.value)}
                                    className="h-8"
                                />
                            </div>

                            <div className="grid gap-1">
                                <label
                                    htmlFor="orders-min-total"
                                    className="text-muted-foreground text-xs"
                                >
                                    {t('orders.minTotal')}
                                </label>
                                <Input
                                    id="orders-min-total"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step={0.01}
                                    value={minTotal}
                                    max={maxTotal || undefined}
                                    onChange={(event) => updateMinTotal(event.target.value)}
                                    className="h-8"
                                />
                            </div>

                            <div className="grid gap-1">
                                <label
                                    htmlFor="orders-max-total"
                                    className="text-muted-foreground text-xs"
                                >
                                    {t('orders.maxTotal')}
                                </label>
                                <Input
                                    id="orders-max-total"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step={0.01}
                                    value={maxTotal}
                                    onChange={(event) => updateMaxTotal(event.target.value)}
                                    className="h-8"
                                />
                            </div>

                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    disabled={!hasFilters}
                                    onClick={clearFilters}
                                >
                                    <X aria-hidden="true" />
                                    {t('common.clearFilters')}
                                </Button>
                            </div>
                        </div>
                    </div>
                }
                footer={
                    <AdminPagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        onPageSizeChange={updatePageSize}
                        isFetching={query.isFetching}
                    />
                }
            />
        </div>
    );
}
