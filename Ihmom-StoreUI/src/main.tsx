import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import axios from 'axios';

import './i18n';
import './styles/index.css';

import { router } from './routes/router.tsx';
import { DocumentLanguageSync } from '@/i18n/DocumentLanguageSync.tsx';
import { TooltipProvider } from '@/components/ui/tooltip.tsx';
import { ThemeProvider } from '@/components/app/theme-provider.tsx';
import { Toaster } from '@/components/ui/toast.tsx';
import { AppErrorBoundary } from '@/components/app/app-error-boundary.tsx';
import { THEME_DEFAULT, THEME_STORAGE_KEY } from '@/constants/theme.ts';
import { CartProvider } from '@/cart/CartProvider.tsx';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,

            retry: (failureCount, error) => {
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    if (status === 404 || status === 409) {
                        return false;
                    }
                }
                return failureCount < 3;
            },

            retryDelay: (attemptIndex, error) => {
                if (axios.isAxiosError(error)) {
                    const retryAfter = error.response?.headers['retry-after'];
                    if (retryAfter) {
                        const seconds = Number(retryAfter);
                        if (!Number.isNaN(seconds)) {
                            return seconds * 1000;
                        }
                    }
                }
                return Math.min(1000 * 2 ** attemptIndex, 30000);
            },

            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchOnMount: true,
            networkMode: 'online',
        },
        mutations: {
            retry: false,
        },
    },
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppErrorBoundary>
                <ThemeProvider defaultTheme={THEME_DEFAULT} storageKey={THEME_STORAGE_KEY}>
                    <TooltipProvider>
                        <Toaster>
                            <DocumentLanguageSync />
                            <CartProvider>
                                <RouterProvider router={router} />
                            </CartProvider>
                        </Toaster>
                    </TooltipProvider>
                </ThemeProvider>
            </AppErrorBoundary>

            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    </StrictMode>,
);
