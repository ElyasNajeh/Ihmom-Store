import { z } from 'zod';

import {
    SLIDER_FORM_DEFAULTS,
    SLIDER_TITLE_MAX_LENGTH,
} from '@/features/catalog/constants/sliders.ts';
import {
    atLeastOneField,
    bilingualTextShape,
    partialBilingualTextShape,
} from '@/shared/schemas/shared.ts';

const displayOrderField = z.number().int({ error: 'Display order must be an integer' });

export const createSliderSchema = z
    .object({
        ...bilingualTextShape('title_ar', 'title_en', 'title', SLIDER_TITLE_MAX_LENGTH),
        display_order: displayOrderField.default(SLIDER_FORM_DEFAULTS.display_order),
        is_active: z.boolean().default(true),
    })
    .strict();

export const updateSliderSchema = atLeastOneField({
    ...partialBilingualTextShape('title_ar', 'title_en', 'title', SLIDER_TITLE_MAX_LENGTH),
    display_order: displayOrderField.optional(),
    is_active: z.boolean().optional(),
});
