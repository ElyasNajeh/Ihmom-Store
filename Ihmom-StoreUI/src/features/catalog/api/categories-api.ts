import type {
    Category,
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

export async function fetchAdminCategory(categoryId: number): Promise<Category> {
    return (await api.get<Category>(`/categories/admin/${categoryId}`)).data;
}

export async function replaceCategoryImage(categoryId: number, image: File): Promise<Category> {
    const body = new FormData();
    body.append('image', image);
    return (await api.put<Category>(`/categories/${categoryId}/image`, body)).data;
}

export async function deleteCategoryImage(categoryId: number): Promise<Category> {
    return (await api.delete<Category>(`/categories/${categoryId}/image`)).data;
}
