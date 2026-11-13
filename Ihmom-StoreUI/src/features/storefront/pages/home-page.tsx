import { useMemo } from 'react';
import { catalogNumericSeed } from '@/features/catalog/utils/catalog-seed.ts';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { CategoryShowcase } from '@/features/catalog/components/store/category-showcase';
import { useCategories } from '@/features/catalog/hooks/useCategories';
import { useProducts } from '@/features/catalog/hooks/useProducts';
import { FEATURED_PRODUCTS_PAGE_SIZE } from '@/features/catalog/constants/products.ts';

import { FeaturedProducts } from '@/features/storefront/components/sections/featured-products';
import { LimitedOffers } from '@/features/storefront/components/sections/limited-offers';
import { HomeHeroCarousel } from '@/features/storefront/components/sections/home-hero-carousel';
import { StoreContact } from '@/features/storefront/components/sections/store-contact';
import { StoreHighlights } from '@/features/storefront/components/sections/store-highlights';
import { StoreStats } from '@/features/storefront/components/sections/store-stats';
import { StorePhoto } from '@/features/storefront/components/sections/store-photo';
import { WhyShopWithUs } from '@/features/storefront/components/sections/why-shop-with-us';
import { Reveal } from '@/shared/components/ui/reveal';
import { DEFAULT_PAGE, SORT_DIRECTION, SORT_FIELD } from '@/shared/constants/query.ts';
import { shuffleArray } from '@/shared/utils/random.ts';
const HOMEPAGE_CATEGORY_PAGE_SIZE = 4;
const HOMEPAGE_PRODUCTS_PER_SECTION = 4;

export default function HomePage() {
    const { t } = useTranslation('home');

    const categorySeed = catalogNumericSeed();
    const productsQuery = useProducts({
        page: DEFAULT_PAGE,
        page_size: FEATURED_PRODUCTS_PAGE_SIZE,
        randomize: true,
    });
    const categoriesQuery = useCategories({
        page: DEFAULT_PAGE,
        page_size: HOMEPAGE_CATEGORY_PAGE_SIZE,
        sort_by: SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.DESC,
        filter: { is_active: true },
    });
    const categories = useMemo(
        () => shuffleArray(categoriesQuery.data?.items ?? [], categorySeed),
        [categoriesQuery.data?.items, categorySeed],
    );

    const productItems = productsQuery.data?.items ?? [];
    const discoverProducts = productItems.slice(0, HOMEPAGE_PRODUCTS_PER_SECTION);
    const offerProducts = productItems.slice(
        HOMEPAGE_PRODUCTS_PER_SECTION,
        HOMEPAGE_PRODUCTS_PER_SECTION * 2,
    );
    const productsLoading = productsQuery.isLoading;
    const categoriesLoading = categoriesQuery.isLoading;
    const productsError = productsQuery.isError;
    const categoriesError = categoriesQuery.isError;

    return (
        <main className="overflow-x-clip">
            <HomeHeroCarousel />

            <Reveal>
                <CategoryShowcase
                    categories={categories}
                    isLoading={categoriesLoading}
                    isError={categoriesError}
                />
            </Reveal>

            <Reveal>
                <LimitedOffers
                    products={offerProducts}
                    isLoading={productsLoading}
                    isError={productsError}
                />
            </Reveal>

            <Reveal>
                <section aria-label={t('discoverProducts.sectionLabel')}>
                    <FeaturedProducts
                        products={discoverProducts}
                        isLoading={productsLoading}
                        isError={productsError}
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
                    <div className="bg-primary text-primary-foreground relative grid items-center gap-8 overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1fr_240px] lg:gap-14 lg:px-14">
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

                        <StorePhoto
                            name="combination_accessories_games_shisha_vape_section"
                            alt={t('aboutCta.imageAlt')}
                            sizes="(min-width: 320px) 240px, calc(100vw - 80px)"
                            className="relative mx-auto aspect-3/4 h-auto max-h-[320px] w-full max-w-[240px] rounded-2xl object-contain"
                        />
                    </div>
                </section>
            </Reveal>

            <Reveal>
                <StoreContact />
            </Reveal>
        </main>
    );
}
