export const SUPPORT_TOPIC = {
    ORDER: 'order',
    DELIVERY: 'delivery',
    RETURNS: 'returns',
    PRODUCT: 'product',
    OTHER: 'other',
} as const;

export type SupportTopic = (typeof SUPPORT_TOPIC)[keyof typeof SUPPORT_TOPIC];

export const SUPPORT_TOPICS = [
    SUPPORT_TOPIC.ORDER,
    SUPPORT_TOPIC.DELIVERY,
    SUPPORT_TOPIC.RETURNS,
    SUPPORT_TOPIC.PRODUCT,
    SUPPORT_TOPIC.OTHER,
] as const satisfies readonly SupportTopic[];

export const SUPPORT_MESSAGE_MIN_LENGTH = 10;
export const SUPPORT_MESSAGE_MAX_LENGTH = 3000;

export const SUPPORT_FORM_DEFAULTS = {
    topic: SUPPORT_TOPIC.ORDER,
    name: '',
    email: '',
    phone: '',
    orderNumber: '',
    message: '',
} as const;

export const CONTACT_FORM_DEFAULTS = {
    name: '',
    email: '',
    message: '',
} as const;
