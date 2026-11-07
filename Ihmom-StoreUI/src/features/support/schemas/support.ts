import { z } from 'zod';

import {
    SUPPORT_MESSAGE_MAX_LENGTH,
    SUPPORT_MESSAGE_MIN_LENGTH,
    SUPPORT_TOPICS,
} from '@/features/support/constants/support.ts';

export const supportTopicSchema = z.enum(SUPPORT_TOPICS);

/**
 * Client-side validation for the customer care contact form. The message is
 * prepared in the visitor's email application, so no server endpoint is implied.
 */
export const supportRequestSchema = z
    .object({
        topic: supportTopicSchema,
        name: z
            .string()
            .trim()
            .min(2, { error: 'Name must contain at least 2 characters' })
            .max(100, { error: 'Name must be at most 100 characters' }),
        email: z
            .string()
            .trim()
            .email({ error: 'Enter a valid email address' })
            .max(254, { error: 'Email must be at most 254 characters' }),
        phone: z
            .string()
            .trim()
            .max(20, { error: 'Phone must be at most 20 characters' })
            .refine((value) => value === '' || /^[+\d][\d\s()+.-]{5,19}$/.test(value), {
                error: 'Enter a valid phone number or leave it empty',
            }),
        orderNumber: z
            .string()
            .trim()
            .max(50, { error: 'Order number must be at most 50 characters' }),
        message: z
            .string()
            .trim()
            .min(SUPPORT_MESSAGE_MIN_LENGTH, { error: 'Message is too short' })
            .max(SUPPORT_MESSAGE_MAX_LENGTH, { error: 'Message is too long' }),
    })
    .strict();
