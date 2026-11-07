import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import type { RefreshAdminResponse } from '@/features/auth/types/auth.ts';

function getBaseURL(): string {
    const configured = (import.meta.env.VITE_API_URL ?? '').trim();

    if (configured) {
        return configured.replace(/\/+$/, '');
    }

    if (import.meta.env.DEV) {
        return (import.meta.env.VITE_DEVELOPMENT_API_URL || 'http://localhost:8000').replace(
            /\/+$/,
            '',
        );
    }

    return (import.meta.env.VITE_DEPLOYMENT_API_URL || '').replace(/\/+$/, '');
}

export const API_BASE_URL = getBaseURL();

export const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        Accept: 'application/json',
    },
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024,
    withCredentials: true,
    timeout: 60 * 1000,
});

// Order-history requests use their own short-lived token and must never trigger
// the admin refresh flow or carry admin credentials.
export const orderHistoryApi: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        Accept: 'application/json',
    },
    withCredentials: false,
    timeout: 60 * 1000,
});

// Kept separate so token refresh never triggers the response interceptor loop.
const authApi: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        Accept: 'application/json',
    },
    withCredentials: true,
    timeout: 60 * 1000,
});

let accessToken: string | null = null;

export function getAccessToken(): string | null {
    return accessToken;
}

export function setAccessToken(token: string | null): void {
    accessToken = token;
}

export const SESSION_EXPIRED_EVENT = 'ihmom:session-expired';

export function emitSessionExpired(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
}

let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
    if (!refreshPromise) {
        refreshPromise = authApi
            .post<RefreshAdminResponse>('/auth/refresh')
            .then((response) => {
                setAccessToken(response.data.access_token);

                return response.data.access_token;
            })
            .catch((error: unknown) => {
                setAccessToken(null);

                throw error;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

export function apiAssetUrl(path: string | null | undefined): string | null {
    if (!path) {
        return null;
    }

    if (/^(https?:|data:|blob:)/i.test(path)) {
        return path;
    }

    const origin =
        API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : undefined);

    if (!origin) {
        return path;
    }

    return new URL(path, `${origin}/`).toString();
}

function isAuthEndpoint(url?: string): boolean {
    if (!url) {
        return false;
    }

    return (
        url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')
    );
}

api.interceptors.request.use((config) => {
    if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        if (!axios.isAxiosError(error)) {
            return Promise.reject(error);
        }

        const config = error.config as
            (InternalAxiosRequestConfig & { retry?: boolean }) | undefined;

        if (
            error.response?.status !== 401 ||
            !config ||
            config.retry ||
            isAuthEndpoint(config.url)
        ) {
            return Promise.reject(error);
        }

        config.retry = true;

        try {
            await refreshAccessToken();

            return api(config);
        } catch {
            emitSessionExpired();

            return Promise.reject(error);
        }
    },
);
