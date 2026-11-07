import { nameSortField, SORT_DIRECTION, SORT_FIELD, type SortParams } from './query.ts';

export const BRAND_NAME_MAX_LENGTH = 100;

export const BRAND_SORT_FIELD = {
    ID: 'id',
    CREATED_AT: SORT_FIELD.CREATED_AT,
    NAME_AR: SORT_FIELD.NAME_AR,
    NAME_EN: SORT_FIELD.NAME_EN,
} as const;

export type BrandSortField = (typeof BRAND_SORT_FIELD)[keyof typeof BRAND_SORT_FIELD];

export const BRAND_SORT_FIELDS = [
    BRAND_SORT_FIELD.ID,
    BRAND_SORT_FIELD.CREATED_AT,
    BRAND_SORT_FIELD.NAME_AR,
    BRAND_SORT_FIELD.NAME_EN,
] as const satisfies readonly BrandSortField[];

export const BRAND_SORT = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
} as const;

export type BrandSort = (typeof BRAND_SORT)[keyof typeof BRAND_SORT];

export const BRAND_SORT_OPTIONS = [
    { value: BRAND_SORT.NEWEST, labelKey: 'common.newestFirst' },
    { value: BRAND_SORT.OLDEST, labelKey: 'common.oldestFirst' },
    { value: BRAND_SORT.NAME_ASC, labelKey: 'common.nameAsc' },
    { value: BRAND_SORT.NAME_DESC, labelKey: 'common.nameDesc' },
] as const satisfies readonly { value: BrandSort; labelKey: string }[];

export const BRAND_DEFAULT_SORT: BrandSort = BRAND_SORT.NEWEST;

export function brandSortParams(isArabic: boolean): Record<BrandSort, SortParams<BrandSortField>> {
    const nameField = nameSortField(isArabic);

    return {
        [BRAND_SORT.NEWEST]: {
            sort_by: BRAND_SORT_FIELD.CREATED_AT,
            order: SORT_DIRECTION.DESC,
        },
        [BRAND_SORT.OLDEST]: {
            sort_by: BRAND_SORT_FIELD.CREATED_AT,
            order: SORT_DIRECTION.ASC,
        },
        [BRAND_SORT.NAME_ASC]: {
            sort_by: nameField,
            order: SORT_DIRECTION.ASC,
        },
        [BRAND_SORT.NAME_DESC]: {
            sort_by: nameField,
            order: SORT_DIRECTION.DESC,
        },
    };
}
