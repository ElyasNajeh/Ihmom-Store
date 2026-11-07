import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

import { useDebounce } from '@/shared/hooks/useDebounce.ts';
import { useProducts } from '@/features/catalog/hooks/useProducts.ts';
import { useCategories } from '@/features/catalog/hooks/useCategories.ts';
import { useBrands } from '@/features/catalog/hooks/useBrands.ts';
import type { PublicProduct, QueryProduct } from '@/features/catalog/types/product.ts';
import type { Category } from '@/features/catalog/types/category.ts';
import type { Brand } from '@/features/catalog/types/brand.ts';
import type { PaginatedResponse } from '@/shared/types/query.ts';
import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    FETCH_ALL_PARAMS,
    resolveSortParams,
    SEARCH_DEBOUNCE_MS,
} from '@/shared/constants/query.ts';
import {
    PRODUCT_STOREFRONT_DEFAULT_SORT,
    PRODUCT_STOREFRONT_SORT_OPTIONS,
    PRODUCT_STOREFRONT_SORT_PARAMS,
    type ProductStorefrontSort,
} from '@/features/catalog/constants/products.ts';
import { localizeOptions } from '@/shared/utils/localized-options.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select.tsx';
import { ShopFilters } from '@/features/catalog/components/store/shop-filters.tsx';
import { ShopCategoryBar } from '@/features/catalog/components/store/shop-category-bar.tsx';
import { ShopProductCollection } from '@/features/catalog/components/store/shop-product-collection.tsx';
import { useLocale } from '@/shared/hooks/useLocale.ts';

function rows<T>(response: PaginatedResponse<T> | undefined): T[] {
    return Array.isArray(response?.items) ? response.items : [];
}

function total<T>(response: PaginatedResponse<T> | undefined, fallback: number): number {
    return typeof response?.total === 'number' ? response.total : fallback;
}

export default function ShopPage() {
    const { t } = useTranslation(['catalog', 'common']);
    const { isArabic } = useLocale();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParam = searchParams.get('search') ?? '';
    const categoryParam = Number(searchParams.get('category'));
    const categoryId =
        Number.isInteger(categoryParam) && categoryParam > 0 ? categoryParam : undefined;

    // Core State
    const [search, setSearch] = useState(searchParam);
    const [brandId, setBrandId] = useState<number | undefined>();
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sort, setSort] = useState<ProductStorefrontSort>(PRODUCT_STOREFRONT_DEFAULT_SORT);
    const [page, setPage] = useState(DEFAULT_PAGE);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Debounced Values
    const debouncedSearch = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS);
    const debouncedMinPrice = useDebounce(minPrice.trim(), SEARCH_DEBOUNCE_MS);
    const debouncedMaxPrice = useDebounce(maxPrice.trim(), SEARCH_DEBOUNCE_MS);

    const resetPage = () => setPage(DEFAULT_PAGE);

    const updateCategoryParam = (value: number | undefined) => {
        setSearchParams(
            (params) => {
                const next = new URLSearchParams(params);

                if (value === undefined) {
                    next.delete('category');
                } else {
                    next.set('category', String(value));
                }

                return next;
            },
            { replace: true },
        );
    };

    const updateSearch = (value: string) => {
        setSearch(value);
        resetPage();
    };

    const updateCategory = (value: number | undefined) => {
        resetPage();
        updateCategoryParam(value);
    };

    const updateBrand = (value: number | undefined) => {
        setBrandId(value);
        resetPage();
    };

    const updateMinPrice = (value: string) => {
        setMinPrice(value);
        resetPage();
    };

    const updateMaxPrice = (value: string) => {
        setMaxPrice(value);
        resetPage();
    };

    const updateSort = (value: ProductStorefrontSort) => {
        setSort(value);
        resetPage();
    };

    const queryParams = useMemo<QueryProduct>(() => {
        const filter: NonNullable<QueryProduct['filter']> = {};
        const min = debouncedMinPrice === '' ? undefined : Number(debouncedMinPrice);
        const max = debouncedMaxPrice === '' ? undefined : Number(debouncedMaxPrice);
        const validPriceRange = min === undefined || max === undefined || min <= max;

        if (categoryId !== undefined) filter.category_id = categoryId;
        if (brandId !== undefined) filter.brand_id = brandId;
        if (validPriceRange && min !== undefined && Number.isFinite(min) && min >= 0)
            filter.min_price = min;
        if (validPriceRange && max !== undefined && Number.isFinite(max) && max >= 0)
            filter.max_price = max;

        return {
            page,
            page_size: DEFAULT_PAGE_SIZE,
            search: debouncedSearch || undefined,
            ...resolveSortParams(sort, PRODUCT_STOREFRONT_SORT_PARAMS),
            filter: Object.keys(filter).length ? filter : undefined,
        } as QueryProduct;
    }, [page, debouncedSearch, categoryId, brandId, debouncedMinPrice, debouncedMaxPrice, sort]);

    const productsQuery = useProducts(queryParams);
    const allCategoriesQuery = useCategories(FETCH_ALL_PARAMS);
    const brandsQuery = useBrands(FETCH_ALL_PARAMS);
    const products = rows<PublicProduct>(productsQuery.data);
    const allCategories = rows<Category>(allCategoriesQuery.data);
    const brands = rows<Brand>(brandsQuery.data);
    const productCount = total(productsQuery.data, products.length);
    const pageCount = Math.max(1, Math.ceil(productCount / DEFAULT_PAGE_SIZE));
    const invalidPriceRange =
        minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);

    const activeFilterCount = [
        brandId !== undefined,
        minPrice !== '',
        maxPrice !== '',
        debouncedSearch !== '',
    ].filter(Boolean).length;

    const resetFilters = () => {
        setSearch('');
        setBrandId(undefined);
        setMinPrice('');
        setMaxPrice('');
        setSort(PRODUCT_STOREFRONT_DEFAULT_SORT);
        setPage(DEFAULT_PAGE);
        updateCategoryParam(undefined);
    };

    const sortItems = localizeOptions(PRODUCT_STOREFRONT_SORT_OPTIONS, t);

    return (
        <main className="mx-auto w-full max-w-7xl px-4 pt-7 pb-12 sm:px-6 sm:pt-10 lg:px-8">
            <header className="border-border/70 from-secondary/70 via-card to-brand/10 relative mb-7 overflow-hidden rounded-3xl border bg-linear-to-br px-4 py-6 shadow-xs sm:mb-9 sm:px-7 sm:py-8">
                <div
                    aria-hidden="true"
                    className="bg-brand/20 pointer-events-none absolute -end-24 -top-28 size-64 rounded-full blur-3xl"
                />
                <div className="relative flex flex-col gap-5">
                    <div className="space-y-2">
                        <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                            {t('shop.eyebrow', { defaultValue: 'IHMOOM STORE' })}
                        </p>
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                                    {t('shop.title', { defaultValue: 'Shop all products' })}
                                </h1>
                                <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
                                    {t('shop.description', {
                                        defaultValue:
                                            'Browse the catalogue and narrow it down to what you need.',
                                    })}
                                </p>
                            </div>
                            <p className="text-muted-foreground text-sm" aria-live="polite">
                                {productsQuery.isPending
                                    ? t('shop.loadingCount', {
                                          defaultValue: 'Loading products…',
                                      })
                                    : t('shop.productCount', {
                                          count: productCount,
                                          defaultValue: '{{count}} products',
                                      })}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative min-w-0 flex-1">
                            <Search
                                className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
                                aria-hidden="true"
                            />
                            <Input
                                value={search}
                                onChange={(event) => updateSearch(event.target.value)}
                                placeholder={t('shop.searchPlaceholder', {
                                    defaultValue: 'Search products…',
                                })}
                                aria-label={t('shop.searchLabel', {
                                    defaultValue: 'Search products',
                                })}
                                className="h-11 ps-9 pe-10"
                            />
                            {search && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute end-1 top-1/2 size-9 -translate-y-1/2"
                                    aria-label={t('shop.clearSearch', {
                                        defaultValue: 'Clear search',
                                    })}
                                    onClick={() => updateSearch('')}
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </Button>
                            )}
                        </div>

                        <div className="w-full sm:w-64">
                            <Select
                                items={sortItems}
                                value={sort}
                                onValueChange={(val) => updateSort(val as ProductStorefrontSort)}
                            >
                                <SelectTrigger
                                    className="h-11 w-full"
                                    aria-label={t('shop.sort.label', {
                                        defaultValue: 'Sort by',
                                    })}
                                >
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-muted-foreground shrink-0 text-xs font-normal">
                                            {t('shop.sort.label', { defaultValue: 'Sort by' })}:
                                        </span>
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {sortItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 gap-2 lg:hidden"
                            aria-expanded={filtersOpen}
                            aria-controls="shop-filters"
                            onClick={() => setFiltersOpen((open) => !open)}
                        >
                            <SlidersHorizontal className="size-4" aria-hidden="true" />
                            {t('shop.filters.title', { defaultValue: 'Filters' })}
                            {activeFilterCount > 0 && (
                                <span className="bg-primary text-primary-foreground grid size-5 place-items-center rounded-full text-[11px]">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            <ShopCategoryBar
                categories={allCategories}
                categoryId={categoryId}
                isLoading={allCategoriesQuery.isPending}
                isArabic={isArabic}
                onSelect={updateCategory}
            />

            <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
                <aside
                    id="shop-filters"
                    className={`${filtersOpen ? 'block' : 'hidden'} lg:sticky lg:top-24 lg:block`}
                >
                    <ShopFilters
                        brands={brands}
                        brandId={brandId}
                        minPrice={minPrice}
                        maxPrice={maxPrice}
                        invalidPriceRange={invalidPriceRange}
                        onBrandChange={updateBrand}
                        onMinPriceChange={updateMinPrice}
                        onMaxPriceChange={updateMaxPrice}
                        onReset={resetFilters}
                        isArabic={isArabic}
                        isBrandsLoading={brandsQuery.isPending}
                    />
                </aside>

                <section aria-labelledby="shop-products-heading" className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2
                                id="shop-products-heading"
                                className="text-xl font-semibold tracking-tight"
                            >
                                {t('shop.products.title', { defaultValue: 'All products' })}
                            </h2>
                            <p className="text-muted-foreground mt-1 text-sm">
                                {t('shop.products.showing', {
                                    from:
                                        productCount === 0 ? 0 : (page - 1) * DEFAULT_PAGE_SIZE + 1,
                                    to: Math.min(page * DEFAULT_PAGE_SIZE, productCount),
                                    total: productCount,
                                    defaultValue: 'Showing {{from}}-{{to}} of {{total}}',
                                })}
                            </p>
                        </div>
                        {activeFilterCount > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="gap-2"
                            >
                                <RotateCcw className="size-3.5" aria-hidden="true" />
                                {t('shop.filters.reset', { defaultValue: 'Reset filters' })}
                            </Button>
                        )}
                    </div>
                    <ShopProductCollection
                        products={products}
                        isArabic={isArabic}
                        isLoading={productsQuery.isPending}
                        isError={productsQuery.isError}
                        isPlaceholderData={productsQuery.isPlaceholderData}
                        onRetry={() => void productsQuery.refetch()}
                        onResetFilters={resetFilters}
                    />

                    {products.length > 0 && !productsQuery.isPending && !productsQuery.isError && (
                        <nav
                            className="border-border mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5"
                            aria-label={t('shop.pagination.label', {
                                defaultValue: 'Product pages',
                            })}
                        >
                            <p className="text-muted-foreground text-sm" aria-live="polite">
                                {t('shop.pagination.page', {
                                    page,
                                    totalPages: pageCount,
                                    defaultValue: 'Page {{page}} of {{totalPages}}',
                                })}
                            </p>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    disabled={page <= DEFAULT_PAGE || productsQuery.isFetching}
                                    onClick={() =>
                                        setPage((current) => Math.max(DEFAULT_PAGE, current - 1))
                                    }
                                >
                                    <ChevronLeft
                                        className="size-4 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                    {t('shop.pagination.previous', {
                                        defaultValue: 'Previous',
                                    })}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    disabled={page >= pageCount || productsQuery.isFetching}
                                    onClick={() =>
                                        setPage((current) => Math.min(pageCount, current + 1))
                                    }
                                >
                                    {t('shop.pagination.next', {
                                        defaultValue: 'Next',
                                    })}
                                    <ChevronRight
                                        className="size-4 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                </Button>
                            </div>
                        </nav>
                    )}
                </section>
            </div>
        </main>
    );
}
