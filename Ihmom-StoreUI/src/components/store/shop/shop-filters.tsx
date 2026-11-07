import { useTranslation } from 'react-i18next';
import type { Brand } from '@/models/brand.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { FILTER_ALL } from '@/constants/query.ts';
import { Label } from '@/components/ui/label.tsx';
import { SearchableSelect } from '@/components/ui/searchable-select.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { localizedName } from '@/utils/localized.ts';

interface Props {
    brands: Brand[];
    brandId?: number;
    minPrice: string;
    maxPrice: string;
    invalidPriceRange: boolean;
    onBrandChange: (value: number | undefined) => void;
    onMinPriceChange: (value: string) => void;
    onMaxPriceChange: (value: string) => void;
    onReset: () => void;
    isArabic: boolean;
    isBrandsLoading: boolean;
}

export function ShopFilters(props: Props) {
    const { t } = useTranslation('catalog', { keyPrefix: 'shop.filters' });
    const {
        brands,
        brandId,
        minPrice,
        maxPrice,
        invalidPriceRange,
        onBrandChange,
        onMinPriceChange,
        onMaxPriceChange,
        onReset,
        isArabic,
        isBrandsLoading,
    } = props;

    const brandItems = [
        { value: FILTER_ALL, label: t('allBrands', { defaultValue: 'All brands' }) },
        ...brands.map((item) => ({
            value: String(item.id),
            label: localizedName(item, isArabic),
        })),
    ];

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                        {t('title', { defaultValue: 'Filters' })}
                    </CardTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={onReset}
                    >
                        {t('reset', { defaultValue: 'Reset' })}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Brand Filter */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">
                        {t('brand', { defaultValue: 'Brand' })}
                    </Label>
                    <SearchableSelect
                        options={brandItems}
                        value={brandId ? String(brandId) : FILTER_ALL}
                        onChange={(val) =>
                            onBrandChange(!val || val === FILTER_ALL ? undefined : Number(val))
                        }
                        placeholder={
                            isBrandsLoading
                                ? t('loadingBrands', { defaultValue: 'Loading brands…' })
                                : t('allBrands', { defaultValue: 'All brands' })
                        }
                        searchPlaceholder={t('searchBrands', {
                            defaultValue: 'Search brands',
                        })}
                        emptyMessage={t('noBrandsFound', {
                            defaultValue: 'No brands found.',
                        })}
                        openLabel={t('brand', { defaultValue: 'Brand' })}
                        clearable={false}
                        disabled={isBrandsLoading}
                        inputClassName="h-9"
                    />
                </div>

                <Separator />

                {/* Price Range Filter */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">
                        {t('price', { defaultValue: 'Price range' })}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="min-w-0 space-y-1.5">
                            <Label
                                htmlFor="shop-min-price"
                                className="text-muted-foreground text-xs font-normal"
                            >
                                {t('minimum', { defaultValue: 'Minimum' })}
                            </Label>
                            <Input
                                id="shop-min-price"
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={minPrice}
                                onChange={(e) => onMinPriceChange(e.target.value)}
                                placeholder="0"
                                className="h-9"
                            />
                        </div>
                        <div className="min-w-0 space-y-1.5">
                            <Label
                                htmlFor="shop-max-price"
                                className="text-muted-foreground text-xs font-normal"
                            >
                                {t('maximum', { defaultValue: 'Maximum' })}
                            </Label>
                            <Input
                                id="shop-max-price"
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={maxPrice}
                                onChange={(e) => onMaxPriceChange(e.target.value)}
                                placeholder="-"
                                className="h-9"
                            />
                        </div>
                    </div>
                    {invalidPriceRange && (
                        <p className="text-destructive text-xs" role="alert">
                            {t('invalidPriceRange', {
                                defaultValue: 'Minimum price must not exceed maximum price.',
                            })}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
