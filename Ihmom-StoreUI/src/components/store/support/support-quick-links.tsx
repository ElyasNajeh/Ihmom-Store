import { ArrowRight, HelpCircle, MessageCircle, RotateCcw, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils.ts';

interface QuickLink {
    id: string;
    href: string;
    icon: LucideIcon;
    tone: string;
}

const QUICK_LINKS: QuickLink[] = [
    {
        id: 'contact',
        href: '/contact',
        icon: MessageCircle,
        tone: 'bg-primary/10 text-primary',
    },
    {
        id: 'delivery',
        href: '/delivery',
        icon: Truck,
        tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    },
    {
        id: 'returns',
        href: '/returns',
        icon: RotateCcw,
        tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
        id: 'faq',
        href: '/faq',
        icon: HelpCircle,
        tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
];

export function SupportQuickLinks({ className }: { className?: string }) {
    const { t } = useTranslation('support');

    return (
        <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
            {QUICK_LINKS.map(({ id, href, icon: Icon, tone }) => (
                <Link
                    key={id}
                    to={href}
                    className="group border-border bg-card hover:border-primary/40 focus-visible:ring-ring flex flex-col rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
                >
                    <span className={`grid size-11 place-items-center rounded-xl ${tone}`}>
                        <Icon className="size-5" aria-hidden="true" />
                    </span>

                    <h3 className="mt-4 font-semibold tracking-tight">
                        {t(`customerCare.quickLinks.${id}.title`)}
                    </h3>
                    <p className="text-muted-foreground mt-1.5 flex-1 text-sm leading-6">
                        {t(`customerCare.quickLinks.${id}.description`)}
                    </p>

                    <span className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                        {t(`nav.${id}`)}
                        <ArrowRight
                            className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                            aria-hidden="true"
                        />
                    </span>
                </Link>
            ))}
        </div>
    );
}
