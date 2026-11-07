import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card.tsx';
import { useToastManager } from '@/shared/components/ui/toast.tsx';
import { AdminEmptyState, AdminErrorState } from '@/shared/components/admin/admin-states.tsx';
import { ActiveBadge } from '@/shared/components/admin/status-badges.tsx';
import { ConfirmDialog } from '@/shared/components/admin/confirm-dialog.tsx';
import { ProductVariantDialog } from '@/features/catalog/components/admin/product-variant-dialog.tsx';
import {
    useCreateProductVariant,
    useDeleteProductVariant,
    useProductVariants,
    useUpdateProductVariant,
} from '@/features/catalog/hooks/useProducts.ts';
import type { CreateProductVariant, ProductVariant } from '@/features/catalog/types/product.ts';
import { DEFAULT_LANGUAGE, getLanguageMetadata } from '@/i18n/locales.ts';
import { formatOrderMoney } from '@/features/orders/utils/order-format.ts';
import { getApiErrorMessage } from '@/shared/utils/api-error.ts';
import { localizedVariantName } from '@/features/catalog/utils/product-variant.ts';

interface ProductVariantsCardProps {
    productId: number;
}

export function ProductVariantsCard({ productId }: ProductVariantsCardProps) {
    const { t, i18n } = useTranslation('admin');
    const toastManager = useToastManager();
    const language = i18n.resolvedLanguage ?? DEFAULT_LANGUAGE;
    const locale = getLanguageMetadata(language).locale;
    const isArabic = language.startsWith('ar');

    const query = useProductVariants(productId);
    const createMutation = useCreateProductVariant();
    const updateMutation = useUpdateProductVariant();
    const deleteMutation = useDeleteProductVariant();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ProductVariant | null>(null);
    const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(null);

    const variants = query.data ?? [];
    const isSaving = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = async (values: CreateProductVariant) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({
                    productId,
                    variantId: editing.id,
                    variantData: values,
                });

                toastManager.add({ type: 'success', title: t('products.variantUpdated') });
            } else {
                await createMutation.mutateAsync({ productId, variantData: values });
                toastManager.add({ type: 'success', title: t('products.variantCreated') });
            }

            setDialogOpen(false);
            setEditing(null);
        } catch (error) {
            toastManager.add({
                type: 'error',
                title: t('common.errorTitle'),
                description: getApiErrorMessage(error) ?? t('common.errorDescription'),
            });

            throw error;
        }
    };

    const handleDelete = () => {
        if (!variantToDelete || deleteMutation.isPending) return;

        const target = variantToDelete;

        deleteMutation.mutate(
            { productId, variantId: target.id },
            {
                onSuccess: () => {
                    setVariantToDelete(null);
                    toastManager.add({ type: 'success', title: t('products.variantDeleted') });
                },
                onError: (error) => {
                    toastManager.add({
                        type: 'error',
                        title: t('common.errorTitle'),
                        description: getApiErrorMessage(error) ?? t('common.errorDescription'),
                    });
                },
            },
        );
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle>{t('products.variants')}</CardTitle>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                    }}
                >
                    <Plus aria-hidden="true" />
                    {t('products.addVariant')}
                </Button>
            </CardHeader>
            <CardContent>
                {query.isPending ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <Skeleton key={index} className="h-12 w-full rounded-lg" />
                        ))}
                    </div>
                ) : query.isError ? (
                    <AdminErrorState className="border-0" onRetry={() => void query.refetch()} />
                ) : variants.length ? (
                    <ul className="divide-border divide-y">
                        {variants.map((variant) => (
                            <li
                                key={variant.id}
                                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {localizedVariantName(
                                            variant.name_ar,
                                            variant.name_en,
                                            isArabic,
                                            t('products.defaultVariant'),
                                        )}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        <span className="tabular-nums">
                                            {formatOrderMoney(variant.price, locale)}
                                        </span>
                                        {variant.sku ? ` · ${variant.sku}` : null}
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                    <ActiveBadge isActive={variant.is_active} />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`${t('common.edit')} ${localizedVariantName(
                                            variant.name_ar,
                                            variant.name_en,
                                            isArabic,
                                            t('products.defaultVariant'),
                                        )}`}
                                        onClick={() => {
                                            setEditing(variant);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <Pencil aria-hidden="true" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:text-destructive"
                                        aria-label={`${t('common.delete')} ${localizedVariantName(
                                            variant.name_ar,
                                            variant.name_en,
                                            isArabic,
                                            t('products.defaultVariant'),
                                        )}`}
                                        onClick={() => setVariantToDelete(variant)}
                                    >
                                        <Trash2 aria-hidden="true" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <AdminEmptyState
                        className="border-0"
                        title={t('products.variantEmpty')}
                        description={t('products.variantEmptyDescription')}
                    />
                )}
            </CardContent>

            <ProductVariantDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);

                    if (!open) setEditing(null);
                }}
                title={t('products.variantDialogTitle')}
                editing={editing}
                onSubmit={handleSubmit}
                isSubmitting={isSaving}
            />

            <ConfirmDialog
                open={variantToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setVariantToDelete(null);
                }}
                title={t('products.variantDeleteTitle')}
                description={t('products.variantDeleteDescription')}
                onConfirm={handleDelete}
                isPending={deleteMutation.isPending}
            />
        </Card>
    );
}
