import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils.ts';

interface SectionHeaderProps {
    eyebrow: string;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
    titleClassName?: string;
}

export function SectionHeader({
    eyebrow,
    title,
    description,
    action,
    className,
    titleClassName,
}: SectionHeaderProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
                className,
            )}
        >
            <div>
                <p className="text-muted-foreground font-emphasis text-xs tracking-[0.08em] uppercase italic">
                    {eyebrow}
                </p>

                <h2
                    className={cn(
                        'font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl',
                        titleClassName,
                    )}
                >
                    {title}
                </h2>

                {description ? (
                    <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                        {description}
                    </p>
                ) : null}
            </div>

            {action}
        </div>
    );
}
