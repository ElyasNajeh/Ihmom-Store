import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ArrowLeft, Download, MapPin, Phone, StickyNote, User } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx';
import { useToastManager } from '@/components/ui/toast.tsx';
import { AdminPageHeader } from '@/components/admin/admin-page-header.tsx';
import { AdminEmptyState, AdminErrorState } from '@/components/admin/admin-states.tsx';
import { AdminTable } from '@/components/admin/admin-table.tsx';
import { ConfirmDialog } from '@/components/admin/confirm-dialog.tsx';
import { OrderStatusBadge } from '@/components/admin/status-badges.tsx';
import type { ColumnDef } from '@/components/data/views/table-view.tsx';
import {
    useAdminOrder,
    useOrderInvoice,
    useOrderItems,
    useUpdateOrderStatus,
} from '@/hooks/useOrders.ts';
import type { OrderItem } from '@/models/order.ts';
import {
    INVOICE_FILENAME_PREFIX,
    ORDER_STATUS_TRANSITIONS,
    type OrderStatus,
} from '@/constants/orders.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import { formatOrderDate, formatOrderMoney } from '@/utils/order-format.ts';
import { localizedName, localizedText } from '@/utils/localized.ts';
import { getApiErrorMessage } from '@/utils/api-error.ts';
import { downloadBlob } from '@/utils/download.ts';

export default function AdminOrderDetailPage() {
    const { orderId: orderIdParam } = useParams();
    const { t } = useTranslation('admin');
    const toastManager = useToastManager();
    const { isArabic, locale, language } = useLocale();

    const orderId = Number(orderIdParam);
    const isValidId = Number.isInteger(orderId) && orderId > 0;

    const orderQuery = useAdminOrder(isValidId ? orderId : 0);
    const itemsQuery = useOrderItems(isValidId ? orderId : 0);
    const invoiceMutation = useOrderInvoice();
    const statusMutation = useUpdateOrderStatus();

    const [nextStatus, setNextStatus] = useState<OrderStatus | null>(null);

    const order = orderQuery.data;
    const isNotFound =
        !isValidId ||
        (axios.isAxiosError(orderQuery.error) && orderQuery.error.response?.status === 404);

    const items = useMemo(
        () => itemsQuery.data ?? order?.items ?? [],
        [itemsQuery.data, order?.items],
    );

    const columns = useMemo<ColumnDef<OrderItem>[]>(
        () => [
            {
                id: 'product',
                header: t('orders.product'),
                cell: (item) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {localizedText(item.product_name_en, item.product_name_ar, isArabic)}
                        </p>
                        {item.variant_name_ar || item.variant_name_en ? (
                            <p className="text-muted-foreground truncate text-xs">
                                {localizedText(
                                    item.variant_name_en,
                                    item.variant_name_ar,
                                    isArabic,
                                )}
                            </p>
                        ) : null}
                    </div>
                ),
            },
            {
                id: 'quantity',
                header: t('orders.quantity'),
                className: 'w-20 text-center',
                cell: (item) => <span className="tabular-nums">{item.quantity}</span>,
            },
            {
                id: 'unit_price',
                header: t('orders.unitPrice'),
                className: 'w-32 text-end',
                cell: (item) => (
                    <span className="tabular-nums">
                        {formatOrderMoney(item.unit_price, locale)}
                    </span>
                ),
            },
            {
                id: 'total',
                header: t('orders.lineTotal'),
                className: 'w-32 text-end',
                cell: (item) => (
                    <span className="font-medium tabular-nums">
                        {formatOrderMoney(item.total, locale)}
                    </span>
                ),
            },
        ],
        [isArabic, locale, t],
    );

    const handleInvoice = useCallback(async () => {
        if (!order || invoiceMutation.isPending) {
            return;
        }

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
        }
    }, [invoiceMutation, language, order, t, toastManager]);

    const handleStatusChange = useCallback(() => {
        if (!order || !nextStatus || statusMutation.isPending) {
            return;
        }

        const target = nextStatus;

        statusMutation.mutate(
            { orderId: order.id, statusData: { status: target } },
            {
                onSuccess: () => {
                    setNextStatus(null);
                    toastManager.add({
                        type: 'success',
                        title: t('orders.statusUpdated'),
                        description: t(`statuses.${target}`),
                    });
                },
                onError: (error) => {
                    setNextStatus(null);

                    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
                    const message =
                        status === 409
                            ? (getApiErrorMessage(error) ?? t('orders.invalidTransition'))
                            : (getApiErrorMessage(error) ?? t('common.errorDescription'));

                    toastManager.add({
                        type: 'error',
                        title: t('common.errorTitle'),
                        description: message,
                    });

                    if (status === 409) {
                        void orderQuery.refetch();
                    }
                },
            },
        );
    }, [nextStatus, order, orderQuery, statusMutation, t, toastManager]);

    if (!isValidId) {
        return (
            <AdminEmptyState
                title={t('orders.orderNotFound')}
                description={t('orders.orderNotFoundDescription')}
                action={
                    <Button asChild variant="outline">
                        <Link to="/admin/orders">
                            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
                            {t('orders.backToOrders')}
                        </Link>
                    </Button>
                }
            />
        );
    }

    if (orderQuery.isPending) {
        return (
            <div className="space-y-6" aria-busy="true">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-9 w-64" />
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <Skeleton className="h-96 w-full rounded-xl" />
                    <div className="space-y-4">
                        <Skeleton className="h-40 w-full rounded-xl" />
                        <Skeleton className="h-52 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (isNotFound) {
        return (
            <AdminEmptyState
                title={t('orders.orderNotFound')}
                description={t('orders.orderNotFoundDescription')}
                action={
                    <Button asChild variant="outline">
                        <Link to="/admin/orders">
                            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
                            {t('orders.backToOrders')}
                        </Link>
                    </Button>
                }
            />
        );
    }

    if (orderQuery.isError || !order) {
        return (
            <AdminErrorState
                onRetry={() => void orderQuery.refetch()}
                description={getApiErrorMessage(orderQuery.error) ?? undefined}
            />
        );
    }

    const transitions = ORDER_STATUS_TRANSITIONS[order.status];
    const areaName = localizedName(order.delivery_area, isArabic);

    return (
        <div className="space-y-6">
            <div>
                <Link
                    to="/admin/orders"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
                >
                    <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                    {t('orders.backToOrders')}
                </Link>
            </div>

            <AdminPageHeader
                title={
                    <span className="flex flex-wrap items-center gap-3">
                        {t('orders.detailsTitle', { number: order.order_number })}
                        <OrderStatusBadge status={order.status} />
                    </span>
                }
                description={`${formatOrderDate(order.created_at, locale)} · ${areaName}`}
                actions={
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleInvoice()}
                        disabled={invoiceMutation.isPending}
                    >
                        <Download aria-hidden="true" />
                        {invoiceMutation.isPending
                            ? t('orders.downloading')
                            : t('orders.downloadInvoice')}
                    </Button>
                }
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                <div className="space-y-4">
                    <AdminTable
                        items={items}
                        columns={columns}
                        keyExtractor={(item) => item.id}
                        isLoading={itemsQuery.isPending}
                        isError={itemsQuery.isError}
                        onRetry={() => void itemsQuery.refetch()}
                        emptyTitle={t('orders.noItems')}
                        emptyDescription={t('orders.itemsTitle')}
                        skeletonRowCount={3}
                        tableMinWidthClass="[&_table]:min-w-[560px]"
                        footer={
                            <dl className="ms-auto grid max-w-xs gap-2 text-sm">
                                <div className="flex items-center justify-between gap-6">
                                    <dt className="text-muted-foreground">
                                        {t('orders.subtotal')}
                                    </dt>
                                    <dd className="tabular-nums">
                                        {formatOrderMoney(order.subtotal, locale)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-6">
                                    <dt className="text-muted-foreground">
                                        {t('orders.deliveryFee')}
                                    </dt>
                                    <dd className="tabular-nums">
                                        {formatOrderMoney(order.delivery_fee, locale)}
                                    </dd>
                                </div>
                                <div className="border-border flex items-center justify-between gap-6 border-t pt-2 font-semibold">
                                    <dt>{t('orders.grandTotal')}</dt>
                                    <dd className="tabular-nums">
                                        {formatOrderMoney(order.total, locale)}
                                    </dd>
                                </div>
                            </dl>
                        }
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('orders.status')}</CardTitle>
                            <CardDescription>{t('orders.nextStatus')}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{t('orders.currentStatus')}</Badge>
                            <OrderStatusBadge status={order.status} />
                            <span className="text-muted-foreground mx-1 hidden h-5 w-px sm:block" />
                            {transitions.length ? (
                                transitions.map((status) => (
                                    <Button
                                        key={status}
                                        type="button"
                                        size="sm"
                                        variant={status === 'cancelled' ? 'destructive' : 'default'}
                                        disabled={statusMutation.isPending}
                                        onClick={() => setNextStatus(status)}
                                    >
                                        {t('orders.markAs', { status: t(`statuses.${status}`) })}
                                    </Button>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    {t('orders.noStatusActions')}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('orders.customerInfo')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p className="flex items-start gap-2">
                                <User
                                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="font-medium">{order.customer_name}</span>
                            </p>
                            <a
                                href={`tel:${order.customer_phone}`}
                                className="hover:text-foreground text-muted-foreground flex items-center gap-2 transition-colors"
                            >
                                <Phone className="size-4 shrink-0" aria-hidden="true" />
                                <span dir="ltr">{order.customer_phone}</span>
                            </a>
                            <p className="text-muted-foreground text-xs">
                                {formatOrderDate(order.created_at, locale)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('orders.deliveryAddress')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p className="flex items-start gap-2">
                                <MapPin
                                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>
                                    <span className="block font-medium">{areaName}</span>
                                    <span className="text-muted-foreground mt-0.5 block whitespace-pre-line">
                                        {order.address}
                                    </span>
                                </span>
                            </p>
                            <div className="border-border border-t pt-3">
                                <p className="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
                                    <StickyNote className="size-3.5" aria-hidden="true" />
                                    {t('orders.notes')}
                                </p>
                                <p className="text-muted-foreground whitespace-pre-line">
                                    {order.notes?.trim() ? order.notes : t('orders.noNotes')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConfirmDialog
                open={nextStatus !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setNextStatus(null);
                    }
                }}
                title={t('orders.statusChangeTitle')}
                description={
                    nextStatus
                        ? t('orders.statusChangeDescription', {
                              number: order.order_number,
                              from: t(`statuses.${order.status}`),
                              to: t(`statuses.${nextStatus}`),
                          })
                        : ''
                }
                confirmLabel={t('orders.confirmStatus')}
                onConfirm={handleStatusChange}
                isPending={statusMutation.isPending}
                destructive={nextStatus === 'cancelled'}
            />
        </div>
    );
}
