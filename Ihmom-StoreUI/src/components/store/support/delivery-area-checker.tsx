import { Check, MapPin, RefreshCw, Search, Truck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { ListView } from '@/components/data/views/list-view.tsx';
import { useDeliveryAreas } from '@/hooks/useDeliveryAreas.ts';
import type { PublicDeliveryArea } from '@/models/delivery-areas.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import { formatOrderMoney } from '@/utils/order-format.ts';
import { cn } from '@/lib/utils.ts';
import { useDebounce } from '@/hooks/useDebounce.ts';
import { FETCH_ALL_PARAMS, SEARCH_DEBOUNCE_MS } from '@/constants/query.ts';
import { localizedName } from '@/utils/localized.ts';
import { useMemo, useState } from 'react';

export function DeliveryAreaChecker({ className }: { className?: string }) {
    const { t } = useTranslation('support');
    const { isArabic, locale } = useLocale();

    const areasQuery = useDeliveryAreas(FETCH_ALL_PARAMS);
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const areas = useMemo(() => areasQuery.data?.items ?? [], [areasQuery.data]);
    const selected = areas.find((area) => area.id === selectedId);
    const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
    const normalizedQuery = debouncedQuery.trim().toLocaleLowerCase();

    const filtered = useMemo(
        () =>
            areas
                .filter((area) =>
                    normalizedQuery
                        ? `${area.name_en} ${area.name_ar}`
                              .toLocaleLowerCase()
                              .includes(normalizedQuery)
                        : true,
                )
                .sort((first, second) =>
                    localizedName(first, isArabic).localeCompare(
                        localizedName(second, isArabic),
                        locale,
                    ),
                ),
        [areas, isArabic, locale, normalizedQuery],
    );

    const loadingState = (
        <div className="mt-2 space-y-2" aria-busy="true">
            {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-xl" />
            ))}
        </div>
    );

    const errorState = (
        <Alert variant="destructive" className="mt-2">
            <AlertTitle>{t('delivery.checker.errorTitle')}</AlertTitle>
            <AlertDescription>
                <p>{t('delivery.checker.errorDescription')}</p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => void areasQuery.refetch()}
                >
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    {t('delivery.checker.retry')}
                </Button>
            </AlertDescription>
        </Alert>
    );

    const emptyState = (
        <div className="border-border mt-2 rounded-xl border border-dashed p-4 text-center">
            <p className="text-sm font-medium">{t('delivery.checker.noResults', { query })}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
                {t('delivery.checker.noResultsDescription')}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/contact?topic=delivery">{t('delivery.checker.contactToConfirm')}</Link>
            </Button>
        </div>
    );

    return (
        <Card className={className}>
            <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
                        <Truck className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">
                            {t('delivery.checker.title')}
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm leading-6">
                            {t('delivery.checker.description')}
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-4">
                        <div className="relative">
                            <Search
                                className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
                                aria-hidden="true"
                            />
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={t('delivery.checker.searchPlaceholder')}
                                aria-label={t('delivery.checker.searchLabel')}
                                className="h-11 ps-9 pe-10"
                            />
                            {query && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute end-1 top-1/2 size-9 -translate-y-1/2"
                                    aria-label={t('delivery.checker.clear')}
                                    onClick={() => setQuery('')}
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </Button>
                            )}
                        </div>

                        <div aria-live="polite">
                            {selected ? (
                                <div className="border-primary/30 bg-primary/5 rounded-2xl border p-5">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                                        {t('delivery.checker.resultTitle', {
                                            area: localizedName(selected, isArabic),
                                        })}
                                    </p>
                                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                                        {formatOrderMoney(selected.delivery_fee, locale)}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 text-xs">
                                        {t('delivery.checker.feeLabel')}
                                    </p>
                                    <p className="text-muted-foreground mt-3 text-xs leading-5">
                                        {t('delivery.checker.resultNote')}
                                    </p>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button asChild className="min-h-9">
                                            <Link to="/shop">{t('shared.continueShopping')}</Link>
                                        </Button>
                                        <Button asChild variant="outline" className="min-h-9">
                                            <Link to="/contact?topic=delivery">
                                                {t('delivery.checker.contactToConfirm')}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-border text-muted-foreground flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center">
                                    <MapPin className="size-6" aria-hidden="true" />
                                    <p className="mt-2 max-w-xs text-sm leading-6">
                                        {t('delivery.checker.selectPrompt')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="min-w-0">
                        <p className="text-muted-foreground text-xs">
                            {areasQuery.isPending
                                ? t('delivery.checker.loading')
                                : t('delivery.checker.areaCount', { count: filtered.length })}
                        </p>

                        <div role="group" aria-label={t('delivery.checker.listLabel')}>
                            <ListView<PublicDeliveryArea>
                                items={filtered}
                                keyExtractor={(area) => area.id}
                                renderItem={(area) => {
                                    const isSelected = area.id === selectedId;

                                    return (
                                        <button
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() => setSelectedId(area.id)}
                                            className={cn(
                                                'focus-visible:ring-ring flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-start text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none',
                                                isSelected
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border bg-background hover:bg-muted/60',
                                            )}
                                        >
                                            <span className="min-w-0 truncate">
                                                {localizedName(area, isArabic)}
                                            </span>
                                            <span className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs font-medium">
                                                {formatOrderMoney(area.delivery_fee, locale)}
                                                {isSelected && (
                                                    <Check
                                                        className="text-primary size-4"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                        </button>
                                    );
                                }}
                                className="mt-2 max-h-80 space-y-1.5 overflow-y-auto pe-1"
                                isLoading={areasQuery.isPending}
                                isError={areasQuery.isError}
                                loadingState={loadingState}
                                errorState={errorState}
                                emptyState={emptyState}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
