import { useTranslation } from 'react-i18next';

import { Badge } from '@/shared/components/ui/badge.tsx';
import { ORDER_STATUS, type OrderStatus } from '@/features/orders/constants/orders.ts';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
    [ORDER_STATUS.PENDING]: 'secondary',
    [ORDER_STATUS.CONFIRMED]: 'default',
    [ORDER_STATUS.OUT_FOR_DELIVERY]: 'outline',
    [ORDER_STATUS.DELIVERED]: 'outline',
    [ORDER_STATUS.CANCELLED]: 'destructive',
};

const STATUS_CLASSNAME: Record<OrderStatus, string> = {
    [ORDER_STATUS.PENDING]: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    [ORDER_STATUS.CONFIRMED]: '',
    [ORDER_STATUS.OUT_FOR_DELIVERY]: 'border-sky-500/50 text-sky-700 dark:text-sky-300',
    [ORDER_STATUS.DELIVERED]: 'border-emerald-500/50 text-emerald-700 dark:text-emerald-300',
    [ORDER_STATUS.CANCELLED]: '',
};

interface OrderStatusBadgeProps {
    status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
    const { t } = useTranslation('orders');

    return (
        <Badge variant={STATUS_VARIANT[status]} className={STATUS_CLASSNAME[status]}>
            {t(`status.${status}`)}
        </Badge>
    );
}
