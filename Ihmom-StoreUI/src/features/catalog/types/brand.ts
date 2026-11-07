import { z } from 'zod';

import { createBrandSchema, updateBrandSchema } from '@/features/catalog/schemas/brands.ts';
import type { Query } from '@/shared/types/query.ts';

export interface Brand {
    id: number;
    name_ar: string;
    name_en: string;
    is_active: boolean;
    created_at: string;
}

export type CreateBrand = z.infer<typeof createBrandSchema>;

export type UpdateBrand = z.infer<typeof updateBrandSchema>;

export type BrandSortBy = 'id' | 'created_at' | 'name_ar' | 'name_en';

export interface FilterBrand {
    is_active?: boolean;
}

export interface QueryBrand extends Query {
    filter?: FilterBrand;
    sort_by?: BrandSortBy;
}
