import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import axios from 'axios';
import type { ReactNode } from 'react';

import { CartProvider } from '@/app/providers/CartProvider.tsx';
import { ThemeProvider } from '@/app/providers/ThemeProvider.tsx';
import { THEME_DEFAULT, THEME_STORAGE_KEY } from '@/features/theme/constants/theme.ts';
import { DocumentLanguageSync } from '@/i18n/DocumentLanguageSync.tsx';
import { AppErrorBoundary } from '@/shared/components/app/app-error-boundary.tsx';
import { Toaster } from '@/shared/components/ui/toast.tsx';
import { TooltipProvider } from '@/shared/components/ui/tooltip.tsx';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { type Language, LANGUAGE_METADATA } from '@/i18n/locales.ts';
import { useTranslation } from 'react-i18next';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,

            retry: (failureCount, error) => {
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    if (status && status >= 400 && status < 500) {
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
            networkMode: 'always',
        },
    },
});

export function AppProviders({ children }: { children: ReactNode }) {
    const { i18n } = useTranslation();
    const resolvedLanguage = i18n.resolvedLanguage?.split('-')[0];
    const language: Language = resolvedLanguage === 'ar' ? 'ar' : 'en';
    const direction = LANGUAGE_METADATA[language].dir;
    return (
        <QueryClientProvider client={queryClient}>
            <AppErrorBoundary>
                <DirectionProvider direction={direction}>
                    <ThemeProvider defaultTheme={THEME_DEFAULT} storageKey={THEME_STORAGE_KEY}>
                        <TooltipProvider>
                            <Toaster>
                                <DocumentLanguageSync />
                                <CartProvider>{children}</CartProvider>
                            </Toaster>
                        </TooltipProvider>
                    </ThemeProvider>
                </DirectionProvider>
            </AppErrorBoundary>

            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
}