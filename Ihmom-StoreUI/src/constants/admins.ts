import { SORT_DIRECTION, type SortParams } from './query.ts';

export const ADMIN_USERNAME_MIN_LENGTH = 3;
export const ADMIN_USERNAME_MAX_LENGTH = 100;
export const ADMIN_EMAIL_MAX_LENGTH = 255;
export const ADMIN_PASSWORD_MIN_LENGTH = 8;
export const ADMIN_PASSWORD_MAX_BYTES = 72;

export const ADMIN_FORM_DEFAULTS = {
    username: '',
    email: '',
    password: '',
} as const;

export const ADMIN_LOGIN_FORM_DEFAULTS = {
    username: '',
    password: '',
} as const;

export const ADMIN_SORT_FIELD = {
    ID: 'id',
    CREATED_AT_UTC: 'created_at_utc',
    USERNAME: 'username',
} as const;

export type AdminSortField = (typeof ADMIN_SORT_FIELD)[keyof typeof ADMIN_SORT_FIELD];

export const ADMIN_SORT_FIELDS = [
    ADMIN_SORT_FIELD.ID,
    ADMIN_SORT_FIELD.CREATED_AT_UTC,
    ADMIN_SORT_FIELD.USERNAME,
] as const satisfies readonly AdminSortField[];

export const ADMIN_SORT = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
} as const;

export type AdminSort = (typeof ADMIN_SORT)[keyof typeof ADMIN_SORT];

export const ADMIN_SORT_OPTIONS = [
    { value: ADMIN_SORT.NEWEST, labelKey: 'common.newestFirst' },
    { value: ADMIN_SORT.OLDEST, labelKey: 'common.oldestFirst' },
    { value: ADMIN_SORT.NAME_ASC, labelKey: 'common.nameAsc' },
    { value: ADMIN_SORT.NAME_DESC, labelKey: 'common.nameDesc' },
] as const satisfies readonly { value: AdminSort; labelKey: string }[];

export const ADMIN_DEFAULT_SORT: AdminSort = ADMIN_SORT.NEWEST;

export const ADMIN_SORT_PARAMS: Record<AdminSort, SortParams<AdminSortField>> = {
    [ADMIN_SORT.NEWEST]: {
        sort_by: ADMIN_SORT_FIELD.CREATED_AT_UTC,
        order: SORT_DIRECTION.DESC,
    },
    [ADMIN_SORT.OLDEST]: {
        sort_by: ADMIN_SORT_FIELD.CREATED_AT_UTC,
        order: SORT_DIRECTION.ASC,
    },
    [ADMIN_SORT.NAME_ASC]: {
        sort_by: ADMIN_SORT_FIELD.USERNAME,
        order: SORT_DIRECTION.ASC,
    },
    [ADMIN_SORT.NAME_DESC]: {
        sort_by: ADMIN_SORT_FIELD.USERNAME,
        order: SORT_DIRECTION.DESC,
    },
};
