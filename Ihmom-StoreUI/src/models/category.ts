import { z } from 'zod';

import { createCategorySchema, updateCategorySchema } from '@/schemas/category.ts';
import type { Query } from './query.ts';

export interface CategoryImage {
    id: number;
    category_id: number;
    image: string;
    is_primary: boolean;
    created_at: string;
}

export interface Category {
    id: number;
    name_ar: string;
    name_en: string;
    is_active: boolean;
    created_at: string;
    images: CategoryImage[];
}

export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;

export type CategorySortBy = 'id' | 'created_at' | 'name_ar' | 'name_en';

export interface FilterCategory {
    is_active?: boolean;
}

export interface QueryCategory extends Query {
    filter?: FilterCategory;
    sort_by?: CategorySortBy;
}
