import { Outlet, createBrowserRouter } from 'react-router-dom';
import { ShopRoute } from '@/app/router/shop-route.tsx';
import { AdminAuthProvider } from '@/app/providers/AdminAuthProvider.tsx';
import { RedirectIfAuthenticated, RequireAdmin } from '@/app/router/guards.tsx';
import { AdminLayout } from '@/app/layouts/admin-layout.tsx';
import { StoreLayout } from '@/app/layouts/store-layout.tsx';
import { RouteErrorPage } from '@/app/errors/route-error-page.tsx';
import { Spinner } from '@/shared/components/ui/spinner.tsx';

const routeFallback = (
    <div
        className="bg-background flex min-h-dvh items-center justify-center"
        role="status"
        aria-live="polite"
    >
        <Spinner aria-hidden="true" className="size-6" />
        <span className="sr-only">Loading...</span>
    </div>
);

export const router = createBrowserRouter([
    {
        path: '/',
        hydrateFallbackElement: routeFallback,
        errorElement: <RouteErrorPage />,
        children: [
            {
                element: <StoreLayout />,
                children: [
                    {
                        index: true,
                        lazy: async () => ({
                            Component: (await import('@/features/storefront/pages/home-page.tsx'))
                                .default,
                        }),
                    },
                    {
                        path: 'about',
                        lazy: async () => ({
                            Component: (
                                await import('@/features/storefront/pages/about-contact-page.tsx')
                            ).default,
                        }),
                    },
                    {
                        path: 'shop',
                        element: <ShopRoute />,
                    },
                    {
                        path: 'shop/:productId',
                        lazy: async () => ({
                            Component: (
                                await import('@/features/catalog/pages/store/product-detail-page.tsx')
                            ).default,
                        }),
                    },
                    {
                        path: 'cart',
                        lazy: async () => ({
                            Component: (await import('@/features/cart/pages/cart-page.tsx'))
                                .default,
                        }),
                    },
                    {
                        path: 'checkout',
                        lazy: async () => ({
                            Component: (
                                await import('@/features/orders/pages/store/checkout-page.tsx')
                            ).default,
                        }),
                    },
                    {
                        path: 'my-orders',
                        lazy: async () => ({
                            Component: (
                                await import('@/features/orders/pages/store/my-orders-page.tsx')
                            ).default,
                        }),
                    },
                ],
            },
            {
                path: 'customer-care',
                lazy: async () => ({
                    Component: (await import('@/features/support/pages/customer-care-page.tsx'))
                        .default,
                }),
            },
            {
                path: 'contact',
                lazy: async () => ({
                    Component: (await import('@/features/support/pages/contact-page.tsx')).default,
                }),
            },
            {
                path: 'delivery',
                lazy: async () => ({
                    Component: (
                        await import('@/features/support/pages/delivery-information-page.tsx')
                    ).default,
                }),
            },
            {
                path: 'returns',
                lazy: async () => ({
                    Component: (await import('@/features/support/pages/returns-exchanges-page.tsx'))
                        .default,
                }),
            },
            {
                path: 'faq',
                lazy: async () => ({
                    Component: (await import('@/features/support/pages/faqs-page.tsx')).default,
                }),
            },
        ],
    },
    {
        hydrateFallbackElement: routeFallback,
        element: (
            <AdminAuthProvider>
                <Outlet />
            </AdminAuthProvider>
        ),
        errorElement: <RouteErrorPage />,
        children: [
            {
                element: <RedirectIfAuthenticated />,
                children: [
                    {
                        path: 'admin/login',
                        lazy: async () => ({
                            Component: (await import('@/features/auth/pages/admin-login-page.tsx'))
                                .default,
                        }),
                    },
                ],
            },
            {
                element: <RequireAdmin />,
                children: [
                    {
                        path: 'admin',
                        element: <AdminLayout />,
                        children: [
                            {
                                index: true,
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/dashboard/pages/dashboard-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'products',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/catalog/pages/admin/products-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'products/new',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/catalog/pages/admin/product-editor-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'products/:productId',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/catalog/pages/admin/product-editor-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'categories',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/catalog/pages/admin/categories-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'brands',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/catalog/pages/admin/brands-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'sliders',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/catalog/pages/admin/sliders-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'customers',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/customers/pages/customers-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'delivery-areas',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/delivery/pages/admin/delivery-areas-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'admins',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/admins/pages/admins-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'orders',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/orders/pages/admin/orders-page.tsx')
                                    ).default,
                                }),
                            },
                            {
                                path: 'orders/:orderId',
                                lazy: async () => ({
                                    Component: (
                                        await import('@/features/orders/pages/admin/order-detail-page.tsx')
                                    ).default,
                                }),
                            },
                        ],
                    },
                ],
            },
        ],
    },
]);
