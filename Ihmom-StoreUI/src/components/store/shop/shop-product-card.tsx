import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ImageOff } from 'lucide-react';

import type { PublicProduct } from '@/models/product.ts';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { ImageWithFade } from '@/components/ui/image-with-fade.tsx';
import { useLocale } from '@/hooks/use-locale.ts';
import { apiAssetUrl } from '@/services/axios.ts';
import { formatOrderMoney } from '@/utils/order-format.ts';
import { localizedName, localizedText } from '@/utils/localized.ts';

interface ShopProductCardProps {
    product: PublicProduct;
    isArabic: boolean;
    priority?: boolean;
}

export function ShopProductCard({ product, isArabic, priority = false }: ShopProductCardProps) {
    const { t } = useTranslation(['catalog', 'common']);
    const { locale } = useLocale();

    const name = localizedName(product, isArabic);

    const description = localizedText(product.description_en, product.description_ar, isArabic);

    const image =
        product.images?.find((item) => item.is_primary)?.image ?? product.images?.[0]?.image;

    const categoryName = product.category ? localizedName(product.category, isArabic) : '';

    const brandName = product.brand ? localizedName(product.brand, isArabic) : '';

    return (
        <Card className="group h-full overflow-hidden transition-shadow hover:shadow-md">
            <Link
                to={`/shop/${product.id}`}
                className="focus-visible:ring-ring flex h-full flex-col focus-visible:ring-2 focus-visible:outline-none"
                aria-label={name}
            >
                <div className="bg-muted aspect-square overflow-hidden">
                    {image ? (
                        <ImageWithFade
                            src={apiAssetUrl(image) ?? image}
                            alt={name}
                            loading={priority ? 'eager' : 'lazy'}
                            fetchPriority={priority ? 'high' : 'auto'}
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                        />
                    ) : (
                        <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
                            <ImageOff className="size-7" aria-hidden="true" />
                            <span className="text-sm">
                                {t('shop.product.noImage', {
                                    defaultValue: 'No image available',
                                })}
                            </span>
                        </div>
                    )}
                </div>

                <CardContent className="flex flex-1 flex-col gap-2 p-4">
                    {categoryName && (
                        <p className="text-muted-foreground text-xs">{categoryName}</p>
                    )}

                    <h3 className="line-clamp-2 font-semibold">{name}</h3>

                    {description && (
                        <p className="text-muted-foreground line-clamp-2 text-sm">{description}</p>
                    )}

                    {brandName && (
                        <p className="text-muted-foreground mt-auto pt-2 text-xs">{brandName}</p>
                    )}

                    <p className="text-primary flex flex-wrap items-baseline gap-1 font-semibold">
                        <span>
                            {t('shop.product.startingAt', {
                                defaultValue: 'Starting at',
                            })}
                        </span>
                        <span className="tabular-nums">
                            {formatOrderMoney(product.starting_price, locale)}
                        </span>
                    </p>
                </CardContent>
            </Link>
        </Card>
    );
}
