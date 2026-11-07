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
    DeliveryAreaFormDialog,
    type DeliveryAreaFormValues,
} from '@/components/admin/delivery-area-form-dialog.tsx';
import { ActiveBadge } from '@/components/admin/status-badges.tsx';
import type { ColumnDef } from '@/components/data/views/table-view.tsx';
import {
    useAdminDeliveryAreas,
    useCreateDeliveryArea,
    useDeleteDeliveryArea,
    useUpdateDeliveryArea,
} from '@/hooks/useDeliveryAreas.ts';
import { useAdminToast } from '@/hooks/use-admin-toast.ts';
import { useCollectionState } from '@/hooks/use-collection-state.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import type { DeliveryArea, QueryDeliveryArea } from '@/models/delivery-areas.ts';
import {
    DELIVERY_AREA_DEFAULT_SORT,
    DELIVERY_AREA_SORT_OPTIONS,
    deliveryAreaSortParams,
    type DeliveryAreaSort,
} from '@/constants/delivery-areas.ts';
import { activeFilterParams, resolveSortParams } from '@/constants/query.ts';
import { localizeOptions } from '@/utils/localized-options.ts';
import { formatOrderDate, formatOrderMoney } from '@/utils/order-format.ts';

export default function AdminDeliveryAreasPage() {
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
    } = useCollectionState<DeliveryAreaSort>(DELIVERY_AREA_DEFAULT_SORT);

    const params = useMemo<QueryDeliveryArea>(
        () => ({
            ...baseParams,
            ...resolveSortParams(sort, deliveryAreaSortParams(isArabic)),
            filter: activeFilterParams(status),
        }),
        [baseParams, isArabic, sort, status],
    );

    const query = useAdminDeliveryAreas(params);
    const createMutation = useCreateDeliveryArea();
    const updateMutation = useUpdateDeliveryArea();
    const deleteMutation = useDeleteDeliveryArea();

    const areas = query.data?.items ?? [];
    const total = query.data?.total ?? 0;
    const totalPages = query.data?.total_pages ?? 0;

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<DeliveryArea | null>(null);
    const [deleting, setDeleting] = useState<DeliveryArea | null>(null);

    const openCreate = useCallback(() => {
        setEditing(null);
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((area: DeliveryArea) => {
        setEditing(area);
        setFormOpen(true);
    }, []);

    const handleSubmit = async (values: DeliveryAreaFormValues) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({ areaId: editing.id, areaData: values });
                showSuccess(t('deliveryAreas.updated'));
            } else {
                await createMutation.mutateAsync(values);
                showSuccess(t('deliveryAreas.created'));
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
            showSuccess(t('deliveryAreas.deleted'));
            setDeleting(null);
        } catch (error) {
            showError(error);
        }
    };

    const columns = useMemo<ColumnDef<DeliveryArea>[]>(
        () => [
            {
                id: 'name',
                header: t('fields.name'),
                cell: (area) => (
                    <BilingualNameCell
                        nameAr={area.name_ar}
                        nameEn={area.name_en}
                        isArabic={isArabic}
                    />
                ),
            },
            {
                id: 'fee',
                header: t('fields.deliveryFee'),
                className: 'whitespace-nowrap tabular-nums',
                cell: (area) => formatOrderMoney(area.delivery_fee, locale),
            },
            {
                id: 'status',
                header: t('fields.isActive'),
                cell: (area) => <ActiveBadge isActive={area.is_active} />,
            },
            {
                id: 'created',
                header: t('common.created'),
                className: 'hidden whitespace-nowrap xl:table-cell',
                cell: (area) => (
                    <span className="text-muted-foreground text-xs">
                        {formatOrderDate(area.created_at, locale)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: t('common.actions'),
                className: 'w-24 text-end',
                cell: (area) => (
                    <AdminRowActions
                        label={area.name_en}
                        onEdit={() => openEdit(area)}
                        onDelete={() => setDeleting(area)}
                    />
                ),
            },
        ],
        [isArabic, locale, openEdit, t],
    );

    const sortOptions = localizeOptions(DELIVERY_AREA_SORT_OPTIONS, t);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={t('deliveryAreas.title')}
                description={t('deliveryAreas.description')}
                actions={
                    <Button type="button" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('deliveryAreas.add')}
                    </Button>
                }
            />

            <AdminTable
                items={areas}
                columns={columns}
                keyExtractor={(area) => area.id}
                isLoading={query.isPending}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                emptyTitle={t('deliveryAreas.empty')}
                emptyDescription={t('deliveryAreas.emptyDescription')}
                emptyAction={
                    <Button type="button" variant="outline" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('deliveryAreas.add')}
                    </Button>
                }
                toolbar={
                    <AdminListToolbar
                        search={search}
                        onSearchChange={setSearch}
                        searchPlaceholder={t('deliveryAreas.searchPlaceholder')}
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

            <DeliveryAreaFormDialog
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditing(null);
                }}
                editing={editing}
                onSubmit={handleSubmit}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
            />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => {
                    if (!open) setDeleting(null);
                }}
                title={t('deliveryAreas.deleteTitle')}
                description={t('deliveryAreas.deleteDescription')}
                onConfirm={() => void handleDelete()}
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
