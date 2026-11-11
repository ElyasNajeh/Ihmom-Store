import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminDialog } from '@/shared/components/admin/admin-dialog';
import { AdminImagePicker } from '@/shared/components/admin/admin-image-picker';
import { AdminErrorState } from '@/shared/components/admin/admin-states';
import { ConfirmDialog } from '@/shared/components/admin/confirm-dialog';
import { Button } from '@/shared/components/ui/button';
import {
    useAdminCategory,
    useDeleteCategoryImage,
    useReplaceCategoryImage,
} from '@/features/catalog/hooks/useCategories';
import type { Category } from '@/features/catalog/types/category';
import { useAdminToast } from '@/shared/hooks/use-admin-toast';
import { apiAssetUrl } from '@/shared/api/axios';

export function CategoryImageDialog({
    category,
    open,
    onOpenChange,
}: {
    category: Category | null;
    open: boolean;
    onOpenChange: (value: boolean) => void;
}) {
    const { t, i18n } = useTranslation('admin');
    const { showSuccess, showError } = useAdminToast();
    const query = useAdminCategory(category?.id ?? 0, open && Boolean(category));
    const upload = useReplaceCategoryImage();
    const remove = useDeleteCategoryImage();
    const [selection, setSelection] = useState<{ categoryId: number; files: File[] } | null>(null);
    const [confirming, setConfirming] = useState(false);
    const files = selection && selection.categoryId === category?.id ? selection.files : [];
    const pending = upload.isPending || remove.isPending;
    const image = query.data?.image;
    const save = async () => {
        if (!category || !files[0] || pending) return;
        try {
            await upload.mutateAsync({ categoryId: category.id, image: files[0] });
            setSelection(null);
            showSuccess(t('categories.imageUploaded'));
        } catch (error) {
            showError(error);
        }
    };
    const deleteImage = async () => {
        if (!category || pending) return;
        try {
            await remove.mutateAsync(category.id);
            setConfirming(false);
            showSuccess(t('categories.imageDeleted'));
        } catch (error) {
            showError(error);
        }
    };
    return (
        <>
            <AdminDialog
                open={open}
                onOpenChange={(value) => {
                    if (pending) return;
                    if (!value) {
                        setSelection(null);
                        setConfirming(false);
                    }
                    onOpenChange(value);
                }}
                title={t('categories.images')}
                description={
                    category
                        ? t('categories.imagesDescription', {
                              name: i18n.language.startsWith('ar')
                                  ? category.name_ar
                                  : category.name_en,
                          })
                        : t('categories.imagesDescriptionFallback')
                }
            >
                {query.isPending ? (
                    <p role="status">{t('common.loading')}</p>
                ) : query.isError ? (
                    <AdminErrorState onRetry={() => void query.refetch()} />
                ) : (
                    <div className="space-y-4">
                        {image ? (
                            <img
                                src={apiAssetUrl(image) ?? undefined}
                                alt={t('categories.images')}
                                className="max-h-64 w-full rounded-lg object-contain"
                            />
                        ) : (
                            <p>{t('categories.noImages')}</p>
                        )}
                        <AdminImagePicker
                            files={files}
                            onChange={(next) =>
                                setSelection({ categoryId: category!.id, files: next.slice(-1) })
                            }
                            label={t('categories.uploadImages')}
                            hint={t('categories.imageHint')}
                            disabled={pending}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => void save()} disabled={pending || !files.length}>
                                {pending ? t('common.saving') : t('categories.uploadImages')}
                            </Button>
                            {image && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setConfirming(true)}
                                    disabled={pending}
                                >
                                    {t('common.delete')}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </AdminDialog>
            <ConfirmDialog
                open={confirming}
                onOpenChange={(value) => {
                    if (!pending) setConfirming(value);
                }}
                title={t('categories.deleteImageTitle')}
                description={t('categories.deleteImageDescription')}
                onConfirm={() => void deleteImage()}
                isPending={remove.isPending}
            />
        </>
    );
}
