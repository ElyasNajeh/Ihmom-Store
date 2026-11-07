import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/axios.ts';
import type { Admin, CreateAdmin, QueryAdmin } from '@/models/admin.ts';
import { type PaginatedResponse, withDefaultQuery } from '@/models/query.ts';
import { ADMINS } from '@/utils/query-keys.ts';
import { invalidateAdminCollection } from '@/utils/query-invalidation.ts';

export function useAdmins(params: QueryAdmin = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [ADMINS, queryParams],

        queryFn: async (): Promise<PaginatedResponse<Admin>> => {
            const response = await api.get<PaginatedResponse<Admin>>('/admins/', {
                params: queryParams,
            });

            return response.data;
        },
    });
}

export function useCreateAdmin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (createAdmin: CreateAdmin): Promise<Admin> => {
            const response = await api.post<Admin>('/admins/', createAdmin);

            return response.data;
        },

        onSuccess: () => {
            invalidateAdminCollection(queryClient, ADMINS);
        },
    });
}

export function useDeleteAdmin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (adminId: number): Promise<void> => {
            await api.delete(`/admins/${adminId}`);
        },

        onSuccess: () => {
            invalidateAdminCollection(queryClient, ADMINS);
        },
    });
}
