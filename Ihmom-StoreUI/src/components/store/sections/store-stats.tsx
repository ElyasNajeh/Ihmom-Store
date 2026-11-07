import { Package, Shapes } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/hooks/use-locale.ts';
import { formatNumber } from '@/utils/order-format.ts';

interface StoreStatsProps {
    productCount?: number;
    categoryCount?: number;
    productsLoading: boolean;
    categoriesLoading: boolean;
    productsError: boolean;
    categoriesError: boolean;
}

export function StoreStats({
    productCount,
    categoryCount,
    productsLoading,
    categoriesLoading,
    productsError,
    categoriesError,
}: StoreStatsProps) {
    const { t } = useTranslation(['shop-catalog-additions', 'common']);
    const { locale } = useLocale();

    const stats = [
        {
            id: 'products',
            label: t('stats.products'),
            value: productCount,
            loading: productsLoading,
            error: productsError,
            icon: Package,
        },
        {
            id: 'categories',
            label: t('stats.categories'),
            value: categoryCount,
            loading: categoriesLoading,
            error: categoriesError,
            icon: Shapes,
        },
    ];

    return (
        <section aria-label={t('stats.sectionLabel')} className="border-border bg-card/60 border-y">
            <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:grid-cols-2 sm:px-6 sm:py-6 lg:px-8">
                {stats.map(({ id, label, value, loading, error, icon: Icon }) => (
                    <Card key={id} className="border-border/70 shadow-none">
                        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                            <span className="bg-secondary grid size-11 shrink-0 place-items-center rounded-xl">
                                <Icon className="size-5" aria-hidden="true" />
                            </span>

                            <div className="min-w-0">
                                <p className="text-muted-foreground text-sm">{label}</p>

                                {loading ? (
                                    <Skeleton className="mt-2 h-7 w-16" />
                                ) : error || value === undefined ? (
                                    <p className="mt-1 text-sm font-medium">
                                        {t('temporarilyUnavailable', {
                                            ns: 'common',
                                        })}
                                    </p>
                                ) : (
                                    <p
                                        className="mt-1 text-2xl font-semibold tracking-tight"
                                        aria-live="polite"
                                    >
                                        {formatNumber(value, locale)}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
