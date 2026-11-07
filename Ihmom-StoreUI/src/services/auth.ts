import { api, refreshAccessToken, setAccessToken } from './axios.ts';
import type {
    CurrentAdmin,
    LoginAdmin,
    LoginAdminResponse,
    MessageResponse,
} from '@/models/auth.ts';

export async function loginAdmin(credentials: LoginAdmin): Promise<LoginAdminResponse> {
    const response = await api.post<LoginAdminResponse>('/auth/login', credentials);

    setAccessToken(response.data.access_token);

    return response.data;
}

export async function fetchCurrentAdmin(): Promise<CurrentAdmin> {
    const response = await api.get<CurrentAdmin>('/auth/me');

    return response.data;
}

export async function restoreAdminSession(): Promise<CurrentAdmin> {
    await refreshAccessToken();

    return fetchCurrentAdmin();
}

export async function logoutAdmin(): Promise<MessageResponse | null> {
    try {
        const response = await api.post<MessageResponse>('/auth/logout');

        return response.data;
    } catch {
        return null;
    } finally {
        setAccessToken(null);
    }
}
