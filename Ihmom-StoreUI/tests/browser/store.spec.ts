import { expect, test } from '@playwright/test';

test('category has one WebP image through upload, replacement and removal', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('store-language', 'en'));
    await page.goto('/admin/login');
    await page.locator('input[name="username"]').fill('browser-admin');
    await page.locator('input[name="password"]').fill('Browser-password-123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/admin/categories');
    await page.getByRole('button', { name: 'New category', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Create category', exact: true });
    const name = `Image category ${Date.now()}`;
    await form.getByLabel('Arabic name', { exact: true }).fill(name);
    await form.getByLabel('English name', { exact: true }).fill(name);
    await form.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(form).not.toBeVisible();
    await page.getByRole('button', { name: `Manage image: ${name}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Category image', exact: true });
    let previous: string | null = null;
    for (let index = 0; index < 2; index++) {
        await dialog.locator('input[type="file"]').setInputFiles('public/favicon.png');
        const saved = page.waitForResponse(
            (r) => r.url().endsWith('/image') && r.request().method() === 'PUT',
        );
        await dialog.getByRole('button', { name: 'Save image', exact: true }).click();
        const response = await saved;
        expect(response.status()).toBe(200);
        const category = await response.json();
        expect(category).not.toHaveProperty('images');
        expect(category.image).toMatch(/\.webp$/);
        await expect(
            dialog.getByRole('img', { name: 'Category image', exact: true }),
        ).toHaveAttribute('src', new RegExp(category.image));
        const served = await page.request.get(category.image);
        expect(served.headers()['content-type']).toBe('image/webp');
        if (previous) expect((await page.request.get(previous)).status()).toBe(404);
        previous = category.image;
    }
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Delete image?', exact: true });
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(confirm).not.toBeVisible();
    await expect(dialog.getByText('No image yet', { exact: true })).toBeVisible();
});

const publicRoutes = [
    '/',
    '/shop',
    '/shop/1',
    '/cart',
    '/checkout',
    '/my-orders',
    '/about',
    '/contact',
    '/customer-care',
    '/delivery',
    '/returns',
    '/faq',
    '/admin/login',
];

test('admin category and brand forms validate, save and refresh their lists', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('store-language', 'en'));
    await page.goto('/admin/login');
    await page.locator('input[name="username"]').fill('browser-admin');
    await page.locator('input[name="password"]').fill('Browser-password-123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin$/);
    for (const [resource, label] of [
        ['categories', 'category'],
        ['brands', 'brand'],
    ]) {
        const suffix = Date.now().toString();
        const name = `Browser ${label} ${suffix}`;
        await page.goto(`/admin/${resource}`);
        await page.getByRole('button', { name: `New ${label}`, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: `Create ${label}`, exact: true });
        await dialog.getByRole('button', { name: 'Create', exact: true }).click();
        await expect(dialog.getByRole('alert').first()).toBeVisible();
        await dialog.getByLabel('Arabic name', { exact: true }).fill(`اختبار ${suffix}`);
        await dialog.getByLabel('English name', { exact: true }).fill(name);
        const saved = page.waitForResponse(
            (r) => r.url().endsWith(`/${resource}/`) && r.request().method() === 'POST',
        );
        await dialog.getByRole('button', { name: 'Create', exact: true }).click();
        expect((await saved).status()).toBe(201);
        await expect(dialog).not.toBeVisible();
        await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
});

test('changing a shop category preserves the entered search', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('store-language', 'en'));
    await page.goto('/shop');
    const search = page
        .locator('main input[type="search"], main input[placeholder*="Search products"]')
        .first();
    await search.fill('Browser');
    await page.getByRole('button', { name: 'Browse Browser Category', exact: true }).click();
    await expect(search).toHaveValue('Browser');
    await expect(page).toHaveURL(/category=/);
});
for (const width of [320, 390, 768, 1024, 1440]) {
    for (const language of ['en', 'ar']) {
        test(`public routes ${width}px ${language} render without overflow or runtime exceptions`, async ({
            page,
        }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.addInitScript(
                (lang) => localStorage.setItem('store-language', lang),
                language,
            );
            const errors: string[] = [];
            page.on('pageerror', (error) => errors.push(error.message));
            for (const route of publicRoutes) {
                await page.goto(route);
                if (route === '/admin/login') {
                    await expect(
                        page.getByRole('button', {
                            name: language === 'en' ? 'Sign in' : 'تسجيل الدخول',
                            exact: true,
                        }),
                    ).toBeVisible();
                } else {
                    await expect(page.getByRole('heading').first()).toBeVisible();
                }
                await expect(page.locator('html')).toHaveAttribute(
                    'dir',
                    language === 'ar' ? 'rtl' : 'ltr',
                );
                expect(
                    await page.evaluate(
                        () => document.documentElement.scrollWidth <= innerWidth + 1,
                    ),
                    route,
                ).toBe(true);
            }
            expect(errors).toEqual([]);
        });
    }
}

test('real login, protected dashboard pages and logout', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('store-language', 'en'));
    await page.goto('/admin/login');
    await page.locator('input[name="username"]').fill('browser-admin');
    await page.locator('input[name="password"]').fill('Browser-password-123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin$/);
    for (const route of [
        'products',
        'products/new',
        'categories',
        'brands',
        'sliders',
        'customers',
        'delivery-areas',
        'admins',
        'orders',
    ]) {
        await page.goto(`/admin/${route}`);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page).not.toHaveURL(/login/);
    }
    await page.getByRole('button', { name: /signed in as/i }).click();
    await page.getByRole('menuitem', { name: /log out|logout|sign out/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
});

test('product → persistent cart → checkout timeout retry → history → PDF uses one order', async ({
    page,
}) => {
    await page.addInitScript(() => localStorage.setItem('store-language', 'en'));
    const products = await (await page.request.get('http://127.0.0.1:18080/products/')).json();
    await page.goto(`/shop/${products.items[0].id}`);
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
    await page.goto('/cart');
    await expect(page.getByText('Browser Product').filter({ visible: true }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText('Browser Product').first()).toBeVisible();
    await page.goto('/checkout');
    await page.locator('input[name="customer_name"]').fill('Browser Customer');
    await page.locator('input[name="customer_phone"]').fill('0599123456');
    await page.locator('textarea[name="address"],input[name="address"]').fill('Browser Street');
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /Browser Area/ }).click();
    await page.getByRole('button', { name: 'Review order', exact: true }).click();
    const keys: string[] = [];
    let originalOrder: string | undefined;
    await page.route('**/orders/checkout', async (route) => {
        keys.push(route.request().headers()['idempotency-key']);
        const response = await route.fetch();
        const data = await response.json();
        if (keys.length === 1) {
            originalOrder = data.order_number;
            await route.abort('timedout'); // Server committed; browser did not receive it.
        } else {
            expect(data.order_number).toBe(originalOrder);
            await route.fulfill({ response });
        }
    });
    await page.getByRole('button', { name: 'Place order', exact: true }).click();
    await expect(page.getByRole('alert').last()).toBeVisible();
    await page.getByRole('button', { name: 'Place order', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Order placed', exact: true })).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
    const download = page.waitForEvent('download');
    await page
        .getByRole('button', { name: /download invoice/i })
        .first()
        .click();
    expect((await download).suggestedFilename()).toContain('.pdf');
    await page.goto('/my-orders');
    await page.locator('#order-phone').fill('0599123456');
    await page.locator('#order-number').fill(originalOrder!);
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Browser Product').first()).toBeVisible();
});

test('shop error → retry → empty → search success states', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('store-language', 'en'));
    let mode = 'error';
    await page.route('**/products/?*', async (route) => {
        if (mode === 'error')
            return route.fulfill({ status: 422, json: { detail: 'internal detail' } });
        if (mode === 'empty')
            return route.fulfill({
                json: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
            });
        return route.continue();
    });
    await page.goto('/shop');
    await expect(page.getByRole('button', { name: /try again|retry/i })).toBeVisible();
    mode = 'empty';
    await page.getByRole('button', { name: /try again|retry/i }).click();
    await expect(page.getByRole('heading', { name: /no products/i })).toBeVisible();
    mode = 'success';
    await page.reload();
    await expect(
        page.getByRole('link', { name: 'Browser Product', exact: true }).first(),
    ).toBeVisible();
});

test('admin pages remain usable across mobile/tablet/desktop and both directions', async ({
    page,
}) => {
    test.setTimeout(120000);
    await page.addInitScript(() => {
        if (!localStorage.getItem('store-language')) localStorage.setItem('store-language', 'en');
    });
    await page.goto('/admin/login');
    await page.locator('input[name="username"]').fill('browser-admin');
    await page.locator('input[name="password"]').fill('Browser-password-123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin$/);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const language of ['en', 'ar']) {
        await page.evaluate((lang) => localStorage.setItem('store-language', lang), language);
        for (const width of [320, 390, 768, 1024, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            for (const route of [
                'products',
                'products/new',
                'categories',
                'brands',
                'sliders',
                'customers',
                'delivery-areas',
                'admins',
                'orders',
            ]) {
                await page.goto(`/admin/${route}`);
                await expect(page.locator('h1').first()).toBeVisible();
                await expect(page).toHaveURL(new RegExp(`/admin/${route}$`));
                await expect(page.locator('html')).toHaveAttribute(
                    'dir',
                    language === 'ar' ? 'rtl' : 'ltr',
                );
                expect(
                    await page.evaluate(
                        () => document.documentElement.scrollWidth <= innerWidth + 1,
                    ),
                    `${language}/${width}/${route}`,
                ).toBe(true);
            }
        }
    }
    expect(errors).toEqual([]);
});
