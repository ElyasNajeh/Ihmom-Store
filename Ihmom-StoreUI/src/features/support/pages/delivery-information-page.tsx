import { Banknote, Clock3, DoorOpen, MapPin, MessageCircle, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DeliveryAreaChecker } from '@/features/delivery/components/store/delivery-area-checker.tsx';
import { SupportCta } from '@/features/support/components/support-cta.tsx';
import { SupportLayout } from '@/app/layouts/support-layout.tsx';
import { SupportSectionHeading } from '@/features/support/components/support-section-heading.tsx';
import { SupportSteps } from '@/features/support/components/support-steps.tsx';

const PROCESS_STEPS = ['placed', 'confirmed', 'onTheWay', 'delivered'] as const;

const GOOD_TO_KNOW: { id: string; icon: LucideIcon }[] = [
    { id: 'coverage', icon: MapPin },
    { id: 'timing', icon: Clock3 },
    { id: 'payment', icon: Banknote },
    { id: 'missed', icon: DoorOpen },
];

export default function DeliveryInformationPage() {
    const { t } = useTranslation('support');

    const steps = PROCESS_STEPS.map((id) => ({
        id,
        title: t(`delivery.process.steps.${id}.title`),
        description: t(`delivery.process.steps.${id}.description`),
    }));

    return (
        <SupportLayout
            eyebrow={t('delivery.meta.eyebrow')}
            title={t('delivery.meta.title')}
            description={t('delivery.meta.description')}
            icon={Truck}
            currentPage={t('nav.delivery')}
            parent={{ label: t('nav.customerCare'), href: '/customer-care' }}
        >
            <DeliveryAreaChecker />

            <section className="mt-10" aria-labelledby="delivery-process-heading">
                <SupportSectionHeading
                    id="delivery-process-heading"
                    title={t('delivery.process.title')}
                    description={t('delivery.process.description')}
                />
                <SupportSteps steps={steps} className="mt-5" />
            </section>

            <section className="mt-10" aria-labelledby="good-to-know-heading">
                <SupportSectionHeading
                    id="good-to-know-heading"
                    title={t('delivery.goodToKnow.title')}
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {GOOD_TO_KNOW.map(({ id, icon: Icon }) => (
                        <div
                            key={id}
                            className="border-border bg-card flex gap-3 rounded-2xl border p-5"
                        >
                            <span className="bg-secondary grid size-10 shrink-0 place-items-center rounded-xl">
                                <Icon className="size-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold">
                                    {t(`delivery.goodToKnow.${id}.title`)}
                                </h3>
                                <p className="text-muted-foreground mt-1 text-sm leading-6">
                                    {t(`delivery.goodToKnow.${id}.description`)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <SupportCta
                className="mt-10"
                title={t('delivery.cta.title')}
                description={t('delivery.cta.description')}
                buttonLabel={t('delivery.cta.button')}
                href="/contact?topic=delivery"
                icon={MessageCircle}
            />
        </SupportLayout>
    );
}
