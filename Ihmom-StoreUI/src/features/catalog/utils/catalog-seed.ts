import { CATALOG_SEED_STORAGE_KEY } from '@/features/catalog/constants/products.ts';
import type { PublicRandomizationOptions } from '@/features/catalog/types/product.ts';

let memorySeed: string | undefined;

export function isCatalogSeed(seed: unknown): seed is string {
    return typeof seed === 'string' && seed.length === 32 && /^[0-9a-f]{32}$/.test(seed);
}

export function getCatalogSeed(): string {
    if (memorySeed) return memorySeed;

    try {
        const stored = localStorage.getItem(CATALOG_SEED_STORAGE_KEY);
        if (isCatalogSeed(stored)) {
            memorySeed = stored;
            return memorySeed;
        }
    } catch {
        // Storage can be unavailable in private or restricted browsing contexts.
    }

    memorySeed = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
        byte.toString(16).padStart(2, '0'),
    ).join('');
    try {
        localStorage.setItem(CATALOG_SEED_STORAGE_KEY, memorySeed);
    } catch {
        // Keep the same selection for this module lifetime even without storage.
    }
    return memorySeed;
}

export function resolvePublicRandomization(
    options: PublicRandomizationOptions = {},
): PublicRandomizationOptions {
    if (options.randomize !== true) {
        return options.randomize === false ? { randomize: false } : {};
    }
    return {
        randomize: true,
        random_seed: isCatalogSeed(options.random_seed) ? options.random_seed : getCatalogSeed(),
    };
}

export function sameRandomization(
    previous: PublicRandomizationOptions | undefined,
    next: PublicRandomizationOptions,
): boolean {
    return (
        previous !== undefined &&
        (previous.randomize === true) === (next.randomize === true) &&
        previous.random_seed === next.random_seed
    );
}

/** Fold all seed bytes into a stable numeric seed for local category presentation only. */
export function catalogNumericSeed(seed = getCatalogSeed()): number {
    let hash = 2166136261;
    for (const character of seed) {
        hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    }
    return hash >>> 0;
}
