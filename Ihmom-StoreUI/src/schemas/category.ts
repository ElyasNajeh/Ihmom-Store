import { z } from 'zod';

import { TAXONOMY_NAME_MAX_LENGTH } from '@/constants/taxonomy.ts';
import {
    atLeastOneField,
    bilingualTextShape,
    partialBilingualTextShape,
} from '@/schemas/shared.ts';

export const createCategorySchema = z
    .object(bilingualTextShape('name_ar', 'name_en', 'name', TAXONOMY_NAME_MAX_LENGTH))
    .extend({
        is_active: z.boolean().default(true),
    })
    .strict();

export const updateCategorySchema = atLeastOneField({
    ...partialBilingualTextShape('name_ar', 'name_en', 'name', TAXONOMY_NAME_MAX_LENGTH),
    is_active: z.boolean().optional(),
});
