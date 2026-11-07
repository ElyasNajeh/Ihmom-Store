import { nameSortField, SORT_DIRECTION, SORT_FIELD, type SortParams } from './query.ts';

export const CATEGORY_NAME_MAX_LENGTH = 100;

export const CATEGORY_SHOWCASE_LIMIT = 3;

export const CATEGORY_SORT_FIELD = {
    ID: 'id',
    CREATED_AT: SORT_FIELD.CREATED_AT,
    NAME_AR: SORT_FIELD.NAME_AR,
    NAME_EN: SORT_FIELD.NAME_EN,
} as const;

export type CategorySortField = (typeof CATEGORY_SORT_FIELD)[keyof typeof CATEGORY_SORT_FIELD];

export const CATEGORY_SORT_FIELDS = [
    CATEGORY_SORT_FIELD.ID,
    CATEGORY_SORT_FIELD.CREATED_AT,
    CATEGORY_SORT_FIELD.NAME_AR,
    CATEGORY_SORT_FIELD.NAME_EN,
] as const satisfies readonly CategorySortField[];

export const CATEGORY_SORT = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
} as const;

export type CategorySort = (typeof CATEGORY_SORT)[keyof typeof CATEGORY_SORT];

export const CATEGORY_SORT_OPTIONS = [
    { value: CATEGORY_SORT.NEWEST, labelKey: 'common.newestFirst' },
    { value: CATEGORY_SORT.OLDEST, labelKey: 'common.oldestFirst' },
    { value: CATEGORY_SORT.NAME_ASC, labelKey: 'common.nameAsc' },
    { value: CATEGORY_SORT.NAME_DESC, labelKey: 'common.nameDesc' },
] as const satisfies readonly { value: CategorySort; labelKey: string }[];

export const CATEGORY_DEFAULT_SORT: CategorySort = CATEGORY_SORT.NEWEST;

export function categorySortParams(
    isArabic: boolean,
): Record<CategorySort, SortParams<CategorySortField>> {
    const nameField = nameSortField(isArabic);

    return {
        [CATEGORY_SORT.NEWEST]: {
            sort_by: CATEGORY_SORT_FIELD.CREATED_AT,
            order: SORT_DIRECTION.DESC,
        },
        [CATEGORY_SORT.OLDEST]: {
            sort_by: CATEGORY_SORT_FIELD.CREATED_AT,
            order: SORT_DIRECTION.ASC,
        },
        [CATEGORY_SORT.NAME_ASC]: {
            sort_by: nameField,
            order: SORT_DIRECTION.ASC,
        },
        [CATEGORY_SORT.NAME_DESC]: {
            sort_by: nameField,
            order: SORT_DIRECTION.DESC,
        },
    };
}
