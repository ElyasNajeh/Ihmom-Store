import { Check, Layers3, MapPinned, MessageCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { storeValues } from '@/features/storefront/constants/store.ts';
import { Link } from 'react-router-dom';
const icons = {
    layers: Layers3,
    check: Check,
    message: MessageCircle,
    map: MapPinned,
} as const;

export function WhyShopWithUs() {
    const { t } = useTranslation('home-additions');
    return (
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:gap-12 sm:px-6 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8 lg:py-20">
            <div>
                <div className="bg-brand/20 text-foreground grid size-11 place-items-center rounded-2xl sm:size-12">
                    <Sparkles className="size-5" aria-hidden="true" />
                </div>

                <p className="text-muted-foreground font-emphasis mt-5 text-xs tracking-[0.08em] uppercase italic sm:mt-6">
                    {t('whyShop.eyebrow')}
                </p>

                <h2 className="font-display mt-3 text-2xl leading-tight font-semibold tracking-tight sm:text-4xl">
                    {t('whyShop.title')}
                </h2>

                <p className="text-muted-foreground mt-4 max-w-lg text-sm leading-6 sm:mt-5 sm:leading-7">
                    {t('whyShop.description')}
                </p>

                <Link
                    to="/about#contact"
                    className="decoration-brand hover:text-muted-foreground focus-visible:ring-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none sm:mt-7"
                >
                    {t('whyShop.contactLink')}
                    <span aria-hidden="true">↗</span>
                </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {storeValues.map((value, index) => {
                    const Icon = icons[value.icon];

                    return (
                        <article
                            key={value.id}
                            className="border-border bg-card rounded-2xl border p-4 sm:p-6"
                        >
                            <div className="flex items-center justify-between">
                                <span className="bg-secondary grid size-10 place-items-center rounded-xl sm:size-11">
                                    <Icon className="size-5" aria-hidden="true" />
                                </span>

                                <span className="text-muted-foreground text-xs">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                            </div>

                            <h3 className="mt-4 font-semibold tracking-tight sm:mt-5">
                                {t(value.titleKey)}
                            </h3>

                            <p className="text-muted-foreground mt-2 text-sm leading-6">
                                {t(value.descriptionKey)}
                            </p>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
