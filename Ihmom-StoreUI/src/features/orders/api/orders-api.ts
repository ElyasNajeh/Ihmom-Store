import { ORDER_INVOICE_LANGUAGE_PARAM } from '@/features/orders/constants/orders.ts';
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
} from '@/features/orders/types/order.ts';
import type { Language } from '@/i18n/locales.ts';
import { api, orderHistoryApi } from '@/shared/api/axios.ts';
import type { PaginatedResponse } from '@/shared/types/query.ts';

export async function fetchAdminOrders(params: QueryOrder): Promise<PaginatedResponse<Order>> {
    const response = await api.get<PaginatedResponse<Order>>('/orders/admin/all', { params });

    return response.data;
}

export async function fetchAdminOrder(orderId: number): Promise<Order> {
    const response = await api.get<Order>(`/orders/admin/${orderId}`);

    return response.data;
}

export async function checkoutOrder(checkoutData: Checkout): Promise<CheckoutOrder> {
    const response = await api.post<CheckoutOrder>('/orders/checkout', checkoutData);

    return response.data;
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

export async function updateOrderStatus(
    orderId: number,
    statusData: OrderStatusUpdate,
): Promise<Order> {
    const response = await api.patch<Order>(`/orders/admin/${orderId}/status`, statusData);

    return response.data;
}

export async function fetchOrderItems(orderId: number): Promise<OrderItem[]> {
    const response = await api.get<OrderItem[]>(`/orders/admin/${orderId}/items`);

    return response.data;
}

export async function downloadAdminOrderInvoice(
    orderId: number,
    language: Language,
): Promise<Blob> {
    const response = await api.get<Blob>(`/orders/admin/${orderId}/invoice`, {
        params: { [ORDER_INVOICE_LANGUAGE_PARAM]: language },
        responseType: 'blob',
    });

    return response.data;
}

export async function downloadOrderHistoryInvoice(
    token: string,
    language: Language,
): Promise<Blob> {
    const response = await orderHistoryApi.get<Blob>('/orders/history/invoice', {
        headers: {
            Accept: 'application/pdf',
            Authorization: `Bearer ${token}`,
        },
        params: { [ORDER_INVOICE_LANGUAGE_PARAM]: language },
        responseType: 'blob',
    });

    return response.data;
}
