import type { ReactNode, Key } from 'react';

export interface BaseCollectionProps<T> {
    items: T[];
    keyExtractor: (item: T, index: number) => Key;
    isLoading?: boolean;
    isError?: boolean;
    loadingState?: ReactNode;
    errorState?: ReactNode;
    emptyState?: ReactNode;
    className?: string;
}
