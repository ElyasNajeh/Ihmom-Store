import type { ReactNode } from 'react';

import { TableView, type ColumnDef } from '@/shared/components/data/views/table-view.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { AdminEmptyState, AdminErrorState } from './admin-states.tsx';
import { cn } from '@/shared/lib/utils.ts';

export interface AdminColumnDef<T> extends ColumnDef<T> {
    /** Card placement only; desktop column rendering is unchanged. */
    mobileRole?: 'image' | 'primary' | 'actions';
}

interface AdminTableProps<T> {
    items: T[];
    columns: AdminColumnDef<T>[];
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
    const primary =
        columns.find((column) => column.mobileRole === 'primary') ??
        columns.find((column) => !column.mobileRole);
    const images = columns.filter((column) => column.mobileRole === 'image');
    const actions = columns.filter((column) => column.mobileRole === 'actions');
    const metadata = columns.filter(
        (column) =>
            column !== primary && column.mobileRole !== 'image' && column.mobileRole !== 'actions',
    );

    function field(column: AdminColumnDef<T>, item: T, index: number, prominent = false) {
        return (
            <div key={column.id} className="min-w-0 space-y-1">
                <dt className="text-muted-foreground text-xs font-normal">{column.header}</dt>
                <dd className={cn('min-w-0', prominent && 'text-base font-semibold')}>
                    {column.cell(item, index)}
                </dd>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'border-border bg-card overflow-hidden rounded-xl border shadow-xs max-md:[&_a]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11',
                className,
            )}
        >
            {toolbar ? <div className="border-border border-b p-3 sm:p-4">{toolbar}</div> : null}

            {!isLoading && isError ? (
                <AdminErrorState onRetry={onRetry} className="border-0" />
            ) : !isLoading && items.length === 0 ? (
                <AdminEmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    className="rounded-none border-0"
                />
            ) : (
                <>
                    <div className="md:hidden">
                        {isLoading ? (
                            <div
                                aria-busy="true"
                                aria-label="Loading table data"
                                className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4"
                            >
                                {Array.from({ length: skeletonRowCount }, (_, index) => (
                                    <div
                                        key={index}
                                        className="border-border space-y-4 rounded-lg border p-4"
                                        aria-hidden="true"
                                    >
                                        <div className="flex gap-3">
                                            {images.length > 0 ? (
                                                <Skeleton className="size-14 shrink-0" />
                                            ) : null}
                                            <Skeleton className="h-6 w-2/3" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {metadata.map((column) => (
                                                <Skeleton key={column.id} className="h-10 w-full" />
                                            ))}
                                        </div>
                                        {actions.length > 0 ? (
                                            <Skeleton className="h-11 w-full" />
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <ul
                                role="list"
                                className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4"
                            >
                                {items.map((item, index) => (
                                    <li key={keyExtractor(item, index)} className="min-w-0">
                                        <article className="border-border flex h-full min-w-0 flex-col rounded-lg border text-sm [overflow-wrap:anywhere] [&_*]:min-w-0 [&_.truncate]:max-w-full [&_.truncate]:overflow-visible [&_.truncate]:text-clip [&_.truncate]:whitespace-normal [&_.whitespace-nowrap]:whitespace-normal [&_[dir=ltr]]:[unicode-bidi:isolate]">
                                            <dl className="flex items-start gap-3 p-4">
                                                {images.map((column) => (
                                                    <div
                                                        key={column.id}
                                                        className="max-w-24 shrink-0"
                                                    >
                                                        <dt className="text-muted-foreground mb-1 text-xs">
                                                            {column.header}
                                                        </dt>
                                                        <dd>{column.cell(item, index)}</dd>
                                                    </div>
                                                ))}
                                                {primary ? field(primary, item, index, true) : null}
                                            </dl>
                                            {metadata.length > 0 ? (
                                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pb-4">
                                                    {metadata.map((column) =>
                                                        field(column, item, index),
                                                    )}
                                                </dl>
                                            ) : null}
                                            {actions.length > 0 ? (
                                                <footer className="border-border mt-auto border-t p-3 [&_.flex]:flex-wrap [&_a]:inline-flex [&_a]:min-w-11 [&_a]:items-center">
                                                    <dl className="space-y-3">
                                                        {actions.map((column) =>
                                                            field(column, item, index),
                                                        )}
                                                    </dl>
                                                </footer>
                                            ) : null}
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="hidden md:block">
                        <TableView
                            items={items}
                            columns={columns}
                            keyExtractor={keyExtractor}
                            isLoading={isLoading}
                            skeletonRowCount={skeletonRowCount}
                            className={cn('rounded-none border-0', tableMinWidthClass)}
                        />
                    </div>
                </>
            )}

            {footer ? <div className="border-border border-t p-3 sm:p-4">{footer}</div> : null}
        </div>
    );
}
