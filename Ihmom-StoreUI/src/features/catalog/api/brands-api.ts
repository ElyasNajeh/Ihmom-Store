import type {
    Brand,
    CreateBrand,
    QueryBrand,
    UpdateBrand,
} from '@/features/catalog/types/brand.ts';
import { api } from '@/shared/api/axios.ts';
import type { PaginatedResponse } from '@/shared/types/query.ts';

export async function fetchBrands(params: QueryBrand): Promise<PaginatedResponse<Brand>> {
    const response = await api.get<PaginatedResponse<Brand>>('/brands/', { params });

    return response.data;
}

export async function fetchAdminBrands(params: QueryBrand): Promise<PaginatedResponse<Brand>> {
    const response = await api.get<PaginatedResponse<Brand>>('/brands/admin/all', { params });

    return response.data;
}

export async function createBrand(brandData: CreateBrand): Promise<Brand> {
    const response = await api.post<Brand>('/brands/', brandData);

    return response.data;
}

export async function updateBrand(brandId: number, brandData: UpdateBrand): Promise<Brand> {
    const response = await api.patch<Brand>(`/brands/${brandId}`, brandData);

    return response.data;
}

export async function deleteBrand(brandId: number): Promise<void> {
    await api.delete(`/brands/${brandId}`);
}
