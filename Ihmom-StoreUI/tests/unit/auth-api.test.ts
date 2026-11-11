import axios, { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => vi.resetModules());

test('relative /api configuration resolves upload URLs against the browser origin', async () => {
    vi.stubEnv('VITE_API_URL', '/api');
    try {
        const { apiAssetUrl } = await import('@/shared/api/axios');
        expect(apiAssetUrl('/uploads/products/image.webp')).toBe(`${window.location.origin}/uploads/products/image.webp`);
    } finally {
        vi.unstubAllEnvs();
    }
});

test('failed server logout clears the local bearer and remains an error', async () => {
    axios.defaults.adapter = async (config) => {
        throw new AxiosError('Service unavailable', 'ERR_BAD_RESPONSE', config, undefined, {
            data: {},
            status: 503,
            statusText: 'Unavailable',
            headers: {},
            config,
        });
    };
    const { setAccessToken, getAccessToken } = await import('@/shared/api/axios');
    const { logoutAdmin } = await import('@/features/auth/api/auth-api');
    setAccessToken('active');
    await expect(logoutAdmin()).rejects.toThrow('Service unavailable');
    expect(getAccessToken()).toBeNull();
});

test('concurrent expired requests share one refresh and retry with the new bearer', async () => {
    let refreshes = 0;
    const headers: string[] = [];
    axios.defaults.adapter = async (config) => {
        if (config.url === '/auth/refresh') {
            refreshes++;
            await new Promise((resolve) => setTimeout(resolve, 10));
            return {
                data: { access_token: 'new' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
            };
        }
        headers.push(String(config.headers.Authorization));
        if (config.headers.Authorization !== 'Bearer new') {
            throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
                data: {},
                status: 401,
                statusText: 'Unauthorized',
                headers: {},
                config,
            });
        }
        return { data: { id: 1 }, status: 200, statusText: 'OK', headers: {}, config };
    };
    const { api, setAccessToken } = await import('@/shared/api/axios');
    setAccessToken('old');
    await Promise.all([api.get('/auth/me'), api.get('/admins/')]);
    expect(refreshes).toBe(1);
    expect(headers).toEqual(['Bearer old', 'Bearer old', 'Bearer new', 'Bearer new']);
});

test('a refresh completing after logout cannot resurrect authentication', async () => {
    let complete!: (value: unknown) => void;
    axios.defaults.adapter = (config) =>
        new Promise((resolve) => {
            complete = () =>
                resolve({
                    data: { access_token: 'late' },
                    status: 200,
                    statusText: 'OK',
                    headers: new AxiosHeaders(),
                    config,
                });
        });
    const { refreshAccessToken, setAccessToken, getAccessToken } =
        await import('@/shared/api/axios');
    const pending = refreshAccessToken();
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
    setAccessToken(null);
    complete(null);
    await expect(pending).rejects.toThrow('Session changed');
    expect(getAccessToken()).toBeNull();
});

test('checkout retries transmit the original key and public/admin reads use distinct routes', async () => {
    const requests: { url?: string; key: unknown }[] = [];
    axios.defaults.adapter = async (config) => {
        requests.push({ url: config.url, key: config.headers['Idempotency-Key'] });
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    const { checkoutOrder } = await import('@/features/orders/api/orders-api');
    const { fetchProducts, fetchAdminProducts, fetchAdminProduct } =
        await import('@/features/catalog/api/products-api');
    const attempt = {
        checkoutData: {
            customer_name: 'Lina',
            customer_phone: '0599123456',
            delivery_area_id: 1,
            address: 'Street',
            items: [{ product_variant_id: 1, quantity: 1 }],
        },
        idempotencyKey: crypto.randomUUID(),
    };
    await checkoutOrder(attempt);
    await checkoutOrder(attempt);
    await fetchProducts({});
    await fetchAdminProducts({});
    await fetchAdminProduct(1);
    expect(requests.slice(0, 2).map((r) => r.key)).toEqual([
        attempt.idempotencyKey,
        attempt.idempotencyKey,
    ]);
    expect(requests.slice(2).map((r) => r.url)).toEqual([
        '/products/',
        '/products/admin/all',
        '/products/admin/1',
    ]);
});
