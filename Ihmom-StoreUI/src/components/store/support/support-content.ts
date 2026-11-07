export const SUPPORT_SECTIONS = [
    { id: 'customerCare', href: '/customer-care', labelKey: 'nav.customerCare' },
    { id: 'contact', href: '/contact', labelKey: 'nav.contact' },
    { id: 'delivery', href: '/delivery', labelKey: 'nav.delivery' },
    { id: 'returns', href: '/returns', labelKey: 'nav.returns' },
    { id: 'faq', href: '/faq', labelKey: 'nav.faq' },
] as const;

export const FAQ_CATEGORIES = ['orders', 'delivery', 'returns', 'products'] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export interface FaqEntry {
    id: string;
    category: FaqCategory;
}

export const FAQ_ENTRIES: FaqEntry[] = [
    { id: 'trackOrder', category: 'orders' },
    { id: 'cancelOrder', category: 'orders' },
    { id: 'changeOrder', category: 'orders' },
    { id: 'findOrderNumber', category: 'orders' },
    { id: 'deliveryAreas', category: 'delivery' },
    { id: 'deliveryTime', category: 'delivery' },
    { id: 'deliveryFee', category: 'delivery' },
    { id: 'missedDelivery', category: 'delivery' },
    { id: 'returnWindow', category: 'returns' },
    { id: 'startReturn', category: 'returns' },
    { id: 'refundTime', category: 'returns' },
    { id: 'damagedItem', category: 'returns' },
    { id: 'stock', category: 'products' },
    { id: 'authenticity', category: 'products' },
    { id: 'variants', category: 'products' },
    { id: 'warranty', category: 'products' },
];

export const TOP_FAQ_IDS = ['trackOrder', 'deliveryTime', 'returnWindow'] as const;
