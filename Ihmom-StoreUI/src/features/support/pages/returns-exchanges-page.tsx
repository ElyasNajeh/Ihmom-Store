import { MessageCircle, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ReturnEligibilityChecker } from '@/features/support/components/return-eligibility-checker.tsx';
import { SupportAccordion } from '@/features/support/components/support-accordion.tsx';
import { SupportCta } from '@/features/support/components/support-cta.tsx';
import { SupportLayout } from '@/app/layouts/support-layout.tsx';
import { SupportSectionHeading } from '@/features/support/components/support-section-heading.tsx';
import { SupportSteps } from '@/features/support/components/support-steps.tsx';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';

const RETURN_STEPS = ['contact', 'pack', 'handoff'] as const;
const POLICY_ITEMS = ['window', 'condition', 'damaged', 'refund'] as const;
const NON_RETURNABLE_ITEMS = ['hygiene', 'consumables', 'innerEar', 'custom'] as const;

export default function ReturnsExchangesPage() {
    const { t } = useTranslation('support');

    const steps = RETURN_STEPS.map((id) => ({
        id,
        title: t(`returns.steps.${id}.title`),
        description: t(`returns.steps.${id}.description`),
    }));

    const policyItems = POLICY_ITEMS.map((id) => ({
        id,
        question: t(`returns.policy.${id}.question`),
        answer: t(`returns.policy.${id}.answer`),
    }));

    return (
        <SupportLayout
            eyebrow={t('returns.meta.eyebrow')}
            title={t('returns.meta.title')}
            description={t('returns.meta.description')}
            icon={RotateCcw}
            currentPage={t('nav.returns')}
            parent={{ label: t('nav.customerCare'), href: '/customer-care' }}
        >
            <ReturnEligibilityChecker />

            <section className="mt-10" aria-labelledby="return-steps-heading">
                <SupportSectionHeading id="return-steps-heading" title={t('returns.steps.title')} />
                <SupportSteps steps={steps} className="mt-5 lg:grid-cols-3" />
            </section>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <section aria-labelledby="return-policy-heading">
                    <SupportSectionHeading
                        id="return-policy-heading"
                        title={t('returns.policy.title')}
                    />
                    <SupportAccordion items={policyItems} className="mt-4" />
                </section>

                <aside aria-labelledby="non-returnable-heading">
                    <Card>
                        <CardContent className="p-5">
                            <span className="text-destructive bg-destructive/10 grid size-10 place-items-center rounded-xl">
                                <ShieldAlert className="size-5" aria-hidden="true" />
                            </span>
                            <h2
                                id="non-returnable-heading"
                                className="font-display mt-3 font-semibold"
                            >
                                {t('returns.nonReturnable.title')}
                            </h2>
                            <p className="text-muted-foreground mt-1 text-sm leading-6">
                                {t('returns.nonReturnable.description')}
                            </p>

                            <ul className="mt-4 space-y-2">
                                {NON_RETURNABLE_ITEMS.map((id) => (
                                    <li
                                        key={id}
                                        className="text-muted-foreground flex items-start gap-2 text-sm leading-5"
                                    >
                                        <XCircle
                                            className="text-destructive/70 mt-0.5 size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>{t(`returns.nonReturnable.items.${id}`)}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </aside>
            </div>

            <SupportCta
                className="mt-10"
                title={t('returns.cta.title')}
                description={t('returns.cta.description')}
                buttonLabel={t('returns.cta.button')}
                href="/contact"
                icon={MessageCircle}
            />
        </SupportLayout>
    );
}
