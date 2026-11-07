import { createContext, useContext } from 'react';

export interface CartItemInput {
    variantId: number;
    productId: number;
    nameAr: string;
    nameEn: string;
    variantNameAr: string | null;
    variantNameEn: string | null;
    price: string;
    image: string | null;
}

export interface CartItem extends CartItemInput {
    quantity: number;
}

export interface CartContextValue {
    items: CartItem[];
    itemCount: number;
    subtotal: number;
    addItem: (item: CartItemInput, quantity?: number) => void;
    removeItem: (variantId: number) => void;
    setQuantity: (variantId: number, quantity: number) => void;
    clearCart: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }

    return context;
}
