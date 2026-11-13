import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ImageOff, Plus, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select.tsx';
import { AdminPageHeader } from '@/shared/components/admin/admin-page-header.tsx';
import { AdminTable } from '@/shared/components/admin/admin-table.tsx';
import { AdminPagination } from '@/shared/components/admin/admin-pagination.tsx';
import { AdminListToolbar } from '@/shared/components/admin/admin-list-toolbar.tsx';
import { AdminRowActions } from '@/shared/components/admin/admin-row-actions.tsx';
import { BilingualNameCell } from '@/shared/components/admin/bilingual-name-cell.tsx';
import { ActiveBadge } from '@/shared/components/admin/status-badges.tsx';
import { ConfirmDialog } from '@/shared/components/admin/confirm-dialog.tsx';
import type { AdminColumnDef as ColumnDef } from '@/shared/components/admin/admin-table.tsx';
import { useAdminProducts, useDeleteProduct } from '@/features/catalog/hooks/useProducts.ts';
import { useAdminCategories } from '@/features/catalog/hooks/useCategories.ts';
import { useAdminBrands } from '@/features/catalog/hooks/useBrands.ts';
import { useAdminToast } from '@/shared/hooks/use-admin-toast.ts';
import { useCollectionState } from '@/shared/hooks/use-collection-state.ts';
import { useDebounce } from '@/shared/hooks/useDebounce.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import type { Product, QueryAdminProduct } from '@/features/catalog/types/product.ts';
import {
    activeFilterParams,
    DEFAULT_PAGE,
    FETCH_ALL_PARAMS,
    FILTER_ALL,
    resolveSortParams,
    SEARCH_DEBOUNCE_MS,
} from '@/shared/constants/query.ts';
import {
    PRODUCT_DEFAULT_SORT,
    PRODUCT_SORT_OPTIONS,
    productSortParams,
    type ProductSort,
} from '@/features/catalog/constants/products.ts';
import { localizeOptions } from '@/shared/utils/localized-options.ts';
import { formatOrderDate, formatOrderMoney } from '@/features/orders/utils/order-format.ts';
import { localizedName } from '@/shared/utils/localized.ts';
import { apiAssetUrl } from '@/shared/api/axios.ts';

export default function AdminProductsPage() {
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
    } = useCollectionState<ProductSort>(PRODUCT_DEFAULT_SORT);

    const [categoryId, setCategoryId] = useState(FILTER_ALL);
    const [brandId, setBrandId] = useState(FILTER_ALL);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const debouncedMinPrice = useDebounce(minPrice.trim(), SEARCH_DEBOUNCE_MS);
    const debouncedMaxPrice = useDebounce(maxPrice.trim(), SEARCH_DEBOUNCE_MS);

    const categoriesQuery = useAdminCategories(FETCH_ALL_PARAMS);
    const brandsQuery = useAdminBrands(FETCH_ALL_PARAMS);

    const updateCategory = (value: string) => {
        setCategoryId(value);
        setPage(1);
    };

    const updateBrand = (value: string) => {
        setBrandId(value);
        setPage(1);
    };

    const updateMinPrice = (value: string) => {
        setMinPrice(value);
        setPage(1);
    };

    const updateMaxPrice = (value: string) => {
        setMaxPrice(value);
        setPage(1);
    };

    const queryParams = useMemo<QueryAdminProduct>(() => {
        const filters: NonNullable<QueryAdminProduct['filter']> = {};

        if (categoryId !== FILTER_ALL) {
            filters.category_id = Number(categoryId);
        }

        if (brandId !== FILTER_ALL) {
            filters.brand_id = Number(brandId);
        }

        Object.assign(filters, activeFilterParams(status));

        if (debouncedMinPrice !== '' && Number.isFinite(Number(debouncedMinPrice))) {
            filters.min_price = debouncedMinPrice;
        }

        if (debouncedMaxPrice !== '' && Number.isFinite(Number(debouncedMaxPrice))) {
            filters.max_price = debouncedMaxPrice;
        }

        return {
            ...baseParams,
            ...resolveSortParams(sort, productSortParams(isArabic)),
            filter: Object.keys(filters).length ? filters : undefined,
        };
    }, [
        baseParams,
        brandId,
        categoryId,
        debouncedMaxPrice,
        debouncedMinPrice,
        isArabic,
        sort,
        status,
    ]);

    const query = useAdminProducts(queryParams);
    const deleteMutation = useDeleteProduct();

    const hasFilters =
        baseParams.search !== undefined ||
        categoryId !== FILTER_ALL ||
        brandId !== FILTER_ALL ||
        status !== FILTER_ALL ||
        debouncedMinPrice !== '' ||
        debouncedMaxPrice !== '';

    const clearFilters = useCallback(() => {
        setSearch('');
        setCategoryId(FILTER_ALL);
        setBrandId(FILTER_ALL);
        setStatus(FILTER_ALL);
        setMinPrice('');
        setMaxPrice('');
        setPage(DEFAULT_PAGE);
    }, [setPage, setSearch, setStatus]);

    const handleDelete = useCallback(() => {
        if (!productToDelete || deleteMutation.isPending) {
            return;
        }

        const target = productToDelete;

        deleteMutation.mutate(target.id, {
            onSuccess: () => {
                setProductToDelete(null);
                showSuccess(t('common.deletedSuccess'), localizedName(target, isArabic));
            },
            onError: (error) => {
                showError(error, t('products.deleteError'));
            },
        });
    }, [deleteMutation, isArabic, productToDelete, showError, showSuccess, t]);

    const columns = useMemo<ColumnDef<Product>[]>(
        () => [
            {
                id: 'image',
                mobileRole: 'image',
                header: t('fields.image'),
                className: 'w-16',
                cell: (product) => {
                    const image =
                        product.images.find((picture) => picture.is_primary) ?? product.images[0];

                    return (
                        <div className="bg-muted size-11 overflow-hidden rounded-md">
                            {image ? (
                                <img
                                    src={apiAssetUrl(image.image) ?? undefined}
                                    alt=""
                                    loading="lazy"
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="text-muted-foreground grid size-full place-items-center">
                                    <ImageOff
                                        className="size-4"
                                        aria-label={t('products.noImage')}
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
                cell: (product) => (
                    <BilingualNameCell
                        nameAr={product.name_ar}
                        nameEn={product.name_en}
                        isArabic={isArabic}
                    />
                ),
            },
            {
                id: 'category',
                header: t('fields.category'),
                cell: (product) => (
                    <span className="text-muted-foreground">
                        {localizedName(product.category, isArabic)}
                    </span>
                ),
            },
            {
                id: 'brand',
                header: t('fields.brand'),
                cell: (product) => (
                    <span className="text-muted-foreground">
                        {localizedName(product.brand, isArabic)}
                    </span>
                ),
            },

            {
                id: 'price',
                header: t('fields.price'),
                cell: (product) => {
                    const minPrice =
                        product.variants.length > 0
                            ? Math.min(...product.variants.map((variant) => Number(variant.price)))
                            : null;

                    return minPrice !== null && Number.isFinite(minPrice) ? (
                        <>
                            <span className="font-medium tabular-nums">
                                {formatOrderMoney(minPrice, locale)}
                            </span>

                            {product.variants.length > 1 && (
                                <span className="text-muted-foreground mt-0.5 block text-xs">
                                    {t('products.startingPrice')}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    );
                },
            },

            {
                id: 'status',
                header: t('fields.status'),
                cell: (product) => <ActiveBadge isActive={product.is_active} />,
            },
            {
                id: 'created',
                header: t('orders.placedAt'),
                cell: (product) => (
                    <span className="text-muted-foreground text-xs">
                        {formatOrderDate(product.created_at, locale)}
                    </span>
                ),
            },
            {
                id: 'actions',
                mobileRole: 'actions',
                header: t('common.actions'),
                className: 'w-28 text-end',
                cell: (product) => (
                    <AdminRowActions
                        label={localizedName(product, isArabic)}
                        editHref={`/admin/products/${product.id}`}
                        onDelete={() => setProductToDelete(product)}
                    />
                ),
            },
        ],
        [isArabic, locale, t],
    );

    const items = query.data?.items ?? [];
    const totalPages = query.data?.total_pages ?? 1;

    const sortOptions = localizeOptions(PRODUCT_SORT_OPTIONS, t);

    const categoryItems = [
        { value: FILTER_ALL, label: t('products.anyCategory') },
        ...(categoriesQuery.data?.items ?? []).map((category) => ({
            value: String(category.id),
            label: localizedName(category, isArabic),
        })),
    ];

    const brandItems = [
        { value: FILTER_ALL, label: t('products.anyBrand') },
        ...(brandsQuery.data?.items ?? []).map((brand) => ({
            value: String(brand.id),
            label: localizedName(brand, isArabic),
        })),
    ];

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title={t('products.title')}
                description={t('products.description')}
                actions={
                    <Button asChild>
                        <Link to="/admin/products/new">
                            <Plus aria-hidden="true" />
                            {t('products.add')}
                        </Link>
                    </Button>
                }
            />

            <AdminTable
                items={items}
                columns={columns}
                keyExtractor={(product) => product.id}
                isLoading={query.isPending}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                emptyTitle={hasFilters ? t('common.noResults') : t('products.empty')}
                emptyDescription={
                    hasFilters ? t('common.noResultsDescription') : t('products.emptyDescription')
                }
                emptyAction={
                    hasFilters ? (
                        <Button type="button" variant="outline" onClick={clearFilters}>
                            <X aria-hidden="true" />
                            {t('common.clearFilters')}
                        </Button>
                    ) : (
                        <Button asChild>
                            <Link to="/admin/products/new">
                                <Plus aria-hidden="true" />
                                {t('products.add')}
                            </Link>
                        </Button>
                    )
                }
                toolbar={
                    <div className="flex flex-col gap-3">
                        <AdminListToolbar
                            search={search}
                            onSearchChange={setSearch}
                            searchPlaceholder={t('products.searchPlaceholder')}
                            status={status}
                            onStatusChange={setStatus}
                            sort={sort}
                            onSortChange={setSort}
                            sortOptions={sortOptions}
                        >
                            <Select
                                items={categoryItems}
                                value={categoryId}
                                onValueChange={(value) => {
                                    if (value) updateCategory(value);
                                }}
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label={t('fields.category')}
                                    className="w-40"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                items={brandItems}
                                value={brandId}
                                onValueChange={(value) => {
                                    if (value) updateBrand(value);
                                }}
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label={t('fields.brand')}
                                    className="w-40"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {brandItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </AdminListToolbar>

                        <div className="border-border grid gap-2 border-t pt-3 sm:grid-cols-2 lg:max-w-md">
                            <div className="grid gap-1">
                                <label
                                    htmlFor="products-min-price"
                                    className="text-muted-foreground text-xs"
                                >
                                    {t('products.minPrice')}
                                </label>
                                <Input
                                    id="products-min-price"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    value={minPrice}
                                    onChange={(event) => updateMinPrice(event.target.value)}
                                    className="h-8"
                                />
                            </div>

                            <div className="grid gap-1">
                                <label
                                    htmlFor="products-max-price"
                                    className="text-muted-foreground text-xs"
                                >
                                    {t('products.maxPrice')}
                                </label>
                                <Input
                                    id="products-max-price"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    value={maxPrice}
                                    onChange={(event) => updateMaxPrice(event.target.value)}
                                    className="h-8"
                                />
                            </div>
                        </div>
                    </div>
                }
                footer={
                    <AdminPagination
                        page={page}
                        totalPages={totalPages}
                        total={query.data?.total ?? 0}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        isFetching={query.isFetching}
                    />
                }
            />

            <ConfirmDialog
                open={productToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setProductToDelete(null);
                }}
                title={t('products.deleteTitle')}
                description={t('products.deleteDescription')}
                onConfirm={handleDelete}
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
