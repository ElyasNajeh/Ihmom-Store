import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';

import {
    CartContext,
    type CartItem,
    type CartItemInput,
    type CartContextValue,
} from '@/features/cart/context/cart-context.ts';
import { CART_STORAGE_KEY, MAX_CART_QUANTITY } from '@/features/cart/constants/cart.ts';

const cartItemSchema = z.object({
    variantId: z.number().int().positive(),
    productId: z.number().int().positive(),
    nameAr: z.string(),
    nameEn: z.string(),
    variantNameAr: z.string().nullable().default(null),
    variantNameEn: z.string().nullable().default(null),
    price: z
        .string()
        .refine(
            (value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0,
        ),
    image: z.string().nullable(),
    quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
});

const storedCartSchema = z.object({
    items: z.array(cartItemSchema),
});

function readStoredCart(): CartItem[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(CART_STORAGE_KEY);

        if (!raw) {
            return [];
        }

        const parsed = storedCartSchema.safeParse(JSON.parse(raw));

        return parsed.success ? parsed.data.items : [];
    } catch {
        return [];
    }
}

function clampQuantity(quantity: number): number {
    if (!Number.isFinite(quantity)) return 1;
    return Math.min(MAX_CART_QUANTITY, Math.max(1, Math.round(quantity)));
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>(readStoredCart);

    useEffect(() => {
        try {
            window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items }));
        } catch {
            // Storage can be unavailable in private browsing; the in-memory cart still works.
        }
    }, [items]);

    const addItem = useCallback((item: CartItemInput, quantity = 1) => {
        setItems((current) => {
            const existing = current.find((entry) => entry.variantId === item.variantId);

            if (existing) {
                return current.map((entry) =>
                    entry.variantId === item.variantId
                        ? {
                              ...entry,
                              quantity: clampQuantity(entry.quantity + quantity),
                          }
                        : entry,
                );
            }

            return [...current, { ...item, quantity: clampQuantity(quantity) }];
        });
    }, []);

    const removeItem = useCallback((variantId: number) => {
        setItems((current) => current.filter((entry) => entry.variantId !== variantId));
    }, []);

    const setQuantity = useCallback((variantId: number, quantity: number) => {
        if (!Number.isFinite(quantity)) return;
        if (quantity < 1) {
            setItems((current) => current.filter((entry) => entry.variantId !== variantId));
            return;
        }

        setItems((current) =>
            current.map((entry) =>
                entry.variantId === variantId
                    ? { ...entry, quantity: clampQuantity(quantity) }
                    : entry,
            ),
        );
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const value = useMemo<CartContextValue>(() => {
        const itemCount = items.reduce((total, item) => total + item.quantity, 0);
        const subtotal = items.reduce(
            (total, item) => total + Number(item.price) * item.quantity,
            0,
        );

        return { items, itemCount, subtotal, addItem, removeItem, setQuantity, clearCart };
    }, [addItem, clearCart, items, removeItem, setQuantity]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
