import { z } from 'zod';

import { MAX_INT32, MAX_MONEY_AMOUNT } from '@/constants/common.ts';
import {
    ORDER_CUSTOMER_NAME_MAX_LENGTH,
    ORDER_NUMBER_MAX_LENGTH,
    ORDER_SORT_FIELDS,
    ORDER_STATUS,
} from '@/constants/orders.ts';
import { SORT_DIRECTION } from '@/constants/query.ts';

export const orderStatusSchema = z.enum(ORDER_STATUS);
export const orderSortSchema = z.enum(ORDER_SORT_FIELDS);
export const sortOrderSchema = z.enum(SORT_DIRECTION);

const phoneSchema = z
    .string()
    .trim()
    .transform((value, ctx) => {
        if (value.length === 10 && value.startsWith('05') && /^\d+$/.test(value)) {
            return `+970${value.slice(1)}`;
        }

        if (value.length === 12 && /^(9705|9725)\d{8}$/.test(value)) {
            return `+${value}`;
        }

        if (value.length === 13 && /^\+(970|972)5\d{8}$/.test(value)) {
            return value;
        }

        ctx.issues.push({
            code: 'custom',
            message: 'Phone must use +970 or +972 followed by a 9-digit number beginning with 5',
            input: value,
        });

        return z.NEVER;
    });

const positiveIdSchema = z.number().int().min(1, { error: 'ID must be a positive integer' });
const quantitySchema = z
    .number()
    .int()
    .min(1, { error: 'Quantity must be at least 1' })
    .max(MAX_INT32, { error: 'Quantity exceeds the maximum allowed value' });
const priceSchema = z
    .number()
    .min(0, { error: 'Amount cannot be negative' })
    .multipleOf(0.01, { error: 'Amount can have at most 2 decimal places' })
    .refine((value) => value < MAX_MONEY_AMOUNT, { error: 'Amount must have at most 10 digits' });

export const checkoutItemSchema = z
    .object({
        product_variant_id: positiveIdSchema,
        quantity: quantitySchema,
    })
    .strict();

export const checkoutSchema = z
    .object({
        customer_name: z
            .string()
            .trim()
            .min(1, { error: 'Customer name is required' })
            .max(ORDER_CUSTOMER_NAME_MAX_LENGTH, {
                error: `Customer name must be at most ${ORDER_CUSTOMER_NAME_MAX_LENGTH} characters`,
            }),
        customer_phone: phoneSchema,
        delivery_area_id: positiveIdSchema,
        address: z.string().trim().min(1, { error: 'Address is required' }),
        notes: z
            .string()
            .trim()
            .transform((value) => value || null)
            .nullable()
            .optional(),
        items: z.array(checkoutItemSchema).min(1, { error: 'At least one item is required' }),
    })
    .strict()
    .superRefine((data, ctx) => {
        const variantIds = data.items.map((item) => item.product_variant_id);

        if (new Set(variantIds).size !== variantIds.length) {
            ctx.addIssue({
                code: 'custom',
                path: ['items'],
                message: 'Duplicate product variants are not allowed',
            });
        }
    });

export const orderHistorySchema = z
    .object({
        phone: phoneSchema,
        order_number: z
            .string()
            .trim()
            .transform((value) => value.replace(/^#\s*/, '').trim())
            .pipe(
                z
                    .string()
                    .min(1, { error: 'Order number is required' })
                    .max(ORDER_NUMBER_MAX_LENGTH, {
                        error: `Order number must be at most ${ORDER_NUMBER_MAX_LENGTH} characters`,
                    }),
            ),
    })
    .strict();

export const orderStatusUpdateSchema = z
    .object({
        status: orderStatusSchema,
    })
    .strict();

export const orderFiltersSchema = z
    .object({
        status: orderStatusSchema.optional(),
        delivery_area_id: positiveIdSchema.optional(),
        date_from: z.iso.date().optional(),
        date_to: z.iso.date().optional(),
        min_total: priceSchema.optional(),
        max_total: priceSchema.optional(),
    })
    .superRefine((data, ctx) => {
        if (data.date_from && data.date_to && data.date_from > data.date_to) {
            ctx.addIssue({
                code: 'custom',
                path: ['date_to'],
                message: 'End date must not be before start date',
            });
        }

        if (
            data.min_total !== undefined &&
            data.max_total !== undefined &&
            data.min_total > data.max_total
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['max_total'],
                message: 'Maximum total must not be less than minimum total',
            });
        }
    });
