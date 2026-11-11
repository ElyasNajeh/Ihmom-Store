import type {
    CreateProduct,
    CreateProductVariant,
    Product,
    ProductImage,
    ProductVariant,
    PublicProduct,
    QueryAdminProduct,
    QueryProduct,
    UpdateProduct,
    UpdateProductVariant,
} from '@/features/catalog/types/product.ts';
import { api } from '@/shared/api/axios.ts';
import type { PaginatedResponse } from '@/shared/types/query.ts';

const productParamsSerializer = {
    indexes: null,
};

export async function fetchProducts(
    params: QueryProduct,
): Promise<PaginatedResponse<PublicProduct>> {
    const response = await api.get<PaginatedResponse<PublicProduct>>('/products/', {
        params,
        paramsSerializer: productParamsSerializer,
    });

    return response.data;
}

export async function fetchAdminProducts(
    params: QueryAdminProduct,
): Promise<PaginatedResponse<Product>> {
    const response = await api.get<PaginatedResponse<Product>>('/products/admin/all', {
        params,
        paramsSerializer: productParamsSerializer,
    });

    return response.data;
}

export async function fetchProduct(productId: number): Promise<PublicProduct> {
    const response = await api.get<PublicProduct>(`/products/${productId}`);

    return response.data;
}

export async function fetchAdminProduct(productId: number): Promise<Product> {
    const response = await api.get<Product>(`/products/admin/${productId}`);

    return response.data;
}

export async function fetchProductRecommendations(
    productId: number,
    limit: number,
): Promise<PublicProduct[]> {
    const response = await api.get<PublicProduct[]>(`/products/${productId}/recommendations`, {
        params: { limit },
    });

    return response.data;
}

export async function createProduct(productData: CreateProduct): Promise<Product> {
    const response = await api.post<Product>('/products/', productData);

    return response.data;
}

export async function updateProduct(
    productId: number,
    productData: UpdateProduct,
): Promise<Product> {
    const response = await api.patch<Product>(`/products/${productId}`, productData);

    return response.data;
}

export async function deleteProduct(productId: number): Promise<void> {
    await api.delete(`/products/${productId}`);
}

export async function fetchProductVariants(productId: number): Promise<ProductVariant[]> {
    const response = await api.get<ProductVariant[]>(`/products/${productId}/variants`);

    return response.data;
}

export async function createProductVariant(
    productId: number,
    variantData: CreateProductVariant,
): Promise<ProductVariant> {
    const response = await api.post<ProductVariant>(`/products/${productId}/variants`, variantData);

    return response.data;
}

export async function updateProductVariant(
    productId: number,
    variantId: number,
    variantData: UpdateProductVariant,
): Promise<ProductVariant> {
    const response = await api.patch<ProductVariant>(
        `/products/${productId}/variants/${variantId}`,
        variantData,
    );

    return response.data;
}

export async function deleteProductVariant(productId: number, variantId: number): Promise<void> {
    await api.delete(`/products/${productId}/variants/${variantId}`);
}

export async function fetchProductImages(productId: number): Promise<ProductImage[]> {
    const response = await api.get<ProductImage[]>(`/products/${productId}/images`);

    return response.data;
}

export async function uploadProductImages(
    productId: number,
    files: File[],
): Promise<ProductImage[]> {
    const formData = new FormData();

    files.forEach((file) => {
        formData.append('files', file);
    });

    const response = await api.post<ProductImage[]>(`/products/${productId}/images`, formData);

    return response.data;
}

export async function setPrimaryProductImage(
    productId: number,
    imageId: number,
): Promise<ProductImage> {
    const response = await api.patch<ProductImage>(
        `/products/${productId}/images/${imageId}/set-primary`,
    );

    return response.data;
}

export async function deleteProductImage(productId: number, imageId: number): Promise<void> {
    await api.delete(`/products/${productId}/images/${imageId}`);
}
