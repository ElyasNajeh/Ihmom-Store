import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ImageOff, Tag } from 'lucide-react';

import type { PublicProduct } from '@/models/product.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { ImageWithFade } from '@/components/ui/image-with-fade.tsx';
import { useLocale } from '@/hooks/use-locale.ts';
import { formatAmount } from '@/utils/order-format.ts';
import { localizedName } from '@/utils/localized.ts';

interface ShopProductRowProps {
    product: PublicProduct;
    isArabic?: boolean;
    priority?: boolean;
}

export function ShopProductRow({
    product,
    isArabic: isArabicProp,
    priority = false,
}: ShopProductRowProps) {
    const { t } = useTranslation('catalog', {
        keyPrefix: 'shop.product',
    });
    const { isArabic: resolvedIsArabic, locale } = useLocale();

    const isArabic = isArabicProp ?? resolvedIsArabic;

    const name = localizedName(product, isArabic);

    const category = product.category ? localizedName(product.category, isArabic) : '';

    const brand = product.brand ? localizedName(product.brand, isArabic) : '';

    const image =
        product.images?.find((item) => item.is_primary)?.image ?? product.images?.[0]?.image;

    // Update this path if the application uses a different product-detail route.
    const detailHref = `/shop/${product.id}`;

    return (
        <Card className="group hover:border-primary/35 overflow-hidden transition-colors">
            <CardContent className="flex flex-col gap-0 p-0 sm:flex-row">
                <Link
                    to={detailHref}
                    aria-label={t('viewProduct', {
                        name,
                        defaultValue: 'View {{name}}',
                    })}
                    className="bg-muted/40 focus-visible:ring-ring relative block aspect-[5/3] w-full shrink-0 overflow-hidden focus-visible:ring-2 focus-visible:outline-none sm:aspect-square sm:w-36 md:w-44"
                >
                    {image ? (
                        <ImageWithFade
                            src={image}
                            alt={name}
                            loading={priority ? 'eager' : 'lazy'}
                            fetchPriority={priority ? 'high' : 'low'}
                            decoding="async"
                            width={176}
                            height={176}
                            className="size-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
                        />
                    ) : (
                        <span className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2 p-4">
                            <ImageOff className="size-7" aria-hidden="true" />
                            <span className="text-xs">
                                {t('noImage', {
                                    defaultValue: 'No image available',
                                })}
                            </span>
                        </span>
                    )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            {category && (
                                <Badge
                                    variant="secondary"
                                    className="max-w-full truncate font-normal"
                                >
                                    {category}
                                </Badge>
                            )}

                            {brand && (
                                <span className="text-muted-foreground text-xs">{brand}</span>
                            )}
                        </div>

                        <Link
                            to={detailHref}
                            className="focus-visible:ring-ring hover:text-primary rounded-sm text-base leading-snug font-semibold tracking-tight focus-visible:ring-2 focus-visible:outline-none sm:text-lg"
                        >
                            {name}
                        </Link>

                        <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
                            <Tag className="size-3.5" aria-hidden="true" />
                            {t('startingAt', {
                                defaultValue: 'Starting at ',
                            })}
                        </p>
                    </div>

                    <div className="border-border flex shrink-0 items-center justify-between gap-4 border-t pt-3 sm:min-w-36 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0">
                        <p className="text-primary text-lg font-semibold tabular-nums sm:text-xl">
                            {formatAmount(product.starting_price, locale)}
                        </p>

                        <Button asChild size="sm" className="gap-2">
                            <Link to={detailHref}>
                                {t('viewDetails', {
                                    defaultValue: 'View details',
                                })}
                                <ArrowUpRight
                                    className="size-3.5 rtl:rotate-[-90deg]"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
