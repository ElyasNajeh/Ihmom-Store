import { useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/ui/button.tsx';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';
import { cn } from '@/shared/lib/utils.ts';
import {
    assessReturnEligibility,
    type ReturnAssessment,
    type ReturnCategory,
    type ReturnCondition,
    type ReturnStatus,
    type ReturnWindow,
} from '@/features/support/utils/return-eligibility.ts';

interface Answers {
    condition: ReturnCondition | null;
    window: ReturnWindow | null;
    category: ReturnCategory | null;
}

interface Choice<T extends string> {
    value: T;
    label: string;
}

const EMPTY_ANSWERS: Answers = {
    condition: null,
    window: null,
    category: null,
};

const STATUS_STYLES: Record<ReturnStatus, { icon: LucideIcon; panel: string; iconTone: string }> = {
    eligible: {
        icon: CheckCircle2,
        panel: 'border-emerald-500/30 bg-emerald-500/5',
        iconTone: 'text-emerald-600 dark:text-emerald-400',
    },
    conditional: {
        icon: AlertTriangle,
        panel: 'border-amber-500/30 bg-amber-500/5',
        iconTone: 'text-amber-600 dark:text-amber-400',
    },
    notEligible: {
        icon: XCircle,
        panel: 'border-destructive/30 bg-destructive/5',
        iconTone: 'text-destructive',
    },
};

export function ReturnEligibilityChecker({ className }: { className?: string }) {
    const { t } = useTranslation('support');
    const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
    const [result, setResult] = useState<ReturnAssessment | null>(null);

    const isComplete =
        answers.condition !== null && answers.window !== null && answers.category !== null;
    const hasAnswers =
        answers.condition !== null || answers.window !== null || answers.category !== null;

    const conditionOptions: Choice<ReturnCondition>[] = [
        { value: 'unused', label: t('returns.checker.conditions.unused') },
        { value: 'opened', label: t('returns.checker.conditions.opened') },
        { value: 'damaged', label: t('returns.checker.conditions.damaged') },
    ];

    const windowOptions: Choice<ReturnWindow>[] = [
        { value: 'under7', label: t('returns.checker.days.under7') },
        { value: '7to14', label: t('returns.checker.days.7to14') },
        { value: 'over14', label: t('returns.checker.days.over14') },
    ];

    const categoryOptions: Choice<ReturnCategory>[] = [
        { value: 'electronics', label: t('returns.checker.categories.electronics') },
        { value: 'hookah', label: t('returns.checker.categories.hookah') },
        { value: 'lifestyle', label: t('returns.checker.categories.lifestyle') },
        { value: 'consumable', label: t('returns.checker.categories.consumable') },
    ];

    function update<K extends keyof Answers>(key: K, value: Answers[K]) {
        setAnswers((current) => ({ ...current, [key]: value }));
        setResult(null);
    }

    function check() {
        if (!answers.condition || !answers.window || !answers.category) return;

        setResult(
            assessReturnEligibility({
                condition: answers.condition,
                window: answers.window,
                category: answers.category,
            }),
        );
    }

    function reset() {
        setAnswers(EMPTY_ANSWERS);
        setResult(null);
    }

    const statusStyle = result ? STATUS_STYLES[result.status] : null;
    const StatusIcon = statusStyle?.icon;

    return (
        <Card className={className}>
            <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
                        <RotateCcw className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">
                            {t('returns.checker.title')}
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm leading-6">
                            {t('returns.checker.description')}
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-5">
                    <OptionGroup
                        legend={t('returns.checker.conditionLabel')}
                        name="return-condition"
                        value={answers.condition}
                        options={conditionOptions}
                        onChange={(value) => update('condition', value)}
                    />
                    <OptionGroup
                        legend={t('returns.checker.daysLabel')}
                        name="return-window"
                        value={answers.window}
                        options={windowOptions}
                        onChange={(value) => update('window', value)}
                    />
                    <OptionGroup
                        legend={t('returns.checker.categoryLabel')}
                        name="return-category"
                        value={answers.category}
                        options={categoryOptions}
                        onChange={(value) => update('category', value)}
                    />
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                    <Button
                        type="button"
                        className="min-h-10"
                        disabled={!isComplete}
                        onClick={check}
                    >
                        {t('returns.checker.check')}
                    </Button>
                    {hasAnswers && (
                        <Button type="button" variant="ghost" className="min-h-10" onClick={reset}>
                            {t('returns.checker.reset')}
                        </Button>
                    )}
                </div>

                <div aria-live="polite" className="mt-5">
                    {result && statusStyle && StatusIcon && (
                        <div className={cn('rounded-2xl border p-4 sm:p-5', statusStyle.panel)}>
                            <div className="flex items-start gap-3">
                                <StatusIcon
                                    className={cn('mt-0.5 size-5 shrink-0', statusStyle.iconTone)}
                                    aria-hidden="true"
                                />
                                <div className="min-w-0">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                                        {t('returns.checker.resultTitle')}
                                    </p>
                                    <h3 className="mt-1 font-semibold">
                                        {t(`returns.checker.${result.status}.title`)}
                                    </h3>
                                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                                        {t(`returns.checker.${result.status}.description`)}
                                    </p>

                                    {result.reasons.length > 0 && (
                                        <ul className="text-muted-foreground mt-3 space-y-1.5 text-sm leading-6">
                                            {result.reasons.map((reason) => (
                                                <li key={reason} className="flex gap-2">
                                                    <span
                                                        aria-hidden="true"
                                                        className="bg-muted-foreground/60 mt-2.5 size-1.5 shrink-0 rounded-full"
                                                    />
                                                    <span>
                                                        {t(`returns.checker.reasons.${reason}`)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="mt-4 min-h-9"
                                    >
                                        <Link to="/contact">{t('returns.checker.contactCta')}</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

interface OptionGroupProps<T extends string> {
    legend: string;
    name: string;
    value: T | null;
    options: Choice<T>[];
    onChange: (value: T) => void;
}

function OptionGroup<T extends string>({
    legend,
    name,
    value,
    options,
    onChange,
}: OptionGroupProps<T>) {
    return (
        <fieldset>
            <legend className="text-sm font-medium">{legend}</legend>

            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {options.map((option) => {
                    const isSelected = option.value === value;

                    return (
                        <label
                            key={option.value}
                            className={cn(
                                'focus-within:ring-ring flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm leading-5 transition-colors focus-within:ring-2 focus-within:outline-none',
                                isSelected
                                    ? 'border-primary bg-primary/5 font-medium'
                                    : 'border-border bg-background hover:bg-muted/60',
                            )}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={option.value}
                                checked={isSelected}
                                onChange={() => onChange(option.value)}
                                className="sr-only"
                            />
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'grid size-4 shrink-0 place-items-center rounded-full border',
                                    isSelected ? 'border-primary' : 'border-muted-foreground/40',
                                )}
                            >
                                {isSelected && <span className="bg-primary size-2 rounded-full" />}
                            </span>
                            <span>{option.label}</span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
