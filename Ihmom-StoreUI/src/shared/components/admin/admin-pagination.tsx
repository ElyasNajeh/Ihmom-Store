import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/ui/button.tsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select.tsx';
import { PAGE_SIZE_OPTIONS } from '@/shared/constants/query.ts';
import { cn } from '@/shared/lib/utils.ts';

interface AdminPaginationProps {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    isFetching?: boolean;
    className?: string;
}

export function AdminPagination({
    page,
    pageSize,
    total,
    totalPages,
    onPageChange,
    onPageSizeChange,
    isFetching = false,
    className,
}: AdminPaginationProps) {
    const { t } = useTranslation('admin');
    const pages = Math.max(totalPages, 1);
    const pageSizeItems = PAGE_SIZE_OPTIONS.map((size) => ({
        value: String(size),
        label: String(size),
    }));

    return (
        <div
            className={cn(
                'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
        >
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span>{t('common.resultsCount', { count: total })}</span>

                {onPageSizeChange ? (
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">{t('common.of')}</span>
                        <Select
                            items={pageSizeItems}
                            value={String(pageSize)}
                            onValueChange={(value) => onPageSizeChange(Number(value))}
                        >
                            <SelectTrigger
                                size="sm"
                                className="w-16 text-xs"
                                aria-label={t('common.resultsCount', { count: total })}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <SelectItem key={size} value={String(size)} className="text-xs">
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-muted-foreground text-xs tabular-nums">
                    {t('common.pageOf', { page, pages })}
                </span>

                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1 || isFetching}
                        aria-label={t('common.previous')}
                    >
                        <ChevronLeft className="rtl:rotate-180" aria-hidden="true" />
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= pages || isFetching}
                        aria-label={t('common.next')}
                    >
                        <ChevronRight className="rtl:rotate-180" aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
