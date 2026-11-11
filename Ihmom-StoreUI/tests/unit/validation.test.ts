import { expect, test } from 'vitest';
import { checkoutSchema, orderHistorySchema } from '@/features/orders/schemas/orders';
import { createProductSchema } from '@/features/catalog/schemas/products';
import { createAdminSchema } from '@/features/admins/schemas/admins';

const checkout = {
    customer_name: 'Lina',
    customer_phone: '0599123456',
    address: 'Street',
    delivery_area_id: 1,
    items: [{ product_variant_id: 1, quantity: 1 }],
};
test.each(['0599123456', '+970599123456', '970599123456', '+972599123456'])(
    'checkout accepts backend phone format %s',
    (phone) => {
        expect(checkoutSchema.safeParse({ ...checkout, customer_phone: phone }).success).toBe(true);
    },
);
test.each([0, -1, 1.5, true, '2', 2147483648])(
    'checkout rejects invalid quantity %s',
    (quantity) => {
        expect(
            checkoutSchema.safeParse({ ...checkout, items: [{ product_variant_id: 1, quantity }] })
                .success,
        ).toBe(false);
    },
);
test('checkout rejects duplicate variants, empty carts and whitespace names', () => {
    for (const patch of [
        { items: [] },
        { items: [...checkout.items, ...checkout.items] },
        { customer_name: '  ' },
    ]) {
        expect(checkoutSchema.safeParse({ ...checkout, ...patch }).success).toBe(false);
    }
});
test('history normalizes an order number and preserves international identity', () => {
    expect(
        orderHistorySchema.parse({ phone: '+972599123456', order_number: ' # ORD-test ' }),
    ).toEqual({ phone: '+972599123456', order_number: 'ORD-test' });
});
test('product simple/variant cross-field constraints and money precision match backend', () => {
    const product = { name_ar: 'منتج', name_en: 'Product', category_id: 1, brand_id: 1 };
    expect(createProductSchema.safeParse({ ...product, price: 0 }).success).toBe(true);
    for (const patch of [
        { price: -1 },
        { price: 1.001 },
        { price: 100000000 },
        {},
        { variants: [] },
    ]) {
        expect(createProductSchema.safeParse({ ...product, ...patch }).success).toBe(false);
    }
});
test('admin accepts trimmed email and rejects passwords above 72 UTF-8 bytes', () => {
    const admin = { username: 'admin', email: ' admin@example.com ', password: 'Password123!' };
    expect(createAdminSchema.parse(admin).email).toBe('admin@example.com');
    expect(createAdminSchema.safeParse({ ...admin, password: 'é'.repeat(37) }).success).toBe(false);
});
