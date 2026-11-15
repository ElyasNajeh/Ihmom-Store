import { expect, test } from '@playwright/test';

test('compiled product form displays category and brand immediately and persists changes', async ({
    page,
}) => {
    await page.addInitScript(() => localStorage.setItem('store-language', 'en'));
    await page.goto('/admin/login');
    await page.locator('input[name="username"]').fill('browser-admin');
    await page.locator('input[name="password"]').fill('Browser-password-123!');
    const loginResponse = page.waitForResponse((response) =>
        response.url().endsWith('/auth/login'),
    );
    await page.locator('button[type="submit"]').click();
    const { access_token: accessToken } = await (await loginResponse).json();
    await expect(page).toHaveURL(/\/admin$/);
    const headers = { Authorization: `Bearer ${accessToken}` };
    const suffix = Date.now().toString();
    const categories: { id: number; name_en: string }[] = [];
    const brands: { id: number; name_en: string }[] = [];
    let productId: number | undefined;

    try {
        for (const [resource, records] of [
            ['categories', categories],
            ['brands', brands],
        ] as const) {
            for (const index of [1, 2]) {
                const name = `Select ${resource} ${index} ${suffix}`;
                const response = await page.request.post(`/api/${resource}/`, {
                    headers,
                    data: { name_ar: name, name_en: name, is_active: true },
                });
                expect(response.status()).toBe(201);
                records.push(await response.json());
            }
        }

        await page.goto('/admin/products/new');
        const category = page.locator('#product-category');
        const brand = page.locator('#product-brand');
        const assertSelection = async (field: 'Category' | 'Brand', name: string) => {
            await page.getByRole('button', { name: field, exact: true }).click();
            await page.getByRole('option', { name, exact: true }).click();
            const input = field === 'Category' ? category : brand;
            // Check BEFORE saving or causing an unrelated form render.
            await expect(input).toHaveValue(name);
            await expect(input).toHaveAttribute('aria-expanded', 'false');
        };
        await assertSelection('Category', categories[0].name_en);
        await assertSelection('Brand', brands[0].name_en);
        await page.locator('#product-name-ar').fill(`منتج اختبار ${suffix}`);
        await page.locator('#product-name-en').fill(`Selection product ${suffix}`);
        await page.locator('#product-price').fill('45.50');
        const created = page.waitForResponse(
            (response) =>
                response.url().endsWith('/products/') && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        const createdResponse = await created;
        expect(createdResponse.status()).toBe(201);
        const product = await createdResponse.json();
        productId = product.id;
        expect(createdResponse.request().postDataJSON()).toMatchObject({
            category_id: categories[0].id,
            brand_id: brands[0].id,
        });
        await expect(page).toHaveURL(new RegExp(`/admin/products/${productId}$`));
        await expect(category).toHaveValue(categories[0].name_en);
        await expect(brand).toHaveValue(brands[0].name_en);

        await assertSelection('Category', categories[1].name_en);
        await assertSelection('Brand', brands[1].name_en);
        const saved = page.waitForResponse(
            (response) =>
                response.url().endsWith(`/products/${productId}`) &&
                response.request().method() === 'PATCH',
        );
        await page.getByRole('button', { name: 'Save details', exact: true }).click();
        const savedResponse = await saved;
        expect(savedResponse.status()).toBe(200);
        expect(savedResponse.request().postDataJSON()).toMatchObject({
            category_id: categories[1].id,
            brand_id: brands[1].id,
        });
        await page.reload();
        await expect(category).toHaveValue(categories[1].name_en);
        await expect(brand).toHaveValue(brands[1].name_en);
    } finally {
        if (productId)
            expect(
                (await page.request.delete(`/api/products/${productId}`, { headers })).status(),
            ).toBe(204);
        for (const [resource, records] of [
            ['categories', categories],
            ['brands', brands],
        ] as const) {
            for (const record of records) {
                expect(
                    (
                        await page.request.delete(`/api/${resource}/${record.id}`, { headers })
                    ).status(),
                ).toBe(204);
            }
        }
    }
});
