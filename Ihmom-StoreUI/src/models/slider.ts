import { z } from 'zod';

import { createSliderSchema, updateSliderSchema } from '@/schemas/sliders.ts';
import type { Query } from './query.ts';

export interface Slider {
    id: number;
    title_ar: string;
    title_en: string;
    display_order: number;
    is_active: boolean;
    image: string;
    created_at: string;
}

export type CreateSlider = z.infer<typeof createSliderSchema>;
export type UpdateSlider = z.infer<typeof updateSliderSchema>;

export type SliderSortBy = 'id' | 'created_at' | 'display_order' | 'title_ar' | 'title_en';

export interface FilterSlider {
    is_active?: boolean;
    display_order?: number;
}

export interface QuerySlider extends Query {
    filter?: FilterSlider;
    sort_by?: SliderSortBy;
}
