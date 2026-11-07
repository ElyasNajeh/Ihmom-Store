import { ArrowRight, Clock3, LifeBuoy, Mail, PackageSearch, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SupportAccordion } from '@/features/support/components/support-accordion.tsx';
import { TOP_FAQ_IDS } from '@/features/support/constants/support.ts';
import { SupportCta } from '@/features/support/components/support-cta.tsx';
import { SupportLayout } from '@/app/layouts/support-layout.tsx';
import { SupportQuickLinks } from '@/features/support/components/support-quick-links.tsx';
import { SupportSectionHeading } from '@/features/support/components/support-section-heading.tsx';
import { storeInfo } from '@/features/storefront/constants/store.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';

export default function CustomerCarePage() {
    const { t } = useTranslation('support');

    const popularFaqs = TOP_FAQ_IDS.map((id) => ({
        id,
        question: t(`faq.items.${id}.question`),
        answer: t(`faq.items.${id}.answer`),
    }));

    return (
        <SupportLayout
            eyebrow={t('customerCare.meta.eyebrow')}
            title={t('customerCare.meta.title')}
            description={t('customerCare.meta.description')}
            icon={LifeBuoy}
            currentPage={t('nav.customerCare')}
        >
            <section aria-labelledby="quick-links-heading">
                <SupportSectionHeading
                    id="quick-links-heading"
                    title={t('customerCare.quickLinks.title')}
                    description={t('customerCare.quickLinks.description')}
                />
                <SupportQuickLinks className="mt-5" />
            </section>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <section aria-labelledby="popular-questions-heading">
                    <SupportSectionHeading
                        id="popular-questions-heading"
                        title={t('customerCare.popular.title')}
                        description={t('customerCare.popular.description')}
                        action={
                            <Button asChild variant="ghost" size="sm" className="min-h-8">
                                <Link to="/faq">
                                    {t('nav.faq')}
                                    <ArrowRight
                                        className="size-4 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </Button>
                        }
                    />
                    <SupportAccordion items={popularFaqs} className="mt-4" />
                </section>

                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-5">
                            <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
                                <PackageSearch className="size-5" aria-hidden="true" />
                            </span>
                            <h2 className="font-display mt-3 font-semibold">
                                {t('customerCare.track.title')}
                            </h2>
                            <p className="text-muted-foreground mt-1 text-sm leading-6">
                                {t('customerCare.track.description')}
                            </p>
                            <Button asChild className="mt-4 min-h-9 w-full">
                                <Link to="/my-orders">{t('customerCare.track.cta')}</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <h2 className="font-display font-semibold">
                                {t('customerCare.contactCard.title')}
                            </h2>

                            <div className="mt-3 flex flex-col gap-2">
                                <Button asChild variant="outline" className="min-h-9 justify-start">
                                    <a href={`tel:${storeInfo.phoneLink}`}>
                                        <Phone className="size-4" aria-hidden="true" />
                                        {t('customerCare.contactCard.callCta')}
                                    </a>
                                </Button>
                                <Button asChild variant="outline" className="min-h-9 justify-start">
                                    <a href={`mailto:${storeInfo.email}`}>
                                        <Mail className="size-4" aria-hidden="true" />
                                        {t('customerCare.contactCard.emailCta')}
                                    </a>
                                </Button>
                            </div>

                            <div className="text-muted-foreground mt-3 space-y-1.5 text-xs leading-5">
                                <p className="flex items-start gap-1.5">
                                    <Clock3
                                        className="mt-0.5 size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>{t('customerCare.contactCard.hours')}</span>
                                </p>
                                <p>{t('customerCare.contactCard.response')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <SupportCta
                className="mt-10"
                title={t('shared.stillNeedHelp')}
                description={t('shared.stillNeedHelpDescription')}
                buttonLabel={t('shared.contactSupport')}
                href="/contact"
            />
        </SupportLayout>
    );
}
