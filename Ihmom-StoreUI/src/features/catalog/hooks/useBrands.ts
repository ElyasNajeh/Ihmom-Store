import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createBrand,
    deleteBrand,
    fetchAdminBrands,
    fetchBrands,
    updateBrand,
} from '@/features/catalog/api/brands-api.ts';
import type { QueryBrand, UpdateBrand } from '@/features/catalog/types/brand.ts';
import { withDefaultQuery } from '@/shared/types/query.ts';
import { BRANDS } from '@/shared/utils/query-keys.ts';
import { invalidateCatalogTaxonomy } from '@/shared/utils/query-invalidation.ts';

export function useBrands(params: QueryBrand = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [BRANDS, queryParams],
        queryFn: () => fetchBrands(queryParams),
    });
}

export function useAdminBrands(params: QueryBrand = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [BRANDS, 'admin', queryParams],
        queryFn: () => fetchAdminBrands(queryParams),
    });
}

export function useCreateBrand() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createBrand,

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, BRANDS);
        },
    });
}

export function useUpdateBrand() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ brandId, brandData }: { brandId: number; brandData: UpdateBrand }) =>
            updateBrand(brandId, brandData),

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, BRANDS);
        },
    });
}

export function useDeleteBrand() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteBrand,

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, BRANDS);
        },
    });
}
