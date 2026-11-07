import { SORT_DIRECTION, SORT_FIELD, type SortParams } from '@/shared/constants/query.ts';

export const SLIDER_TITLE_MAX_LENGTH = 200;

export const SLIDER_SORT_FIELD = {
    ID: 'id',
    CREATED_AT: SORT_FIELD.CREATED_AT,
    DISPLAY_ORDER: 'display_order',
    TITLE_AR: 'title_ar',
    TITLE_EN: 'title_en',
} as const;

export type SliderSortField = (typeof SLIDER_SORT_FIELD)[keyof typeof SLIDER_SORT_FIELD];

export const SLIDER_SORT_FIELDS = [
    SLIDER_SORT_FIELD.ID,
    SLIDER_SORT_FIELD.CREATED_AT,
    SLIDER_SORT_FIELD.DISPLAY_ORDER,
    SLIDER_SORT_FIELD.TITLE_AR,
    SLIDER_SORT_FIELD.TITLE_EN,
] as const satisfies readonly SliderSortField[];

export const SLIDER_FORM_DEFAULTS = {
    title_ar: '',
    title_en: '',
    display_order: 0,
    is_active: true,
} as const;

export const SLIDER_SORT = {
    ORDER_ASC: 'order_asc',
    ORDER_DESC: 'order_desc',
    NEWEST: 'newest',
    OLDEST: 'oldest',
} as const;

export type SliderSort = (typeof SLIDER_SORT)[keyof typeof SLIDER_SORT];

export const SLIDER_SORT_OPTIONS = [
    { value: SLIDER_SORT.ORDER_ASC, labelKey: 'common.sortOrderAsc' },
    { value: SLIDER_SORT.ORDER_DESC, labelKey: 'common.sortOrderDesc' },
    { value: SLIDER_SORT.NEWEST, labelKey: 'common.newestFirst' },
    { value: SLIDER_SORT.OLDEST, labelKey: 'common.oldestFirst' },
] as const satisfies readonly { value: SliderSort; labelKey: string }[];

export const SLIDER_DEFAULT_SORT: SliderSort = SLIDER_SORT.ORDER_ASC;

export const SLIDER_SORT_PARAMS: Record<SliderSort, SortParams<SliderSortField>> = {
    [SLIDER_SORT.ORDER_ASC]: {
        sort_by: SLIDER_SORT_FIELD.DISPLAY_ORDER,
        order: SORT_DIRECTION.ASC,
    },
    [SLIDER_SORT.ORDER_DESC]: {
        sort_by: SLIDER_SORT_FIELD.DISPLAY_ORDER,
        order: SORT_DIRECTION.DESC,
    },
    [SLIDER_SORT.NEWEST]: {
        sort_by: SLIDER_SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.DESC,
    },
    [SLIDER_SORT.OLDEST]: {
        sort_by: SLIDER_SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.ASC,
    },
};

export const HERO_SLIDERS_PAGE_SIZE = 10;
