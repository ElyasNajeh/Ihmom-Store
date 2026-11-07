import { z } from 'zod';
import {
    checkoutSchema,
    checkoutItemSchema,
    orderHistorySchema,
    orderStatusUpdateSchema,
    orderFiltersSchema,
    orderStatusSchema,
    orderSortSchema,
    sortOrderSchema,
} from '@/features/orders/schemas/orders.ts';
import type { Query } from '@/shared/types/query.ts';

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderSort = z.infer<typeof orderSortSchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;

export type Checkout = z.infer<typeof checkoutSchema>;
export type CheckoutItem = z.infer<typeof checkoutItemSchema>;
export type OrderHistoryRequest = z.infer<typeof orderHistorySchema>;
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>;
export type OrderFilters = z.infer<typeof orderFiltersSchema>;

export interface OrderDeliveryArea {
    id: number;
    name_ar: string;
    name_en: string;
}

export interface OrderItem {
    id: number;
    product_variant_id: number;
    product_name_ar: string;
    product_name_en: string;
    variant_name_ar: string | null;
    variant_name_en: string | null;
    quantity: number;
    unit_price: string;
    total: string;
    created_at: string;
}

export interface PublicOrderItem {
    product_name_ar: string;
    product_name_en: string;
    variant_name_ar: string | null;
    variant_name_en: string | null;
    quantity: number;
    unit_price: string;
    total: string;
}

export interface Order {
    id: number;
    order_number: string;
    customer_id: number;
    customer_name: string;
    customer_phone: string;
    delivery_area_id: number;
    delivery_area: OrderDeliveryArea;
    address: string;
    notes: string | null;
    subtotal: string;
    delivery_fee: string;
    total: string;
    status: OrderStatus;
    created_at: string;
    items: OrderItem[];
}

export interface CheckoutOrder {
    order_number: string;
    status: OrderStatus;
    created_at: string;
    customer_name: string;
    delivery_area_name_ar: string;
    delivery_area_name_en: string;
    address: string;
    items: PublicOrderItem[];
    subtotal: string;
    delivery_fee: string;
    total: string;
    history_access_token: string;
    history_access_token_expires_in: number;
}

export interface OrderHistoryItem {
    order_number: string;
    status: OrderStatus;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    delivery_area_name_ar: string;
    delivery_area_name_en: string;
    address: string;
    notes: string | null;
    total_quantity: number;
    items: PublicOrderItem[];
    subtotal: string;
    delivery_fee: string;
    total: string;
}

export interface OrderHistoryTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface QueryOrder extends Query {
    filter?: OrderFilters;
    sort_by?: OrderSort;
}
