import { z } from 'zod';

import { CUSTOMER_NAME_MAX_LENGTH } from '@/constants/customers.ts';
import { atLeastOneField, palestinianPhoneSchema, requiredText } from '@/schemas/shared.ts';

export const createCustomerSchema = z
    .object({
        name: requiredText('Customer name', CUSTOMER_NAME_MAX_LENGTH),
        phone: palestinianPhoneSchema,
    })
    .strict();

export const updateCustomerSchema = atLeastOneField({
    name: requiredText('Customer name', CUSTOMER_NAME_MAX_LENGTH).optional(),
    phone: palestinianPhoneSchema.optional(),
});
