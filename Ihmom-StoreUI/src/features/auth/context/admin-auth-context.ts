import { createContext, useContext } from 'react';

import type { CurrentAdmin, LoginAdmin, LoginAdminResponse } from '@/features/auth/types/auth.ts';

export type AdminAuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AdminAuthState {
    status: AdminAuthStatus;
    admin: CurrentAdmin | null;
}

export interface AdminAuthContextValue extends AdminAuthState {
    login: (credentials: LoginAdmin) => Promise<LoginAdminResponse>;
    logout: () => Promise<void>;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth(): AdminAuthContextValue {
    const context = useContext(AdminAuthContext);

    if (!context) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }

    return context;
}
