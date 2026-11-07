import { Outlet } from 'react-router-dom';

import { StoreShell } from '@/features/storefront/components/layout/store-shell.tsx';

export function StoreLayout() {
    return (
        <StoreShell>
            <Outlet />
        </StoreShell>
    );
}
