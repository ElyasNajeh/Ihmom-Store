import type { ReactNode } from 'react';

import { TableView, type ColumnDef } from '@/components/data/views/table-view.tsx';
import { AdminEmptyState, AdminErrorState } from './admin-states.tsx';
import { cn } from '@/lib/utils.ts';

interface AdminTableProps<T> {
    items: T[];
    columns: ColumnDef<T>[];
    keyExtractor: (item: T, index: number) => string | number;
    isLoading?: boolean;
    isError?: boolean;
    onRetry?: () => void;
    toolbar?: ReactNode;
    footer?: ReactNode;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
    skeletonRowCount?: number;
    className?: string;
    tableMinWidthClass?: string;
}

export function AdminTable<T>({
    items,
    columns,
    keyExtractor,
    isLoading = false,
    isError = false,
    onRetry,
    toolbar,
    footer,
    emptyTitle,
    emptyDescription,
    emptyAction,
    skeletonRowCount = 6,
    className,
    tableMinWidthClass = '[&_table]:min-w-[720px]',
}: AdminTableProps<T>) {
    return (
        <div
            className={cn(
                'border-border bg-card overflow-hidden rounded-xl border shadow-xs',
                className,
            )}
        >
            {toolbar ? <div className="border-border border-b p-3 sm:p-4">{toolbar}</div> : null}

            <TableView
                items={items}
                columns={columns}
                keyExtractor={keyExtractor}
                isLoading={isLoading}
                isError={isError}
                skeletonRowCount={skeletonRowCount}
                errorState={<AdminErrorState onRetry={onRetry} className="border-0" />}
                emptyState={
                    <AdminEmptyState
                        title={emptyTitle}
                        description={emptyDescription}
                        action={emptyAction}
                        className="rounded-none border-0"
                    />
                }
                className={cn('rounded-none border-0', tableMinWidthClass)}
            />

            {footer ? <div className="border-border border-t p-3 sm:p-4">{footer}</div> : null}
        </div>
    );
}
