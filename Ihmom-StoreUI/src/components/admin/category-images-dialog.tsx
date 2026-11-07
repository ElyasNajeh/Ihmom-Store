import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AdminDialog } from '@/components/admin/admin-dialog.tsx';
import { AdminImageGallery } from '@/components/admin/admin-image-gallery.tsx';
import { ConfirmDialog } from '@/components/admin/confirm-dialog.tsx';
import {
    useCategoryImages,
    useDeleteCategoryImage,
    useSetPrimaryCategoryImage,
    useUploadCategoryImages,
} from '@/hooks/useCategories.ts';
import { useAdminToast } from '@/hooks/use-admin-toast.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import type { Category } from '@/models/category.ts';
import { localizedName } from '@/utils/localized.ts';

interface CategoryImagesDialogProps {
    category: Category | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CategoryImagesDialog({ category, open, onOpenChange }: CategoryImagesDialogProps) {
    const { t } = useTranslation('admin');
    const { isArabic } = useLocale();
    const { showSuccess, showError } = useAdminToast();
    const categoryName = category ? localizedName(category, isArabic) : '';

    const query = useCategoryImages(category?.id ?? 0, open && Boolean(category));
    const uploadMutation = useUploadCategoryImages();
    const setPrimaryMutation = useSetPrimaryCategoryImage();
    const deleteMutation = useDeleteCategoryImage();

    const [files, setFiles] = useState<File[]>([]);
    const [imageToDelete, setImageToDelete] = useState<number | null>(null);

    const images = query.data ?? [];
    const categoryId = category?.id ?? 0;

    const handleUpload = async () => {
        if (!categoryId || !files.length || uploadMutation.isPending) return;

        try {
            await uploadMutation.mutateAsync({ categoryId, files });
            setFiles([]);
            showSuccess(t('categories.imageUploaded'));
        } catch (error) {
            showError(error);
        }
    };

    const handleSetPrimary = (imageId: number) => {
        if (!categoryId || setPrimaryMutation.isPending) return;

        setPrimaryMutation.mutate(
            { categoryId, imageId },
            {
                onSuccess: () => {
                    showSuccess(t('categories.primaryUpdated'));
                },
                onError: (error) => showError(error),
            },
        );
    };

    const handleDelete = () => {
        if (!categoryId || imageToDelete === null || deleteMutation.isPending) return;

        deleteMutation.mutate(
            { categoryId, imageId: imageToDelete },
            {
                onSuccess: () => {
                    setImageToDelete(null);
                    showSuccess(t('categories.imageDeleted'));
                },
                onError: (error) => showError(error),
            },
        );
    };

    return (
        <>
            <AdminDialog
                open={open}
                onOpenChange={onOpenChange}
                title={t('categories.images')}
                description={
                    category
                        ? t('categories.imagesDescription', { name: categoryName })
                        : t('categories.imagesDescriptionFallback')
                }
                className="sm:max-w-2xl"
            >
                <div className="max-h-[65vh] space-y-5 overflow-y-auto pe-1">
                    <AdminImageGallery
                        images={images}
                        isLoading={query.isPending}
                        isError={query.isError}
                        onRetry={() => void query.refetch()}
                        emptyTitle={t('categories.noImages')}
                        emptyDescription={t('categories.noImagesDescription')}
                        primaryLabel={t('categories.primary')}
                        setPrimaryLabel={t('categories.setPrimary')}
                        onSetPrimary={handleSetPrimary}
                        isSettingPrimary={setPrimaryMutation.isPending}
                        onRequestDelete={setImageToDelete}
                        files={files}
                        onFilesChange={setFiles}
                        onUpload={() => void handleUpload()}
                        isUploading={uploadMutation.isPending}
                        uploadLabel={t('categories.uploadImages')}
                        uploadingLabel={t('common.saving')}
                        uploadHint={t('categories.imageHint')}
                    />
                </div>
            </AdminDialog>

            <ConfirmDialog
                open={imageToDelete !== null}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) setImageToDelete(null);
                }}
                title={t('categories.deleteImageTitle')}
                description={t('categories.deleteImageDescription')}
                onConfirm={handleDelete}
                isPending={deleteMutation.isPending}
            />
        </>
    );
}
