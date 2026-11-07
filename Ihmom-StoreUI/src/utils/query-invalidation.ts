import type { QueryClient } from '@tanstack/react-query';

import {
    CUSTOMERS,
    DASHBOARD_STATS,
    DELIVERY_AREAS,
    ORDER,
    ORDERS,
    ORDER_ITEMS,
    PRODUCT,
    PRODUCT_IMAGES,
    PRODUCTS,
    PRODUCT_VARIANTS,
} from './query-keys.ts';

export function invalidateDashboardStats(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: [DASHBOARD_STATS] });
}

export function invalidateProductData(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: [PRODUCTS] });
    void queryClient.invalidateQueries({ queryKey: [PRODUCT] });
    // Order items resolve product and variant names from the current catalogue.
    void queryClient.invalidateQueries({ queryKey: [ORDERS] });
    void queryClient.invalidateQueries({ queryKey: [ORDER] });
    void queryClient.invalidateQueries({ queryKey: [ORDER_ITEMS] });
    invalidateDashboardStats(queryClient);
}

export function invalidateProductVariants(queryClient: QueryClient, productId: number): void {
    void queryClient.invalidateQueries({ queryKey: [PRODUCT_VARIANTS, productId] });
    invalidateProductData(queryClient);
}

export function invalidateProductImages(queryClient: QueryClient, productId: number): void {
    // Image changes affect the catalogue and galleries but not dashboard totals.
    void queryClient.invalidateQueries({ queryKey: [PRODUCT_IMAGES, productId] });
    void queryClient.invalidateQueries({ queryKey: [PRODUCTS] });
    void queryClient.invalidateQueries({ queryKey: [PRODUCT] });
}

export function invalidateCatalogTaxonomy(queryClient: QueryClient, queryKey: string): void {
    // Products embed category and brand summaries, so taxonomy edits invalidate them too.
    void queryClient.invalidateQueries({ queryKey: [queryKey] });
    void queryClient.invalidateQueries({ queryKey: [PRODUCTS] });
    void queryClient.invalidateQueries({ queryKey: [PRODUCT] });
    invalidateDashboardStats(queryClient);
}

export function invalidateAdminCollection(queryClient: QueryClient, queryKey: string): void {
    void queryClient.invalidateQueries({ queryKey: [queryKey] });
    invalidateDashboardStats(queryClient);
}

export function invalidateCheckoutData(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: [ORDERS] });
    void queryClient.invalidateQueries({ queryKey: [CUSTOMERS] });
    invalidateDashboardStats(queryClient);
}

export function invalidateOrderData(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: [ORDERS] });
    invalidateDashboardStats(queryClient);
}

export function invalidateCustomerData(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: [CUSTOMERS] });
    invalidateDashboardStats(queryClient);
}

export function invalidateDeliveryAreas(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: [DELIVERY_AREAS] });
    // Orders embed the delivery area names.
    void queryClient.invalidateQueries({ queryKey: [ORDERS] });
    void queryClient.invalidateQueries({ queryKey: [ORDER] });
}
