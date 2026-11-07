import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { AdminPageHeader } from '@/components/admin/admin-page-header.tsx';
import { AdminTable } from '@/components/admin/admin-table.tsx';
import { AdminPagination } from '@/components/admin/admin-pagination.tsx';
import { AdminListToolbar } from '@/components/admin/admin-list-toolbar.tsx';
import { AdminRowActions } from '@/components/admin/admin-row-actions.tsx';
import { BilingualNameCell } from '@/components/admin/bilingual-name-cell.tsx';
import { ConfirmDialog } from '@/components/admin/confirm-dialog.tsx';
import {
    TaxonomyFormDialog,
    type TaxonomyFormValues,
} from '@/components/admin/taxonomy-form-dialog.tsx';
import { ActiveBadge } from '@/components/admin/status-badges.tsx';
import type { ColumnDef } from '@/components/data/views/table-view.tsx';
import {
    useAdminBrands,
    useCreateBrand,
    useDeleteBrand,
    useUpdateBrand,
} from '@/hooks/useBrands.ts';
import { useAdminToast } from '@/hooks/use-admin-toast.ts';
import { useCollectionState } from '@/hooks/use-collection-state.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import type { Brand, QueryBrand } from '@/models/brand.ts';
import {
    BRAND_DEFAULT_SORT,
    BRAND_SORT_OPTIONS,
    brandSortParams,
    type BrandSort,
} from '@/constants/brands.ts';
import { activeFilterParams, resolveSortParams } from '@/constants/query.ts';
import { localizeOptions } from '@/utils/localized-options.ts';
import { formatOrderDate } from '@/utils/order-format.ts';

export default function AdminBrandsPage() {
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
    } = useCollectionState<BrandSort>(BRAND_DEFAULT_SORT);

    const params = useMemo<QueryBrand>(
        () => ({
            ...baseParams,
            ...resolveSortParams(sort, brandSortParams(isArabic)),
            filter: activeFilterParams(status),
        }),
        [baseParams, isArabic, sort, status],
    );

    const query = useAdminBrands(params);
    const createMutation = useCreateBrand();
    const updateMutation = useUpdateBrand();
    const deleteMutation = useDeleteBrand();

    const brands = query.data?.items ?? [];
    const total = query.data?.total ?? 0;
    const totalPages = query.data?.total_pages ?? 0;

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Brand | null>(null);
    const [deleting, setDeleting] = useState<Brand | null>(null);

    const openCreate = useCallback(() => {
        setEditing(null);
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((brand: Brand) => {
        setEditing(brand);
        setFormOpen(true);
    }, []);

    const handleSubmit = async (values: TaxonomyFormValues) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({
                    brandId: editing.id,
                    brandData: values,
                });
                showSuccess(t('brands.updated'));
            } else {
                await createMutation.mutateAsync(values);
                showSuccess(t('brands.created'));
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
            showSuccess(t('brands.deleted'));
            setDeleting(null);
        } catch (error) {
            showError(error);
        }
    };

    const columns = useMemo<ColumnDef<Brand>[]>(
        () => [
            {
                id: 'name',
                header: t('fields.name'),
                cell: (brand) => (
                    <BilingualNameCell
                        nameAr={brand.name_ar}
                        nameEn={brand.name_en}
                        isArabic={isArabic}
                    />
                ),
            },
            {
                id: 'status',
                header: t('fields.isActive'),
                cell: (brand) => <ActiveBadge isActive={brand.is_active} />,
            },
            {
                id: 'created',
                header: t('common.created'),
                className: 'hidden whitespace-nowrap lg:table-cell',
                cell: (brand) => (
                    <span className="text-muted-foreground text-xs">
                        {formatOrderDate(brand.created_at, locale)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: t('common.actions'),
                className: 'w-24 text-end',
                cell: (brand) => (
                    <AdminRowActions
                        label={brand.name_en}
                        onEdit={() => openEdit(brand)}
                        onDelete={() => setDeleting(brand)}
                    />
                ),
            },
        ],
        [isArabic, locale, t, openEdit],
    );

    const sortOptions = localizeOptions(BRAND_SORT_OPTIONS, t);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={t('brands.title')}
                description={t('brands.description')}
                actions={
                    <Button type="button" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('brands.add')}
                    </Button>
                }
            />

            <AdminTable
                items={brands}
                columns={columns}
                keyExtractor={(brand) => brand.id}
                isLoading={query.isPending}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                emptyTitle={t('brands.empty')}
                emptyDescription={t('brands.emptyDescription')}
                emptyAction={
                    <Button type="button" variant="outline" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('brands.add')}
                    </Button>
                }
                toolbar={
                    <AdminListToolbar
                        search={search}
                        onSearchChange={setSearch}
                        searchPlaceholder={t('brands.searchPlaceholder')}
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
                title={editing ? t('brands.editTitle') : t('brands.createTitle')}
                description={t('brands.description')}
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
                title={t('brands.deleteTitle')}
                description={t('brands.deleteDescription')}
                onConfirm={() => void handleDelete()}
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
