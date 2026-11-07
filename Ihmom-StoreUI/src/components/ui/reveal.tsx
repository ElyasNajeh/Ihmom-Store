import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useInView } from '@/hooks/use-in-view.ts';

interface RevealProps {
    children: ReactNode;
    className?: string;
}

/** Fades and lifts content into place the first time it scrolls into view. */
export function Reveal({ children, className }: RevealProps) {
    const { ref, inView } = useInView<HTMLDivElement>();

    return (
        <div
            ref={ref}
            className={cn(
                'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                inView
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-5 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100',
                className,
            )}
        >
            {children}
        </div>
    );
}
