import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils.ts';
import { StoreFooter } from '@/features/storefront/components/layout/store-footer.tsx';
import { StoreNavbar } from '@/features/storefront/components/layout/store-navbar.tsx';
import { useScrollToTopOnNavigate } from '@/shared/hooks/useScrollToTopOnNavigate.ts';

interface StoreShellProps {
    children: ReactNode;
    className?: string;
}

export function StoreShell({ children, className }: StoreShellProps) {
    useScrollToTopOnNavigate();

    return (
        <div className={cn('bg-background text-foreground min-h-screen', className)}>
            <StoreNavbar />
            {children}
            <StoreFooter />
        </div>
    );
}
