import * as React from 'react';
import { ArrowRight, ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { SiFacebook, SiInstagram, SiSnapchat } from 'react-icons/si';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark.tsx';
import { useLocale } from '@/hooks/use-locale.ts';
import { getStoreAddress, getStoreName, storeInfo } from './store-content';

const trustItems = [
    { id: 'securePayments', image: '/illustrations/secure-payments.png' },
    { id: 'fastDelivery', image: '/illustrations/fast-delivery.png' },
    { id: 'easyReturns', image: '/illustrations/easy-returns.png' },
    { id: 'qualityGuarantee', image: '/illustrations/quality-guarantee.png' },
] as const;

export function StoreFooter() {
    const location = useLocation();
    const { t } = useTranslation(['navigation', 'common']);
    const { isArabic } = useLocale();
    const storeName = getStoreName(isArabic);
    const address = getStoreAddress(isArabic);
    const aboutHref = location.pathname === '/about' ? '#about' : '/about#about';

    const exploreLinks: [string, string][] = [
        [t('navigation:header.home'), '/'],
        [t('navigation:header.shop'), '/shop'],
        [t('navigation:header.myOrders'), '/my-orders'],
        [t('navigation:footer.aboutUs'), aboutHref],
    ];

    const customerCareLinks: [string, string][] = [
        [t('navigation:footer.contactUs'), '/contact'],
        [t('navigation:footer.deliveryInformation'), '/delivery'],
        [t('navigation:footer.returnsExchanges'), '/returns'],
        [t('navigation:footer.faqs'), '/faq'],
    ];

    return (
        <footer className="border-border bg-background border-t">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
                <div className="border-border/70 from-secondary/60 via-card to-brand/10 mb-9 grid grid-cols-2 gap-3 rounded-2xl border bg-linear-to-br px-4 py-4 sm:mb-10 sm:grid-cols-4 sm:gap-4 sm:px-5">
                    {trustItems.map(({ id, image }) => (
                        <div key={id} className="flex items-center gap-3">
                            <img
                                src={image}
                                alt=""
                                width={512}
                                height={512}
                                loading="lazy"
                                className="size-9 shrink-0 object-contain sm:size-10"
                            />
                            <span className="text-xs leading-5 font-medium sm:text-sm">
                                {t(`navigation:footer.trust.${id}`)}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
                    <div>
                        <Link to="/" className="inline-flex items-center gap-3">
                            <BrandMark className="size-12" />
                            <span className="text-base font-semibold tracking-tight">
                                {storeName}
                            </span>
                        </Link>

                        <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-6">
                            {t('common:store.description')}
                        </p>

                        <div className="mt-5 flex gap-2">
                            <SocialLink href={storeInfo.instagramUrl} label="Instagram">
                                <SiInstagram className="size-4" aria-hidden="true" />
                            </SocialLink>
                            <SocialLink href={storeInfo.snapchatUrl} label="Facebook">
                                <SiSnapchat className="size-4" aria-hidden="true" />
                            </SocialLink>
                            <SocialLink href={storeInfo.facebookUrl} label="Instagram">
                                <SiFacebook className="size-4" aria-hidden="true" />
                            </SocialLink>
                        </div>
                    </div>

                    <FooterColumn title={t('navigation:footer.explore')} links={exploreLinks} />
                    <FooterColumn
                        title={t('navigation:footer.customerCare')}
                        titleHref="/customer-care"
                        links={customerCareLinks}
                    />

                    <div>
                        <h3 className="text-sm font-semibold">
                            {t('navigation:footer.getInTouch')}
                        </h3>
                        <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
                            <li className="flex items-start gap-2.5">
                                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                <a
                                    href={storeInfo.mapDirectionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={t('navigation:footer.openMap', {
                                        address,
                                    })}
                                    className="hover:text-foreground decoration-border inline-flex items-center gap-1 underline decoration-1 underline-offset-4 transition-colors"
                                >
                                    {address}
                                    <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
                                </a>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                <a
                                    href={`tel:${storeInfo.phoneLink}`}
                                    className="hover:text-foreground break-words"
                                >
                                    {storeInfo.phoneDisplay}
                                </a>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                <Link
                                    to={`mailto:${storeInfo.email}`}
                                    className="hover:text-foreground break-all"
                                >
                                    {storeInfo.email}
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-border text-muted-foreground mt-8 flex flex-col gap-4 border-t pt-5 text-xs sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        © {new Date().getFullYear()} {storeName}.{' '}
                        {t('navigation:footer.rightsReserved')}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-3">
                        <Link
                            to={aboutHref}
                            className="hover:text-foreground inline-flex min-h-6 items-center gap-1"
                        >
                            {t('navigation:footer.backToTop')}
                            <ArrowUpRight className="size-3" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function SocialLink({
    href,
    label,
    children,
}: {
    href: string;
    label: string;
    children: React.ReactNode;
}) {
    const placeholder = href === '#';

    return (
        <a
            href={href}
            aria-label={label}
            aria-disabled={placeholder}
            onClick={placeholder ? (event) => event.preventDefault() : undefined}
            className="border-border hover:bg-muted focus-visible:ring-ring grid size-10 place-items-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
            {children}
        </a>
    );
}

function FooterColumn({
    title,
    titleHref,
    links,
}: {
    title: string;
    titleHref?: string;
    links: [string, string][];
}) {
    return (
        <div>
            <h3 className="text-sm font-semibold">
                {titleHref ? (
                    <Link
                        to={titleHref}
                        className="hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        {title}
                        <ArrowRight
                            className="text-muted-foreground size-3.5 rtl:rotate-180"
                            aria-hidden="true"
                        />
                    </Link>
                ) : (
                    title
                )}
            </h3>
            <ul className="mt-4 space-y-2.5">
                {links.map(([label, href]) => (
                    <li key={`${label}-${href}`}>
                        {href.startsWith('/') && !href.includes('#') ? (
                            <Link
                                to={href}
                                className="text-muted-foreground hover:text-foreground inline-flex min-h-8 items-center text-sm transition-colors"
                            >
                                {label}
                            </Link>
                        ) : (
                            <a
                                href={href}
                                className="text-muted-foreground hover:text-foreground inline-flex min-h-8 items-center text-sm transition-colors"
                            >
                                {label}
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
