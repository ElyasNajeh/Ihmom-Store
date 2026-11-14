import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { OrderHistoryList } from '@/features/orders/components/store/order-history-list.tsx';
import { OrderLookupForm } from '@/features/orders/components/store/order-lookup-form.tsx';
import { useOrderHistoryLookup } from '@/features/orders/hooks/useOrderHistoryLookup.ts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card.tsx';
import { useLocale } from '@/shared/hooks/useLocale.ts';

export default function MyOrdersPage() {
    const { t } = useTranslation('orders');
    const { locale } = useLocale();
    const lookup = useOrderHistoryLookup();

    useEffect(() => {
        return () => {
            lookup.clear();
        };
    }, [lookup.clear]);

    const orders = lookup.result ? [lookup.result] : [];
    const isInitialLoading = lookup.isSearching && !lookup.result;

    return (
        <main className="mx-auto w-full max-w-5xl px-4 pt-7 pb-12 sm:px-6 sm:pt-10 lg:px-8">
            <header className="mb-7 space-y-2 sm:mb-9">
                <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                    {t('meta.eyebrow')}
                </p>
                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    {t('meta.title')}
                </h1>
                <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
                    {t('meta.description')}
                </p>
            </header>

            <section aria-labelledby="order-lookup-heading" className="mb-8 sm:mb-10">
                <Card>
                    <CardHeader>
                        <CardTitle id="order-lookup-heading">{t('lookup.title')}</CardTitle>
                        <CardDescription>{t('lookup.description')}</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <OrderLookupForm
                            isSearching={lookup.isSearching}
                            onSubmit={lookup.search}
                        />
                    </CardContent>
                </Card>
            </section>

            <section aria-labelledby="order-history-heading">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <h2 id="order-history-heading" className="text-xl font-semibold tracking-tight">
                        {t('history.title')}
                    </h2>

                    {lookup.hasAttemptedLookup && !lookup.errorKind && (
                        <p className="text-muted-foreground text-sm" aria-live="polite">
                            {isInitialLoading ? t('history.loading') : t('history.verified')}
                        </p>
                    )}
                </div>

                <OrderHistoryList
                    orders={orders}
                    token={lookup.token}
                    hasSearched={lookup.hasAttemptedLookup}
                    isLoading={isInitialLoading}
                    errorKind={lookup.errorKind}
                    errorMessage={lookup.errorMessage}
                    locale={locale}
                    onRetry={lookup.retry}
                />
            </section>
        </main>
    );
}
