import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useToastManager } from '@/components/ui/toast.tsx';
import { getApiErrorMessage } from '@/utils/api-error.ts';

export function useAdminToast() {
    const { t } = useTranslation('admin');
    const toastManager = useToastManager();

    const showSuccess = useCallback(
        (title: string, description?: string) => {
            toastManager.add({ type: 'success', title, description });
        },
        [toastManager],
    );

    const showError = useCallback(
        (error: unknown, fallbackDescription?: string) => {
            toastManager.add({
                type: 'error',
                title: t('common.errorTitle'),
                description:
                    getApiErrorMessage(error) ??
                    fallbackDescription ??
                    t('common.errorDescription'),
            });
        },
        [t, toastManager],
    );

    return { showSuccess, showError };
}
