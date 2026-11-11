import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { CartProvider } from '@/app/providers/CartProvider';
import { useCart } from '@/features/cart/context/cart-context';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const item = {
    variantId: 1,
    productId: 1,
    nameAr: 'منتج',
    nameEn: 'Product',
    variantNameAr: null,
    variantNameEn: null,
    price: '10.25',
    image: null,
};
test('cart merges additions, caps quantities, calculates totals, persists and clears', () => {
    const hook = renderHook(useCart, { wrapper: CartProvider });
    act(() => {
        hook.result.current.addItem(item, 2);
        hook.result.current.addItem(item, 3);
    });
    expect(hook.result.current.items).toHaveLength(1);
    expect(hook.result.current.subtotal).toBe(51.25);
    act(() => hook.result.current.setQuantity(1, 999));
    expect(hook.result.current.itemCount).toBe(99);
    hook.unmount();
    const restored = renderHook(useCart, { wrapper: CartProvider });
    expect(restored.result.current.itemCount).toBe(99);
    act(() => restored.result.current.clearCart());
    expect(restored.result.current.items).toEqual([]);
});
test('invalid persisted prices and malformed storage do not corrupt cart totals', () => {
    localStorage.setItem(
        'ihmom-cart',
        JSON.stringify({ items: [{ ...item, price: 'NaN', quantity: 2 }] }),
    );
    const hook = renderHook(useCart, { wrapper: CartProvider });
    expect(hook.result.current.subtotal).toBe(0);
    act(() => hook.result.current.addItem(item));
    act(() => hook.result.current.setQuantity(1, NaN));
    expect(hook.result.current.itemCount).toBe(1);
});
