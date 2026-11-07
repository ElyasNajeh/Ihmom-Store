import { Outlet, createBrowserRouter } from 'react-router-dom';
import AboutContactPage from '@/pages/store/about-contact-page.tsx';
import ContactPage from '@/pages/store/support/contact-page.tsx';
import CustomerCarePage from '@/pages/store/support/customer-care-page.tsx';
import DeliveryInformationPage from '@/pages/store/support/delivery-information-page.tsx';
import FaqsPage from '@/pages/store/support/faqs-page.tsx';
import HomePage from '@/pages/store/home-page.tsx';
import MyOrdersPage from '@/pages/store/orders/my-orders-page.tsx';
import ReturnsExchangesPage from '@/pages/store/support/returns-exchanges-page.tsx';
import ProductDetailPage from '@/pages/store/shop/product-detail-page.tsx';
import CartPage from '@/pages/store/cart/cart-page.tsx';
import CheckoutPage from '@/pages/store/cart/checkout-page.tsx';
import { ShopRoute } from '@/routes/shop-route.tsx';
import AdminLoginPage from '@/pages/admin/login-page.tsx';
import AdminDashboardPage from '@/pages/admin/dashboard/dashboard-page.tsx';
import AdminCategoriesPage from '@/pages/admin/catalog/categories-page.tsx';
import AdminBrandsPage from '@/pages/admin/catalog/brands-page.tsx';
import AdminProductsPage from '@/pages/admin/catalog/products-page.tsx';
import AdminProductEditorPage from '@/pages/admin/catalog/product-editor-page.tsx';
import AdminSlidersPage from '@/pages/admin/catalog/sliders-page.tsx';
import AdminCustomersPage from '@/pages/admin/people/customers-page.tsx';
import AdminDeliveryAreasPage from '@/pages/admin/delivery/delivery-areas-page.tsx';
import AdminAdminsPage from '@/pages/admin/people/admins-page.tsx';
import AdminOrdersPage from '@/pages/admin/sales/orders-page.tsx';
import AdminOrderDetailPage from '@/pages/admin/sales/order-detail-page.tsx';
import { AdminAuthProvider } from '@/auth/AdminAuthProvider.tsx';
import { RedirectIfAuthenticated, RequireAdmin } from '@/auth/guards.tsx';
import { AdminLayout } from '@/components/admin/admin-layout.tsx';
import { RouteErrorPage } from '@/pages/route-error-page.tsx';

export const router = createBrowserRouter([
    {
        path: '/',
        errorElement: <RouteErrorPage />,
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
