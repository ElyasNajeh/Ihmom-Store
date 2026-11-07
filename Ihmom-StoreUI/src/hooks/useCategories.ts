import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/axios.ts';
import type {
    Category,
    CategoryImage,
    CreateCategory,
    QueryCategory,
    UpdateCategory,
} from '@/models/category.ts';
import { type PaginatedResponse, withDefaultQuery } from '@/models/query.ts';
import { CATEGORIES, CATEGORY_IMAGES } from '@/utils/query-keys.ts';
import { invalidateCatalogTaxonomy } from '@/utils/query-invalidation.ts';

export function useCategories(params: QueryCategory = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [CATEGORIES, queryParams],
        // Avoid refetching the public category catalogue on every page revisit.
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        placeholderData: keepPreviousData,

        queryFn: async (): Promise<PaginatedResponse<Category>> => {
            const response = await api.get<PaginatedResponse<Category>>('/categories/', {
                params: queryParams,
            });

            return response.data;
        },
    });
}

export function useAdminCategories(params: QueryCategory = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [CATEGORIES, 'admin', queryParams],

        queryFn: async (): Promise<PaginatedResponse<Category>> => {
            const response = await api.get<PaginatedResponse<Category>>('/categories/admin/all', {
                params: queryParams,
            });

            return response.data;
        },
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (categoryData: CreateCategory): Promise<Category> => {
            const response = await api.post<Category>('/categories/', categoryData);

            return response.data;
        },

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            categoryId,
            categoryData,
        }: {
            categoryId: number;
            categoryData: UpdateCategory;
        }): Promise<Category> => {
            const response = await api.patch<Category>(`/categories/${categoryId}`, categoryData);

            return response.data;
        },

        onSuccess: () => {
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (categoryId: number): Promise<void> => {
            await api.delete(`/categories/${categoryId}`);
        },

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

        queryFn: async (): Promise<CategoryImage[]> => {
            const response = await api.get<CategoryImage[]>(`/categories/${categoryId}/images`);

            return response.data;
        },
    });
}

export function useUploadCategoryImages() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            categoryId,
            files,
        }: {
            categoryId: number;
            files: File[];
        }): Promise<CategoryImage[]> => {
            const formData = new FormData();

            files.forEach((file) => {
                formData.append('files', file);
            });

            const response = await api.post<CategoryImage[]>(
                `/categories/${categoryId}/images`,
                formData,
            );

            return response.data;
        },

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
        mutationFn: async ({
            categoryId,
            imageId,
        }: {
            categoryId: number;
            imageId: number;
        }): Promise<CategoryImage> => {
            const response = await api.patch<CategoryImage>(
                `/categories/${categoryId}/images/${imageId}/set-primary`,
            );

            return response.data;
        },

        onSuccess: (_, { categoryId }) => {
            void queryClient.invalidateQueries({ queryKey: [CATEGORY_IMAGES, categoryId] });
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}

export function useDeleteCategoryImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            categoryId,
            imageId,
        }: {
            categoryId: number;
            imageId: number;
        }): Promise<void> => {
            await api.delete(`/categories/${categoryId}/images/${imageId}`);
        },

        onSuccess: (_, { categoryId }) => {
            void queryClient.invalidateQueries({ queryKey: [CATEGORY_IMAGES, categoryId] });
            invalidateCatalogTaxonomy(queryClient, CATEGORIES);
        },
    });
}
