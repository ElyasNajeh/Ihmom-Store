import { HelpCircle, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { FaqExplorer } from '@/components/store/support/faq-explorer.tsx';
import { SupportCta } from '@/components/store/support/support-cta.tsx';
import { SupportLayout } from '@/components/store/support/support-layout.tsx';

export default function FaqsPage() {
    const { t } = useTranslation('support');

    return (
        <SupportLayout
            eyebrow={t('faq.meta.eyebrow')}
            title={t('faq.meta.title')}
            description={t('faq.meta.description')}
            icon={HelpCircle}
            currentPage={t('nav.faq')}
            parent={{ label: t('nav.customerCare'), href: '/customer-care' }}
        >
            <FaqExplorer />

            <SupportCta
                className="mt-10"
                title={t('shared.stillNeedHelp')}
                description={t('shared.stillNeedHelpDescription')}
                buttonLabel={t('shared.contactSupport')}
                href="/contact"
                icon={MessageCircle}
            />
        </SupportLayout>
    );
}
