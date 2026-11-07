import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar.tsx';
import { AdminSidebar } from '@/shared/components/admin/admin-sidebar.tsx';
import { AdminHeader } from '@/shared/components/admin/admin-header.tsx';
import { useScrollToTopOnNavigate } from '@/shared/hooks/useScrollToTopOnNavigate.ts';

export function AdminLayout() {
    const { i18n } = useTranslation();
    useScrollToTopOnNavigate();

    const side = i18n.dir() === 'rtl' ? 'right' : 'left';

    return (
        <SidebarProvider>
            <AdminSidebar side={side} />

            <SidebarInset className="min-w-0">
                <AdminHeader />

                <div className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
