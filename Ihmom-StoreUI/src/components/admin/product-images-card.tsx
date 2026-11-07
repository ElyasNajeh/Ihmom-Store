import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { AdminImageGallery } from '@/components/admin/admin-image-gallery.tsx';
import { ConfirmDialog } from '@/components/admin/confirm-dialog.tsx';
import {
    useDeleteProductImage,
    useProductImages,
    useSetPrimaryProductImage,
    useUploadProductImages,
} from '@/hooks/useProducts.ts';
import { useAdminToast } from '@/hooks/use-admin-toast.ts';

interface ProductImagesCardProps {
    productId: number;
}

export function ProductImagesCard({ productId }: ProductImagesCardProps) {
    const { t } = useTranslation('admin');
    const { showSuccess, showError } = useAdminToast();
    const query = useProductImages(productId);
    const uploadMutation = useUploadProductImages();
    const setPrimaryMutation = useSetPrimaryProductImage();
    const deleteMutation = useDeleteProductImage();

    const [files, setFiles] = useState<File[]>([]);
    const [imageToDelete, setImageToDelete] = useState<number | null>(null);

    const images = query.data ?? [];

    const handleUpload = async () => {
        if (!files.length || uploadMutation.isPending) return;

        try {
            await uploadMutation.mutateAsync({ productId, files });
            setFiles([]);
            showSuccess(t('products.imageUploaded'));
        } catch (error) {
            showError(error, t('products.imageUploadError'));
        }
    };

    const handleSetPrimary = (imageId: number) => {
        if (setPrimaryMutation.isPending) return;

        setPrimaryMutation.mutate(
            { productId, imageId },
            {
                onSuccess: () => {
                    showSuccess(t('products.primaryUpdated'));
                },
                onError: (error) => showError(error),
            },
        );
    };

    const handleDelete = () => {
        if (imageToDelete === null || deleteMutation.isPending) return;

        deleteMutation.mutate(
            { productId, imageId: imageToDelete },
            {
                onSuccess: () => {
                    setImageToDelete(null);
                    showSuccess(t('products.imageDeleted'));
                },
                onError: (error) => showError(error),
            },
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('products.images')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <AdminImageGallery
                    images={images}
                    isLoading={query.isPending}
                    isError={query.isError}
                    onRetry={() => void query.refetch()}
                    emptyTitle={t('products.noImages')}
                    emptyDescription={t('products.noImagesDescription')}
                    primaryLabel={t('products.primary')}
                    setPrimaryLabel={t('products.setPrimary')}
                    onSetPrimary={handleSetPrimary}
                    isSettingPrimary={setPrimaryMutation.isPending}
                    onRequestDelete={setImageToDelete}
                    files={files}
                    onFilesChange={setFiles}
                    onUpload={() => void handleUpload()}
                    isUploading={uploadMutation.isPending}
                    uploadLabel={t('products.imageUpload')}
                    uploadingLabel={t('products.uploading')}
                    uploadHint={t('products.imageHint')}
                />
            </CardContent>

            <ConfirmDialog
                open={imageToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setImageToDelete(null);
                }}
                title={t('products.deleteImageTitle')}
                description={t('products.deleteImageDescription')}
                onConfirm={handleDelete}
                isPending={deleteMutation.isPending}
            />
        </Card>
    );
}
