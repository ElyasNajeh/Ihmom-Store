import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ORDER_INVOICE_LANGUAGE_PARAM } from '@/constants/orders.ts';
import type { Language } from '@/i18n/locales.ts';
import { api, orderHistoryApi } from '@/services/axios.ts';
import type {
    Checkout,
    CheckoutOrder,
    Order,
    OrderHistoryItem,
    OrderHistoryRequest,
    OrderHistoryTokenResponse,
    OrderItem,
    OrderStatusUpdate,
    QueryOrder,
} from '@/models/order.ts';
import { type PaginatedResponse, withDefaultQuery } from '@/models/query.ts';
import { ORDER, ORDERS, ORDER_ITEMS } from '@/utils/query-keys.ts';
import { invalidateCheckoutData, invalidateOrderData } from '@/utils/query-invalidation.ts';

export function useAdminOrders(params: QueryOrder = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [ORDERS, queryParams],

        queryFn: async (): Promise<PaginatedResponse<Order>> => {
            const response = await api.get<PaginatedResponse<Order>>('/orders/admin/all', {
                params: queryParams,
            });

            return response.data;
        },
    });
}

export function useAdminOrder(orderId: number) {
    return useQuery({
        queryKey: [ORDER, orderId],

        queryFn: async (): Promise<Order> => {
            const response = await api.get<Order>(`/orders/admin/${orderId}`);

            return response.data;
        },
    });
}

export function useCheckout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (checkoutData: Checkout): Promise<CheckoutOrder> => {
            const response = await api.post<CheckoutOrder>('/orders/checkout', checkoutData);

            return response.data;
        },

        onSuccess: () => {
            invalidateCheckoutData(queryClient);
        },
    });
}

export async function verifyOrderHistoryAccess(
    historyData: OrderHistoryRequest,
): Promise<OrderHistoryTokenResponse> {
    const response = await orderHistoryApi.post<OrderHistoryTokenResponse>(
        '/orders/history/verify',
        historyData,
    );

    return response.data;
}

export async function fetchVerifiedOrderHistory(token: string): Promise<OrderHistoryItem> {
    const response = await orderHistoryApi.get<OrderHistoryItem>('/orders/history', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return response.data;
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            statusData,
        }: {
            orderId: number;
            statusData: OrderStatusUpdate;
        }): Promise<Order> => {
            const response = await api.patch<Order>(`/orders/admin/${orderId}/status`, statusData);

            return response.data;
        },

        onSuccess: (order) => {
            queryClient.setQueryData([ORDER, order.id], order);
            invalidateOrderData(queryClient);
        },
    });
}

export function useOrderItems(orderId: number) {
    return useQuery({
        queryKey: [ORDER_ITEMS, orderId],

        queryFn: async (): Promise<OrderItem[]> => {
            const response = await api.get<OrderItem[]>(`/orders/admin/${orderId}/items`);

            return response.data;
        },
    });
}

export function useOrderInvoice() {
    return useMutation({
        mutationFn: async ({
            orderId,
            language,
        }: {
            orderId: number;
            language: Language;
        }): Promise<Blob> => {
            const response = await api.get<Blob>(`/orders/admin/${orderId}/invoice`, {
                params: { [ORDER_INVOICE_LANGUAGE_PARAM]: language },
                responseType: 'blob',
            });

            return response.data;
        },
    });
}

export function useOrderHistoryInvoice() {
    return useMutation({
        mutationFn: async ({
            token,
            language,
        }: {
            token: string;
            language: Language;
        }): Promise<Blob> => {
            const response = await orderHistoryApi.get<Blob>('/orders/history/invoice', {
                headers: {
                    Accept: 'application/pdf',
                    Authorization: `Bearer ${token}`,
                },
                params: { [ORDER_INVOICE_LANGUAGE_PARAM]: language },
                responseType: 'blob',
            });

            return response.data;
        },
    });
}
