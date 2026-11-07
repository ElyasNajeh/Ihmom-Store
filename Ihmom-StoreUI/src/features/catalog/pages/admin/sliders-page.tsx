import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';
import { AdminPageHeader } from '@/shared/components/admin/admin-page-header.tsx';
import { AdminTable } from '@/shared/components/admin/admin-table.tsx';
import { AdminPagination } from '@/shared/components/admin/admin-pagination.tsx';
import { AdminListToolbar } from '@/shared/components/admin/admin-list-toolbar.tsx';
import { AdminRowActions } from '@/shared/components/admin/admin-row-actions.tsx';
import { BilingualNameCell } from '@/shared/components/admin/bilingual-name-cell.tsx';
import { ConfirmDialog } from '@/shared/components/admin/confirm-dialog.tsx';
import {
    SliderFormDialog,
    type SliderFormValues,
} from '@/features/catalog/components/admin/slider-form-dialog.tsx';
import { ActiveBadge } from '@/shared/components/admin/status-badges.tsx';
import type { ColumnDef } from '@/shared/components/data/views/table-view.tsx';
import {
    useCreateSlider,
    useDeleteSlider,
    useReplaceSliderImage,
    useSliders,
    useUpdateSlider,
} from '@/features/catalog/hooks/useSliders.ts';
import { useAdminToast } from '@/shared/hooks/use-admin-toast.ts';
import { useCollectionState } from '@/shared/hooks/use-collection-state.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import type { QuerySlider, Slider } from '@/features/catalog/types/slider.ts';
import {
    SLIDER_DEFAULT_SORT,
    SLIDER_SORT_OPTIONS,
    SLIDER_SORT_PARAMS,
    type SliderSort,
} from '@/features/catalog/constants/sliders.ts';
import { activeFilterParams, resolveSortParams } from '@/shared/constants/query.ts';
import { localizeOptions } from '@/shared/utils/localized-options.ts';
import { formatOrderDate } from '@/features/orders/utils/order-format.ts';
import { apiAssetUrl } from '@/shared/api/axios.ts';

export default function AdminSlidersPage() {
    const { t } = useTranslation('admin');
    const { isArabic, locale } = useLocale();
    const { showSuccess, showError } = useAdminToast();

    const {
        search,
        status,
        sort,
        page,
        pageSize,
        baseParams,
        setPage,
        setSearch,
        setStatus,
        setSort,
        setPageSize,
    } = useCollectionState<SliderSort>(SLIDER_DEFAULT_SORT);

    const params = useMemo<QuerySlider>(
        () => ({
            ...baseParams,
            ...resolveSortParams(sort, SLIDER_SORT_PARAMS),
            filter: activeFilterParams(status),
        }),
        [baseParams, sort, status],
    );

    const query = useSliders(params);
    const createMutation = useCreateSlider();
    const updateMutation = useUpdateSlider();
    const replaceImageMutation = useReplaceSliderImage();
    const deleteMutation = useDeleteSlider();

    const sliders = query.data?.items ?? [];
    const total = query.data?.total ?? 0;
    const totalPages = query.data?.total_pages ?? 0;

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Slider | null>(null);
    const [deleting, setDeleting] = useState<Slider | null>(null);

    const openCreate = useCallback(() => {
        setEditing(null);
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((slider: Slider) => {
        setEditing(slider);
        setFormOpen(true);
    }, []);

    const handleSubmit = async (values: SliderFormValues, image: File | null) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({
                    sliderId: editing.id,
                    sliderData: values,
                });

                if (image) {
                    await replaceImageMutation.mutateAsync({ sliderId: editing.id, image });
                }

                showSuccess(image ? t('sliders.imageUpdated') : t('sliders.updated'));
            } else {
                if (!image) return;

                await createMutation.mutateAsync({ sliderData: values, image });
                showSuccess(t('sliders.created'));
            }

            setFormOpen(false);
            setEditing(null);
        } catch (error) {
            showError(error);
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;

        try {
            await deleteMutation.mutateAsync(deleting.id);
            showSuccess(t('sliders.deleted'));
            setDeleting(null);
        } catch (error) {
            showError(error);
        }
    };

    const columns = useMemo<ColumnDef<Slider>[]>(
        () => [
            {
                id: 'image',
                header: t('fields.image'),
                className: 'w-28',
                cell: (slider) => {
                    const src = apiAssetUrl(slider.image);

                    return (
                        <div className="bg-muted aspect-video w-24 overflow-hidden rounded-md">
                            {src ? (
                                <img
                                    src={src}
                                    alt=""
                                    loading="lazy"
                                    className="size-full object-cover"
                                />
                            ) : null}
                        </div>
                    );
                },
            },
            {
                id: 'title',
                header: t('fields.name'),
                cell: (slider) => (
                    <BilingualNameCell
                        nameAr={slider.title_ar}
                        nameEn={slider.title_en}
                        isArabic={isArabic}
                    />
                ),
            },
            {
                id: 'order',
                header: t('fields.displayOrder'),
                className: 'w-24 text-center tabular-nums',
                cell: (slider) => slider.display_order,
            },
            {
                id: 'status',
                header: t('fields.isActive'),
                cell: (slider) => <ActiveBadge isActive={slider.is_active} />,
            },
            {
                id: 'created',
                header: t('common.created'),
                className: 'hidden whitespace-nowrap xl:table-cell',
                cell: (slider) => (
                    <span className="text-muted-foreground text-xs">
                        {formatOrderDate(slider.created_at, locale)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: t('common.actions'),
                className: 'w-24 text-end',
                cell: (slider) => (
                    <AdminRowActions
                        label={slider.title_en}
                        onEdit={() => openEdit(slider)}
                        onDelete={() => setDeleting(slider)}
                    />
                ),
            },
        ],
        [isArabic, locale, t, openEdit],
    );

    const sortOptions = localizeOptions(SLIDER_SORT_OPTIONS, t);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={t('sliders.title')}
                description={t('sliders.description')}
                actions={
                    <Button type="button" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('sliders.add')}
                    </Button>
                }
            />

            <AdminTable
                items={sliders}
                columns={columns}
                keyExtractor={(slider) => slider.id}
                isLoading={query.isPending}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                emptyTitle={t('sliders.empty')}
                emptyDescription={t('sliders.emptyDescription')}
                emptyAction={
                    <Button type="button" variant="outline" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('sliders.add')}
                    </Button>
                }
                toolbar={
                    <AdminListToolbar
                        search={search}
                        onSearchChange={setSearch}
                        searchPlaceholder={t('sliders.searchPlaceholder')}
                        status={status}
                        onStatusChange={setStatus}
                        sort={sort}
                        onSortChange={setSort}
                        sortOptions={sortOptions}
                    />
                }
                footer={
                    <AdminPagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        isFetching={query.isFetching}
                    />
                }
            />

            <SliderFormDialog
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditing(null);
                }}
                editing={editing}
                onSubmit={handleSubmit}
                isSubmitting={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    replaceImageMutation.isPending
                }
            />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => {
                    if (!open) setDeleting(null);
                }}
                title={t('sliders.deleteTitle')}
                description={t('sliders.deleteDescription')}
                onConfirm={() => void handleDelete()}
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
