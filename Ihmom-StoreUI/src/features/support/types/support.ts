import { z } from 'zod';

import { supportRequestSchema, supportTopicSchema } from '@/features/support/schemas/support.ts';

export type SupportTopic = z.infer<typeof supportTopicSchema>;
export type SupportRequest = z.infer<typeof supportRequestSchema>;
