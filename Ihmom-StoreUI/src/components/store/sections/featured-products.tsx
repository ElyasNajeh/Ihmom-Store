import { ArrowUpRight, ImageOff, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { PublicProduct } from '@/models/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageWithFade } from '@/components/ui/image-with-fade';
import { GridView } from '@/components/data/views/grid-view.tsx';
import { SectionHeader } from '@/components/store/sections/section-header.tsx';
import { useLocale } from '@/hooks/use-locale.ts';
import { apiAssetUrl } from '@/services/axios.ts';
import { formatPrice } from '@/utils/order-format.ts';
import { localizedName } from '@/utils/localized.ts';

interface FeaturedProductsProps {
    products: PublicProduct[];
    isLoading: boolean;
    isError: boolean;
}

export function FeaturedProducts({ products, isLoading, isError }: FeaturedProductsProps) {
    const { t } = useTranslation('shop-catalog-additions');
    const { isArabic, locale } = useLocale();

    const loadingState = (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
                <Card key={index} className="overflow-hidden rounded-2xl shadow-none">
                    <Skeleton className="aspect-[4/3] w-full rounded-none" />
                    <CardContent className="space-y-3 p-4 sm:p-5">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    const errorState = (
        <div
            className="border-border bg-card text-muted-foreground mt-8 rounded-2xl border p-6 text-sm"
            role="status"
        >
            {t('featuredProducts.error')}
        </div>
    );

    const emptyState = (
        <div className="border-border mt-8 rounded-2xl border border-dashed p-8 text-center">
            <Package className="text-muted-foreground mx-auto size-8" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">{t('featuredProducts.emptyTitle')}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
                {t('featuredProducts.emptyDescription')}
            </p>
        </div>
    );

    return (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <SectionHeader
                eyebrow={t('featuredProducts.eyebrow')}
                title={t('featuredProducts.title')}
                description={t('featuredProducts.description')}
                action={
                    <Button variant="outline" asChild className="min-h-11 self-start sm:self-auto">
                        <Link to="/shop">
                            {t('featuredProducts.viewAll')}
                            <ArrowUpRight className="ms-2 size-4" aria-hidden="true" />
                        </Link>
                    </Button>
                }
            />

            <GridView<PublicProduct>
                items={products}
                keyExtractor={(product) => product.id}
                renderItem={(product) => {
                    const primaryImage =
                        product.images.find((image) => image.is_primary) ?? product.images[0];

                    const productName = localizedName(product, isArabic);
                    const categoryName = localizedName(product.category, isArabic);

                    return (
                        <Card className="group border-border/80 hover:border-brand/60 h-full overflow-hidden rounded-2xl py-0 shadow-none transition-colors">
                            <Link
                                to={`/shop/${product.id}`}
                                aria-label={t('featuredProducts.browseProduct', {
                                    name: productName,
                                })}
                                className="focus-visible:ring-ring block focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                            >
                                <div className="bg-secondary relative aspect-[4/3] overflow-hidden">
                                    {primaryImage ? (
                                        <ImageWithFade
                                            src={
                                                apiAssetUrl(primaryImage.image) ??
                                                primaryImage.image
                                            }
                                            alt={productName}
                                            loading="lazy"
                                            decoding="async"
                                            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none"
                                        />
                                    ) : (
                                        <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
                                            <ImageOff className="size-7" aria-hidden="true" />
                                            <span className="text-xs">
                                                {t('featuredProducts.noImage')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <CardContent className="p-3 sm:p-5">
                                    <p className="text-muted-foreground truncate text-xs">
                                        {categoryName}
                                    </p>

                                    <h3 className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 font-semibold sm:text-base">
                                        {productName}
                                    </h3>

                                    <p className="mt-3 text-sm font-semibold sm:text-base">
                                        <span className="text-muted-foreground text-xs font-normal">
                                            {t('featuredProducts.priceFrom')}{' '}
                                        </span>
                                        {formatPrice(product.starting_price, locale)}
                                    </p>
                                </CardContent>
                            </Link>
                        </Card>
                    );
                }}
                className="mt-8 sm:mt-10"
                gridClassName="grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
                isLoading={isLoading}
                isError={isError}
                loadingState={loadingState}
                errorState={errorState}
                emptyState={emptyState}
            />
        </section>
    );
}
