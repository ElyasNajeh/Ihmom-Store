import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { AdminPageHeader } from '@/components/admin/admin-page-header.tsx';
import { AdminTable } from '@/components/admin/admin-table.tsx';
import { AdminPagination } from '@/components/admin/admin-pagination.tsx';
import { AdminListToolbar } from '@/components/admin/admin-list-toolbar.tsx';
import { AdminRowActions } from '@/components/admin/admin-row-actions.tsx';
import { ConfirmDialog } from '@/components/admin/confirm-dialog.tsx';
import {
    CustomerFormDialog,
    type CustomerFormValues,
} from '@/components/admin/customer-form-dialog.tsx';
import type { ColumnDef } from '@/components/data/views/table-view.tsx';
import {
    useCreateCustomer,
    useCustomers,
    useDeleteCustomer,
    useUpdateCustomer,
} from '@/hooks/useCustomers.ts';
import { useAdminToast } from '@/hooks/use-admin-toast.ts';
import { useCollectionState } from '@/hooks/use-collection-state.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import type { Customer, QueryCustomer } from '@/models/customer.ts';
import {
    CUSTOMER_DEFAULT_SORT,
    CUSTOMER_SORT_OPTIONS,
    CUSTOMER_SORT_PARAMS,
    type CustomerSort,
} from '@/constants/customers.ts';
import { resolveSortParams } from '@/constants/query.ts';
import { localizeOptions } from '@/utils/localized-options.ts';
import { formatOrderDate } from '@/utils/order-format.ts';

export default function AdminCustomersPage() {
    const { t } = useTranslation('admin');
    const { locale } = useLocale();
    const { showSuccess, showError } = useAdminToast();

    const { search, sort, page, pageSize, baseParams, setPage, setSearch, setSort, setPageSize } =
        useCollectionState<CustomerSort>(CUSTOMER_DEFAULT_SORT);

    const params = useMemo<QueryCustomer>(
        () => ({
            ...baseParams,
            ...resolveSortParams(sort, CUSTOMER_SORT_PARAMS),
        }),
        [baseParams, sort],
    );

    const query = useCustomers(params);
    const createMutation = useCreateCustomer();
    const updateMutation = useUpdateCustomer();
    const deleteMutation = useDeleteCustomer();

    const customers = query.data?.items ?? [];
    const total = query.data?.total ?? 0;
    const totalPages = query.data?.total_pages ?? 0;

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Customer | null>(null);
    const [deleting, setDeleting] = useState<Customer | null>(null);

    const openCreate = useCallback(() => {
        setEditing(null);
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((customer: Customer) => {
        setEditing(customer);
        setFormOpen(true);
    }, []);

    const handleSubmit = async (values: CustomerFormValues) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({
                    customerId: editing.id,
                    customerData: values,
                });
                showSuccess(t('customers.updated'));
            } else {
                await createMutation.mutateAsync(values);
                showSuccess(t('customers.created'));
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
            showSuccess(t('customers.deleted'));
            setDeleting(null);
        } catch (error) {
            showError(error);
        }
    };

    const columns = useMemo<ColumnDef<Customer>[]>(
        () => [
            {
                id: 'name',
                header: t('fields.name'),
                cell: (customer) => <span className="font-medium">{customer.name}</span>,
            },
            {
                id: 'phone',
                header: t('fields.phone'),
                cell: (customer) => (
                    <span className="text-muted-foreground font-mono text-xs" dir="ltr">
                        {customer.phone}
                    </span>
                ),
            },
            {
                id: 'created',
                header: t('common.created'),
                className: 'hidden whitespace-nowrap lg:table-cell',
                cell: (customer) => (
                    <span className="text-muted-foreground text-xs">
                        {formatOrderDate(customer.created_at, locale)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: t('common.actions'),
                className: 'w-24 text-end',
                cell: (customer) => (
                    <AdminRowActions
                        label={customer.name}
                        onEdit={() => openEdit(customer)}
                        onDelete={() => setDeleting(customer)}
                    />
                ),
            },
        ],
        [locale, openEdit, t],
    );

    const sortOptions = localizeOptions(CUSTOMER_SORT_OPTIONS, t);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title={t('customers.title')}
                description={t('customers.description')}
                actions={
                    <Button type="button" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('customers.add')}
                    </Button>
                }
            />

            <AdminTable
                items={customers}
                columns={columns}
                keyExtractor={(customer) => customer.id}
                isLoading={query.isPending}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                emptyTitle={t('customers.empty')}
                emptyDescription={t('customers.emptyDescription')}
                emptyAction={
                    <Button type="button" variant="outline" onClick={openCreate}>
                        <Plus aria-hidden="true" />
                        {t('customers.add')}
                    </Button>
                }
                toolbar={
                    <AdminListToolbar
                        search={search}
                        onSearchChange={setSearch}
                        searchPlaceholder={t('customers.searchPlaceholder')}
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

            <CustomerFormDialog
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
                title={t('customers.deleteTitle')}
                description={t('customers.deleteDescription')}
                onConfirm={() => void handleDelete()}
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
