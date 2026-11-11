export const DEFAULT_PAGE = 1;

export const DEFAULT_PAGE_SIZE = 20;

export const SEARCH_DEBOUNCE_MS = 300;

export const FETCH_ALL_PAGE_SIZE = 100;

export const FETCH_ALL_PARAMS = {
    page: DEFAULT_PAGE,
    page_size: FETCH_ALL_PAGE_SIZE,
} as const;

export const PAGE_SIZE_OPTIONS = [20, 40, 60, 100] as const;

export const FILTER_ALL = 'all';

export const ACTIVE_FILTER = {
    ALL: FILTER_ALL,
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export type ActiveFilterValue = (typeof ACTIVE_FILTER)[keyof typeof ACTIVE_FILTER];

export const ACTIVE_FILTER_OPTIONS = [
    { value: ACTIVE_FILTER.ALL, labelKey: 'common.all' },
    { value: ACTIVE_FILTER.ACTIVE, labelKey: 'common.active' },
    { value: ACTIVE_FILTER.INACTIVE, labelKey: 'common.inactive' },
] as const satisfies readonly { value: ActiveFilterValue; labelKey: string }[];

export const SORT_FIELD = {
    CREATED_AT: 'created_at',
    NAME_AR: 'name_ar',
    NAME_EN: 'name_en',
} as const;

export type SortField = (typeof SORT_FIELD)[keyof typeof SORT_FIELD];

export const SORT_DIRECTION = {
    ASC: 'asc',
    DESC: 'desc',
} as const;

export type SortDirection = (typeof SORT_DIRECTION)[keyof typeof SORT_DIRECTION];

export interface SortParams<SortBy extends string = string> {
    sort_by: SortBy;
    order: SortDirection;
}

export function activeFilterParams(status: ActiveFilterValue): { is_active: boolean } | undefined {
    return status === ACTIVE_FILTER.ALL
        ? undefined
        : { is_active: status === ACTIVE_FILTER.ACTIVE };
}

export function resolveSortParams<
    SortValue extends string,
    const Mapping extends Record<SortValue, SortParams>,
>(sort: SortValue, mapping: Mapping): Mapping[SortValue] {
    return mapping[sort];
}

export function nameSortField(isArabic: boolean): SortField {
    return isArabic ? SORT_FIELD.NAME_AR : SORT_FIELD.NAME_EN;
}
