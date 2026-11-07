import type { ReactNode } from 'react';

import { StoreFooter } from '@/components/store/layout/store-footer.tsx';
import { StoreNavbar } from '@/components/store/layout/store-navbar.tsx';
import { Reveal } from '@/components/ui/reveal.tsx';
import { useScrollToTopOnNavigate } from '@/hooks/use-scroll-to-top-on-navigate.ts';
import { SupportHero, type SupportHeroProps } from './support-hero.tsx';
import { SupportNav } from './support-nav.tsx';

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
