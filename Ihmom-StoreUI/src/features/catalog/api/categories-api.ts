import type {
    Category,
    CategoryImage,
    CreateCategory,
    QueryCategory,
    UpdateCategory,
} from '@/features/catalog/types/category.ts';
import { api } from '@/shared/api/axios.ts';
import type { PaginatedResponse } from '@/shared/types/query.ts';

export async function fetchCategories(params: QueryCategory): Promise<PaginatedResponse<Category>> {
    const response = await api.get<PaginatedResponse<Category>>('/categories/', { params });

    return response.data;
}

export async function fetchAdminCategories(
    params: QueryCategory,
): Promise<PaginatedResponse<Category>> {
    const response = await api.get<PaginatedResponse<Category>>('/categories/admin/all', {
        params,
    });

    return response.data;
}

export async function createCategory(categoryData: CreateCategory): Promise<Category> {
    const response = await api.post<Category>('/categories/', categoryData);

    return response.data;
}

export async function updateCategory(
    categoryId: number,
    categoryData: UpdateCategory,
): Promise<Category> {
    const response = await api.patch<Category>(`/categories/${categoryId}`, categoryData);

    return response.data;
}

export async function deleteCategory(categoryId: number): Promise<void> {
    await api.delete(`/categories/${categoryId}`);
}

export async function fetchCategoryImages(categoryId: number): Promise<CategoryImage[]> {
    const response = await api.get<CategoryImage[]>(`/categories/${categoryId}/images`);

    return response.data;
}

export async function uploadCategoryImages(
    categoryId: number,
    files: File[],
): Promise<CategoryImage[]> {
    const formData = new FormData();

    files.forEach((file) => {
        formData.append('files', file);
    });

    const response = await api.post<CategoryImage[]>(`/categories/${categoryId}/images`, formData);

    return response.data;
}

export async function setPrimaryCategoryImage(
    categoryId: number,
    imageId: number,
): Promise<CategoryImage> {
    const response = await api.patch<CategoryImage>(
        `/categories/${categoryId}/images/${imageId}/set-primary`,
    );

    return response.data;
}

export async function deleteCategoryImage(categoryId: number, imageId: number): Promise<void> {
    await api.delete(`/categories/${categoryId}/images/${imageId}`);
}
