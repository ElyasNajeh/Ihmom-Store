import type { ReactNode } from 'react';

import { Separator } from '@/components/ui/separator.tsx';
import { AdminActiveFilter } from '@/components/admin/active-filter.tsx';
import { AdminSearchInput } from '@/components/admin/admin-search-input.tsx';
import { AdminSortSelect, type AdminSortOption } from '@/components/admin/admin-sort-select.tsx';
import type { ActiveFilterValue } from '@/constants/query.ts';

interface AdminListToolbarProps<SortValue extends string> {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    sort: SortValue;
    onSortChange: (value: SortValue) => void;
    sortOptions: AdminSortOption<SortValue>[];
    status?: ActiveFilterValue;
    onStatusChange?: (value: ActiveFilterValue) => void;
    children?: ReactNode;
}

export function AdminListToolbar<SortValue extends string>({
    search,
    onSearchChange,
    searchPlaceholder,
    sort,
    onSortChange,
    sortOptions,
    status,
    onStatusChange,
    children,
}: AdminListToolbarProps<SortValue>) {
    return (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <AdminSearchInput
                value={search}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
            />

            <Separator orientation="vertical" className="hidden h-8 self-center lg:block" />

            <div className="flex flex-wrap items-center gap-2">
                {children}

                {status !== undefined && onStatusChange ? (
                    <AdminActiveFilter value={status} onChange={onStatusChange} />
                ) : null}

                <AdminSortSelect value={sort} onChange={onSortChange} options={sortOptions} />
            </div>
        </div>
    );
}
