import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty.tsx';
import { cn } from '@/lib/utils.ts';

interface AdminErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
    className?: string;
}

export function AdminErrorState({ title, description, onRetry, className }: AdminErrorStateProps) {
    const { t } = useTranslation('admin');

    return (
        <Empty className={cn('border-border border py-12', className)}>
            <EmptyHeader>
                <EmptyMedia variant="icon" className="text-destructive bg-destructive/10">
                    <AlertTriangle aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{title ?? t('common.errorTitle')}</EmptyTitle>
                <EmptyDescription>{description ?? t('common.errorDescription')}</EmptyDescription>
            </EmptyHeader>

            {onRetry ? (
                <EmptyContent>
                    <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                        <RefreshCw aria-hidden="true" />
                        {t('common.retry')}
                    </Button>
                </EmptyContent>
            ) : null}
        </Empty>
    );
}

interface AdminEmptyStateProps {
    title?: string;
    description?: string;
    action?: ReactNode;
    icon?: ReactNode;
    className?: string;
}

export function AdminEmptyState({
    title,
    description,
    action,
    icon,
    className,
}: AdminEmptyStateProps) {
    const { t } = useTranslation('admin');

    return (
        <Empty className={cn('border-border border py-12', className)}>
            <EmptyHeader>
                <EmptyMedia variant="icon">{icon ?? <Inbox aria-hidden="true" />}</EmptyMedia>
                <EmptyTitle>{title ?? t('common.noResults')}</EmptyTitle>
                <EmptyDescription>
                    {description ?? t('common.noResultsDescription')}
                </EmptyDescription>
            </EmptyHeader>

            {action ? <EmptyContent>{action}</EmptyContent> : null}
        </Empty>
    );
}
