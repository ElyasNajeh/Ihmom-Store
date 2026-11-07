import axios from 'axios';

interface ApiErrorBody {
    detail?: unknown;
    message?: unknown;
}

export function getApiErrorMessage(error: unknown): string | null {
    if (!axios.isAxiosError<ApiErrorBody>(error)) {
        return null;
    }
    const detail = error.response?.data?.detail ?? error.response?.data?.message;
    if (typeof detail === 'string' && detail.trim()) {
        return detail;
    }
    return null;
}
