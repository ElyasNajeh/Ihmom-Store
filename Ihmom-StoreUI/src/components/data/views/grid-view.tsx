import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { BaseCollectionProps } from '@/components/data/types';

interface GridViewProps<T> extends BaseCollectionProps<T> {
    renderItem: (item: T, index: number) => ReactNode;
    gridClassName?: string;
    skeletonCount?: number;
}

export function GridView<T>({
    items,
    renderItem,
    keyExtractor,
    isLoading,
    isError,
    loadingState,
    errorState,
    emptyState,
    className,
    gridClassName = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    skeletonCount = 8,
}: GridViewProps<T>) {
    if (isLoading) {
        return (
            loadingState ?? (
                <div
                    className={cn('w-full', className)}
                    aria-busy="true"
                    aria-label="Loading items"
                >
                    <div className={cn('grid gap-4 sm:gap-6', gridClassName)}>
                        {Array.from({ length: skeletonCount }).map((_, index) => (
                            <div
                                key={index}
                                className="h-full min-w-0 space-y-3"
                                aria-hidden="true"
                            >
                                <Skeleton className="h-40 w-full rounded-xl" />

                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        );
    }

    if (isError) {
        return errorState ?? null;
    }

    if (items.length === 0) {
        return (
            emptyState ?? (
                <div
                    className={cn(
                        'text-muted-foreground flex w-full items-center justify-center py-10 text-sm',
                        className,
                    )}
                    role="status"
                >
                    No items found.
                </div>
            )
        );
    }

    return (
        <div className={cn('w-full', className)}>
            <div className={cn('grid gap-4 sm:gap-6', gridClassName)}>
                {items.map((item, index) => (
                    <div key={keyExtractor(item, index)} className="h-full min-w-0">
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </div>
    );
}
