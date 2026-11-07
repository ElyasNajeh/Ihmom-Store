import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils.ts';

interface SupportSectionHeadingProps {
    title: string;
    description?: string;
    id?: string;
    className?: string;
    action?: ReactNode;
}

export function SupportSectionHeading({
    title,
    description,
    id,
    className,
    action,
}: SupportSectionHeadingProps) {
    return (
        <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
            <div className="min-w-0">
                <h2
                    id={id}
                    className="font-display text-xl font-semibold tracking-tight sm:text-2xl"
                >
                    {title}
                </h2>
                {description && (
                    <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm leading-6">
                        {description}
                    </p>
                )}
            </div>

            {action}
        </div>
    );
}
