import {
    FETCH_ALL_PARAMS,
    nameSortField,
    SORT_DIRECTION,
    SORT_FIELD,
    type SortParams,
} from './query.ts';

export const DELIVERY_AREA_NAME_MAX_LENGTH = 150;

export const DELIVERY_AREA_SORT_FIELD = {
    ID: 'id',
    CREATED_AT: SORT_FIELD.CREATED_AT,
    NAME_AR: SORT_FIELD.NAME_AR,
    NAME_EN: SORT_FIELD.NAME_EN,
    DELIVERY_FEE: 'delivery_fee',
} as const;

export type DeliveryAreaSortField =
    (typeof DELIVERY_AREA_SORT_FIELD)[keyof typeof DELIVERY_AREA_SORT_FIELD];

export const DELIVERY_AREA_SORT_FIELDS = [
    DELIVERY_AREA_SORT_FIELD.ID,
    DELIVERY_AREA_SORT_FIELD.CREATED_AT,
    DELIVERY_AREA_SORT_FIELD.NAME_AR,
    DELIVERY_AREA_SORT_FIELD.NAME_EN,
    DELIVERY_AREA_SORT_FIELD.DELIVERY_FEE,
] as const satisfies readonly DeliveryAreaSortField[];

export const DELIVERY_AREA_SORTED_LOOKUP_PARAMS = {
    ...FETCH_ALL_PARAMS,
    sort_by: DELIVERY_AREA_SORT_FIELD.NAME_EN,
    order: SORT_DIRECTION.ASC,
} as const;

export const DELIVERY_AREA_FORM_DEFAULTS = {
    name_ar: '',
    name_en: '',
    delivery_fee: 0,
    is_active: true,
} as const;

export const DELIVERY_AREA_SORT = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
    FEE_ASC: 'fee_asc',
    FEE_DESC: 'fee_desc',
} as const;

export type DeliveryAreaSort = (typeof DELIVERY_AREA_SORT)[keyof typeof DELIVERY_AREA_SORT];

export const DELIVERY_AREA_SORT_OPTIONS = [
    { value: DELIVERY_AREA_SORT.NEWEST, labelKey: 'common.newestFirst' },
    { value: DELIVERY_AREA_SORT.OLDEST, labelKey: 'common.oldestFirst' },
    { value: DELIVERY_AREA_SORT.NAME_ASC, labelKey: 'common.nameAsc' },
    { value: DELIVERY_AREA_SORT.NAME_DESC, labelKey: 'common.nameDesc' },
    { value: DELIVERY_AREA_SORT.FEE_ASC, labelKey: 'common.feeAsc' },
    { value: DELIVERY_AREA_SORT.FEE_DESC, labelKey: 'common.feeDesc' },
] as const satisfies readonly { value: DeliveryAreaSort; labelKey: string }[];

export const DELIVERY_AREA_DEFAULT_SORT: DeliveryAreaSort = DELIVERY_AREA_SORT.NEWEST;

export function deliveryAreaSortParams(
    isArabic: boolean,
): Record<DeliveryAreaSort, SortParams<DeliveryAreaSortField>> {
    const nameField = nameSortField(isArabic);

    return {
        [DELIVERY_AREA_SORT.NEWEST]: {
            sort_by: DELIVERY_AREA_SORT_FIELD.CREATED_AT,
            order: SORT_DIRECTION.DESC,
        },
        [DELIVERY_AREA_SORT.OLDEST]: {
            sort_by: DELIVERY_AREA_SORT_FIELD.CREATED_AT,
            order: SORT_DIRECTION.ASC,
        },
        [DELIVERY_AREA_SORT.NAME_ASC]: {
            sort_by: nameField,
            order: SORT_DIRECTION.ASC,
        },
        [DELIVERY_AREA_SORT.NAME_DESC]: {
            sort_by: nameField,
            order: SORT_DIRECTION.DESC,
        },
        [DELIVERY_AREA_SORT.FEE_ASC]: {
            sort_by: DELIVERY_AREA_SORT_FIELD.DELIVERY_FEE,
            order: SORT_DIRECTION.ASC,
        },
        [DELIVERY_AREA_SORT.FEE_DESC]: {
            sort_by: DELIVERY_AREA_SORT_FIELD.DELIVERY_FEE,
            order: SORT_DIRECTION.DESC,
        },
    };
}
