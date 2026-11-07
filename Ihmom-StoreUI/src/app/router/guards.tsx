import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/shared/components/app/spinner.tsx';
import { useAdminAuth } from '@/features/auth/context/admin-auth-context.ts';

function SessionLoader() {
    const { t } = useTranslation('common');

    return (
        <div
            className="bg-background flex min-h-dvh flex-col items-center justify-center gap-3"
            role="status"
            aria-live="polite"
        >
            <Spinner size={24} color="currentColor" className="text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t('auth.checkingSession')}</p>
        </div>
    );
}

export function RequireAdmin() {
    const { status } = useAdminAuth();
    const location = useLocation();

    if (status === 'loading') {
        return <SessionLoader />;
    }

    if (status === 'unauthenticated') {
        return (
            <Navigate
                to="/admin/login"
                replace
                state={{ from: `${location.pathname}${location.search}` }}
            />
        );
    }

    return <Outlet />;
}

export function RedirectIfAuthenticated() {
    const { status } = useAdminAuth();
    const location = useLocation();
    const from = (location.state as { from?: string } | null)?.from;

    if (status === 'loading') {
        return <SessionLoader />;
    }

    if (status === 'authenticated') {
        return <Navigate to={from && from.startsWith('/admin') ? from : '/admin'} replace />;
    }

    return <Outlet />;
}
