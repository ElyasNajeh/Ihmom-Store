import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
    return (
        <div className="border-border/70 from-card via-card to-secondary/60 relative overflow-hidden rounded-2xl border bg-linear-to-br p-4 shadow-xs sm:p-5">
            <span
                aria-hidden="true"
                className="from-brand to-brand/10 absolute inset-y-0 start-0 w-1 bg-linear-to-b"
            />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
                        {title}
                    </h1>
                    {description ? (
                        <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                            {description}
                        </p>
                    ) : null}
                </div>

                {actions ? (
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
                ) : null}
            </div>
        </div>
    );
}
