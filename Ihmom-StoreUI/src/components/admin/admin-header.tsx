import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LogOut, Store } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb.tsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { SidebarTrigger } from '@/components/ui/sidebar.tsx';
import { LanguageSelector } from '@/i18n/components/LanguageSwitcher.tsx';
import ThemeToggle from '@/components/app/theme-toggle.tsx';
import { useAdminAuth } from '@/auth/admin-auth-context.ts';
import { findActiveAdminNavItem } from '@/components/admin/admin-navigation.ts';
import { useScrolled } from '@/hooks/use-scrolled.ts';
import { cn } from '@/lib/utils';

function initials(value: string | undefined): string {
    if (!value) return 'AD';

    return value.slice(0, 2).toUpperCase();
}

export function AdminHeader() {
    const { t } = useTranslation('admin');
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { admin, logout } = useAdminAuth();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const isScrolled = useScrolled();

    const activeItem = findActiveAdminNavItem(pathname);
    const sectionLabel = activeItem ? t(activeItem.labelKey) : t('dashboard.title');

    const handleLogout = async () => {
        if (isSigningOut) return;

        setIsSigningOut(true);

        try {
            await logout();
            navigate('/admin/login', { replace: true });
        } finally {
            setIsSigningOut(false);
        }
    };

    return (
        <header
            className={cn(
                'border-border/80 bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-3 backdrop-blur transition-shadow duration-300 sm:px-6',
                isScrolled && 'shadow-[0_12px_32px_-20px_rgba(0,0,0,0.4)]',
            )}
        >
            <SidebarTrigger
                aria-label={t('nav.toggleSidebar')}
                className="text-muted-foreground hover:text-foreground size-8 shrink-0 rtl:rotate-180"
            />

            <Separator orientation="vertical" className="me-1 h-5" />

            <Breadcrumb className="min-w-0">
                <BreadcrumbList className="flex-nowrap">
                    <BreadcrumbItem className="hidden shrink-0 sm:inline-flex">
                        <BreadcrumbLink
                            className="text-muted-foreground hover:text-foreground text-sm"
                            render={<Link to="/admin" />}
                        >
                            {t('brand', { defaultValue: 'Admin' })}
                        </BreadcrumbLink>
                    </BreadcrumbItem>

                    <BreadcrumbSeparator className="hidden sm:block rtl:rotate-180" />

                    <BreadcrumbItem className="min-w-0">
                        <BreadcrumbPage className="truncate text-sm font-medium">
                            {sectionLabel}
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
                <div className="hidden sm:block">
                    <LanguageSelector />
                </div>

                <ThemeToggle />

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-9 gap-2 rounded-full px-1.5 sm:pe-3"
                                aria-label={t('common.signedInAs', {
                                    name: admin?.username ?? t('common.unknownUser'),
                                })}
                            />
                        }
                    >
                        <span className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold">
                            {initials(admin?.username)}
                        </span>

                        <span className="hidden max-w-[10rem] truncate text-sm font-medium md:block">
                            {admin?.username ?? t('common.unknownUser')}
                        </span>

                        <ChevronDown
                            className="text-muted-foreground hidden size-3.5 md:block"
                            aria-hidden="true"
                        />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-60">
                        <DropdownMenuLabel className="flex flex-col gap-0.5">
                            <span className="text-foreground truncate text-sm font-medium">
                                {admin?.username ?? t('common.unknownUser')}
                            </span>
                            <span className="text-muted-foreground truncate text-xs font-normal">
                                {admin?.email}
                            </span>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            render={<Link to="/" target="_blank" rel="noopener noreferrer" />}
                        >
                            <Store aria-hidden="true" />
                            {t('common.viewStore')}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            variant="destructive"
                            disabled={isSigningOut}
                            onClick={() => void handleLogout()}
                        >
                            <LogOut aria-hidden="true" />
                            {t('common.logout')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
