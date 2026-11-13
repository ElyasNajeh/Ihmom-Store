import { z } from 'zod';

import {
    createProductSchema,
    updateProductSchema,
    createProductVariantSchema,
    updateProductVariantSchema,
    productSortSchema,
    productAdminSortSchema,
    sortOrderSchema,
} from '@/features/catalog/schemas/products.ts';
import type { Query } from '@/shared/types/query.ts';

export interface CategorySummary {
    id: number;
    name_ar: string;
    name_en: string;
}

export interface BrandSummary {
    id: number;
    name_ar: string;
    name_en: string;
}

export interface ProductVariant {
    id: number;
    product_id: number;
    name_ar: string;
    name_en: string;
    sku: string | null;
    price: string;
    is_active: boolean;
    created_at: string;
}

export interface PublicProductVariant {
    id: number;
    name_ar: string | null;
    name_en: string | null;
    price: string;
}

export interface ProductImage {
    id: number;
    product_id: number;
    image: string;
    is_primary: boolean;
    created_at: string;
}

export interface PublicProductImage {
    id: number;
    image: string;
    is_primary: boolean;
}

export interface Product {
    id: number;
    category_id: number;
    brand_id: number;
    name_ar: string;
    name_en: string;
    description_ar: string | null;
    description_en: string | null;
    is_active: boolean;
    created_at: string;
    category: CategorySummary;
    brand: BrandSummary;
    variants: ProductVariant[];
    images: ProductImage[];
}

export interface PublicProduct {
    id: number;
    category_id: number;
    brand_id: number;
    name_ar: string;
    name_en: string;
    description_ar: string | null;
    description_en: string | null;
    starting_price: string;
    has_selectable_variants: boolean;
    category: CategorySummary;
    brand: BrandSummary;
    variants: PublicProductVariant[];
    images: PublicProductImage[];
}

export type ProductSort = z.infer<typeof productSortSchema>;
export type ProductAdminSort = z.infer<typeof productAdminSortSchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;

export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type CreateProductVariant = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariant = z.infer<typeof updateProductVariantSchema>;

export type ProductSortBy = 'id' | 'created_at' | 'name_ar' | 'name_en' | 'price';

export interface FilterProduct {
    category_id?: number;
    brand_id?: number;
    is_active?: boolean;
    min_price?: number | string;
    max_price?: number | string;
}

export interface PublicRandomizationOptions {
    randomize?: boolean;
    /** Exactly 32 hexadecimal characters; validated before public requests. */
    random_seed?: string;
}

export interface QueryProduct extends Query, PublicRandomizationOptions {
    filter?: FilterProduct;
    sort_by?: ProductSortBy;
    ids?: number[];
}

export interface QueryAdminProduct extends Query {
    filter?: FilterProduct;
    sort_by?: ProductSortBy;
}
