import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb.tsx';

export interface SupportHeroProps {
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
    currentPage: string;
    parent?: { label: string; href: string };
}

export function SupportHero({
    eyebrow,
    title,
    description,
    icon: Icon,
    currentPage,
    parent,
}: SupportHeroProps) {
    const { t } = useTranslation('support');

    return (
        <section className="border-border bg-secondary/40 relative overflow-hidden border-b">
            <div
                aria-hidden="true"
                className="bg-primary/10 pointer-events-none absolute end-[-4rem] -top-32 size-80 rounded-full blur-3xl"
            />

            <div className="relative mx-auto w-full max-w-5xl px-4 pt-5 pb-10 sm:px-6 sm:pt-6 sm:pb-12 lg:px-8">
                <Breadcrumb aria-label={t('shared.breadcrumbLabel')}>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink render={<Link to="/" />}>
                                {t('shared.home')}
                            </BreadcrumbLink>
                        </BreadcrumbItem>

                        {parent && (
                            <>
                                <BreadcrumbSeparator>
                                    <ChevronRight
                                        className="size-3.5 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                </BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    <BreadcrumbLink render={<Link to={parent.href} />}>
                                        {parent.label}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </>
                        )}

                        <BreadcrumbSeparator>
                            <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                            <BreadcrumbPage>{currentPage}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="mt-6 flex items-start gap-4">
                    <span className="bg-primary/10 text-primary ring-primary/15 grid size-12 shrink-0 place-items-center rounded-2xl ring-1 sm:size-14">
                        <Icon className="size-6 sm:size-7" aria-hidden="true" />
                    </span>

                    <div className="min-w-0">
                        <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                            {eyebrow}
                        </p>
                        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                            {title}
                        </h1>
                        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6 sm:text-base">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
