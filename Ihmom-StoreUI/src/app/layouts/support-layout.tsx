import type { ReactNode } from 'react';

import { StoreFooter } from '@/features/storefront/components/layout/store-footer.tsx';
import { StoreNavbar } from '@/features/storefront/components/layout/store-navbar.tsx';
import { Reveal } from '@/shared/components/ui/reveal.tsx';
import { useScrollToTopOnNavigate } from '@/shared/hooks/useScrollToTopOnNavigate.ts';
import { SupportHero, type SupportHeroProps } from '@/features/support/components/support-hero.tsx';
import { SupportNav } from '@/features/support/components/support-nav.tsx';

interface SupportLayoutProps extends SupportHeroProps {
    children: ReactNode;
    showNav?: boolean;
}

export function SupportLayout({ children, showNav = true, ...heroProps }: SupportLayoutProps) {
    useScrollToTopOnNavigate();

    return (
        <div className="bg-background text-foreground min-h-screen">
            <StoreNavbar />

            <main>
                <SupportHero {...heroProps} />

                <div className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6 lg:px-8">
                    {showNav && <SupportNav />}
                    <div className="pt-8">
                        <Reveal>{children}</Reveal>
                    </div>
                </div>
            </main>

            <StoreFooter />
        </div>
    );
}
