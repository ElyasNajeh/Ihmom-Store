import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store } from 'lucide-react';

import { BrandMark } from '@/components/brand/brand-mark.tsx';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar.tsx';
import { useAdminAuth } from '@/auth/admin-auth-context.ts';
import { ADMIN_NAV_GROUPS, isAdminNavItemActive } from '@/components/admin/admin-navigation.ts';

export function AdminSidebar({ side }: { side: 'left' | 'right' }) {
    const { t } = useTranslation('admin');
    const { pathname } = useLocation();
    const { admin } = useAdminAuth();
    const { setOpenMobile } = useSidebar();

    return (
        <Sidebar side={side} collapsible="icon">
            <SidebarHeader className="border-sidebar-border h-16 justify-center border-b px-2 py-0">
                <Link
                    to="/admin"
                    className="flex items-center gap-2.5 rounded-md px-1 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                    aria-label={t('nav.brand')}
                >
                    <BrandMark className="size-10" />

                    <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="block truncate text-sm font-semibold">
                            {t('nav.brand')}
                        </span>
                        <span className="text-muted-foreground block truncate text-[11px]">
                            {t('nav.brandSubtitle')}
                        </span>
                    </span>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                {ADMIN_NAV_GROUPS.map((group) => (
                    <SidebarGroup key={group.labelKey}>
                        <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const active = isAdminNavItemActive(item, pathname);

                                    return (
                                        <SidebarMenuItem key={item.to}>
                                            <SidebarMenuButton
                                                isActive={active}
                                                tooltip={t(item.labelKey)}
                                                render={
                                                    <Link
                                                        to={item.to}
                                                        onClick={() => setOpenMobile(false)}
                                                    />
                                                }
                                            >
                                                <Icon aria-hidden="true" />
                                                <span>{t(item.labelKey)}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="border-sidebar-border border-t">
                <div className="text-muted-foreground flex items-center gap-2 px-1 py-1 text-xs group-data-[collapsible=icon]:hidden">
                    <span className="bg-muted text-foreground grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold">
                        {admin?.username.slice(0, 2).toUpperCase() ?? 'AD'}
                    </span>
                    <span className="min-w-0">
                        <span className="text-foreground block truncate font-medium">
                            {admin?.username ?? t('common.unknownUser')}
                        </span>
                        <span className="block truncate">{admin?.email}</span>
                    </span>
                </div>

                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip={t('nav.backToStore')} render={<Link to="/" />}>
                            <Store aria-hidden="true" />
                            <span>{t('nav.backToStore')}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
