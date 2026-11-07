import { useMemo } from 'react';

import { CategoryShowcase } from '@/components/store/sections/category-showcase';
import { FeaturedProducts } from '@/components/store/sections/featured-products';
import { StoreContact } from '@/components/store/sections/store-contact';
import { StoreHighlights } from '@/components/store/sections/store-highlights';
import { StoreShell } from '@/components/store/layout/store-shell';
import { StoreStats } from '@/components/store/sections/store-stats';
import { WhyShopWithUs } from '@/components/store/sections/why-shop-with-us';
import { Reveal } from '@/components/ui/reveal';
import { HomeHeroCarousel } from '@/components/store/sections/home-hero-carousel';
import { LimitedOffers } from '@/components/store/sections/limited-offers';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, SORT_DIRECTION, SORT_FIELD } from '@/constants/query.ts';
import { FEATURED_PRODUCTS_PAGE_SIZE } from '@/constants/products.ts';
import { Link } from 'react-router-dom';

export default function HomePage() {
    const { t } = useTranslation('home');

    const productsQuery = useProducts({
        page: DEFAULT_PAGE,
        page_size: FEATURED_PRODUCTS_PAGE_SIZE,
        sort_by: SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.DESC,
    });
    const categoriesQuery = useCategories({
        page: DEFAULT_PAGE,
        page_size: DEFAULT_PAGE_SIZE,
        sort_by: SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.DESC,
        filter: { is_active: true },
    });

    // The public hooks return PaginatedResponse<T>. Keep the page resilient to
    // an empty response while preserving loading/error states for each section.
    const productItems = productsQuery.data?.items;
    const categories = categoriesQuery.data?.items ?? [];

    const latestProducts = useMemo(() => (productItems ?? []).slice(0, 4), [productItems]);
    const offerProducts = useMemo(() => (productItems ?? []).slice(4, 8), [productItems]);

    return (
        <StoreShell className="overflow-x-clip">
            <main>
                <HomeHeroCarousel />

                <Reveal>
                    <CategoryShowcase
                        categories={categories}
                        isLoading={categoriesQuery.isLoading}
                        isError={categoriesQuery.isError}
                    />
                </Reveal>

                <Reveal>
                    <LimitedOffers
                        products={offerProducts.length > 0 ? offerProducts : latestProducts}
                        isLoading={productsQuery.isLoading}
                        isError={productsQuery.isError}
                    />
                </Reveal>

                <Reveal>
                    <section aria-label={t('latestProducts.sectionLabel')}>
                        <FeaturedProducts
                            products={latestProducts}
                            isLoading={productsQuery.isLoading}
                            isError={productsQuery.isError}
                        />
                    </section>
                </Reveal>

                <Reveal>
                    <StoreStats
                        productCount={productsQuery.data?.total}
                        categoryCount={categoriesQuery.data?.total}
                        productsLoading={productsQuery.isLoading}
                        categoriesLoading={categoriesQuery.isLoading}
                        productsError={productsQuery.isError}
                        categoriesError={categoriesQuery.isError}
                    />
                </Reveal>

                <Reveal>
                    <StoreHighlights />
                </Reveal>
                <Reveal>
                    <WhyShopWithUs />
                </Reveal>

                <Reveal>
                    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
                        <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
                            <div className="border-primary-foreground/15 pointer-events-none absolute -end-12 -top-20 size-64 rounded-full border sm:size-80" />
                            <div className="border-primary-foreground/10 pointer-events-none absolute -end-2 -top-10 size-48 rounded-full border sm:size-64" />
                            <div className="relative max-w-2xl">
                                <p className="text-primary-foreground/70 font-emphasis text-xs tracking-[0.08em] uppercase italic">
                                    {t('aboutCta.eyebrow')}
                                </p>
                                <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                                    {t('aboutCta.title')}
                                </h2>
                                <p className="text-primary-foreground/75 mt-3 max-w-xl text-sm leading-6 sm:text-base">
                                    {t('aboutCta.description')}
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Link
                                        to="/about#about"
                                        className="bg-brand text-brand-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
                                    >
                                        {t('aboutCta.aboutButton')}
                                    </Link>
                                    <Link
                                        to="/about#contact"
                                        className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl border px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                    >
                                        {t('aboutCta.contactButton')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                </Reveal>

                <Reveal>
                    <StoreContact />
                </Reveal>
            </main>
        </StoreShell>
    );
}
