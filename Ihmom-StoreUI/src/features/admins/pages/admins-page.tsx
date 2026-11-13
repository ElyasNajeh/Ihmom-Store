import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ShieldCheck } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { AdminPageHeader } from '@/shared/components/admin/admin-page-header.tsx';
import { AdminTable } from '@/shared/components/admin/admin-table.tsx';
import { AdminPagination } from '@/shared/components/admin/admin-pagination.tsx';
import { AdminListToolbar } from '@/shared/components/admin/admin-list-toolbar.tsx';
import { AdminRowActions } from '@/shared/components/admin/admin-row-actions.tsx';
import { ConfirmDialog } from '@/shared/components/admin/confirm-dialog.tsx';
import { AdminFormDialog } from '@/shared/components/admin/admin-form-dialog.tsx';
import type { AdminColumnDef as ColumnDef } from '@/shared/components/admin/admin-table.tsx';
import { useAdmins, useCreateAdmin, useDeleteAdmin } from '@/features/admins/hooks/useAdmins.ts';
import { useAdminAuth } from '@/features/auth/context/admin-auth-context.ts';
import { useAdminToast } from '@/shared/hooks/use-admin-toast.ts';
import { useCollectionState } from '@/shared/hooks/use-collection-state.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import type { Admin, QueryAdmin } from '@/features/admins/types/admin.ts';
import {
    ADMIN_DEFAULT_SORT,
    ADMIN_SORT_OPTIONS,
    ADMIN_SORT_PARAMS,
    type AdminSort,
} from '@/features/admins/constants/admins.ts';
import { resolveSortParams } from '@/shared/constants/query.ts';
import { localizeOptions } from '@/shared/utils/localized-options.ts';
import { formatOrderDate } from '@/features/orders/utils/order-format.ts';

export default function AdminAdminsPage() {
    const { t } = useTranslation('admin');
    const { locale } = useLocale();
    const { showSuccess, showError } = useAdminToast();
    const { admin: currentAdmin } = useAdminAuth();

    const { search, sort, page, pageSize, baseParams, setPage, setSearch, setSort, setPageSize } =
        useCollectionState<AdminSort>(ADMIN_DEFAULT_SORT);

    const params = useMemo<QueryAdmin>(
        () => ({
            ...baseParams,
            ...resolveSortParams(sort, ADMIN_SORT_PARAMS),
        }),
        [baseParams, sort],
    );

    const query = useAdmins(params);
    const createMutation = useCreateAdmin();
    const deleteMutation = useDeleteAdmin();

    const admins = query.data?.items ?? [];
    const total = query.data?.total ?? 0;
    const totalPages = query.data?.total_pages ?? 0;

    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState<Admin | null>(null);

    const handleCreate = async (values: { username: string; email: string; password: string }) => {
        try {
            await createMutation.mutateAsync(values);
            showSuccess(t('admins.created'));
            setFormOpen(false);
        } catch (error) {
            showError(error);
            throw error;
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;

        try {
            await deleteMutation.mutateAsync(deleting.id);
            showSuccess(t('admins.deleted'));
            setDeleting(null);
        } catch (error) {
            showError(error);
        }
    };

    const columns = useMemo<ColumnDef<Admin>[]>(
        () => [
            {
                id: 'username',
                header: t('fields.username'),
                cell: (admin) => (
                    <div className="flex items-center gap-2.5">
                        <span className="bg-muted text-foreground grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold">
                            {admin.username.slice(0, 2).toUpperCase()}
                        </span>

                        <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate font-medium">
                                {admin.username}
                                {admin.id === currentAdmin?.id ? (
                                    <Badge variant="secondary" className="text-[10px]">
                                        {t('admins.you')}
                                    </Badge>
                                ) : null}
                            </p>
                            <p className="text-muted-foreground truncate text-xs" dir="ltr">
                                {admin.email}
                            </p>
                        </div>
                    </div>
                ),
            },
            {
                id: 'created',
                header: t('common.created'),
                className: 'hidden whitespace-nowrap lg:table-cell',
                cell: (admin) => (
                    <span className="text-muted-foreground text-xs">
                        {formatOrderDate(admin.created_at, locale)}
                    </span>
                ),
            },
            {
                id: 'actions',
                mobileRole: 'actions',
                header: t('common.actions'),
                className: 'w-16 text-end',
                cell: (admin) => (
                    <AdminRowActions
                        label={admin.username}
                        onDelete={() => setDeleting(admin)}
                        deleteDisabled={admin.id === currentAdmin?.id}
                    />
                ),
            },
        ],
        [currentAdmin?.id, locale, t],
    );

    const sortOptions = localizeOptions(ADMIN_SORT_OPTIONS, t);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={t('admins.title')}
                description={t('admins.description')}
                actions={
                    <Button type="button" onClick={() => setFormOpen(true)}>
                        <Plus aria-hidden="true" />
                        {t('admins.add')}
                    </Button>
                }
            />

            <AdminTable
                items={admins}
                columns={columns}
                keyExtractor={(admin) => admin.id}
                isLoading={query.isPending}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                emptyTitle={t('admins.empty')}
                emptyDescription={t('admins.emptyDescription')}
                toolbar={
                    <AdminListToolbar
                        search={search}
                        onSearchChange={setSearch}
                        searchPlaceholder={t('admins.searchPlaceholder')}
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

            <div className="text-muted-foreground flex items-start gap-2 text-xs">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>{t('admins.deleteDescription')}</p>
            </div>

            <AdminFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                onSubmit={handleCreate}
                isSubmitting={createMutation.isPending}
            />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => {
                    if (!open) setDeleting(null);
                }}
                title={t('admins.deleteTitle')}
                description={t('admins.deleteDescription')}
                onConfirm={() => void handleDelete()}
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
