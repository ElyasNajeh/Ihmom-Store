import { ArrowUpRight, Clock3, ImageOff, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { PublicProduct } from '@/features/catalog/types/product';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { ImageWithFade } from '@/shared/components/ui/image-with-fade';
import { GridView } from '@/shared/components/data/views/grid-view.tsx';
import { SectionHeader } from '@/features/storefront/components/sections/section-header.tsx';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import { apiAssetUrl } from '@/shared/api/axios.ts';
import { formatPrice } from '@/features/orders/utils/order-format.ts';
import { localizedName } from '@/shared/utils/localized.ts';

interface LimitedOffersProps {
    products: PublicProduct[];
    isLoading: boolean;
    isError: boolean;
}

export function LimitedOffers({ products, isLoading, isError }: LimitedOffersProps) {
    // Sets 'offers' as keyPrefix so translation keys omit the redundant 'offers.' prefix
    const { t } = useTranslation('home', { keyPrefix: 'offers' });
    const { isArabic, locale } = useLocale();

    const loadingState = (
        <div className="relative mt-7 grid grid-cols-2 gap-3 sm:mt-9 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
                <Card key={index} className="overflow-hidden rounded-2xl py-0 shadow-none">
                    <Skeleton className="aspect-[4/3] w-full rounded-none" />
                    <CardContent className="space-y-3 p-3 sm:p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    const errorState = (
        <div
            role="status"
            className="border-border bg-card text-muted-foreground relative mt-7 rounded-2xl border p-5 text-sm sm:mt-9"
        >
            {t('error')}
        </div>
    );

    const emptyState = (
        <div className="border-border text-muted-foreground relative mt-7 rounded-2xl border border-dashed p-6 text-sm sm:mt-9">
            {t('empty')}
        </div>
    );

    return (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="border-border bg-secondary/70 relative overflow-hidden rounded-3xl border p-5 sm:p-8 lg:p-10">
                <div className="border-brand/30 pointer-events-none absolute -end-16 -top-20 size-64 rounded-full border sm:size-80" />
                <SectionHeader
                    className="relative gap-5"
                    eyebrow={t('eyebrow')}
                    title={t('title')}
                    description={t('description')}
                    action={
                        <Button asChild className="min-h-11 shrink-0 self-start sm:self-auto">
                            <Link to="/shop">
                                {t('viewShop')}
                                <ArrowUpRight
                                    className="ms-2 size-4 rtl:rotate-[-90deg]"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    }
                />

                <GridView<PublicProduct>
                    items={products.slice(0, 4)}
                    keyExtractor={(product) => product.id}
                    renderItem={(product) => {
                        const image =
                            product.images.find((item) => item.is_primary) ?? product.images[0];
                        const name = localizedName(product, isArabic);
                        const category = localizedName(product.category, isArabic);

                        return (
                            <Card className="group border-border/80 bg-card hover:border-brand/70 h-full overflow-hidden rounded-2xl py-0 shadow-none transition-colors">
                                <Link
                                    to={`/shop/${product.id}`}
                                    className="focus-visible:ring-ring block focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                                    aria-label={t(
                                        'shop-catalog-additions:featuredProducts.browseProduct',
                                        {
                                            name,
                                            defaultValue: name,
                                        },
                                    )}
                                >
                                    <div className="bg-muted relative aspect-[4/3] overflow-hidden">
                                        {image ? (
                                            <ImageWithFade
                                                src={apiAssetUrl(image.image) ?? image.image}
                                                alt={name}
                                                loading="lazy"
                                                decoding="async"
                                                className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                                            />
                                        ) : (
                                            <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
                                                <ImageOff className="size-6" aria-hidden="true" />
                                                <span className="text-xs">
                                                    {t(
                                                        'shop-catalog-additions:featuredProducts.noImage',
                                                        {
                                                            defaultValue: 'No image',
                                                        },
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        <span className="bg-brand text-brand-foreground absolute start-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-xs">
                                            <Tag className="size-3" aria-hidden="true" />
                                            {t('offerBadge')}
                                        </span>
                                    </div>
                                    <CardContent className="p-3 sm:p-4">
                                        <p className="text-muted-foreground truncate text-xs">
                                            {category}
                                        </p>
                                        <h3 className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 font-semibold">
                                            {name}
                                        </h3>
                                        <p className="mt-3 text-sm font-semibold">
                                            {formatPrice(product.starting_price, locale)}
                                            <span className="text-muted-foreground ms-1 text-xs font-normal">
                                                {t('priceNote')}
                                            </span>
                                        </p>
                                    </CardContent>
                                </Link>
                            </Card>
                        );
                    }}
                    className="relative mt-7 sm:mt-9"
                    gridClassName="grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
                    isLoading={isLoading}
                    isError={isError}
                    loadingState={loadingState}
                    errorState={errorState}
                    emptyState={emptyState}
                />

                <p className="text-muted-foreground relative mt-5 flex items-center gap-2 text-xs">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {t('disclaimer')}
                </p>
            </div>
        </section>
    );
}
