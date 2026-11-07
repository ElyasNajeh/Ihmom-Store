import { SORT_DIRECTION, SORT_FIELD, type SortParams } from './query.ts';

export const CUSTOMER_NAME_MAX_LENGTH = 150;

export const CUSTOMER_SORT_FIELD = {
    ID: 'id',
    CREATED_AT: SORT_FIELD.CREATED_AT,
    NAME: 'name',
} as const;

export type CustomerSortField = (typeof CUSTOMER_SORT_FIELD)[keyof typeof CUSTOMER_SORT_FIELD];

export const CUSTOMER_SORT_FIELDS = [
    CUSTOMER_SORT_FIELD.ID,
    CUSTOMER_SORT_FIELD.CREATED_AT,
    CUSTOMER_SORT_FIELD.NAME,
] as const satisfies readonly CustomerSortField[];

export const CUSTOMER_FORM_DEFAULTS = {
    name: '',
    phone: '',
} as const;

export const CUSTOMER_SORT = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
} as const;

export type CustomerSort = (typeof CUSTOMER_SORT)[keyof typeof CUSTOMER_SORT];

export const CUSTOMER_SORT_OPTIONS = [
    { value: CUSTOMER_SORT.NEWEST, labelKey: 'common.newestFirst' },
    { value: CUSTOMER_SORT.OLDEST, labelKey: 'common.oldestFirst' },
    { value: CUSTOMER_SORT.NAME_ASC, labelKey: 'common.nameAsc' },
    { value: CUSTOMER_SORT.NAME_DESC, labelKey: 'common.nameDesc' },
] as const satisfies readonly { value: CustomerSort; labelKey: string }[];

export const CUSTOMER_DEFAULT_SORT: CustomerSort = CUSTOMER_SORT.NEWEST;

export const CUSTOMER_SORT_PARAMS: Record<CustomerSort, SortParams<CustomerSortField>> = {
    [CUSTOMER_SORT.NEWEST]: {
        sort_by: CUSTOMER_SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.DESC,
    },
    [CUSTOMER_SORT.OLDEST]: {
        sort_by: CUSTOMER_SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.ASC,
    },
    [CUSTOMER_SORT.NAME_ASC]: {
        sort_by: CUSTOMER_SORT_FIELD.NAME,
        order: SORT_DIRECTION.ASC,
    },
    [CUSTOMER_SORT.NAME_DESC]: {
        sort_by: CUSTOMER_SORT_FIELD.NAME,
        order: SORT_DIRECTION.DESC,
    },
};
