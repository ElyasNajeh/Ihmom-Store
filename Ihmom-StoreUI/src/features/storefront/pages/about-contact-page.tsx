import { useCategories } from '@/features/catalog/hooks/useCategories';
import { useProducts } from '@/features/catalog/hooks/useProducts';
import { AboutHero } from '@/features/storefront/components/sections/about-hero';
import { CategoryShowcase } from '@/features/catalog/components/store/category-showcase';
import { FeaturedProducts } from '@/features/storefront/components/sections/featured-products';
import { StoreContact } from '@/features/storefront/components/sections/store-contact';
import { StoreHighlights } from '@/features/storefront/components/sections/store-highlights';
import { StoreStats } from '@/features/storefront/components/sections/store-stats';
import { WhyShopWithUs } from '@/features/storefront/components/sections/why-shop-with-us.tsx';
import { Reveal } from '@/shared/components/ui/reveal.tsx';
import {
    CATEGORY_SHOWCASE_LIMIT,
    CATEGORY_SORT_FIELD,
} from '@/features/catalog/constants/categories.ts';
import {
    PRODUCT_RECOMMENDATIONS_LIMIT,
    PRODUCT_SORT_FIELD,
} from '@/features/catalog/constants/products.ts';
import { DEFAULT_PAGE, SORT_DIRECTION } from '@/shared/constants/query.ts';

/** Public-facing About + Contact landing page. */
export default function AboutContactPage() {
    // These are public catalogue endpoints. Do not expose admin dashboard data here:
    // DashboardStats also contains customer, order, and revenue information.
    const productsQuery = useProducts({
        page: DEFAULT_PAGE,
        page_size: PRODUCT_RECOMMENDATIONS_LIMIT,
        sort_by: PRODUCT_SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.DESC,
    });

    const categoriesQuery = useCategories({
        page: DEFAULT_PAGE,
        page_size: CATEGORY_SHOWCASE_LIMIT,
        sort_by: CATEGORY_SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.DESC,
    });

    return (
        <main>
            <AboutHero />
            <Reveal>
                <StoreStats
                    productCount={productsQuery.data?.total}
                    categoryCount={categoriesQuery.data?.total}
                    productsLoading={productsQuery.isPending}
                    categoriesLoading={categoriesQuery.isPending}
                    productsError={productsQuery.isError}
                    categoriesError={categoriesQuery.isError}
                />
            </Reveal>
            <Reveal>
                <StoreHighlights />
            </Reveal>
            <Reveal>
                <FeaturedProducts
                    products={productsQuery.data?.items ?? []}
                    isLoading={productsQuery.isPending}
                    isError={productsQuery.isError}
                />
            </Reveal>
            <Reveal>
                <CategoryShowcase
                    categories={categoriesQuery.data?.items ?? []}
                    isLoading={categoriesQuery.isPending}
                    isError={categoriesQuery.isError}
                />
            </Reveal>
            <Reveal>
                <WhyShopWithUs />
            </Reveal>
            <Reveal>
                <StoreContact />
            </Reveal>
        </main>
    );
}
