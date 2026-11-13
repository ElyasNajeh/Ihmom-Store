import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
    CATALOG_SEED_STORAGE_KEY,
    PRODUCT_STOREFRONT_DEFAULT_SORT,
} from '@/features/catalog/constants/products.ts';
import { shuffleArray } from '@/shared/utils/random.ts';
import {
    useAdminProducts,
    useProducts,
    useProductRecommendations,
} from '@/features/catalog/hooks/useProducts.ts';

const seed = '0123456789abcdef0123456789abcdef';

beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('persistent catalog seed', () => {
    it('generates 16 crypto bytes, persists, and reads storage only once', async () => {
        const read = vi.spyOn(Storage.prototype, 'getItem');
        const generate = vi.spyOn(crypto, 'getRandomValues');
        const { getCatalogSeed } = await import('@/features/catalog/utils/catalog-seed.ts');
        const value = getCatalogSeed();
        expect(value).toMatch(/^[a-f0-9]{32}$/);
        expect(generate).toHaveBeenCalledOnce();
        expect(generate.mock.calls[0][0]).toHaveLength(16);
        expect(getCatalogSeed()).toBe(value);
        expect(read).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem(CATALOG_SEED_STORAGE_KEY)).toBe(value);
        vi.resetModules();
        const reloaded = await import('@/features/catalog/utils/catalog-seed.ts');
        expect(reloaded.getCatalogSeed()).toBe(value);
        expect(generate).toHaveBeenCalledOnce();
    });

    it('reuses valid stored seed and replaces invalid values', async () => {
        localStorage.setItem(CATALOG_SEED_STORAGE_KEY, seed);
        let utility = await import('@/features/catalog/utils/catalog-seed.ts');
        expect(utility.getCatalogSeed()).toBe(seed);
        expect(utility.isCatalogSeed(seed.toUpperCase())).toBe(false);
        expect(utility.isCatalogSeed(`${seed}\n`)).toBe(false);
        vi.resetModules();
        localStorage.setItem(CATALOG_SEED_STORAGE_KEY, 'invalid');
        utility = await import('@/features/catalog/utils/catalog-seed.ts');
        expect(utility.getCatalogSeed()).toMatch(/^[a-f0-9]{32}$/);
        expect(localStorage.getItem(CATALOG_SEED_STORAGE_KEY)).toBe(utility.getCatalogSeed());
    });

    it('keeps module memory when storage access is blocked', async () => {
        const getItem = vi.fn(() => {
            throw new Error('blocked');
        });
        const setItem = vi.fn(() => {
            throw new Error('blocked');
        });
        vi.stubGlobal('localStorage', { getItem, setItem });
        const { getCatalogSeed } = await import('@/features/catalog/utils/catalog-seed.ts');
        const value = getCatalogSeed();
        expect(value).toMatch(/^[a-f0-9]{32}$/);
        expect(getCatalogSeed()).toBe(value);
        expect(getItem).toHaveBeenCalledOnce();
        expect(setItem).toHaveBeenCalledOnce();
    });

    it('resolves only explicit opt-in and drops seeds when off', async () => {
        const read = vi.spyOn(Storage.prototype, 'getItem');
        const { resolvePublicRandomization } =
            await import('@/features/catalog/utils/catalog-seed.ts');
        expect(resolvePublicRandomization({ random_seed: seed })).toEqual({});
        expect(resolvePublicRandomization({ randomize: false, random_seed: seed })).toEqual({
            randomize: false,
        });
        expect(resolvePublicRandomization({ randomize: true, random_seed: seed })).toEqual({
            randomize: true,
            random_seed: seed,
        });
        expect(read).not.toHaveBeenCalled();
        expect(
            resolvePublicRandomization({ randomize: true, random_seed: 'bad' }).random_seed,
        ).toMatch(/^[a-f0-9]{32}$/);
    });

    it('shuffles a copy reproducibly with the same numeric seed', async () => {
        const { catalogNumericSeed } = await import('@/features/catalog/utils/catalog-seed.ts');
        const items = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
        const result = shuffleArray(items, catalogNumericSeed(seed));
        expect(result).toEqual(shuffleArray(items, catalogNumericSeed(seed)));
        expect(result).not.toBe(items);
        expect([...result].sort()).toEqual([...items]);
        expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
});

it('isolates public mode/seed keys from admin and recommendation keys without API requests', () => {
    // Disable queries, not transport mocking: inspect the real hook options/cache only.
    const client = new QueryClient({
        defaultOptions: { queries: { enabled: false, retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { rerender } = renderHook(
        ({ randomize, random_seed, page }) => useProducts({ randomize, random_seed, page }),
        {
            wrapper,
            initialProps: { randomize: true, random_seed: seed, page: 1 },
        },
    );
    rerender({ randomize: true, random_seed: seed, page: 2 });
    rerender({ randomize: true, random_seed: 'f'.repeat(32), page: 1 });
    rerender({ randomize: false, random_seed: seed, page: 1 });
    renderHook(() => useAdminProducts(), { wrapper });
    renderHook(() => useProductRecommendations(0, 4, { randomize: true, random_seed: seed }), {
        wrapper,
    });
    renderHook(() => useProductRecommendations(0), { wrapper });
    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(7);
    expect(queries.every((query) => query.state.fetchStatus === 'idle')).toBe(true);
    const off = queries.find(
        (query) => (query.queryKey[2] as { randomize?: boolean })?.randomize === false,
    )!;
    expect(off.queryKey[1]).toBe('public');
    expect(off.queryKey[2]).not.toHaveProperty('random_seed');
    expect(queries.filter((query) => query.queryKey[1] === 'admin')).toHaveLength(1);
    expect(
        queries
            .filter((query) => query.queryKey.includes('recommendations'))
            .every((query) => query.queryKey[1] === 'public'),
    ).toBe(true);
    expect(PRODUCT_STOREFRONT_DEFAULT_SORT).toBe('discover');
    client.clear();
});

it('allows previous data only for the same randomization mode and seed', async () => {
    const { sameRandomization } = await import('@/features/catalog/utils/catalog-seed.ts');
    const randomized = { randomize: true, random_seed: seed };
    expect(sameRandomization(randomized, { ...randomized })).toBe(true);
    expect(sameRandomization(randomized, { randomize: true, random_seed: 'f'.repeat(32) })).toBe(
        false,
    );
    expect(sameRandomization(randomized, { randomize: false })).toBe(false);
    expect(sameRandomization({}, { randomize: false })).toBe(true);
    expect(sameRandomization(undefined, {})).toBe(false);
});
