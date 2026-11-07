import { HelpCircle, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { cn } from '@/lib/utils.ts';
import { SupportAccordion } from './support-accordion.tsx';
import { FAQ_CATEGORIES, FAQ_ENTRIES, type FaqCategory } from './support-content.ts';
import { useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce.ts';
import { FILTER_ALL, SEARCH_DEBOUNCE_MS } from '@/constants/query.ts';
type CategoryFilter = FaqCategory | typeof FILTER_ALL;

export function FaqExplorer({ className }: { className?: string }) {
    const { t } = useTranslation('support');
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<CategoryFilter>(FILTER_ALL);

    const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
    const normalizedQuery = debouncedQuery.trim().toLocaleLowerCase();
    const isFiltered = normalizedQuery.length > 0 || category !== FILTER_ALL;

    const filteredEntries = useMemo(
        () =>
            FAQ_ENTRIES.filter((entry) => {
                if (category !== FILTER_ALL && entry.category !== category) return false;
                if (!normalizedQuery) return true;

                const question = t(`faq.items.${entry.id}.question`);
                const answer = t(`faq.items.${entry.id}.answer`);

                return `${question} ${answer}`.toLocaleLowerCase().includes(normalizedQuery);
            }),
        [category, normalizedQuery, t],
    );

    const items = useMemo(
        () =>
            filteredEntries.map((entry) => ({
                id: entry.id,
                question: t(`faq.items.${entry.id}.question`),
                answer: t(`faq.items.${entry.id}.answer`),
            })),
        [filteredEntries, t],
    );

    function resetFilters() {
        setQuery('');
        setCategory(FILTER_ALL);
    }

    return (
        <div className={cn('space-y-4', className)}>
            <div className="border-border bg-card rounded-2xl border p-4 sm:p-5">
                <div className="relative">
                    <Search
                        className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
                        aria-hidden="true"
                    />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('faq.searchPlaceholder')}
                        aria-label={t('faq.searchLabel')}
                        className="h-11 ps-9 pe-10"
                    />
                    {query && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute end-1 top-1/2 size-9 -translate-y-1/2"
                            aria-label={t('faq.clearSearch')}
                            onClick={() => setQuery('')}
                        >
                            <X className="size-4" aria-hidden="true" />
                        </Button>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                    <CategoryPill
                        isActive={category === FILTER_ALL}
                        onClick={() => setCategory(FILTER_ALL)}
                    >
                        {t('faq.allCategories')}
                    </CategoryPill>

                    {FAQ_CATEGORIES.map((id) => (
                        <CategoryPill
                            key={id}
                            isActive={category === id}
                            onClick={() => setCategory(id)}
                        >
                            {t(`faq.categories.${id}`)}
                        </CategoryPill>
                    ))}
                </div>

                <p className="text-muted-foreground mt-3 text-xs" aria-live="polite">
                    {t('faq.resultCount', { count: items.length })}
                </p>
            </div>

            {items.length > 0 ? (
                <SupportAccordion
                    key={`${category}:${normalizedQuery}`}
                    items={items}
                    defaultOpenIds={normalizedQuery ? [items[0].id] : []}
                />
            ) : (
                <div className="border-border rounded-2xl border border-dashed p-8 text-center">
                    <HelpCircle
                        className="text-muted-foreground mx-auto size-8"
                        aria-hidden="true"
                    />
                    <h3 className="mt-3 font-semibold">{t('faq.emptyTitle')}</h3>
                    <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm leading-6">
                        {t('faq.emptyDescription')}
                    </p>

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Button asChild className="min-h-9">
                            <Link to="/contact">{t('faq.emptyCta')}</Link>
                        </Button>
                        {isFiltered && (
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-9"
                                onClick={resetFilters}
                            >
                                {t('faq.clearSearch')}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface CategoryPillProps {
    isActive: boolean;
    onClick: () => void;
    children: string;
}

function CategoryPill({ isActive, onClick, children }: CategoryPillProps) {
    return (
        <button
            type="button"
            aria-pressed={isActive}
            onClick={onClick}
            className={cn(
                'focus-visible:ring-ring inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            {children}
        </button>
    );
}
