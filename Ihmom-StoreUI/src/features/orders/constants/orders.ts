import { SORT_DIRECTION, type SortParams } from '@/shared/constants/query.ts';

export const ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUSES = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
] as const satisfies readonly OrderStatus[];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
};

export const ORDER_SORT_FIELD = {
    ID: 'id',
    CREATED_AT: 'created_at',
    TOTAL: 'total',
    CUSTOMER_NAME: 'customer_name',
    STATUS: 'status',
} as const;

export type OrderSortField = (typeof ORDER_SORT_FIELD)[keyof typeof ORDER_SORT_FIELD];

export const ORDER_SORT_FIELDS = [
    ORDER_SORT_FIELD.ID,
    ORDER_SORT_FIELD.CREATED_AT,
    ORDER_SORT_FIELD.TOTAL,
    ORDER_SORT_FIELD.CUSTOMER_NAME,
    ORDER_SORT_FIELD.STATUS,
] as const satisfies readonly OrderSortField[];

export const ORDER_SORT = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    TOTAL_DESC: 'total_desc',
    TOTAL_ASC: 'total_asc',
    CUSTOMER_ASC: 'customer_asc',
    STATUS_ASC: 'status_asc',
} as const;

export type OrderSortValue = (typeof ORDER_SORT)[keyof typeof ORDER_SORT];

export const ORDER_SORT_OPTIONS = [
    { value: ORDER_SORT.NEWEST, labelKey: 'common.newestFirst' },
    { value: ORDER_SORT.OLDEST, labelKey: 'common.oldestFirst' },
    { value: ORDER_SORT.TOTAL_DESC, labelKey: 'common.totalDesc' },
    { value: ORDER_SORT.TOTAL_ASC, labelKey: 'common.totalAsc' },
    { value: ORDER_SORT.CUSTOMER_ASC, labelKey: 'common.nameAsc' },
    { value: ORDER_SORT.STATUS_ASC, labelKey: 'orders.status' },
] as const satisfies readonly { value: OrderSortValue; labelKey: string }[];

export const ORDER_DEFAULT_SORT: OrderSortValue = ORDER_SORT.NEWEST;

export const ORDER_SORT_PARAMS: Record<OrderSortValue, SortParams<OrderSortField>> = {
    [ORDER_SORT.NEWEST]: { sort_by: ORDER_SORT_FIELD.CREATED_AT, order: SORT_DIRECTION.DESC },
    [ORDER_SORT.OLDEST]: { sort_by: ORDER_SORT_FIELD.CREATED_AT, order: SORT_DIRECTION.ASC },
    [ORDER_SORT.TOTAL_DESC]: { sort_by: ORDER_SORT_FIELD.TOTAL, order: SORT_DIRECTION.DESC },
    [ORDER_SORT.TOTAL_ASC]: { sort_by: ORDER_SORT_FIELD.TOTAL, order: SORT_DIRECTION.ASC },
    [ORDER_SORT.CUSTOMER_ASC]: {
        sort_by: ORDER_SORT_FIELD.CUSTOMER_NAME,
        order: SORT_DIRECTION.ASC,
    },
    [ORDER_SORT.STATUS_ASC]: { sort_by: ORDER_SORT_FIELD.STATUS, order: SORT_DIRECTION.ASC },
};

export const CHECKOUT_FORM_DEFAULTS = {
    customer_name: '',
    customer_phone: '',
    delivery_area_id: '',
    address: '',
    notes: '',
} as const;

export const ORDER_LOOKUP_FORM_DEFAULTS = {
    phone: '',
    order_number: '',
} as const;

export const INVOICE_FILENAME_PREFIX = 'ihmom-store-invoice';

export const ORDER_INVOICE_LANGUAGE_PARAM = 'lang';

export const ORDER_NUMBER_MAX_LENGTH = 50;
export const ORDER_CUSTOMER_NAME_MAX_LENGTH = 150;
