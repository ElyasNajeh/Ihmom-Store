import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    checkoutOrder,
    downloadAdminOrderInvoice,
    downloadOrderHistoryInvoice,
    fetchAdminOrder,
    fetchAdminOrders,
    fetchOrderItems,
    updateOrderStatus,
} from '@/features/orders/api/orders-api.ts';
import type { OrderStatusUpdate, QueryOrder } from '@/features/orders/types/order.ts';
import type { Language } from '@/i18n/locales.ts';
import { withDefaultQuery } from '@/shared/types/query.ts';
import { ORDER, ORDERS, ORDER_ITEMS } from '@/shared/utils/query-keys.ts';
import { invalidateCheckoutData, invalidateOrderData } from '@/shared/utils/query-invalidation.ts';

export function useAdminOrders(params: QueryOrder = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [ORDERS, queryParams],
        queryFn: () => fetchAdminOrders(queryParams),
    });
}

export function useAdminOrder(orderId: number) {
    return useQuery({
        queryKey: [ORDER, orderId],
        queryFn: () => fetchAdminOrder(orderId),
    });
}

export function useCheckout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: checkoutOrder,

        onSuccess: () => {
            invalidateCheckoutData(queryClient);
        },
    });
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, statusData }: { orderId: number; statusData: OrderStatusUpdate }) =>
            updateOrderStatus(orderId, statusData),

        onSuccess: (order) => {
            queryClient.setQueryData([ORDER, order.id], order);
            invalidateOrderData(queryClient);
        },
    });
}

export function useOrderItems(orderId: number) {
    return useQuery({
        queryKey: [ORDER_ITEMS, orderId],
        queryFn: () => fetchOrderItems(orderId),
    });
}

export function useOrderInvoice() {
    return useMutation({
        mutationFn: ({ orderId, language }: { orderId: number; language: Language }) =>
            downloadAdminOrderInvoice(orderId, language),
    });
}

export function useOrderHistoryInvoice() {
    return useMutation({
        mutationFn: ({ token, language }: { token: string; language: Language }) =>
            downloadOrderHistoryInvoice(token, language),
    });
}
