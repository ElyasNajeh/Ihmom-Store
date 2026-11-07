import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { CurrentAdmin, LoginAdmin } from '@/models/auth.ts';
import { CURRENT_ADMIN } from '@/utils/query-keys.ts';
import {
    fetchCurrentAdmin,
    loginAdmin,
    logoutAdmin,
    restoreAdminSession,
} from '@/services/auth.ts';
import { SESSION_EXPIRED_EVENT, setAccessToken } from '@/services/axios.ts';
import {
    AdminAuthContext,
    type AdminAuthContextValue,
    type AdminAuthState,
} from '@/auth/admin-auth-context.ts';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [state, setState] = useState<AdminAuthState>({
        status: 'loading',
        admin: null,
    });
    const bootstrapRef = useRef<Promise<CurrentAdmin> | null>(null);

    useEffect(() => {
        let cancelled = false;

        bootstrapRef.current ??= restoreAdminSession();

        bootstrapRef.current
            .then((admin) => {
                if (cancelled) return;

                queryClient.setQueryData([CURRENT_ADMIN], admin);
                setState({ status: 'authenticated', admin });
            })
            .catch(() => {
                if (cancelled) return;

                setState({ status: 'unauthenticated', admin: null });
            });

        return () => {
            cancelled = true;
        };
    }, [queryClient]);

    useEffect(() => {
        const handleSessionExpired = () => {
            setAccessToken(null);
            queryClient.setQueryData([CURRENT_ADMIN], null);
            setState({ status: 'unauthenticated', admin: null });
        };

        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    }, [queryClient]);

    const login = useCallback(
        async (credentials: LoginAdmin) => {
            const response = await loginAdmin(credentials);
            const admin = await fetchCurrentAdmin();

            queryClient.setQueryData([CURRENT_ADMIN], admin);
            setState({ status: 'authenticated', admin });
            bootstrapRef.current = Promise.resolve(admin);

            return response;
        },
        [queryClient],
    );

    const logout = useCallback(async () => {
        await logoutAdmin();

        queryClient.clear();
        setState({ status: 'unauthenticated', admin: null });
    }, [queryClient]);

    const value = useMemo<AdminAuthContextValue>(
        () => ({ ...state, login, logout }),
        [state, login, logout],
    );

    return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
