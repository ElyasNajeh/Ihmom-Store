import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import i18n from '@/i18n';
import {
    ProductCreateForm,
    ProductEditForm,
} from '@/features/catalog/components/admin/product-form.tsx';
import type { BrandSummary, CategorySummary, Product } from '@/features/catalog/types/product.ts';

const categories: CategorySummary[] = [
    { id: 10, name_en: 'Hookahs', name_ar: 'شيش' },
    { id: 20, name_en: 'Accessories', name_ar: 'إكسسوارات' },
];

const brands: BrandSummary[] = [
    { id: 100, name_en: 'Q LM', name_ar: 'كيو إل إم' },
    { id: 200, name_en: 'Ihmom', name_ar: 'إحموم' },
];

const baseProduct: Product = {
    id: 1,
    category_id: 10,
    brand_id: 100,
    name_ar: 'لوحة ماوس للألعاب',
    name_en: 'RGB Gaming Mouse Pad',
    description_ar: 'وصف عربي',
    description_en: 'English description',
    is_active: true,
    created_at: '2026-11-01T00:00:00Z',
    category: categories[0],
    brand: brands[0],
    variants: [],
    images: [],
};

afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('en');
});

test('create form displays selected category and brand labels, toggles active switch, and submits payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
        <ProductCreateForm
            categories={categories}
            brands={brands}
            isSubmitting={false}
            onSubmit={onSubmit}
        />,
    );

    const categoryInput = document.getElementById('product-category') as HTMLInputElement;
    const brandInput = document.getElementById('product-brand') as HTMLInputElement;
    const activeSwitch = screen.getByRole('switch');

    expect(activeSwitch.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Accessories' }));
    expect(categoryInput.value).toBe('Accessories');

    fireEvent.click(screen.getByRole('button', { name: 'Brand' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Ihmom' }));
    expect(brandInput.value).toBe('Ihmom');

    fireEvent.change(document.getElementById('product-name-en') as HTMLInputElement, {
        target: { value: 'Gaming Pad' },
    });
    fireEvent.change(document.getElementById('product-name-ar') as HTMLInputElement, {
        target: { value: 'لوحة ألعاب' },
    });
    fireEvent.change(document.getElementById('product-price') as HTMLInputElement, {
        target: { value: '45.50' },
    });

    fireEvent.click(activeSwitch);
    expect(activeSwitch.getAttribute('aria-checked')).toBe('false');

    fireEvent.submit(categoryInput.closest('form') as HTMLFormElement);

    await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
            category_id: 20,
            brand_id: 200,
            name_ar: 'لوحة ألعاب',
            name_en: 'Gaming Pad',
            description_ar: null,
            description_en: null,
            is_active: false,
            price: 45.5,
            sku: null,
        });
    });
});

test('edit form displays initial values and preserves unsaved edits when product refetches for images or variants', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
        <ProductEditForm
            product={baseProduct}
            categories={categories}
            brands={brands}
            isSubmitting={false}
            onSubmit={onSubmit}
        />,
    );

    const categoryInput = document.getElementById('product-category') as HTMLInputElement;
    const brandInput = document.getElementById('product-brand') as HTMLInputElement;
    const activeSwitch = screen.getByRole('switch');

    expect(categoryInput.value).toBe('Hookahs');
    expect(brandInput.value).toBe('Q LM');
    expect(activeSwitch.getAttribute('aria-checked')).toBe('true');

    // Toggle switch and change category without saving yet
    fireEvent.click(activeSwitch);
    expect(activeSwitch.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Accessories' }));
    expect(categoryInput.value).toBe('Accessories');

    // Simulate sibling image/variant mutation returning a new product reference with same details
    rerender(
        <ProductEditForm
            product={{
                ...baseProduct,
                images: [
                    {
                        id: 99,
                        product_id: 1,
                        image: '/pad.webp',
                        is_primary: true,
                        created_at: '2026-11-15T00:00:00Z',
                    },
                ],
            }}
            categories={categories}
            brands={brands}
            isSubmitting={false}
            onSubmit={onSubmit}
        />,
    );

    expect(activeSwitch.getAttribute('aria-checked')).toBe('false');
    expect(categoryInput.value).toBe('Accessories');

    fireEvent.submit(categoryInput.closest('form') as HTMLFormElement);

    await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                category_id: 20,
                brand_id: 100,
                is_active: false,
            }),
        );
    });
});

test('edit form resets fields and switch state when switching to another product', async () => {
    const { rerender } = render(
        <ProductEditForm
            product={baseProduct}
            categories={categories}
            brands={brands}
            isSubmitting={false}
            onSubmit={vi.fn()}
        />,
    );

    const categoryInput = document.getElementById('product-category') as HTMLInputElement;
    const brandInput = document.getElementById('product-brand') as HTMLInputElement;
    const activeSwitch = screen.getByRole('switch');

    expect(activeSwitch.getAttribute('aria-checked')).toBe('true');

    rerender(
        <ProductEditForm
            product={{
                ...baseProduct,
                id: 2,
                category_id: 20,
                brand_id: 200,
                name_en: 'Second Product',
                is_active: false,
            }}
            categories={categories}
            brands={brands}
            isSubmitting={false}
            onSubmit={vi.fn()}
        />,
    );

    await waitFor(() => {
        expect(activeSwitch.getAttribute('aria-checked')).toBe('false');
        expect(categoryInput.value).toBe('Accessories');
        expect(brandInput.value).toBe('Ihmom');
    });
});

test('edit selections resolve after option loading and localize without losing form IDs', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
        <ProductEditForm
            product={baseProduct}
            categories={[]}
            brands={[]}
            isSubmitting={false}
            onSubmit={onSubmit}
        />,
    );
    const categoryInput = document.getElementById('product-category') as HTMLInputElement;
    const brandInput = document.getElementById('product-brand') as HTMLInputElement;
    expect(categoryInput.value).toBe('');
    expect(brandInput.value).toBe('');
    rerender(
        <ProductEditForm
            product={baseProduct}
            categories={categories}
            brands={brands}
            isSubmitting={false}
            onSubmit={onSubmit}
        />,
    );
    await waitFor(() => {
        expect(categoryInput.value).toBe('Hookahs');
        expect(brandInput.value).toBe('Q LM');
    });
    await act(() => i18n.changeLanguage('ar'));
    expect(categoryInput.value).toBe(categories[0].name_ar);
    expect(brandInput.value).toBe(brands[0].name_ar);
    fireEvent.submit(categoryInput.closest('form') as HTMLFormElement);
    await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({ category_id: 10, brand_id: 100 }),
        ),
    );
});
