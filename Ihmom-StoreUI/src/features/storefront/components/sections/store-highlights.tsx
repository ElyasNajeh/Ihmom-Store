import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const highlights = [
    {
        id: 'categories',
        image: '/illustrations/shop-categories.png',
        href: '/shop',
    },
    {
        id: 'options',
        image: '/illustrations/shopping-options.png',
        href: '/shop',
    },
    {
        id: 'support',
        image: '/illustrations/customer-support.png',
        href: '/contact',
    },
    {
        id: 'local',
        image: '/illustrations/local-store.png',
        href: '/about#contact',
    },
] as const;

export function StoreHighlights() {
    const { t } = useTranslation('home-additions');

    return (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="mb-7 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div>
                    <p className="text-muted-foreground font-emphasis text-xs tracking-[0.08em] uppercase italic">
                        {t('highlights.eyebrow')}
                    </p>

                    <h2 className="font-display mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-4xl">
                        {t('highlights.title')}
                    </h2>
                </div>

                <p className="text-muted-foreground max-w-md text-sm leading-6">
                    {t('highlights.description')}
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {highlights.map(({ id, image, href }, index) => (
                    <Link
                        key={id}
                        to={href}
                        className="group focus-visible:ring-ring block rounded-2xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                        <article className="border-border from-card via-card to-secondary/60 sm:hover:border-brand/50 relative h-full overflow-hidden rounded-2xl border bg-linear-to-br p-4 transition-all duration-300 sm:p-6 sm:hover:-translate-y-1 sm:hover:shadow-xl sm:hover:shadow-black/[0.05]">
                            <span
                                aria-hidden="true"
                                className="via-brand/60 pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            />

                            <div className="flex items-start justify-between gap-3">
                                <span className="from-secondary via-card to-brand/15 ring-border/60 grid size-16 place-items-center rounded-2xl bg-linear-to-br ring-1 sm:size-20">
                                    <img
                                        src={image}
                                        alt=""
                                        width={512}
                                        height={512}
                                        loading="lazy"
                                        className="size-14 object-contain drop-shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 sm:size-[4.5rem]"
                                    />
                                </span>

                                <span className="text-muted-foreground text-xs font-medium">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                            </div>

                            <p className="text-muted-foreground mt-5 text-xs font-medium tracking-[0.14em] uppercase sm:mt-6 sm:tracking-[0.16em]">
                                {t(`highlights.items.${id}.eyebrow`)}
                            </p>

                            <h3 className="mt-2 text-base font-semibold tracking-tight sm:text-lg">
                                {t(`highlights.items.${id}.title`)}
                            </h3>

                            <p className="text-muted-foreground mt-2 text-sm leading-6">
                                {t(`highlights.items.${id}.text`)}
                            </p>

                            <ArrowUpRight
                                className="text-brand mt-4 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:mt-5"
                                aria-hidden="true"
                            />
                        </article>
                    </Link>
                ))}
            </div>

            <p className="text-muted-foreground mt-4 text-xs leading-5">
                {t('highlights.disclaimer')}
            </p>
        </section>
    );
}
