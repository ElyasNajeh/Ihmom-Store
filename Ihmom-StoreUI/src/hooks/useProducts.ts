import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/axios.ts';
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
} from '@/models/product.ts';
import { type PaginatedResponse, withDefaultQuery } from '@/models/query.ts';
import {
    PRODUCT,
    PRODUCTS,
    PRODUCT_IMAGE,
    PRODUCT_IMAGES,
    PRODUCT_VARIANTS,
} from '@/utils/query-keys.ts';
import {
    invalidateProductData,
    invalidateProductImages,
    invalidateProductVariants,
} from '@/utils/query-invalidation.ts';

export function useProducts(params: QueryProduct = {}) {
    // Admins browsing the storefront share this route; keep the public view active-only.
    const queryParams = withDefaultQuery({
        ...params,
        filter: { ...params.filter, is_active: true },
    });

    return useQuery({
        queryKey: [PRODUCTS, 'public', queryParams],
        // Catalogue data changes far less often than cart/checkout state.
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<PaginatedResponse<PublicProduct>> => {
            const response = await api.get<PaginatedResponse<PublicProduct>>('/products/', {
                params: queryParams,
                paramsSerializer: {
                    indexes: null,
                },
            });

            return response.data;
        },
    });
}

export function useAdminProducts(params: QueryAdminProduct = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [PRODUCTS, 'admin', queryParams],

        queryFn: async (): Promise<PaginatedResponse<Product>> => {
            // The shared catalogue route returns the admin projection when a token is present.
            const response = await api.get<PaginatedResponse<Product>>('/products/', {
                params: queryParams,
                paramsSerializer: {
                    indexes: null,
                },
            });

            return response.data;
        },
    });
}

export function useProduct(productId: number) {
    return useQuery({
        queryKey: [PRODUCT, 'public', productId],

        queryFn: async (): Promise<PublicProduct> => {
            const response = await api.get<PublicProduct>(`/products/${productId}`);

            return response.data;
        },
    });
}

export function useAdminProduct(productId: number, enabled = true) {
    return useQuery({
        queryKey: [PRODUCT, 'admin', productId],
        enabled,

        queryFn: async (): Promise<Product> => {
            const response = await api.get<Product>(`/products/${productId}`);

            return response.data;
        },
    });
}

export function useProductRecommendations(productId: number, limit = 4) {
    return useQuery({
        queryKey: [PRODUCT, productId, 'recommendations', limit],

        queryFn: async (): Promise<PublicProduct[]> => {
            const response = await api.get<PublicProduct[]>(
                `/products/${productId}/recommendations`,
                {
                    params: { limit },
                },
            );

            return response.data;
        },
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (productData: CreateProduct): Promise<Product> => {
            const response = await api.post<Product>('/products/', productData);

            return response.data;
        },

        onSuccess: () => {
            invalidateProductData(queryClient);
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            productData,
        }: {
            productId: number;
            productData: UpdateProduct;
        }): Promise<Product> => {
            const response = await api.patch<Product>(`/products/${productId}`, productData);

            return response.data;
        },

        onSuccess: (product) => {
            queryClient.setQueryData([PRODUCT, 'admin', product.id], product);
            invalidateProductData(queryClient);
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (productId: number): Promise<void> => {
            await api.delete(`/products/${productId}`);
        },

        onSuccess: (_, productId) => {
            queryClient.removeQueries({
                queryKey: [PRODUCT, 'admin', productId],
            });

            queryClient.removeQueries({
                queryKey: [PRODUCT, 'public', productId],
            });

            invalidateProductData(queryClient);
        },
    });
}

export function useProductVariants(productId: number, enabled = true) {
    return useQuery({
        queryKey: [PRODUCT_VARIANTS, productId],
        enabled,

        queryFn: async (): Promise<ProductVariant[]> => {
            const response = await api.get<ProductVariant[]>(`/products/${productId}/variants`);

            return response.data;
        },
    });
}

export function useCreateProductVariant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            variantData,
        }: {
            productId: number;
            variantData: CreateProductVariant;
        }): Promise<ProductVariant> => {
            const response = await api.post<ProductVariant>(
                `/products/${productId}/variants`,
                variantData,
            );

            return response.data;
        },

        onSuccess: (variant) => {
            invalidateProductVariants(queryClient, variant.product_id);
        },
    });
}

export function useUpdateProductVariant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            variantId,
            variantData,
        }: {
            productId: number;
            variantId: number;
            variantData: UpdateProductVariant;
        }): Promise<ProductVariant> => {
            const response = await api.patch<ProductVariant>(
                `/products/${productId}/variants/${variantId}`,
                variantData,
            );

            return response.data;
        },

        onSuccess: (variant) => {
            invalidateProductVariants(queryClient, variant.product_id);
        },
    });
}

export function useDeleteProductVariant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            variantId,
        }: {
            productId: number;
            variantId: number;
        }): Promise<void> => {
            await api.delete(`/products/${productId}/variants/${variantId}`);
        },

        onSuccess: (_, { productId }) => {
            invalidateProductVariants(queryClient, productId);
        },
    });
}

export function useProductImages(productId: number, enabled = true) {
    return useQuery({
        queryKey: [PRODUCT_IMAGES, productId],
        enabled,

        queryFn: async (): Promise<ProductImage[]> => {
            const response = await api.get<ProductImage[]>(`/products/${productId}/images`);

            return response.data;
        },
    });
}

export function useUploadProductImages() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            files,
        }: {
            productId: number;
            files: File[];
        }): Promise<ProductImage[]> => {
            const formData = new FormData();

            files.forEach((file) => {
                formData.append('files', file);
            });

            const response = await api.post<ProductImage[]>(
                `/products/${productId}/images`,
                formData,
            );

            return response.data;
        },

        onSuccess: (images, { productId }) => {
            // The upload endpoint returns only the new files, so append them instead of replacing
            // the cached gallery, then refetch to reconcile with the server.
            queryClient.setQueryData<ProductImage[]>([PRODUCT_IMAGES, productId], (current) => {
                if (!current) return images;

                const existingIds = new Set(current.map((image) => image.id));

                return [...current, ...images.filter((image) => !existingIds.has(image.id))];
            });

            invalidateProductImages(queryClient, productId);
        },
    });
}

export function useSetPrimaryProductImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            imageId,
        }: {
            productId: number;
            imageId: number;
        }): Promise<ProductImage> => {
            const response = await api.patch<ProductImage>(
                `/products/${productId}/images/${imageId}/set-primary`,
            );

            return response.data;
        },

        onSuccess: (image, { productId }) => {
            queryClient.setQueryData([PRODUCT_IMAGE, productId, image.id], image);
            invalidateProductImages(queryClient, productId);
        },
    });
}

export function useDeleteProductImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            imageId,
        }: {
            productId: number;
            imageId: number;
        }): Promise<void> => {
            await api.delete(`/products/${productId}/images/${imageId}`);
        },

        onSuccess: (_, { productId, imageId }) => {
            queryClient.removeQueries({
                queryKey: [PRODUCT_IMAGE, productId, imageId],
            });

            invalidateProductImages(queryClient, productId);
        },
    });
}
