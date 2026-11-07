import { z } from 'zod';

import { createCustomerSchema, updateCustomerSchema } from '@/schemas/customers.ts';
import type { Query } from './query.ts';

export interface Customer {
    id: number;
    name: string;
    phone: string;
    created_at: string;
}

export type CreateCustomer = z.infer<typeof createCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;

export type CustomerSortBy = 'id' | 'created_at' | 'name';

export interface QueryCustomer extends Query {
    sort_by?: CustomerSortBy;
}
