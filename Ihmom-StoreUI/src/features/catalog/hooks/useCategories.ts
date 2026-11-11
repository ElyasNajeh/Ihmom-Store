import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createCategory,
    deleteCategory,
    deleteCategoryImage,
    fetchAdminCategories,
    fetchCategories,
    fetchAdminCategory,
    updateCategory,
    replaceCategoryImage,
} from '@/features/catalog/api/categories-api.ts';
import type { QueryCategory, UpdateCategory } from '@/features/catalog/types/category.ts';
import { withDefaultQuery } from '@/shared/types/query.ts';
import { CATEGORIES, CATEGORY } from '@/shared/utils/query-keys.ts';
import { invalidateCatalogTaxonomy } from '@/shared/utils/query-invalidation.ts';

export function useCategories(params: QueryCategory = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [CATEGORIES, queryParams],
        // Avoid refetching the public category catalogue on every page revisit.
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        placeholderData: keepPreviousData,
        queryFn: () => fetchCategories(queryParams),
    });
}

export function useAdminCategories(params: QueryCategory = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [CATEGORIES, 'admin', queryParams],
        queryFn: () => fetchAdminCategories(queryParams),
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCategory,

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            categoryId,
            categoryData,
        }: {
            categoryId: number;
            categoryData: UpdateCategory;
        }) => updateCategory(categoryId, categoryData),

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCategory,

        onSuccess: (_, categoryId) => {
            queryClient.removeQueries({ queryKey: [CATEGORY, categoryId] });
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useAdminCategory(categoryId: number, enabled = true) {
    return useQuery({
        queryKey: [CATEGORY, categoryId],
        enabled,
        queryFn: () => fetchAdminCategory(categoryId),
    });
}

export function useReplaceCategoryImage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ categoryId, image }: { categoryId: number; image: File }) =>
            replaceCategoryImage(categoryId, image),
        onSuccess: (category) => {
            queryClient.setQueryData([CATEGORY, category.id], category);
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useDeleteCategoryImage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteCategoryImage,
        onSuccess: (category) => {
            queryClient.setQueryData([CATEGORY, category.id], category);
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}
