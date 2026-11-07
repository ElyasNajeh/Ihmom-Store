import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useToastManager } from '@/components/ui/toast.tsx';
import { AdminPageHeader } from '@/components/admin/admin-page-header.tsx';
import { AdminEmptyState, AdminErrorState } from '@/components/admin/admin-states.tsx';
import { ProductCreateForm, ProductEditForm } from '@/components/admin/product-form.tsx';
import { ProductVariantsCard } from '@/components/admin/product-variants-card.tsx';
import { ProductImagesCard } from '@/components/admin/product-images-card.tsx';
import { useAdminProduct, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts.ts';
import { useAdminCategories } from '@/hooks/useCategories.ts';
import { useAdminBrands } from '@/hooks/useBrands.ts';
import type { CreateProduct, UpdateProduct } from '@/models/product.ts';
import { FETCH_ALL_PARAMS } from '@/constants/query.ts';
import { getApiErrorMessage } from '@/utils/api-error.ts';

export default function AdminProductEditorPage() {
    const { productId: productIdParam } = useParams();
    const { t } = useTranslation('admin');
    const toastManager = useToastManager();
    const navigate = useNavigate();

    const isNew = productIdParam === undefined;
    const productId = Number(productIdParam);
    const isValidId = isNew || (Number.isInteger(productId) && productId > 0);

    const categoriesQuery = useAdminCategories(FETCH_ALL_PARAMS);
    const brandsQuery = useAdminBrands(FETCH_ALL_PARAMS);
    const productQuery = useAdminProduct(isNew ? 0 : productId, !isNew && isValidId);

    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();

    const handleCreate = useCallback(
        async (data: CreateProduct) => {
            try {
                const product = await createMutation.mutateAsync(data);

                toastManager.add({
                    type: 'success',
                    title: t('products.created'),
                    description: product.name_en,
                });

                navigate(`/admin/products/${product.id}`, { replace: true });
            } catch (error) {
                toastManager.add({
                    type: 'error',
                    title: t('common.errorTitle'),
                    description: getApiErrorMessage(error) ?? t('common.errorDescription'),
                });

                throw error;
            }
        },
        [createMutation, navigate, t, toastManager],
    );

    const handleUpdate = useCallback(
        async (data: UpdateProduct) => {
            try {
                await updateMutation.mutateAsync({ productId, productData: data });

                toastManager.add({ type: 'success', title: t('products.detailsSaved') });
            } catch (error) {
                toastManager.add({
                    type: 'error',
                    title: t('common.errorTitle'),
                    description: getApiErrorMessage(error) ?? t('common.errorDescription'),
                });

                throw error;
            }
        },
        [productId, t, toastManager, updateMutation],
    );

    const backLink = (
        <div>
            <Link
                to="/admin/products"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
            >
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                {t('products.backToProducts')}
            </Link>
        </div>
    );

    if (!isValidId) {
        return (
            <AdminEmptyState
                title={t('products.notFound')}
                description={t('products.notFoundDescription')}
                action={
                    <Button asChild variant="outline">
                        <Link to="/admin/products">{t('products.backToProducts')}</Link>
                    </Button>
                }
            />
        );
    }

    if (categoriesQuery.isError || brandsQuery.isError) {
        return (
            <AdminErrorState
                onRetry={() => {
                    void categoriesQuery.refetch();
                    void brandsQuery.refetch();
                }}
                description={
                    getApiErrorMessage(categoriesQuery.error ?? brandsQuery.error) ?? undefined
                }
            />
        );
    }

    if (isNew) {
        return (
            <div className="space-y-6">
                {backLink}

                <AdminPageHeader
                    title={t('products.createTitle')}
                    description={t('products.createDescription')}
                />

                <ProductCreateForm
                    categories={categoriesQuery.data?.items ?? []}
                    brands={brandsQuery.data?.items ?? []}
                    isSubmitting={createMutation.isPending}
                    onSubmit={handleCreate}
                />
            </div>
        );
    }

    if (productQuery.isPending) {
        return (
            <div className="space-y-6" aria-busy="true">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-9 w-64" />
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <Skeleton className="h-[32rem] w-full rounded-xl" />
                    <div className="space-y-4">
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-80 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    const isNotFound =
        axios.isAxiosError(productQuery.error) && productQuery.error.response?.status === 404;

    if (isNotFound) {
        return (
            <AdminEmptyState
                title={t('products.notFound')}
                description={t('products.notFoundDescription')}
                action={
                    <Button asChild variant="outline">
                        <Link to="/admin/products">{t('products.backToProducts')}</Link>
                    </Button>
                }
            />
        );
    }

    if (productQuery.isError || !productQuery.data) {
        return (
            <AdminErrorState
                onRetry={() => void productQuery.refetch()}
                description={getApiErrorMessage(productQuery.error) ?? undefined}
            />
        );
    }

    const product = productQuery.data;

    return (
        <div className="space-y-6">
            {backLink}

            <AdminPageHeader
                title={product.name_en}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <span>{t('products.editDescription')}</span>
                        <span className="text-muted-foreground">·</span>
                        <span>
                            {product.name_ar} / {product.name_en}
                        </span>
                    </span>
                }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
                <div className="space-y-4">
                    <ProductEditForm
                        product={product}
                        categories={categoriesQuery.data?.items ?? []}
                        brands={brandsQuery.data?.items ?? []}
                        isSubmitting={updateMutation.isPending}
                        onSubmit={handleUpdate}
                    />

                    <ProductImagesCard productId={product.id} />
                </div>

                <div className="space-y-4">
                    <ProductVariantsCard productId={product.id} />
                </div>
            </div>
        </div>
    );
}
