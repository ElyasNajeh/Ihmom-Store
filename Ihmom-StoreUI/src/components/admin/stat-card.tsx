import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';

interface StatCardProps {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    icon: LucideIcon;
    isLoading?: boolean;
    tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
    className?: string;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, string> = {
    default: 'bg-muted text-muted-foreground',
    brand: 'bg-brand/10 text-brand',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
};

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    isLoading = false,
    tone = 'default',
    className,
}: StatCardProps) {
    return (
        <Card className={cn('gap-0 py-0 shadow-xs transition-shadow hover:shadow-md', className)}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                    <p className="text-muted-foreground truncate text-xs font-medium tracking-wide uppercase">
                        {label}
                    </p>

                    {isLoading ? (
                        <Skeleton className="mt-2.5 h-7 w-20" />
                    ) : (
                        <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
                    )}

                    {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
                </div>

                <span
                    className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-lg',
                        TONE_CLASSES[tone],
                    )}
                >
                    <Icon className="size-4" aria-hidden="true" />
                </span>
            </CardContent>
        </Card>
    );
}
