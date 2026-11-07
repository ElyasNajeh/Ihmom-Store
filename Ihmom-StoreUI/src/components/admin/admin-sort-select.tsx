import { ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.tsx';

export interface AdminSortOption<T extends string> {
    value: T;
    label: string;
}

interface AdminSortSelectProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    options: AdminSortOption<T>[];
    ariaLabel?: string;
    className?: string;
}

export function AdminSortSelect<T extends string>({
    value,
    onChange,
    options,
    ariaLabel,
    className,
}: AdminSortSelectProps<T>) {
    const { t } = useTranslation('admin');

    return (
        <Select
            items={options}
            value={value}
            onValueChange={(nextValue) => {
                const option = options.find((entry) => entry.value === nextValue);

                if (option) {
                    onChange(option.value);
                }
            }}
        >
            <SelectTrigger
                size="sm"
                aria-label={ariaLabel ?? t('common.sortBy')}
                className={className}
            >
                <ArrowUpDown className="text-muted-foreground" aria-hidden="true" />
                <SelectValue />
            </SelectTrigger>

            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
