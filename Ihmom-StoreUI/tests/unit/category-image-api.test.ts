import axios from 'axios';
import { expect, test, vi } from 'vitest';

test('category image replacement uploads one file, returns a category, and removes by category ID', async () => {
    vi.resetModules();
    const seen: { url?: string; method?: string; fields: string[] }[] = [];
    axios.defaults.adapter = async (config) => {
        const fields = config.data instanceof FormData ? [...config.data.keys()] : [];
        seen.push({ url: config.url, method: config.method, fields });
        return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            data: {
                id: 42,
                name_ar: 'فئة',
                name_en: 'Category',
                is_active: true,
                image: config.method === 'delete' ? null : '/uploads/categories/image.webp',
            },
        };
    };
    const { replaceCategoryImage, deleteCategoryImage } =
        await import('@/features/catalog/api/categories-api');
    const uploaded = await replaceCategoryImage(
        42,
        new File(['image bytes'], 'test.png', { type: 'image/png' }),
    );
    expect(uploaded.image).toBe('/uploads/categories/image.webp');
    expect(await deleteCategoryImage(42)).toMatchObject({ image: null });
    expect(seen).toEqual([
        { url: '/categories/42/image', method: 'put', fields: ['image'] },
        { url: '/categories/42/image', method: 'delete', fields: [] },
    ]);
});
