import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';

interface AdminRowActionsProps {
    label: string;
    onEdit?: () => void;
    editHref?: string;
    onDelete: () => void;
    deleteDisabled?: boolean;
    children?: ReactNode;
}

export function AdminRowActions({
    label,
    onEdit,
    editHref,
    onDelete,
    deleteDisabled,
    children,
}: AdminRowActionsProps) {
    const { t } = useTranslation('admin');

    return (
        <div className="flex items-center justify-end gap-1">
            {children}

            {onEdit ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t('common.edit')}: ${label}`}
                    onClick={onEdit}
                >
                    <Pencil aria-hidden="true" />
                </Button>
            ) : editHref ? (
                <Button asChild variant="ghost" size="icon-sm">
                    <Link to={editHref} aria-label={`${t('common.edit')}: ${label}`}>
                        <Pencil aria-hidden="true" />
                    </Link>
                </Button>
            ) : null}

            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={`${t('common.delete')}: ${label}`}
                disabled={deleteDisabled}
                onClick={onDelete}
            >
                <Trash2 aria-hidden="true" />
            </Button>
        </div>
    );
}
