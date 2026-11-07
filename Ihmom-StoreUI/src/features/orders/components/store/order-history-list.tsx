import { PackageSearch, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ListView } from '@/shared/components/data/views/list-view.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/shared/components/ui/empty.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import type { OrderHistoryLookupError } from '@/features/orders/hooks/useOrderHistoryLookup.ts';
import type { OrderHistoryItem } from '@/features/orders/types/order.ts';
import { OrderHistoryCard } from './order-history-card.tsx';

interface OrderHistoryListProps {
    orders: OrderHistoryItem[];
    token: string | null;
    hasSearched: boolean;
    isLoading: boolean;
    errorKind: OrderHistoryLookupError | null;
    errorMessage: string | null;
    locale: string;
    onRetry: () => void;
}

const ERROR_COPY_KEYS: Record<OrderHistoryLookupError, { title: string; description: string }> = {
    invalid_details: {
        title: 'history.invalidTitle',
        description: 'history.invalidDescription',
    },
    rate_limited: {
        title: 'history.rateLimitedTitle',
        description: 'history.rateLimitedDescription',
    },
    unexpected: {
        title: 'history.errorTitle',
        description: 'history.errorDescription',
    },
};

export function OrderHistoryList({
    orders,
    token,
    hasSearched,
    isLoading,
    errorKind,
    errorMessage,
    locale,
    onRetry,
}: OrderHistoryListProps) {
    const { t } = useTranslation('orders');

    const loadingState = (
        <div className="space-y-3" aria-busy="true" aria-label={t('history.loading')}>
            <Card>
                <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-4 w-44 max-w-full" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="ms-auto h-6 w-32" />
                </CardContent>
            </Card>
        </div>
    );

    const errorCopy = ERROR_COPY_KEYS[errorKind ?? 'unexpected'];

    const errorState = (
        <Alert variant="destructive">
            <AlertTitle>{t(errorCopy.title)}</AlertTitle>
            <AlertDescription>
                <p>{t(errorCopy.description)}</p>
                {errorKind === 'unexpected' && errorMessage && (
                    <p className="mt-1 break-words">{errorMessage}</p>
                )}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={onRetry}
                >
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    {t('history.retry')}
                </Button>
            </AlertDescription>
        </Alert>
    );

    const emptyState = (
        <Empty className="bg-card border">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <PackageSearch />
                </EmptyMedia>
                <EmptyTitle>
                    {hasSearched ? t('history.emptyTitle') : t('history.idleTitle')}
                </EmptyTitle>
                <EmptyDescription>
                    {hasSearched ? t('history.emptyDescription') : t('history.idleDescription')}
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );

    return (
        <ListView<OrderHistoryItem>
            items={orders}
            keyExtractor={(order) => order.order_number}
            renderItem={(order) => <OrderHistoryCard order={order} token={token} locale={locale} />}
            className="space-y-3"
            isLoading={isLoading}
            isError={errorKind !== null}
            loadingState={loadingState}
            errorState={errorState}
            emptyState={emptyState}
        />
    );
}
