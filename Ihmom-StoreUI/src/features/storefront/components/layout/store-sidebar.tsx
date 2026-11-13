import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    CircleHelp,
    Home,
    Info,
    Mail,
    MessageCircle,
    Package,
    RotateCcw,
    ShoppingBag,
    Truck,
    X,
} from 'lucide-react';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    useSidebar,
} from '@/shared/components/ui/sidebar.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { BrandMark } from '@/shared/components/brand/brand-mark.tsx';
import ThemeToggle from '@/shared/components/app/theme-toggle.tsx';
import { LanguageSelector } from '@/i18n/components/LanguageSwitcher.tsx';
import { useCart } from '@/features/cart/context/cart-context.ts';
import { formatCartBadgeCount } from '@/features/cart/constants/cart.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import { getStoreName } from '@/features/storefront/constants/store.ts';

export function StoreSidebar({ side }: { side: 'left' | 'right' }) {
    const { t } = useTranslation(['navigation', 'common']);
    const { isArabic } = useLocale();
    const storeName = getStoreName(isArabic);
    const { setOpenMobile } = useSidebar();
    const { itemCount } = useCart();
    const { pathname } = useLocation();

    const close = () => setOpenMobile(false);

    const browseLinks = [
        { id: 'home', label: t('navigation:header.home'), to: '/', icon: Home },
        { id: 'shop', label: t('navigation:header.shop'), to: '/shop', icon: Package },
        {
            id: 'myOrders',
            label: t('navigation:header.myOrders'),
            to: '/my-orders',
            icon: ShoppingBag,
        },
    ];

    const supportLinks = [
        { id: 'about', label: t('navigation:header.about'), to: '/about#about', icon: Info },
        { id: 'contact', label: t('navigation:header.contact'), to: '/contact', icon: Mail },
        {
            id: 'customerCare',
            label: t('navigation:footer.customerCare'),
            to: '/customer-care',
            icon: MessageCircle,
        },
        {
            id: 'delivery',
            label: t('navigation:footer.deliveryInformation'),
            to: '/delivery',
            icon: Truck,
        },
        {
            id: 'returns',
            label: t('navigation:footer.returnsExchanges'),
            to: '/returns',
            icon: RotateCcw,
        },
        {
            id: 'faq',
            label: t('navigation:footer.faqs'),
            to: '/faq',
            icon: CircleHelp,
        },
    ];

    const isActive = (id: string) => {
        if (id === 'home') return pathname === '/';
        if (id === 'shop') return pathname.startsWith('/shop');
        if (id === 'myOrders') return pathname.startsWith('/my-orders');
        if (id === 'about') return pathname === '/about';
        if (id === 'contact') return pathname === '/contact';
        if (id === 'customerCare') return pathname === '/customer-care';
        if (id === 'delivery') return pathname === '/delivery';
        if (id === 'returns') return pathname === '/returns';
        if (id === 'faq') return pathname === '/faq';

        return false;
    };

    return (
        <Sidebar side={side} collapsible="offcanvas">
            <SidebarHeader className="border-sidebar-border border-b">
                <div className="flex items-center justify-between gap-2">
                    <Link
                        to="/"
                        onClick={close}
                        className="flex min-w-0 items-center gap-2.5 rounded-lg p-1"
                        aria-label={t('navigation:header.homeAriaLabel', {
                            store: storeName,
                        })}
                    >
                        <BrandMark className="size-11" />

                        <span className="min-w-0 leading-tight">
                            <span className="block truncate text-sm font-semibold">
                                {storeName}
                            </span>
                            <span className="text-muted-foreground block truncate text-[11px]">
                                {t('common:store.taglineShort')}
                            </span>
                        </span>
                    </Link>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('navigation:header.closeNavigation')}
                        onClick={close}
                    >
                        <X aria-hidden="true" />
                    </Button>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{t('navigation:header.browse')}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {browseLinks.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            isActive={isActive(item.id)}
                                            size="lg"
                                            render={<Link to={item.to} onClick={close} />}
                                        >
                                            <Icon aria-hidden="true" />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>

                                        {item.id === 'myOrders' && itemCount > 0 ? (
                                            <SidebarMenuBadge>
                                                {formatCartBadgeCount(itemCount)}
                                            </SidebarMenuBadge>
                                        ) : null}
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupLabel>{t('navigation:footer.customerCare')}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {supportLinks.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            isActive={isActive(item.id)}
                                            render={<Link to={item.to} onClick={close} />}
                                        >
                                            <Icon aria-hidden="true" />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-sidebar-border border-t">
                <div className="flex items-center justify-between gap-3 px-1 pt-1">
                    <LanguageSelector />
                    <ThemeToggle />
                </div>
                <p className="text-muted-foreground px-1 pt-1 text-[11px] leading-4">
                    {t('common:store.tagline')}
                </p>
            </SidebarFooter>
        </Sidebar>
    );
}
