import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { ContactChannels } from '@/components/store/support/contact-channels.tsx';
import { ContactForm } from '@/components/store/support/contact-form.tsx';
import { StoreInfoCard } from '@/components/store/support/store-info-card.tsx';
import { SupportLayout } from '@/components/store/support/support-layout.tsx';
import { SupportSectionHeading } from '@/components/store/support/support-section-heading.tsx';
import { SUPPORT_TOPICS } from '@/constants/support.ts';

export default function ContactPage() {
    const { t } = useTranslation('support');
    const [searchParams] = useSearchParams();
    const requestedTopic = searchParams.get('topic');
    const initialTopic = SUPPORT_TOPICS.find((option) => option === requestedTopic);

    return (
        <SupportLayout
            eyebrow={t('contact.meta.eyebrow')}
            title={t('contact.meta.title')}
            description={t('contact.meta.description')}
            icon={MessageCircle}
            currentPage={t('nav.contact')}
            parent={{ label: t('nav.customerCare'), href: '/customer-care' }}
        >
            <section aria-labelledby="contact-channels-heading">
                <SupportSectionHeading
                    id="contact-channels-heading"
                    title={t('contact.channels.title')}
                    description={t('contact.channels.description')}
                />
                <ContactChannels className="mt-5" />
            </section>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <ContactForm initialTopic={initialTopic} />
                <StoreInfoCard />
            </div>
        </SupportLayout>
    );
}
