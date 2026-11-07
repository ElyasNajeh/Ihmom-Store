import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/api/axios.ts';
import { withDefaultQuery, type PaginatedResponse } from '@/shared/types/query.ts';
import type {
    CreateDeliveryArea,
    DeliveryArea,
    PublicDeliveryArea,
    QueryDeliveryArea,
    UpdateDeliveryArea,
} from '@/features/delivery/types/delivery-area.ts';
import { DELIVERY_AREAS } from '@/shared/utils/query-keys.ts';
import { invalidateDeliveryAreas } from '@/shared/utils/query-invalidation.ts';

export function useDeliveryAreas(params: QueryDeliveryArea = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [DELIVERY_AREAS, 'public', queryParams],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<PublicDeliveryArea>>(
                '/delivery-areas/',
                { params: queryParams },
            );

            return data;
        },
    });
}

export function useAdminDeliveryAreas(params: QueryDeliveryArea = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [DELIVERY_AREAS, 'admin', queryParams],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<DeliveryArea>>(
                '/delivery-areas/admin/all',
                { params: queryParams },
            );

            return data;
        },
    });
}

export function useCreateDeliveryArea() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (areaData: CreateDeliveryArea) => {
            const { data } = await api.post<DeliveryArea>('/delivery-areas/', areaData);

            return data;
        },
        onSuccess: () => {
            invalidateDeliveryAreas(queryClient);
        },
    });
}

export function useUpdateDeliveryArea() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            areaId,
            areaData,
        }: {
            areaId: number;
            areaData: UpdateDeliveryArea;
        }) => {
            const { data } = await api.patch<DeliveryArea>(`/delivery-areas/${areaId}`, areaData);

            return data;
        },
        onSuccess: () => {
            invalidateDeliveryAreas(queryClient);
        },
    });
}

export function useDeleteDeliveryArea() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (areaId: number) => {
            await api.delete(`/delivery-areas/${areaId}`);

            return areaId;
        },
        onSuccess: () => {
            invalidateDeliveryAreas(queryClient);
        },
    });
}
