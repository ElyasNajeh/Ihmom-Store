import { z } from 'zod';

import { createDeliveryAreaSchema, updateDeliveryAreaSchema } from '@/schemas/delivery-areas.ts';
import type { Query } from './query.ts';

export interface DeliveryArea {
    id: number;
    name_ar: string;
    name_en: string;
    delivery_fee: string;
    is_active: boolean;
    created_at: string;
}

export interface PublicDeliveryArea {
    id: number;
    name_ar: string;
    name_en: string;
    delivery_fee: string;
}

export type CreateDeliveryArea = z.infer<typeof createDeliveryAreaSchema>;
export type UpdateDeliveryArea = z.infer<typeof updateDeliveryAreaSchema>;

export interface FilterDeliveryArea {
    is_active?: boolean;
    min_delivery_fee?: number;
    max_delivery_fee?: number;
}

export type DeliveryAreaSortBy = 'id' | 'created_at' | 'name_ar' | 'name_en' | 'delivery_fee';

export interface QueryDeliveryArea extends Query {
    filter?: FilterDeliveryArea;
    sort_by?: DeliveryAreaSortBy;
}
