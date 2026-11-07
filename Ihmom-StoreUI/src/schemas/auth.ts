import { z } from 'zod';

export const loginAdminSchema = z
    .object({
        username: z
            .string()
            .trim()
            .min(1, { error: 'Username is required' })
            .max(100, { error: 'Username must be at most 100 characters' }),
        password: z.string().min(1, { error: 'Password is required' }),
    })
    .strict();
