import { z } from 'zod';

/** Client-side validation for the public contact form. No backend endpoint is implied. */
export const contactFormSchema = z
    .object({
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
        message: z
            .string()
            .trim()
            .min(10, { error: 'Message must contain at least 10 characters' })
            .max(3000, { error: 'Message must be at most 3000 characters' }),
    })
    .strict();
