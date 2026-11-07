import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/axios.ts';
import type { Brand, CreateBrand, QueryBrand, UpdateBrand } from '@/models/brand.ts';
import { type PaginatedResponse, withDefaultQuery } from '@/models/query.ts';
import { BRANDS } from '@/utils/query-keys.ts';
import { invalidateCatalogTaxonomy } from '@/utils/query-invalidation.ts';

export function useBrands(params: QueryBrand = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [BRANDS, queryParams],

        queryFn: async (): Promise<PaginatedResponse<Brand>> => {
            const response = await api.get<PaginatedResponse<Brand>>('/brands/', {
                params: queryParams,
            });

            return response.data;
        },
    });
}

export function useAdminBrands(params: QueryBrand = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [BRANDS, 'admin', queryParams],

        queryFn: async (): Promise<PaginatedResponse<Brand>> => {
            const response = await api.get<PaginatedResponse<Brand>>('/brands/admin/all', {
                params: queryParams,
            });

            return response.data;
        },
    });
}

export function useCreateBrand() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (brandData: CreateBrand): Promise<Brand> => {
            const response = await api.post<Brand>('/brands/', brandData);

            return response.data;
        },

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, BRANDS);
        },
    });
}

export function useUpdateBrand() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            brandId,
            brandData,
        }: {
            brandId: number;
            brandData: UpdateBrand;
        }): Promise<Brand> => {
            const response = await api.patch<Brand>(`/brands/${brandId}`, brandData);

            return response.data;
        },

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, BRANDS);
        },
    });
}

export function useDeleteBrand() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (brandId: number): Promise<void> => {
            await api.delete(`/brands/${brandId}`);
        },

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, BRANDS);
        },
    });
}
