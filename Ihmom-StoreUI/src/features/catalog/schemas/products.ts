import { z } from 'zod';

import {
    DEFAULT_VARIANT_NAME,
    PRODUCT_NAME_MAX_LENGTH,
    PRODUCT_PRICE_MAX,
    PRODUCT_SKU_MAX_LENGTH,
    PRODUCT_STOREFRONT_SORT,
    PRODUCT_VARIANT_NAME_MAX_LENGTH,
} from '@/features/catalog/constants/products.ts';
import { SORT_DIRECTION } from '@/shared/constants/query.ts';

export const productSortSchema = z.enum(PRODUCT_STOREFRONT_SORT);
export const productAdminSortSchema = z.enum(['id', 'created_at', 'name_ar', 'name_en', 'price']);
export const sortOrderSchema = z.enum(SORT_DIRECTION);

const priceSchema = z
    .number()
    .min(0, { error: 'Price cannot be negative' })
    .multipleOf(0.01, { error: 'Price can have at most 2 decimal places' })
    .refine((value) => value < PRODUCT_PRICE_MAX, { error: 'Price must have at most 10 digits' });

const skuSchema = z
    .string()
    .trim()
    .max(PRODUCT_SKU_MAX_LENGTH, {
        error: `SKU must be at most ${PRODUCT_SKU_MAX_LENGTH} characters`,
    })
    .transform((value) => value || null)
    .nullable()
    .optional();

const productVariantDetailsSchema = z
    .object({
        name_ar: z
            .string()
            .trim()
            .min(1, { error: 'Arabic variant name is required' })
            .max(PRODUCT_VARIANT_NAME_MAX_LENGTH, {
                error: `Arabic variant name must be at most ${PRODUCT_VARIANT_NAME_MAX_LENGTH} characters`,
            }),
        name_en: z
            .string()
            .trim()
            .min(1, { error: 'English variant name is required' })
            .max(PRODUCT_VARIANT_NAME_MAX_LENGTH, {
                error: `English variant name must be at most ${PRODUCT_VARIANT_NAME_MAX_LENGTH} characters`,
            }),
        sku: skuSchema,
        price: priceSchema,
        is_active: z.boolean().default(true),
    })
    .strict()
    .refine(
        (data) => !(data.name_ar === DEFAULT_VARIANT_NAME && data.name_en === DEFAULT_VARIANT_NAME),
        {
            message: 'The internal default variant name is reserved',
        },
    );

export const createProductVariantSchema = productVariantDetailsSchema;

export const updateProductVariantSchema = z
    .object({
        name_ar: z
            .string()
            .trim()
            .min(1, { error: 'Arabic variant name is required' })
            .max(PRODUCT_VARIANT_NAME_MAX_LENGTH, {
                error: `Arabic variant name must be at most ${PRODUCT_VARIANT_NAME_MAX_LENGTH} characters`,
            })
            .optional(),
        name_en: z
            .string()
            .trim()
            .min(1, { error: 'English variant name is required' })
            .max(PRODUCT_VARIANT_NAME_MAX_LENGTH, {
                error: `English variant name must be at most ${PRODUCT_VARIANT_NAME_MAX_LENGTH} characters`,
            })
            .optional(),
        sku: skuSchema,
        price: priceSchema.optional(),
        is_active: z.boolean().optional(),
    })
    .strict();

const productDetailsSchema = z.object({
    category_id: z.number().int().min(1, { error: 'Category ID must be a positive integer' }),
    brand_id: z.number().int().min(1, { error: 'Brand ID must be a positive integer' }),
    name_ar: z
        .string()
        .trim()
        .min(1, { error: 'Arabic product name is required' })
        .max(PRODUCT_NAME_MAX_LENGTH, {
            error: `Arabic product name must be at most ${PRODUCT_NAME_MAX_LENGTH} characters`,
        }),
    name_en: z
        .string()
        .trim()
        .min(1, { error: 'English product name is required' })
        .max(PRODUCT_NAME_MAX_LENGTH, {
            error: `English product name must be at most ${PRODUCT_NAME_MAX_LENGTH} characters`,
        }),
    description_ar: z
        .string()
        .trim()
        .transform((value) => value || null)
        .nullable()
        .optional(),
    description_en: z
        .string()
        .trim()
        .transform((value) => value || null)
        .nullable()
        .optional(),
    is_active: z.boolean().default(true),
});

export const createProductSchema = productDetailsSchema
    .extend({
        price: priceSchema.nullable().optional(),
        sku: skuSchema,
        variants: z.array(createProductVariantSchema).nullable().optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
        if (data.variants == null) {
            if (data.price == null) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['price'],
                    message: 'A price is required for a simple product',
                });
            }
            return;
        }

        if (data.variants.length === 0) {
            ctx.addIssue({
                code: 'custom',
                path: ['variants'],
                message: 'A product must have at least one variant',
            });
        }

        if (data.price != null || data.sku != null) {
            ctx.addIssue({
                code: 'custom',
                path: ['variants'],
                message: 'Use either a simple-product price or selectable variants, not both',
            });
        }

        if (data.is_active && !data.variants.some((variant) => variant.is_active)) {
            ctx.addIssue({
                code: 'custom',
                path: ['variants'],
                message: 'An active product requires an active variant',
            });
        }
    });

export const updateProductSchema = z
    .object({
        category_id: z
            .number()
            .int()
            .min(1, { error: 'Category ID must be a positive integer' })
            .optional(),
        brand_id: z
            .number()
            .int()
            .min(1, { error: 'Brand ID must be a positive integer' })
            .optional(),
        name_ar: z
            .string()
            .trim()
            .min(1, { error: 'Arabic product name is required' })
            .max(PRODUCT_NAME_MAX_LENGTH, {
                error: `Arabic product name must be at most ${PRODUCT_NAME_MAX_LENGTH} characters`,
            })
            .optional(),
        name_en: z
            .string()
            .trim()
            .min(1, { error: 'English product name is required' })
            .max(PRODUCT_NAME_MAX_LENGTH, {
                error: `English product name must be at most ${PRODUCT_NAME_MAX_LENGTH} characters`,
            })
            .optional(),
        description_ar: z
            .string()
            .trim()
            .transform((value) => value || null)
            .nullable()
            .optional(),
        description_en: z
            .string()
            .trim()
            .transform((value) => value || null)
            .nullable()
            .optional(),
        is_active: z.boolean().optional(),
    })
    .strict();
