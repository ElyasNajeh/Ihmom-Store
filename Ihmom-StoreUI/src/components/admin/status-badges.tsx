import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { ORDER_STATUS, type OrderStatus } from '@/constants/orders.ts';
import { cn } from '@/lib/utils.ts';

const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
    [ORDER_STATUS.PENDING]:
        'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:border-amber-400/40 dark:text-amber-300',
    [ORDER_STATUS.CONFIRMED]:
        'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:border-sky-400/40 dark:text-sky-300',
    [ORDER_STATUS.OUT_FOR_DELIVERY]:
        'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:border-violet-400/40 dark:text-violet-300',
    [ORDER_STATUS.DELIVERED]:
        'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300',
    [ORDER_STATUS.CANCELLED]:
        'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:border-rose-400/40 dark:text-rose-300',
};

export function OrderStatusBadge({
    status,
    className,
}: {
    status: OrderStatus;
    className?: string;
}) {
    const { t } = useTranslation('admin');

    return (
        <Badge variant="outline" className={cn(ORDER_STATUS_CLASSES[status], className)}>
            {t(`statuses.${status}`)}
        </Badge>
    );
}

export function ActiveBadge({ isActive, className }: { isActive: boolean; className?: string }) {
    const { t } = useTranslation('admin');

    return (
        <Badge
            variant="outline"
            className={cn(
                isActive
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300'
                    : 'border-border text-muted-foreground bg-muted/60',
                className,
            )}
        >
            {isActive ? t('common.active') : t('common.inactive')}
        </Badge>
    );
}
