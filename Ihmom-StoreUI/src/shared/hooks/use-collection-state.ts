import { useMemo, useState } from 'react';

import { useDebounce } from '@/shared/hooks/useDebounce.ts';
import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    FILTER_ALL,
    SEARCH_DEBOUNCE_MS,
} from '@/shared/constants/query.ts';
import type { ActiveFilterValue } from '@/shared/constants/query.ts';

export interface CollectionBaseParams {
    page: number;
    page_size: number;
    search?: string;
}

export function useCollectionState<SortValue extends string>(initialSort: SortValue) {
    const [search, setSearchValue] = useState('');
    const [status, setStatusValue] = useState<ActiveFilterValue>(FILTER_ALL);
    const [sort, setSortValue] = useState<SortValue>(initialSort);
    const [page, setPage] = useState(DEFAULT_PAGE);
    const [pageSize, setPageSizeValue] = useState(DEFAULT_PAGE_SIZE);

    const debouncedSearch = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS);

    const setSearch = (value: string) => {
        setSearchValue(value);
        setPage(DEFAULT_PAGE);
    };

    const setStatus = (value: ActiveFilterValue) => {
        setStatusValue(value);
        setPage(DEFAULT_PAGE);
    };

    const setSort = (value: SortValue) => {
        setSortValue(value);
        setPage(DEFAULT_PAGE);
    };

    const setPageSize = (value: number) => {
        setPageSizeValue(value);
        setPage(DEFAULT_PAGE);
    };

    const baseParams = useMemo<CollectionBaseParams>(
        () => ({
            page,
            page_size: pageSize,
            search: debouncedSearch || undefined,
        }),
        [debouncedSearch, page, pageSize],
    );

    return {
        search,
        debouncedSearch,
        status,
        sort,
        page,
        pageSize,
        baseParams,
        setPage,
        setSearch,
        setStatus,
        setSort,
        setPageSize,
    };
}
