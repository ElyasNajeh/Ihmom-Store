import axios from 'axios';
import i18n from '@/i18n';

interface ApiErrorBody {
    detail?: unknown;
    message?: unknown;
}

export function getApiErrorMessage(error: unknown): string | null {
    if (!axios.isAxiosError<ApiErrorBody>(error)) {
        return null;
    }
    const status = error.response?.status;
    const key = !status ? 'network' : status >= 500 ? 'server' : String(status);
    return i18n.t(`apiErrors.${key}`, {
        ns: 'common',
        defaultValue: i18n.t('apiErrors.unexpected', { ns: 'common' }),
    });
}
