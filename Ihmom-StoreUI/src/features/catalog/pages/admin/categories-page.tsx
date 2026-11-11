import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageOff, ImagePlus, Plus } from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';
import { AdminPageHeader } from '@/shared/components/admin/admin-page-header.tsx';
import { AdminTable } from '@/shared/components/admin/admin-table.tsx';
import { AdminPagination } from '@/shared/components/admin/admin-pagination.tsx';
import { AdminListToolbar } from '@/shared/components/admin/admin-list-toolbar.tsx';
import { AdminRowActions } from '@/shared/components/admin/admin-row-actions.tsx';
import { BilingualNameCell } from '@/shared/components/admin/bilingual-name-cell.tsx';
import { ConfirmDialog } from '@/shared/components/admin/confirm-dialog.tsx';
import { CategoryImageDialog } from '@/features/catalog/components/admin/category-image-dialog.tsx';
import {
    TaxonomyFormDialog,
    type TaxonomyFormValues,
} from '@/features/catalog/components/admin/taxonomy-form-dialog.tsx';
import { ActiveBadge } from '@/shared/components/admin/status-badges.tsx';
import type { ColumnDef } from '@/shared/components/data/views/table-view.tsx';
import {
    useAdminCategories,
    useCreateCategory,
    useDeleteCategory,
    useUpdateCategory,
} from '@/features/catalog/hooks/useCategories.ts';
import { useAdminToast } from '@/shared/hooks/use-admin-toast.ts';
import { useCollectionState } from '@/shared/hooks/use-collection-state.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import type { Category, QueryCategory } from '@/features/catalog/types/category.ts';
import {
    CATEGORY_DEFAULT_SORT,
    CATEGORY_SORT_OPTIONS,
    categorySortParams,
    type CategorySort,
} from '@/features/catalog/constants/categories.ts';
import { activeFilterParams, resolveSortParams } from '@/shared/constants/query.ts';
import { localizeOptions } from '@/shared/utils/localized-options.ts';
import { formatOrderDate } from '@/features/orders/utils/order-format.ts';
import { apiAssetUrl } from '@/shared/api/axios.ts';

export default function AdminCategoriesPage() {
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
    } = useCollectionState<CategorySort>(CATEGORY_DEFAULT_SORT);

    const params = useMemo<QueryCategory>(
        () => ({
            ...baseParams,
            ...resolveSortParams(sort, categorySortParams(isArabic)),
            filter: activeFilterParams(status),
        }),
        [baseParams, isArabic, sort, status],
    );

    const query = useAdminCategories(params);
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();

    const categories = query.data?.items ?? [];
    const total = query.data?.total ?? 0;
    const totalPages = query.data?.total_pages ?? 0;

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [deleting, setDeleting] = useState<Category | null>(null);
    const [imagesFor, setImagesFor] = useState<Category | null>(null);

    const openCreate = useCallback(() => {
        setEditing(null);
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((category: Category) => {
        setEditing(category);
        setFormOpen(true);
    }, []);

    const handleSubmit = async (values: TaxonomyFormValues) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({
                    categoryId: editing.id,
                    categoryData: values,
                });
                showSuccess(t('categories.updated'));
            } else {
                await createMutation.mutateAsync(values);
                showSuccess(t('categories.created'));
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
            showSuccess(t('categories.deleted'));
            setDeleting(null);
        } catch (error) {
            showError(error);
        }
    };

    const columns = useMemo<ColumnDef<Category>[]>(
        () => [
            {
                id: 'image',
                header: t('fields.image'),
                className: 'w-16',
                cell: (category) => {
                    const image = category.image;

                    return (
                        <div className="bg-muted size-11 overflow-hidden rounded-md">
                            {image ? (
                                <img
                                    src={apiAssetUrl(image) ?? undefined}
                                    alt=""
                                    loading="lazy"
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="text-muted-foreground grid size-full place-items-center">
                                    <ImageOff
                                        className="size-4"
                                        aria-label={t('categories.noImages')}
                                    />
                                </div>
                            )}
                        </div>
                    );
                },
            },
            {
                id: 'name',
                header: t('fields.name'),
                cell: (category) => (
                    <BilingualNameCell
                        nameAr={category.name_ar}
                        nameEn={category.name_en}
                        isArabic={isArabic}
                    />
                ),
            },
            {
                id: 'status',
                header: t('fields.isActive'),
                cell: (category) => <ActiveBadge isActive={category.is_active} />,
            },
            {
                id: 'created',
                header: t('common.created'),
                className: 'hidden whitespace-nowrap lg:table-cell',
                cell: (category) => (
                    <span className="text-muted-foreground text-xs">
                        {formatOrderDate(category.created_at, locale)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: t('common.actions'),
                className: 'w-24 text-end',
                cell: (category) => (
                    <AdminRowActions
                        label={category.name_en}
                        onEdit={() => openEdit(category)}
                        onDelete={() => setDeleting(category)}
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${t('categories.manageImages')}: ${category.name_en}`}
                            onClick={() => setImagesFor(category)}
                        >
                            <ImagePlus aria-hidden="true" />
                        </Button>
                    </AdminRowActions>
                ),
            },
        ],
        [isArabic, locale, t, openEdit],
    );

    const sortOptions = localizeOptions(CATEGORY_SORT_OPTIONS, t);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={t('categories.title')}
                description={t('categories.description')}
                actions={
                    <Button type="button" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('categories.add')}
                    </Button>
                }
            />

            <AdminTable
                items={categories}
                columns={columns}
                keyExtractor={(category) => category.id}
                isLoading={query.isPending}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                emptyTitle={t('categories.empty')}
                emptyDescription={t('categories.emptyDescription')}
                emptyAction={
                    <Button type="button" variant="outline" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('categories.add')}
                    </Button>
                }
                toolbar={
                    <AdminListToolbar
                        search={search}
                        onSearchChange={setSearch}
                        searchPlaceholder={t('categories.searchPlaceholder')}
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

            <TaxonomyFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? t('categories.editTitle') : t('categories.createTitle')}
                description={t('categories.description')}
                initialValues={
                    editing
                        ? {
                              name_ar: editing.name_ar,
                              name_en: editing.name_en,
                              is_active: editing.is_active,
                          }
                        : undefined
                }
                onSubmit={handleSubmit}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
            />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => {
                    if (!open) setDeleting(null);
                }}
                title={t('categories.deleteTitle')}
                description={t('categories.deleteDescription')}
                onConfirm={() => void handleDelete()}
                isPending={deleteMutation.isPending}
            />

            <CategoryImageDialog
                category={imagesFor}
                open={Boolean(imagesFor)}
                onOpenChange={(open) => {
                    if (!open) setImagesFor(null);
                }}
            />
        </div>
    );
}
