import { useTranslation } from 'react-i18next';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select.tsx';
import {
    ACTIVE_FILTER,
    ACTIVE_FILTER_OPTIONS,
    type ActiveFilterValue,
} from '@/shared/constants/query.ts';

interface AdminActiveFilterProps {
    value: ActiveFilterValue;
    onChange: (value: ActiveFilterValue) => void;
    className?: string;
}

export function AdminActiveFilter({ value, onChange, className }: AdminActiveFilterProps) {
    const { t } = useTranslation('admin');

    const items = ACTIVE_FILTER_OPTIONS.map(({ value: optionValue, labelKey }) => ({
        value: optionValue,
        label: t(labelKey),
    }));

    return (
        <Select
            items={items}
            value={value}
            onValueChange={(nextValue) => {
                if (ACTIVE_FILTER_OPTIONS.some((option) => option.value === nextValue)) {
                    onChange(nextValue as ActiveFilterValue);
                }
            }}
        >
            <SelectTrigger size="sm" aria-label={t('fields.isActive')} className={className}>
                <SelectValue />
            </SelectTrigger>

            <SelectContent>
                <SelectItem value={ACTIVE_FILTER.ALL}>{t('common.all')}</SelectItem>
                <SelectItem value={ACTIVE_FILTER.ACTIVE}>{t('common.active')}</SelectItem>
                <SelectItem value={ACTIVE_FILTER.INACTIVE}>{t('common.inactive')}</SelectItem>
            </SelectContent>
        </Select>
    );
}
