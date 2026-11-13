import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    resolvePublicRandomization,
    sameRandomization,
} from '@/features/catalog/utils/catalog-seed.ts';

import {
    createProduct,
    createProductVariant,
    deleteProduct,
    deleteProductImage,
    deleteProductVariant,
    fetchAdminProduct,
    fetchAdminProducts,
    fetchProduct,
    fetchProductImages,
    fetchProductRecommendations,
    fetchProducts,
    fetchProductVariants,
    setPrimaryProductImage,
    updateProduct,
    updateProductVariant,
    uploadProductImages,
} from '@/features/catalog/api/products-api.ts';
import type {
    CreateProductVariant,
    ProductImage,
    QueryAdminProduct,
    QueryProduct,
    PublicRandomizationOptions,
    UpdateProduct,
    UpdateProductVariant,
} from '@/features/catalog/types/product.ts';
import { withDefaultQuery } from '@/shared/types/query.ts';
import {
    PRODUCT,
    PRODUCTS,
    PRODUCT_IMAGE,
    PRODUCT_IMAGES,
    PRODUCT_VARIANTS,
} from '@/shared/utils/query-keys.ts';
import {
    invalidateProductData,
    invalidateProductImages,
    invalidateProductVariants,
} from '@/shared/utils/query-invalidation.ts';

export function useProducts(params: QueryProduct = {}) {
    // Admins browsing the storefront share this route; keep the public view active-only.
    const { randomize, random_seed, ...rest } = params;
    const queryParams = withDefaultQuery({
        ...rest,
        ...resolvePublicRandomization({ randomize, random_seed }),
        filter: { ...params.filter, is_active: true },
    });

    return useQuery({
        queryKey: [PRODUCTS, 'public', queryParams],
        // Catalogue data changes far less often than cart/checkout state.
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        placeholderData: (previousData, previousQuery) =>
            previousQuery?.queryKey[1] === 'public' &&
            sameRandomization(previousQuery.queryKey[2] as QueryProduct, queryParams)
                ? keepPreviousData(previousData)
                : undefined,
        queryFn: () => fetchProducts(queryParams),
    });
}

export function useAdminProducts(params: QueryAdminProduct = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [PRODUCTS, 'admin', queryParams],
        queryFn: () => fetchAdminProducts(queryParams),
    });
}

export function useProduct(productId: number) {
    return useQuery({
        queryKey: [PRODUCT, 'public', productId],
        enabled: Number.isInteger(productId) && productId > 0,
        queryFn: () => fetchProduct(productId),
    });
}

export function useAdminProduct(productId: number, enabled = true) {
    return useQuery({
        queryKey: [PRODUCT, 'admin', productId],
        enabled,
        queryFn: () => fetchAdminProduct(productId),
    });
}

export function useProductRecommendations(
    productId: number,
    limit = 4,
    options: PublicRandomizationOptions = {},
) {
    const queryParams = resolvePublicRandomization(options);
    return useQuery({
        queryKey: [PRODUCT, 'public', productId, 'recommendations', limit, queryParams],
        enabled: Number.isInteger(productId) && productId > 0,
        queryFn: () => fetchProductRecommendations(productId, limit, queryParams),
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProduct,

        onSuccess: () => {
            invalidateProductData(queryClient);
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            productId,
            productData,
        }: {
            productId: number;
            productData: UpdateProduct;
        }) => updateProduct(productId, productData),

        onSuccess: (product) => {
            queryClient.setQueryData([PRODUCT, 'admin', product.id], product);
            invalidateProductData(queryClient);
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteProduct,

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
        queryFn: () => fetchProductVariants(productId),
    });
}

export function useCreateProductVariant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            productId,
            variantData,
        }: {
            productId: number;
            variantData: CreateProductVariant;
        }) => createProductVariant(productId, variantData),

        onSuccess: (variant) => {
            invalidateProductVariants(queryClient, variant.product_id);
        },
    });
}

export function useUpdateProductVariant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            productId,
            variantId,
            variantData,
        }: {
            productId: number;
            variantId: number;
            variantData: UpdateProductVariant;
        }) => updateProductVariant(productId, variantId, variantData),

        onSuccess: (variant) => {
            invalidateProductVariants(queryClient, variant.product_id);
        },
    });
}

export function useDeleteProductVariant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ productId, variantId }: { productId: number; variantId: number }) =>
            deleteProductVariant(productId, variantId),

        onSuccess: (_, { productId }) => {
            invalidateProductVariants(queryClient, productId);
        },
    });
}

export function useProductImages(productId: number, enabled = true) {
    return useQuery({
        queryKey: [PRODUCT_IMAGES, productId],
        enabled,
        queryFn: () => fetchProductImages(productId),
    });
}

export function useUploadProductImages() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ productId, files }: { productId: number; files: File[] }) =>
            uploadProductImages(productId, files),

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
        mutationFn: ({ productId, imageId }: { productId: number; imageId: number }) =>
            setPrimaryProductImage(productId, imageId),

        onSuccess: (image, { productId }) => {
            queryClient.setQueryData([PRODUCT_IMAGE, productId, image.id], image);
            invalidateProductImages(queryClient, productId);
        },
    });
}

export function useDeleteProductImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ productId, imageId }: { productId: number; imageId: number }) =>
            deleteProductImage(productId, imageId),

        onSuccess: (_, { productId, imageId }) => {
            queryClient.removeQueries({
                queryKey: [PRODUCT_IMAGE, productId, imageId],
            });

            invalidateProductImages(queryClient, productId);
        },
    });
}
