import type { ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';
import { StoreFooter } from '@/components/store/layout/store-footer.tsx';
import { StoreNavbar } from '@/components/store/layout/store-navbar.tsx';
import { useScrollToTopOnNavigate } from '@/hooks/use-scroll-to-top-on-navigate.ts';

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
