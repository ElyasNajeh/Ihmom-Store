import { ImageOff, Star, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { AdminEmptyState, AdminErrorState } from '@/shared/components/admin/admin-states.tsx';
import { AdminImagePicker } from '@/shared/components/admin/admin-image-picker.tsx';
import { apiAssetUrl } from '@/shared/api/axios.ts';

export interface AdminGalleryImage {
    id: number;
    image: string;
    is_primary: boolean;
}

interface AdminImageGalleryProps {
    images: AdminGalleryImage[];
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
    emptyTitle: string;
    emptyDescription: string;
    primaryLabel: string;
    setPrimaryLabel: string;
    onSetPrimary: (imageId: number) => void;
    isSettingPrimary: boolean;
    onRequestDelete: (imageId: number) => void;
    files: File[];
    onFilesChange: (files: File[]) => void;
    onUpload: () => void;
    isUploading: boolean;
    uploadLabel: string;
    uploadingLabel: string;
    uploadHint: string;
}

export function AdminImageGallery({
    images,
    isLoading,
    isError,
    onRetry,
    emptyTitle,
    emptyDescription,
    primaryLabel,
    setPrimaryLabel,
    onSetPrimary,
    isSettingPrimary,
    onRequestDelete,
    files,
    onFilesChange,
    onUpload,
    isUploading,
    uploadLabel,
    uploadingLabel,
    uploadHint,
}: AdminImageGalleryProps) {
    const { t } = useTranslation('admin');

    return (
        <>
            {isLoading ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="aspect-square rounded-lg" />
                    ))}
                </div>
            ) : isError ? (
                <AdminErrorState className="border-0" onRetry={onRetry} />
            ) : images.length ? (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {images.map((image) => (
                        <li
                            key={image.id}
                            className="group border-border bg-muted relative aspect-square overflow-hidden rounded-lg border"
                        >
                            <img
                                src={apiAssetUrl(image.image) ?? undefined}
                                alt=""
                                loading="lazy"
                                className="size-full object-cover"
                            />

                            {image.is_primary ? (
                                <Badge className="absolute start-1 top-1">{primaryLabel}</Badge>
                            ) : (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon-xs"
                                    className="absolute start-1 top-1 opacity-90"
                                    aria-label={setPrimaryLabel}
                                    disabled={isSettingPrimary}
                                    onClick={() => onSetPrimary(image.id)}
                                >
                                    <Star aria-hidden="true" />
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="destructive"
                                size="icon-xs"
                                className="absolute end-1 top-1 opacity-90"
                                aria-label={t('common.delete')}
                                onClick={() => onRequestDelete(image.id)}
                            >
                                <Trash2 aria-hidden="true" />
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : (
                <AdminEmptyState
                    className="border-0"
                    icon={<ImageOff aria-hidden="true" />}
                    title={emptyTitle}
                    description={emptyDescription}
                />
            )}

            <div className="border-border space-y-3 border-t pt-4">
                <AdminImagePicker
                    files={files}
                    onChange={onFilesChange}
                    multiple
                    label={uploadLabel}
                    hint={uploadHint}
                    disabled={isUploading}
                />

                <div className="flex justify-end">
                    <Button
                        type="button"
                        onClick={onUpload}
                        disabled={!files.length || isUploading}
                    >
                        {isUploading ? uploadingLabel : uploadLabel}
                    </Button>
                </div>
            </div>
        </>
    );
}
