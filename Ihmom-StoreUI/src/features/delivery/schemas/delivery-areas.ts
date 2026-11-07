import { z } from 'zod';

import { DELIVERY_AREA_NAME_MAX_LENGTH } from '@/features/delivery/constants/delivery-areas.ts';
import {
    atLeastOneField,
    bilingualTextShape,
    moneyField,
    partialBilingualTextShape,
} from '@/shared/schemas/shared.ts';

export const createDeliveryAreaSchema = z
    .object({
        ...bilingualTextShape('name_ar', 'name_en', 'name', DELIVERY_AREA_NAME_MAX_LENGTH),
        delivery_fee: moneyField('Delivery fee'),
    })
    .extend({
        is_active: z.boolean().default(true),
    })
    .strict();

export const updateDeliveryAreaSchema = atLeastOneField({
    ...partialBilingualTextShape('name_ar', 'name_en', 'name', DELIVERY_AREA_NAME_MAX_LENGTH),
    delivery_fee: moneyField('Delivery fee').optional(),
    is_active: z.boolean().optional(),
});
