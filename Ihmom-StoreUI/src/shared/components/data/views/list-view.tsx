import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils.ts';
import type { BaseCollectionProps } from '@/shared/components/data/types.ts';
import { Separator } from '@/shared/components/ui/separator.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';

interface ListViewProps<T> extends BaseCollectionProps<T> {
    renderItem: (item: T, index: number) => ReactNode;
    divided?: boolean;
    skeletonCount?: number;
}

export function ListView<T>({
    items,
    renderItem,
    keyExtractor,
    isLoading = false,
    isError = false,
    loadingState,
    errorState,
    emptyState,
    divided = false,
    className,
    skeletonCount = 5,
}: ListViewProps<T>) {
    if (isLoading) {
        return (
            loadingState ?? (
                <ul
                    className={cn('flex w-full flex-col', className)}
                    aria-busy="true"
                    aria-label="Loading list items"
                >
                    {Array.from({ length: skeletonCount }).map((_, index) => {
                        const hasSeparator = divided && index < skeletonCount - 1;

                        return (
                            <li
                                key={index}
                                className="flex w-full min-w-0 flex-col"
                                aria-hidden="true"
                            >
                                <div
                                    className={cn(
                                        'flex w-full min-w-0 items-center gap-4',
                                        hasSeparator && 'pb-4',
                                    )}
                                >
                                    <Skeleton className="size-12 shrink-0 rounded-lg" />

                                    <div className="w-full min-w-0 space-y-2">
                                        <Skeleton className="h-4 w-1/3 max-w-full min-w-[120px]" />
                                        <Skeleton className="h-4 w-full max-w-[300px]" />
                                    </div>
                                </div>

                                {hasSeparator && <Separator className="mb-4" />}
                            </li>
                        );
                    })}
                </ul>
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
        <ul className={cn('flex w-full flex-col', className)}>
            {items.map((item, index) => {
                const hasSeparator = divided && index < items.length - 1;

                return (
                    <li key={keyExtractor(item, index)} className="flex w-full min-w-0 flex-col">
                        <div className={cn('w-full min-w-0', hasSeparator && 'pb-4')}>
                            {renderItem(item, index)}
                        </div>

                        {hasSeparator && <Separator className="mb-4" />}
                    </li>
                );
            })}
        </ul>
    );
}
