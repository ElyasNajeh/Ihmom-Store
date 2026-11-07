import { CalendarDays, Download, MapPin, Phone, StickyNote, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { useToastManager } from '@/components/ui/toast.tsx';
import { useOrderHistoryInvoice } from '@/hooks/useOrders.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import { DEFAULT_LANGUAGE } from '@/i18n/locales.ts';
import type { OrderHistoryItem } from '@/models/order.ts';
import { INVOICE_FILENAME_PREFIX } from '@/constants/orders.ts';
import { getApiErrorMessage } from '@/utils/api-error.ts';
import { downloadBlob } from '@/utils/download.ts';
import { formatOrderDate, formatOrderMoney } from '@/utils/order-format.ts';
import { localizedVariantName } from '@/utils/product-variant.ts';
import { OrderStatusBadge } from './order-status-badge.tsx';

interface OrderHistoryCardProps {
    order: OrderHistoryItem;
    token: string | null;
    locale: string;
}

export function OrderHistoryCard({ order, token, locale }: OrderHistoryCardProps) {
    const { t, i18n } = useTranslation('orders');
    const toastManager = useToastManager();
    const invoiceMutation = useOrderHistoryInvoice();
    const { language } = useLocale();

    const isArabic = (i18n.resolvedLanguage ?? DEFAULT_LANGUAGE).startsWith('ar');
    const deliveryArea = isArabic
        ? order.delivery_area_name_ar || order.delivery_area_name_en
        : order.delivery_area_name_en || order.delivery_area_name_ar;

    const downloadInvoice = async () => {
        if (!token || invoiceMutation.isPending) {
            return;
        }

        try {
            const blob = await invoiceMutation.mutateAsync({ token, language });
            downloadBlob(blob, `${INVOICE_FILENAME_PREFIX}-${order.order_number}.pdf`);
        } catch (error) {
            toastManager.add({
                type: 'error',
                title: t('history.invoiceErrorTitle'),
                description: getApiErrorMessage(error) ?? t('history.invoiceErrorDescription'),
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <span dir="ltr" className="block font-mono text-sm break-all">
                        {order.order_number}
                    </span>
                </CardTitle>

                <CardDescription className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                    {t('history.placedOn', {
                        date: formatOrderDate(order.created_at, locale),
                    })}
                </CardDescription>

                <CardAction>
                    <OrderStatusBadge status={order.status} />
                </CardAction>
            </CardHeader>

            <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <dl className="space-y-2 text-sm">
                        <div>
                            <dt className="text-muted-foreground text-xs">
                                {t('history.customer')}
                            </dt>
                            <dd className="mt-0.5 flex items-center gap-2 font-medium">
                                <User className="size-3.5 shrink-0" aria-hidden="true" />
                                {order.customer_name}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-muted-foreground text-xs">{t('history.phone')}</dt>
                            <dd className="mt-0.5">
                                <a
                                    href={`tel:${order.customer_phone}`}
                                    className="hover:text-foreground flex items-center gap-2 transition-colors"
                                >
                                    <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                                    <span dir="ltr">{order.customer_phone}</span>
                                </a>
                            </dd>
                        </div>
                    </dl>

                    <dl className="space-y-2 text-sm">
                        <div>
                            <dt className="text-muted-foreground text-xs">
                                {t('history.deliveryArea')}
                            </dt>
                            <dd className="mt-0.5 flex items-start gap-2 font-medium">
                                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                    <span className="block">{deliveryArea}</span>
                                    <span className="text-muted-foreground mt-0.5 block font-normal whitespace-pre-line">
                                        {order.address}
                                    </span>
                                </span>
                            </dd>
                        </div>

                        <div>
                            <dt className="text-muted-foreground text-xs">{t('history.notes')}</dt>
                            <dd className="text-muted-foreground mt-0.5 flex items-start gap-2">
                                <StickyNote
                                    className="mt-0.5 size-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="whitespace-pre-line">
                                    {order.notes?.trim() ? order.notes : t('history.noNotes')}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </div>

                <div>
                    <h3 className="text-sm font-medium">{t('history.products')}</h3>
                    <ul className="border-border mt-2 divide-y rounded-lg border">
                        {order.items.map((item, index) => {
                            const name = isArabic
                                ? item.product_name_ar || item.product_name_en
                                : item.product_name_en || item.product_name_ar;
                            const variant =
                                item.variant_name_ar || item.variant_name_en
                                    ? localizedVariantName(
                                          item.variant_name_ar,
                                          item.variant_name_en,
                                          isArabic,
                                          t('history.defaultVariant'),
                                      )
                                    : null;

                            return (
                                <li
                                    key={`${item.product_name_en}-${index}`}
                                    className="flex items-start justify-between gap-3 p-3 text-sm"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium break-words">{name}</p>
                                        {variant ? (
                                            <p className="text-muted-foreground text-xs">
                                                {variant}
                                            </p>
                                        ) : null}
                                        <p className="text-muted-foreground mt-0.5 text-xs">
                                            {t('history.lineQuantity', {
                                                count: item.quantity,
                                            })}{' '}
                                            × {formatOrderMoney(item.unit_price, locale)}
                                        </p>
                                    </div>
                                    <span className="shrink-0 font-medium tabular-nums">
                                        {formatOrderMoney(item.total, locale)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <dl className="ms-auto grid w-full max-w-xs gap-1.5 text-sm">
                    <div className="flex items-center justify-between gap-6">
                        <dt className="text-muted-foreground">{t('history.subtotal')}</dt>
                        <dd className="tabular-nums">{formatOrderMoney(order.subtotal, locale)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                        <dt className="text-muted-foreground">{t('history.delivery')}</dt>
                        <dd className="tabular-nums">
                            {formatOrderMoney(order.delivery_fee, locale)}
                        </dd>
                    </div>
                    <div className="border-border flex items-center justify-between gap-6 border-t pt-1.5 font-semibold">
                        <dt>{t('history.total')}</dt>
                        <dd className="text-primary tabular-nums">
                            {formatOrderMoney(order.total, locale)}
                        </dd>
                    </div>
                </dl>
            </CardContent>

            <CardFooter className="justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => void downloadInvoice()}
                    disabled={!token || invoiceMutation.isPending}
                >
                    {invoiceMutation.isPending ? (
                        <Spinner aria-hidden="true" />
                    ) : (
                        <Download className="size-4" aria-hidden="true" />
                    )}
                    {invoiceMutation.isPending
                        ? t('history.downloadingInvoice')
                        : t('history.downloadInvoice')}
                </Button>
            </CardFooter>
        </Card>
    );
}
