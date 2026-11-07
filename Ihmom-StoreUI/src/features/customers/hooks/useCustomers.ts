import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createCustomer,
    deleteCustomer,
    fetchCustomers,
    updateCustomer,
} from '@/features/customers/api/customers-api.ts';
import type { QueryCustomer, UpdateCustomer } from '@/features/customers/types/customer.ts';
import { withDefaultQuery } from '@/shared/types/query.ts';
import { CUSTOMERS } from '@/shared/utils/query-keys.ts';
import { invalidateCustomerData } from '@/shared/utils/query-invalidation.ts';

export function useCustomers(params: QueryCustomer = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [CUSTOMERS, queryParams],
        queryFn: () => fetchCustomers(queryParams),
    });
}

export function useCreateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCustomer,

        onSuccess: () => {
            invalidateCustomerData(queryClient);
        },
    });
}

export function useUpdateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            customerId,
            customerData,
        }: {
            customerId: number;
            customerData: UpdateCustomer;
        }) => updateCustomer(customerId, customerData),

        onSuccess: () => {
            invalidateCustomerData(queryClient);
        },
    });
}

export function useDeleteCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCustomer,

        onSuccess: () => {
            invalidateCustomerData(queryClient);
        },
    });
}
