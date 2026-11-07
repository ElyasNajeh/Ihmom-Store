import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createCategory,
    deleteCategory,
    deleteCategoryImage,
    fetchAdminCategories,
    fetchCategories,
    fetchCategoryImages,
    setPrimaryCategoryImage,
    updateCategory,
    uploadCategoryImages,
} from '@/features/catalog/api/categories-api.ts';
import type {
    CategoryImage,
    QueryCategory,
    UpdateCategory,
} from '@/features/catalog/types/category.ts';
import { withDefaultQuery } from '@/shared/types/query.ts';
import { CATEGORIES, CATEGORY_IMAGES } from '@/shared/utils/query-keys.ts';
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
            queryClient.removeQueries({ queryKey: [CATEGORY_IMAGES, categoryId] });
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useCategoryImages(categoryId: number, enabled = true) {
    return useQuery({
        queryKey: [CATEGORY_IMAGES, categoryId],
        enabled,
        queryFn: () => fetchCategoryImages(categoryId),
    });
}

export function useUploadCategoryImages() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ categoryId, files }: { categoryId: number; files: File[] }) =>
            uploadCategoryImages(categoryId, files),

        onSuccess: (images, { categoryId }) => {
            queryClient.setQueryData<CategoryImage[]>([CATEGORY_IMAGES, categoryId], (current) => {
                if (!current) return images;

                const existingIds = new Set(current.map((image) => image.id));

                return [...current, ...images.filter((image) => !existingIds.has(image.id))];
            });

            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useSetPrimaryCategoryImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ categoryId, imageId }: { categoryId: number; imageId: number }) =>
            setPrimaryCategoryImage(categoryId, imageId),

        onSuccess: (_, { categoryId }) => {
            void queryClient.invalidateQueries({ queryKey: [CATEGORY_IMAGES, categoryId] });
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useDeleteCategoryImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ categoryId, imageId }: { categoryId: number; imageId: number }) =>
            deleteCategoryImage(categoryId, imageId),

        onSuccess: (_, { categoryId }) => {
            void queryClient.invalidateQueries({ queryKey: [CATEGORY_IMAGES, categoryId] });
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}
