import { z } from 'zod';

import { createAdminSchema } from '@/features/admins/schemas/admins.ts';
import type { Query } from '@/shared/types/query.ts';

export interface Admin {
    id: number;
    username: string;
    email: string;
    created_at: string;
}

export type CreateAdmin = z.infer<typeof createAdminSchema>;

export type AdminSortBy = 'username' | 'created_at_utc' | 'id';

export type FilterAdmin = Record<string, never>;

export interface QueryAdmin extends Query {
    filter?: FilterAdmin;
    sort_by?: AdminSortBy;
}
