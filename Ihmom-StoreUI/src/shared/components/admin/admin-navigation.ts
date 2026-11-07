import {
    BadgeCheck,
    GalleryHorizontal,
    LayoutDashboard,
    Package,
    ShieldCheck,
    ShoppingCart,
    Tags,
    Truck,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AdminNavItem {
    to: string;
    labelKey: string;
    icon: LucideIcon;
    end?: boolean;
}

export interface AdminNavGroup {
    labelKey: string;
    items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
    {
        labelKey: 'nav.overview',
        items: [
            {
                to: '/admin',
                labelKey: 'nav.dashboard',
                icon: LayoutDashboard,
                end: true,
            },
        ],
    },
    {
        labelKey: 'nav.catalogue',
        items: [
            { to: '/admin/products', labelKey: 'nav.products', icon: Package },
            { to: '/admin/categories', labelKey: 'nav.categories', icon: Tags },
            { to: '/admin/brands', labelKey: 'nav.brands', icon: BadgeCheck },
            { to: '/admin/sliders', labelKey: 'nav.sliders', icon: GalleryHorizontal },
        ],
    },
    {
        labelKey: 'nav.sales',
        items: [
            { to: '/admin/orders', labelKey: 'nav.orders', icon: ShoppingCart },
            { to: '/admin/customers', labelKey: 'nav.customers', icon: Users },
            { to: '/admin/delivery-areas', labelKey: 'nav.deliveryAreas', icon: Truck },
        ],
    },
    {
        labelKey: 'nav.access',
        items: [{ to: '/admin/admins', labelKey: 'nav.admins', icon: ShieldCheck }],
    },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export function isAdminNavItemActive(item: AdminNavItem, pathname: string): boolean {
    if (item.end) {
        return pathname === item.to;
    }

    return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function findActiveAdminNavItem(pathname: string): AdminNavItem | undefined {
    return ADMIN_NAV_ITEMS.find((item) => isAdminNavItemActive(item, pathname));
}
