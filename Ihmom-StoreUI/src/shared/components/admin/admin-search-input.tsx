import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { cn } from '@/shared/lib/utils.ts';

interface AdminSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
    trailing?: ReactNode;
}

export function AdminSearchInput({
    value,
    onChange,
    placeholder,
    className,
    trailing,
}: AdminSearchInputProps) {
    const { t } = useTranslation('admin');

    return (
        <div className={cn('flex w-full items-center gap-2', className)}>
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <Search
                    className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
                    aria-hidden="true"
                />

                <Input
                    type="text"
                    role="searchbox"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    className="h-9 ps-8 pe-8"
                />

                {value ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="absolute end-1 top-1/2 -translate-y-1/2"
                        onClick={() => onChange('')}
                        aria-label={t('common.clearFilters')}
                    >
                        <X aria-hidden="true" />
                    </Button>
                ) : null}
            </div>

            {trailing}
        </div>
    );
}
