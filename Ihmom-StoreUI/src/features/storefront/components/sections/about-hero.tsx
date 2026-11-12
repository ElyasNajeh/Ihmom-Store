import { ArrowDownRight, ArrowUpRight, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import { storeInfo, getStoreName } from '@/features/storefront/constants/store.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import { scrollToSection } from '@/shared/utils/scroll.ts';
import { StorePhoto } from './store-photo';

const gallery = [
    { name: 'accessories_section', key: 'accessories' },
    { name: 'games_section', key: 'games' },
    { name: 'shisha_vape_section', key: 'shishaVape' },
] as const;

export function AboutHero() {
    // Isolated to the 'about' namespace, targeting its 'hero' block directly
    const { t } = useTranslation('about', { keyPrefix: 'hero' });
    const { t: tCommon } = useTranslation('common');
    const { isArabic } = useLocale();
    const storeName = getStoreName(isArabic);

    return (
        <section id="about" className="scroll-mt-20 overflow-x-clip sm:scroll-mt-24">
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:px-8 lg:py-24">
                <div className="relative z-10">
                    <div className="border-border bg-card text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
                        <span className="bg-brand size-1.5 rounded-full" />
                        {t('eyebrow')}
                    </div>

                    <h1 className="font-display max-w-2xl text-4xl leading-[1.08] font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                        {t('title')}{' '}
                        <span className="font-emphasis text-muted-foreground italic">
                            {t('titleEmphasis')}
                        </span>
                    </h1>

                    <p className="text-muted-foreground mt-6 max-w-xl text-base leading-7 sm:text-lg sm:leading-8">
                        {tCommon(storeInfo.descriptionKey, { defaultValue: '' })}
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Button size="lg" asChild>
                            <Link to="/shop">
                                {t('exploreStore')}
                                <ArrowUpRight
                                    className="ms-2 size-4 rtl:rotate-[-90deg]"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link
                                to="#contact"
                                onClick={(e) => {
                                    e.preventDefault();
                                    scrollToSection('contact');
                                }}
                            >
                                {t('findUs')}
                                <ArrowDownRight
                                    className="ms-2 size-4 rtl:rotate-[90deg]"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    </div>

                    <div className="text-muted-foreground mt-9 flex flex-wrap gap-x-5 gap-y-3 text-sm">
                        <span className="inline-flex items-center gap-2">
                            <BadgeCheck className="text-brand size-4" aria-hidden="true" />
                            {t('highlights.accessories')}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <BadgeCheck className="text-brand size-4" aria-hidden="true" />
                            {t('highlights.support')}
                        </span>
                    </div>
                </div>

                <div className="relative">
                    <div className="bg-brand/20 absolute -end-5 -top-5 size-32 rounded-full blur-2xl" />
                    <div className="border-border bg-secondary relative overflow-hidden rounded-[2rem] border p-2 shadow-xl shadow-black/5">
                        <StorePhoto
                            name="general_shop_opening_image"
                            alt={t('imageAlt')}
                            loading="eager"
                            fetchPriority="high"
                            sizes="(min-width: 1280px) 587px, (min-width: 1024px) calc(52.5vw - 85px), (min-width: 640px) calc(100vw - 66px), calc(100vw - 50px)"
                            className="aspect-4/3 h-auto w-full rounded-[1.5rem] object-contain"
                        />

                        <div className="px-4 py-5 sm:px-5">
                            <p className="text-muted-foreground font-emphasis text-xs tracking-[0.08em] uppercase italic">
                                {t('welcome')}
                            </p>
                            <p className="mt-1 text-xl font-semibold tracking-tight">{storeName}</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                                {tCommon(storeInfo.taglineKey, { defaultValue: '' })}
                            </p>
                        </div>
                    </div>

                    <div className="border-border bg-card absolute -end-3 -bottom-5 hidden rounded-2xl border px-4 py-3 shadow-lg sm:block">
                        <p className="text-muted-foreground text-xs">{t('ourFocus')}</p>
                        <p className="mt-1 text-sm font-semibold">{t('focusItems')}</p>
                    </div>
                </div>
            </div>

            <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 px-4 pb-14 sm:gap-8 sm:px-6 sm:pb-20 lg:pb-24">
                {gallery.map(({ name, key }) => (
                    <figure key={name} className="min-w-0">
                        <StorePhoto
                            name={name}
                            alt={t(`gallery.${key}.alt`)}
                            sizes="(min-width: 697px) 195px, (min-width: 640px) calc((100vw - 112px) / 3), calc((100vw - 64px) / 3)"
                            className="mx-auto aspect-3/4 h-auto max-h-[260px] w-full max-w-[195px] rounded-2xl object-cover"
                        />
                        <figcaption className="text-muted-foreground mt-3 text-center text-xs leading-5 sm:text-sm">
                            {t(`gallery.${key}.label`)}
                        </figcaption>
                    </figure>
                ))}
            </div>

            <div className="border-border bg-card/70 border-y">
                <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 text-sm sm:grid-cols-3 sm:px-6 lg:px-8">
                    <p className="text-muted-foreground sm:text-center">
                        {t('bottom.accessories')}
                    </p>
                    <p className="text-muted-foreground sm:text-center">{t('bottom.selection')}</p>
                    <p className="text-muted-foreground sm:text-start">{t('bottom.questions')}</p>
                </div>
            </div>
        </section>
    );
}
