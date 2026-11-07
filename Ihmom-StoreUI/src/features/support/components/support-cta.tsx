import { LifeBuoy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/ui/button.tsx';

interface SupportCtaProps {
    title: string;
    description: string;
    buttonLabel: string;
    href: string;
    icon?: LucideIcon;
    className?: string;
}

export function SupportCta({
    title,
    description,
    buttonLabel,
    href,
    icon: Icon = LifeBuoy,
    className,
}: SupportCtaProps) {
    return (
        <section className={className}>
            <div className="border-primary/20 bg-primary/5 relative overflow-hidden rounded-2xl border p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                        <span className="bg-primary text-primary-foreground grid size-11 shrink-0 place-items-center rounded-xl">
                            <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="font-display text-lg font-semibold tracking-tight">
                                {title}
                            </h2>
                            <p className="text-muted-foreground mt-1 max-w-xl text-sm leading-6">
                                {description}
                            </p>
                        </div>
                    </div>

                    <Button asChild className="min-h-10">
                        <Link to={href}>{buttonLabel}</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
