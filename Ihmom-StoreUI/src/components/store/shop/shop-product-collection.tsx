import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

import type { PublicProduct } from '@/models/product.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { ListView } from '@/components/data/views/list-view.tsx';
import { GridView } from '@/components/data/views/grid-view.tsx';
import { ShopProductRow } from './shop-product-row.tsx';
import { ShopProductCard } from './shop-product-card.tsx';

interface ShopProductCollectionProps {
    products: PublicProduct[];
    isArabic: boolean;
    isLoading: boolean;
    isError: boolean;
    isPlaceholderData: boolean;
    onRetry: () => void;
    onResetFilters: () => void;
}

export function ShopProductCollection({
    products,
    isArabic,
    isLoading,
    isError,
    isPlaceholderData,
    onRetry,
    onResetFilters,
}: ShopProductCollectionProps) {
    const { t } = useTranslation(['catalog', 'common']);

    const loadingState = (
        <div
            className="space-y-3"
            aria-label={t('shop.loading', {
                defaultValue: 'Loading products',
            })}
        >
            {Array.from({ length: 5 }, (_, index) => (
                <Card key={index} className="overflow-hidden">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                        <Skeleton className="aspect-[5/3] w-full rounded-lg sm:aspect-square sm:size-36 sm:shrink-0" />
                        <div className="flex-1 space-y-3 py-1">
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-4 w-full max-w-lg" />
                            <Skeleton className="h-7 w-24" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    const gridLoadingState = (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
                <Card key={index} className="overflow-hidden">
                    <Skeleton className="aspect-square w-full rounded-none" />
                    <CardContent className="space-y-3 p-4">
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-4 w-2/5" />
                        <Skeleton className="h-5 w-1/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    const errorState = (
        <Card>
            <CardContent className="flex flex-col items-start gap-3 p-6 sm:p-8">
                <h3 className="font-semibold">
                    {t('shop.error.title', {
                        defaultValue: 'Products could not be loaded',
                    })}
                </h3>
                <p className="text-muted-foreground text-sm">
                    {t('shop.error.description', {
                        defaultValue: 'Check your connection and try again.',
                    })}
                </p>
                <Button type="button" onClick={onRetry}>
                    {t('shop.error.retry', {
                        defaultValue: 'Try again',
                    })}
                </Button>
            </CardContent>
        </Card>
    );

    const emptyState = (
        <Card>
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                <Search className="text-muted-foreground mb-3 size-8" aria-hidden="true" />
                <h3 className="font-semibold">
                    {t('shop.empty.title', {
                        defaultValue: 'No products found',
                    })}
                </h3>
                <p className="text-muted-foreground mt-1 max-w-md text-sm">
                    {t('shop.empty.description', {
                        defaultValue: 'Try changing your search or removing some filters.',
                    })}
                </p>
                <Button type="button" variant="outline" className="mt-4" onClick={onResetFilters}>
                    {t('shop.filters.reset', {
                        defaultValue: 'Reset filters',
                    })}
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <>
            {/* Mobile and smaller tablets: list layout */}
            <div className="lg:hidden">
                <ListView<PublicProduct>
                    items={products}
                    keyExtractor={(product) => product.id}
                    renderItem={(product, index) => (
                        <ShopProductRow
                            product={product}
                            isArabic={isArabic}
                            priority={index === 0}
                        />
                    )}
                    className={`space-y-3 transition-opacity ${
                        isPlaceholderData ? 'opacity-60' : 'opacity-100'
                    }`}
                    isLoading={isLoading}
                    isError={isError}
                    loadingState={loadingState}
                    errorState={errorState}
                    emptyState={emptyState}
                />
            </div>

            {/* Large screens: grid layout */}
            <div className="hidden lg:block">
                <GridView<PublicProduct>
                    items={products}
                    keyExtractor={(product) => product.id}
                    renderItem={(product, index) => (
                        <ShopProductCard
                            product={product}
                            isArabic={isArabic}
                            priority={index === 0}
                        />
                    )}
                    gridClassName="grid grid-cols-2 gap-4 xl:grid-cols-3"
                    className={`transition-opacity ${
                        isPlaceholderData ? 'opacity-60' : 'opacity-100'
                    }`}
                    isLoading={isLoading}
                    isError={isError}
                    loadingState={gridLoadingState}
                    errorState={errorState}
                    emptyState={emptyState}
                />
            </div>
        </>
    );
}
