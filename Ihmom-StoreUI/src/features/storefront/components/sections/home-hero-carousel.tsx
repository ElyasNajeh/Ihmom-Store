import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useSliders } from '@/features/catalog/hooks/useSliders.ts';
import { DEFAULT_PAGE, SORT_DIRECTION } from '@/shared/constants/query.ts';
import { HERO_SLIDERS_PAGE_SIZE, SLIDER_SORT_FIELD } from '@/features/catalog/constants/sliders.ts';
import { apiAssetUrl } from '@/shared/api/axios.ts';

interface HeroSlide {
    key: string;
    image: string;
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
    alt: string;
}

export function HomeHeroCarousel() {
    const { t, i18n } = useTranslation('home', { keyPrefix: 'hero' });
    const [activeIndex, setActiveIndex] = useState(0);
    const language = i18n.resolvedLanguage ?? i18n.language;
    const isRtl = language.startsWith('ar');
    const isArabic = language.startsWith('ar');

    const slidersQuery = useSliders({
        page: DEFAULT_PAGE,
        page_size: HERO_SLIDERS_PAGE_SIZE,
        filter: { is_active: true },
        sort_by: SLIDER_SORT_FIELD.DISPLAY_ORDER,
        order: SORT_DIRECTION.ASC,
    });

    const slides = useMemo<HeroSlide[]>(() => {
        return (slidersQuery.data?.items ?? []).map((slider) => {
            const title = isArabic
                ? slider.title_ar || slider.title_en
                : slider.title_en || slider.title_ar;

            return {
                key: `slider-${slider.id}`,
                image: apiAssetUrl(slider.image) ?? slider.image,
                eyebrow: t('sliderEyebrow'),
                title,
                description: t('sliderDescription'),
                cta: t('sliderCta'),
                alt: title,
            };
        });
    }, [isArabic, slidersQuery.data, t]);

    useEffect(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion || slides.length < 2) return;

        const intervalId = window.setInterval(() => {
            setActiveIndex((index) => (index + 1) % slides.length);
        }, 6500);

        return () => window.clearInterval(intervalId);
    }, [slides.length]);

    const currentIndex = activeIndex < slides.length ? activeIndex : 0;
    const activeSlide = slides[currentIndex] ?? slides[0];

    const move = (direction: -1 | 1) => {
        setActiveIndex((currentIndex + direction + slides.length) % slides.length);
    };

    if (slidersQuery.isPending) {
        return (
            <section
                aria-busy="true"
                aria-label={t('sectionLabel')}
                className="mx-auto max-w-[1600px] px-3 pt-3 sm:px-5 sm:pt-5 lg:px-8"
            >
                <Skeleton className="h-[520px] w-full rounded-[1.75rem] sm:h-[560px] lg:h-[640px]" />
            </section>
        );
    }

    if (slides.length === 0) {
        return null;
    }

    return (
        <section
            aria-label={t('sectionLabel')}
            aria-roledescription={t('carouselRole')}
            className="mx-auto max-w-[1600px] px-3 pt-3 sm:px-5 sm:pt-5 lg:px-8"
        >
            {/* Fixed height per breakpoint with aspect-ratio fallback eliminates container reflow */}
            <div className="group relative isolate h-[520px] overflow-hidden rounded-[1.75rem] bg-neutral-900 sm:h-[560px] lg:h-[640px]">
                {slides.map((slide, index) => (
                    <div
                        key={slide.key}
                        aria-hidden={index !== currentIndex}
                        className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
                            index === currentIndex
                                ? 'z-0 opacity-100'
                                : 'pointer-events-none -z-10 opacity-0'
                        }`}
                    >
                        <img
                            src={slide.image}
                            alt={slide.alt}
                            width={2400}
                            height={1200}
                            fetchPriority={index === 0 ? 'high' : 'auto'}
                            loading={index === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                            className="size-full object-cover object-center"
                        />
                    </div>
                ))}

                {/* Overlays */}
                <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/85 via-black/55 to-black/15 rtl:bg-gradient-to-l" />
                <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                {/* Content layer pinned to exact container height */}
                <div className="relative z-10 flex h-full flex-col justify-between p-6 text-white sm:p-10 lg:p-16">
                    {/* Top Row: Eyebrow badge + Slide counter */}
                    <div className="flex items-center justify-between gap-4">
                        <span
                            key={currentIndex}
                            className="hero-content-enter inline-flex min-h-[28px] items-center rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-white/90 uppercase backdrop-blur-sm sm:text-xs"
                        >
                            {activeSlide.eyebrow}
                        </span>
                        <span className="text-xs font-medium text-white/80 tabular-nums">
                            {String(currentIndex + 1).padStart(2, '0')} /{' '}
                            {String(slides.length).padStart(2, '0')}
                        </span>
                    </div>

                    {/* Middle: Content zone with reserved height & line-clamps to prevent vertical jumping */}
                    <div key={currentIndex} className="hero-content-enter max-w-2xl">
                        <p className="font-emphasis text-xs tracking-[0.08em] text-white/75 uppercase italic sm:text-sm">
                            {t('kicker')}
                        </p>
                        <h1 className="font-display mt-4 line-clamp-2 min-h-[2.4em] max-w-xl text-3xl leading-[1.12] font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.08] lg:text-6xl">
                            {activeSlide.title}
                        </h1>
                        <p className="mt-4 line-clamp-2 min-h-[3rem] max-w-lg text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
                            {activeSlide.description}
                        </p>
                        <div className="mt-6">
                            <Button
                                asChild
                                size="lg"
                                className="bg-brand text-brand-foreground hover:bg-brand/90 min-h-12 rounded-xl px-5"
                            >
                                <Link to="/shop">
                                    {activeSlide.cta}
                                    <ArrowUpRight
                                        className="ms-2 size-4 rtl:rotate-[-90deg]"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Bottom Row: Slide indicator dots + Navigation arrows */}
                    <div className="flex items-end justify-between gap-4">
                        <div className="flex items-center gap-2" aria-label={t('chooseSlide')}>
                            {slides.map((slide, index) => (
                                <button
                                    key={slide.key}
                                    type="button"
                                    aria-label={t('goToSlide', { number: index + 1 })}
                                    aria-current={index === currentIndex ? 'true' : undefined}
                                    onClick={() => setActiveIndex(index)}
                                    className={`h-1.5 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 focus-visible:outline-none ${
                                        index === currentIndex
                                            ? 'w-10 bg-white'
                                            : 'w-4 bg-white/45 hover:bg-white/75'
                                    }`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t('previousSlide')}
                                onClick={() => move(isRtl ? 1 : -1)}
                                className="size-10 rounded-full border-white/35 bg-black/20 text-white hover:bg-white/15 hover:text-white"
                            >
                                {isRtl ? (
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                ) : (
                                    <ArrowLeft className="size-4" aria-hidden="true" />
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t('nextSlide')}
                                onClick={() => move(isRtl ? -1 : 1)}
                                className="size-10 rounded-full border-white/35 bg-black/20 text-white hover:bg-white/15 hover:text-white"
                            >
                                {isRtl ? (
                                    <ArrowLeft className="size-4" aria-hidden="true" />
                                ) : (
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
