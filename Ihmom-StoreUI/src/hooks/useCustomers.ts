import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/axios.ts';
import type { Customer, CreateCustomer, QueryCustomer, UpdateCustomer } from '@/models/customer.ts';
import { type PaginatedResponse, withDefaultQuery } from '@/models/query.ts';
import { CUSTOMERS } from '@/utils/query-keys.ts';
import { invalidateCustomerData } from '@/utils/query-invalidation.ts';

export function useCustomers(params: QueryCustomer = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [CUSTOMERS, queryParams],

        queryFn: async (): Promise<PaginatedResponse<Customer>> => {
            const response = await api.get<PaginatedResponse<Customer>>('/customers/', {
                params: queryParams,
            });

            return response.data;
        },
    });
}

export function useCreateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (customerData: CreateCustomer): Promise<Customer> => {
            const response = await api.post<Customer>('/customers/', customerData);

            return response.data;
        },

        onSuccess: () => {
            invalidateCustomerData(queryClient);
        },
    });
}

export function useUpdateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            customerId,
            customerData,
        }: {
            customerId: number;
            customerData: UpdateCustomer;
        }): Promise<Customer> => {
            const response = await api.patch<Customer>(`/customers/${customerId}`, customerData);

            return response.data;
        },

        onSuccess: () => {
            invalidateCustomerData(queryClient);
        },
    });
}

export function useDeleteCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (customerId: number): Promise<void> => {
            await api.delete(`/customers/${customerId}`);
        },

        onSuccess: () => {
            invalidateCustomerData(queryClient);
        },
    });
}
