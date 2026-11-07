import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils.ts';
import type { BaseCollectionProps } from '@/shared/components/data/types.ts';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';

export interface ColumnDef<T> {
    /** Unique identifier for the column. */
    id: string;

    /** The header label or component. */
    header: ReactNode;

    /** Render function for the cell content. */
    cell: (item: T, index: number) => ReactNode;

    /** Optional styling for the column headers and cells. */
    className?: string;
}

interface TableViewProps<T> extends BaseCollectionProps<T> {
    columns: ColumnDef<T>[];
    skeletonRowCount?: number;
}

export function TableView<T>({
    items,
    columns,
    keyExtractor,
    isLoading = false,
    isError = false,
    loadingState,
    errorState,
    emptyState,
    className,
    skeletonRowCount = 5,
}: TableViewProps<T>) {
    if (isLoading) {
        return (
            loadingState ?? (
                <div
                    className={cn(
                        'border-border w-full overflow-auto rounded-md border',
                        className,
                    )}
                    aria-busy="true"
                    aria-label="Loading table data"
                >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead key={column.id} className={column.className}>
                                        {column.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {columns.map((column) => (
                                        <TableCell key={column.id} className={column.className}>
                                            <Skeleton
                                                className="h-5 w-full max-w-[120px]"
                                                aria-hidden="true"
                                            />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
        <div className={cn('border-border w-full overflow-auto rounded-md border', className)}>
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column.id} className={column.className}>
                                {column.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {items.map((item, index) => (
                        <TableRow key={keyExtractor(item, index)}>
                            {columns.map((column) => (
                                <TableCell key={column.id} className={column.className}>
                                    {column.cell(item, index)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
