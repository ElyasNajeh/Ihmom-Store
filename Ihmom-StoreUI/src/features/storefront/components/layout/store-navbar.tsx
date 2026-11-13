import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar.tsx';
import ThemeToggle from '@/shared/components/app/theme-toggle.tsx';
import { BrandMark } from '@/shared/components/brand/brand-mark.tsx';
import { LanguageSelector } from '@/i18n/components/LanguageSwitcher.tsx';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import { useScrolled } from '@/shared/hooks/useScrolled.ts';
import { useCart } from '@/features/cart/context/cart-context.ts';
import { formatCartBadgeCount } from '@/features/cart/constants/cart.ts';
import { cn } from '@/shared/lib/utils';
import { StoreSearchDialog } from './store-search-dialog';
import { StoreSidebar } from './store-sidebar';
import { getStoreName } from '@/features/storefront/constants/store.ts';

export function StoreNavbar() {
    const [searchOpen, setSearchOpen] = useState(false);
    const isScrolled = useScrolled();
    const isMobile = useIsMobile();
    const location = useLocation();
    const { t, i18n } = useTranslation(['navigation', 'common']);
    const { isArabic } = useLocale();
    const storeName = getStoreName(isArabic);
    const { itemCount } = useCart();
    const side = i18n.dir() === 'rtl' ? 'right' : 'left';

    const aboutHref = location.pathname === '/about' ? '#about' : '/about#about';
    const contactHref = '/contact';

    const routeLinks = [
        { id: 'home', label: t('navigation:header.home'), href: '/' },
        { id: 'shop', label: t('navigation:header.shop'), href: '/shop' },
        { id: 'myOrders', label: t('navigation:header.myOrders'), href: '/my-orders' },
    ];

    const sectionLinks = [
        { id: 'about', label: t('navigation:header.about'), href: aboutHref },
        { id: 'contact', label: t('navigation:header.contact'), href: contactHref },
    ];

    const isLinkActive = (id: string) => {
        if (id === 'home') return location.pathname === '/';
        if (id === 'shop') return location.pathname.startsWith('/shop');
        if (id === 'myOrders') return location.pathname.startsWith('/my-orders');
        if (id === 'about') return location.pathname === '/about';
        if (id === 'contact') return location.pathname === '/contact';

        return false;
    };

    const desktopLinkClassName = (active: boolean) =>
        cn(
            'relative rounded-sm text-[0.95rem] font-semibold tracking-tight transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            'after:absolute after:inset-x-0 after:-bottom-1.5 after:h-[2px] after:origin-center after:rounded-full after:bg-brand after:shadow-[0_0_10px_var(--brand)] after:transition-transform after:duration-300 after:ease-out',
            active
                ? 'text-foreground after:scale-x-100'
                : 'text-muted-foreground after:scale-x-0 hover:text-foreground hover:after:scale-x-100 focus-visible:after:scale-x-100',
        );

    useEffect(() => {
        if (!location.hash) return;

        const frame = requestAnimationFrame(() => {
            document
                .getElementById(decodeURIComponent(location.hash.slice(1)))
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        return () => cancelAnimationFrame(frame);
    }, [location.pathname, location.hash]);

    return (
        <SidebarProvider style={{ display: 'contents' }}>
            <header
                className={cn(
                    'border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-40 border-b backdrop-blur transition-shadow duration-300',
                    isScrolled && 'shadow-[0_12px_32px_-20px_rgba(0,0,0,0.4)]',
                )}
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <SidebarTrigger
                            aria-label={t('navigation:header.openNavigation')}
                            variant="outline"
                            size="icon"
                            className="size-10 shrink-0 md:hidden rtl:rotate-180 [&_svg]:size-5!"
                        />

                        <Link
                            to="/"
                            className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
                            aria-label={t('navigation:header.homeAriaLabel', {
                                store: storeName,
                            })}
                        >
                            <BrandMark className="size-11 sm:size-12" />

                            <span className="min-w-0 leading-tight">
                                <span className="block truncate text-sm font-semibold tracking-tight sm:text-base">
                                    {storeName}
                                </span>

                                <span className="text-muted-foreground hidden text-[11px] sm:block">
                                    {t('common:store.taglineShort')}
                                </span>
                            </span>
                        </Link>
                    </div>

                    <nav
                        className="hidden items-center gap-6 md:flex lg:gap-7"
                        aria-label={t('navigation:header.mainLabel')}
                    >
                        {routeLinks.map((link) => (
                            <Link
                                key={link.id}
                                to={link.href}
                                aria-current={isLinkActive(link.id) ? 'page' : undefined}
                                className={desktopLinkClassName(isLinkActive(link.id))}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {sectionLinks.map((link) => (
                            <Link
                                key={link.id}
                                to={link.href}
                                aria-current={isLinkActive(link.id) ? 'page' : undefined}
                                className={desktopLinkClassName(isLinkActive(link.id))}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                        <LanguageSelector />
                        <ThemeToggle />

                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('navigation:header.search')}
                            title={t('navigation:header.search')}
                            onClick={() => setSearchOpen(true)}
                        >
                            <Search className="size-4" aria-hidden="true" />
                        </Button>

                        <Button variant="outline" size="sm" asChild>
                            <Link to="/cart">
                                <ShoppingBag className="me-2 size-4" aria-hidden="true" />
                                {t('navigation:header.cart')}
                                {itemCount > 0 ? (
                                    <span className="bg-primary text-primary-foreground ms-2 grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums">
                                        {formatCartBadgeCount(itemCount)}
                                    </span>
                                ) : null}
                            </Link>
                        </Button>

                        <Button size="sm" asChild>
                            <Link to={contactHref}>{t('navigation:header.visitStore')}</Link>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 md:hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative size-10 shrink-0"
                            asChild
                        >
                            <Link to="/cart" aria-label={t('navigation:header.cart')}>
                                <ShoppingBag className="size-5" aria-hidden="true" />

                                {itemCount > 0 && (
                                    <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full text-[10px] font-semibold tabular-nums">
                                        {formatCartBadgeCount(itemCount)}
                                    </span>
                                )}
                            </Link>
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            className="size-10 shrink-0"
                            aria-label={t('navigation:header.search')}
                            onClick={() => setSearchOpen(true)}
                        >
                            <Search className="size-5" aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </header>

            {isMobile ? <StoreSidebar side={side} /> : null}

            <StoreSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </SidebarProvider>
    );
}
