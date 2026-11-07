export const MAX_CART_QUANTITY = 99;

export const CART_STORAGE_KEY = 'ihmom-cart';

export function formatCartBadgeCount(count: number): string {
    return count > MAX_CART_QUANTITY ? `${MAX_CART_QUANTITY}+` : String(count);
}
