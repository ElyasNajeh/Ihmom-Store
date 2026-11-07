import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/utils.ts';

import { SUPPORT_SECTIONS } from '@/features/support/constants/support.ts';

export function SupportNav({ className }: { className?: string }) {
    const { t } = useTranslation('support');

    return (
        <nav aria-label={t('shared.navLabel')} className={cn('border-border border-b', className)}>
            <ul className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                {SUPPORT_SECTIONS.map((section) => (
                    <li key={section.id} className="shrink-0">
                        <NavLink
                            to={section.href}
                            end
                            className={({ isActive }) =>
                                cn(
                                    'focus-visible:ring-ring inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                                    isActive
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                                )
                            }
                        >
                            {t(section.labelKey)}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
