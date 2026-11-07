import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, type SortDirection } from '@/constants/query.ts';

export type Filter = object;
export type DataResponses = object;

export type { SortDirection };

export interface Query {
    search?: string;
    filter?: Filter;
    sort_by?: string;
    order?: SortDirection;
    page?: number;
    page_size?: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface Links {
    self: string;
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
}

export const DEFAULT_QUERY: Query = {
    page: DEFAULT_PAGE,
    page_size: DEFAULT_PAGE_SIZE,
};

export function withDefaultQuery<T extends Query>(params: T = {} as T) {
    return {
        ...DEFAULT_QUERY,
        ...params,
    };
}
