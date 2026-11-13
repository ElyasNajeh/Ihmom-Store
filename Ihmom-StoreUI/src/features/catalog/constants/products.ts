import { MAX_MONEY_AMOUNT } from '@/shared/constants/common.ts';
import {
    nameSortField,
    SORT_DIRECTION,
    SORT_FIELD,
    type SortParams,
} from '@/shared/constants/query.ts';

export const CATALOG_SEED_STORAGE_KEY = 'ihmom-catalog-seed-v1';

export const DEFAULT_VARIANT_NAME = '__default__';

export const PRODUCT_NAME_MAX_LENGTH = 200;
export const PRODUCT_VARIANT_NAME_MAX_LENGTH = 100;
export const PRODUCT_SKU_MAX_LENGTH = 100;
export const PRODUCT_PRICE_MAX = MAX_MONEY_AMOUNT;

export const PRODUCT_SORT_FIELD = {
    ID: 'id',
    CREATED_AT: SORT_FIELD.CREATED_AT,
    NAME_AR: SORT_FIELD.NAME_AR,
    NAME_EN: SORT_FIELD.NAME_EN,
    PRICE: 'price',
} as const;

export type ProductSortField = (typeof PRODUCT_SORT_FIELD)[keyof typeof PRODUCT_SORT_FIELD];

export const PRODUCT_SORT_FIELDS = [
    PRODUCT_SORT_FIELD.ID,
    PRODUCT_SORT_FIELD.CREATED_AT,
    PRODUCT_SORT_FIELD.NAME_AR,
    PRODUCT_SORT_FIELD.NAME_EN,
    PRODUCT_SORT_FIELD.PRICE,
] as const satisfies readonly ProductSortField[];

export const PRODUCT_FORM_DEFAULTS = {
    category_id: '',
    brand_id: '',
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    is_active: true,
} as const;

export const PRODUCT_VARIANT_FORM_DEFAULTS = {
    name_ar: '',
    name_en: '',
    sku: '',
    price: '',
    is_active: true,
} as const;

export const PRODUCT_SORT = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
    PRICE_ASC: 'price_asc',
    PRICE_DESC: 'price_desc',
} as const;

export type ProductSort = (typeof PRODUCT_SORT)[keyof typeof PRODUCT_SORT];

export const PRODUCT_SORT_OPTIONS = [
    { value: PRODUCT_SORT.NEWEST, labelKey: 'common.newestFirst' },
    { value: PRODUCT_SORT.OLDEST, labelKey: 'common.oldestFirst' },
    { value: PRODUCT_SORT.NAME_ASC, labelKey: 'common.nameAsc' },
    { value: PRODUCT_SORT.NAME_DESC, labelKey: 'common.nameDesc' },
    { value: PRODUCT_SORT.PRICE_ASC, labelKey: 'common.priceAsc' },
    { value: PRODUCT_SORT.PRICE_DESC, labelKey: 'common.priceDesc' },
] as const satisfies readonly { value: ProductSort; labelKey: string }[];

export const PRODUCT_DEFAULT_SORT: ProductSort = PRODUCT_SORT.NEWEST;

export function productSortParams(
    isArabic: boolean,
): Record<ProductSort, SortParams<ProductSortField>> {
    const nameField = nameSortField(isArabic);

    return {
        [PRODUCT_SORT.NEWEST]: {
            sort_by: PRODUCT_SORT_FIELD.CREATED_AT,
            order: SORT_DIRECTION.DESC,
        },
        [PRODUCT_SORT.OLDEST]: {
            sort_by: PRODUCT_SORT_FIELD.CREATED_AT,
            order: SORT_DIRECTION.ASC,
        },
        [PRODUCT_SORT.NAME_ASC]: {
            sort_by: nameField,
            order: SORT_DIRECTION.ASC,
        },
        [PRODUCT_SORT.NAME_DESC]: {
            sort_by: nameField,
            order: SORT_DIRECTION.DESC,
        },
        [PRODUCT_SORT.PRICE_ASC]: {
            sort_by: PRODUCT_SORT_FIELD.PRICE,
            order: SORT_DIRECTION.ASC,
        },
        [PRODUCT_SORT.PRICE_DESC]: {
            sort_by: PRODUCT_SORT_FIELD.PRICE,
            order: SORT_DIRECTION.DESC,
        },
    };
}

export const PRODUCT_STOREFRONT_SORT = {
    DISCOVER: 'discover',
    NEWEST: 'newest',
    OLDEST: 'oldest',
    NAME_AR: 'name_ar',
    NAME_EN: 'name_en',
    PRICE_ASC: 'price_asc',
    PRICE_DESC: 'price_desc',
} as const;

export type ProductStorefrontSort =
    (typeof PRODUCT_STOREFRONT_SORT)[keyof typeof PRODUCT_STOREFRONT_SORT];

export const PRODUCT_STOREFRONT_SORT_OPTIONS = [
    { value: PRODUCT_STOREFRONT_SORT.DISCOVER, labelKey: 'shop.sort.discover' },
    { value: PRODUCT_STOREFRONT_SORT.NEWEST, labelKey: 'shop.sort.newest' },
    { value: PRODUCT_STOREFRONT_SORT.OLDEST, labelKey: 'shop.sort.oldest' },
    { value: PRODUCT_STOREFRONT_SORT.NAME_AR, labelKey: 'shop.sort.nameAr' },
    { value: PRODUCT_STOREFRONT_SORT.NAME_EN, labelKey: 'shop.sort.nameEn' },
    { value: PRODUCT_STOREFRONT_SORT.PRICE_ASC, labelKey: 'shop.sort.priceAsc' },
    { value: PRODUCT_STOREFRONT_SORT.PRICE_DESC, labelKey: 'shop.sort.priceDesc' },
] as const satisfies readonly { value: ProductStorefrontSort; labelKey: string }[];

export const PRODUCT_STOREFRONT_DEFAULT_SORT: ProductStorefrontSort =
    PRODUCT_STOREFRONT_SORT.DISCOVER;

export const PRODUCT_STOREFRONT_SORT_PARAMS: Record<
    Exclude<ProductStorefrontSort, 'discover'>,
    SortParams<ProductSortField>
> = {
    [PRODUCT_STOREFRONT_SORT.NEWEST]: {
        sort_by: PRODUCT_SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.DESC,
    },
    [PRODUCT_STOREFRONT_SORT.OLDEST]: {
        sort_by: PRODUCT_SORT_FIELD.CREATED_AT,
        order: SORT_DIRECTION.ASC,
    },
    [PRODUCT_STOREFRONT_SORT.NAME_AR]: {
        sort_by: PRODUCT_SORT_FIELD.NAME_AR,
        order: SORT_DIRECTION.ASC,
    },
    [PRODUCT_STOREFRONT_SORT.NAME_EN]: {
        sort_by: PRODUCT_SORT_FIELD.NAME_EN,
        order: SORT_DIRECTION.ASC,
    },
    [PRODUCT_STOREFRONT_SORT.PRICE_ASC]: {
        sort_by: PRODUCT_SORT_FIELD.PRICE,
        order: SORT_DIRECTION.ASC,
    },
    [PRODUCT_STOREFRONT_SORT.PRICE_DESC]: {
        sort_by: PRODUCT_SORT_FIELD.PRICE,
        order: SORT_DIRECTION.DESC,
    },
};

export const FEATURED_PRODUCTS_PAGE_SIZE = 8;

export const PRODUCT_RECOMMENDATIONS_LIMIT = 4;
