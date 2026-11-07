import { z } from 'zod';

import {
    ADMIN_EMAIL_MAX_LENGTH,
    ADMIN_PASSWORD_MAX_BYTES,
    ADMIN_PASSWORD_MIN_LENGTH,
    ADMIN_USERNAME_MAX_LENGTH,
    ADMIN_USERNAME_MIN_LENGTH,
} from '@/constants/admins.ts';

const adminDetailsSchema = z.object({
    username: z
        .string()
        .trim()
        .nonempty({ error: 'Username is required' })
        .min(ADMIN_USERNAME_MIN_LENGTH, {
            error: `Username must be at least ${ADMIN_USERNAME_MIN_LENGTH} characters`,
        })
        .max(ADMIN_USERNAME_MAX_LENGTH, {
            error: `Username must be at most ${ADMIN_USERNAME_MAX_LENGTH} characters`,
        }),
    email: z.email({ error: 'Invalid email address' }).max(ADMIN_EMAIL_MAX_LENGTH, {
        error: `Email must be at most ${ADMIN_EMAIL_MAX_LENGTH} characters`,
    }),
});

export const createAdminSchema = adminDetailsSchema
    .extend({
        password: z
            .string()
            .nonempty({ error: 'Password is required' })
            .min(ADMIN_PASSWORD_MIN_LENGTH, {
                error: `Password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`,
            })
            .refine((value) => value.trim().length !== 0, {
                error: 'Password cannot contain only spaces',
            })
            .refine((value) => new TextEncoder().encode(value).length <= ADMIN_PASSWORD_MAX_BYTES, {
                error: 'Password is too long',
            }),
    })
    .strict();
