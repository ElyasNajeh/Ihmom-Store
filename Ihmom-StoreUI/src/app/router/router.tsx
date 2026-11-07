import { Outlet, createBrowserRouter } from 'react-router-dom';
import AboutContactPage from '@/features/storefront/pages/about-contact-page.tsx';
import ContactPage from '@/features/support/pages/contact-page.tsx';
import CustomerCarePage from '@/features/support/pages/customer-care-page.tsx';
import DeliveryInformationPage from '@/features/support/pages/delivery-information-page.tsx';
import FaqsPage from '@/features/support/pages/faqs-page.tsx';
import HomePage from '@/features/storefront/pages/home-page.tsx';
import MyOrdersPage from '@/features/orders/pages/store/my-orders-page.tsx';
import ReturnsExchangesPage from '@/features/support/pages/returns-exchanges-page.tsx';
import ProductDetailPage from '@/features/catalog/pages/store/product-detail-page.tsx';
import CartPage from '@/features/cart/pages/cart-page.tsx';
import CheckoutPage from '@/features/orders/pages/store/checkout-page.tsx';
import { ShopRoute } from '@/app/router/shop-route.tsx';
import AdminLoginPage from '@/features/auth/pages/admin-login-page.tsx';
import AdminDashboardPage from '@/features/dashboard/pages/dashboard-page.tsx';
import AdminCategoriesPage from '@/features/catalog/pages/admin/categories-page.tsx';
import AdminBrandsPage from '@/features/catalog/pages/admin/brands-page.tsx';
import AdminProductsPage from '@/features/catalog/pages/admin/products-page.tsx';
import AdminProductEditorPage from '@/features/catalog/pages/admin/product-editor-page.tsx';
import AdminSlidersPage from '@/features/catalog/pages/admin/sliders-page.tsx';
import AdminCustomersPage from '@/features/customers/pages/customers-page.tsx';
import AdminDeliveryAreasPage from '@/features/delivery/pages/admin/delivery-areas-page.tsx';
import AdminAdminsPage from '@/features/admins/pages/admins-page.tsx';
import AdminOrdersPage from '@/features/orders/pages/admin/orders-page.tsx';
import AdminOrderDetailPage from '@/features/orders/pages/admin/order-detail-page.tsx';
import { AdminAuthProvider } from '@/app/providers/AdminAuthProvider.tsx';
import { RedirectIfAuthenticated, RequireAdmin } from '@/app/router/guards.tsx';
import { AdminLayout } from '@/app/layouts/admin-layout.tsx';
import { StoreLayout } from '@/app/layouts/store-layout.tsx';
import { RouteErrorPage } from '@/app/errors/route-error-page.tsx';

export const router = createBrowserRouter([
    {
        path: '/',
        errorElement: <RouteErrorPage />,
        children: [
            {
                element: <StoreLayout />,
                children: [
                    {
                        index: true,
                        element: <HomePage />,
                    },
                    {
                        path: 'about',
                        element: <AboutContactPage />,
                    },
                    {
                        path: 'shop',
                        element: <ShopRoute />,
                    },
                    {
                        path: 'shop/:productId',
                        element: <ProductDetailPage />,
                    },
                    {
                        path: 'cart',
                        element: <CartPage />,
                    },
                    {
                        path: 'checkout',
                        element: <CheckoutPage />,
                    },
                    {
                        path: 'my-orders',
                        element: <MyOrdersPage />,
                    },
                ],
            },
            {
                path: 'customer-care',
                element: <CustomerCarePage />,
            },
            {
                path: 'contact',
                element: <ContactPage />,
            },
            {
                path: 'delivery',
                element: <DeliveryInformationPage />,
            },
            {
                path: 'returns',
                element: <ReturnsExchangesPage />,
            },
            {
                path: 'faq',
                element: <FaqsPage />,
            },
        ],
    },
    {
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
                        element: <AdminLoginPage />,
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
                                element: <AdminDashboardPage />,
                            },
                            {
                                path: 'products',
                                element: <AdminProductsPage />,
                            },
                            {
                                path: 'products/new',
                                element: <AdminProductEditorPage />,
                            },
                            {
                                path: 'products/:productId',
                                element: <AdminProductEditorPage />,
                            },
                            {
                                path: 'categories',
                                element: <AdminCategoriesPage />,
                            },
                            {
                                path: 'brands',
                                element: <AdminBrandsPage />,
                            },
                            {
                                path: 'sliders',
                                element: <AdminSlidersPage />,
                            },
                            {
                                path: 'customers',
                                element: <AdminCustomersPage />,
                            },
                            {
                                path: 'delivery-areas',
                                element: <AdminDeliveryAreasPage />,
                            },
                            {
                                path: 'admins',
                                element: <AdminAdminsPage />,
                            },
                            {
                                path: 'orders',
                                element: <AdminOrdersPage />,
                            },
                            {
                                path: 'orders/:orderId',
                                element: <AdminOrderDetailPage />,
                            },
                        ],
                    },
                ],
            },
        ],
    },
]);
