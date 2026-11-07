import { Clock3, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { getStoreAddress, storeInfo } from '@/components/store/layout/store-content.ts';
import { useLocale } from '@/hooks/use-locale.ts';

export function StoreInfoCard({ className }: { className?: string }) {
    const { t } = useTranslation(['support', 'contact']);
    const { isArabic } = useLocale();
    const address = getStoreAddress(isArabic);

    return (
        <Card className={className}>
            <CardContent className="space-y-5 p-5 sm:p-6">
                <h2 className="font-semibold">{t('contact.storeInfo.title')}</h2>

                <InfoRow icon={MapPin} label={t('contact.storeInfo.address')} value={address} />
                <InfoRow
                    icon={Phone}
                    label={t('contact.storeInfo.phone')}
                    value={storeInfo.phoneDisplay}
                    href={`tel:${storeInfo.phoneLink}`}
                />
                <InfoRow
                    icon={Mail}
                    label={t('contact.storeInfo.email')}
                    value={storeInfo.email}
                    href={`mailto:${storeInfo.email}`}
                />

                <div className="flex gap-3">
                    <span className="bg-secondary grid size-10 shrink-0 place-items-center rounded-xl">
                        <Clock3 className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{t('contact.storeInfo.hours')}</p>
                        <div className="mt-2 space-y-1.5">
                            {storeInfo.openingHours.map((item) => (
                                <div
                                    key={item.id}
                                    className="text-muted-foreground flex flex-col gap-0.5 text-xs min-[380px]:flex-row min-[380px]:justify-between min-[380px]:gap-3"
                                >
                                    <span>{t(item.daysKey)}</span>
                                    <span className="min-[380px]:text-start">
                                        {t(item.hoursKey)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <Button asChild className="min-h-10 w-full">
                    <a href={storeInfo.mapDirectionsUrl} target="_blank" rel="noreferrer">
                        <Navigation className="me-2 size-4" aria-hidden="true" />
                        {t('contact.storeInfo.directions')}
                    </a>
                </Button>

                <iframe
                    title={t('contact.storeInfo.mapTitle')}
                    src={storeInfo.mapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="bg-muted h-44 w-full rounded-xl border-0"
                    allowFullScreen
                />
            </CardContent>
        </Card>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
    href,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    href?: string;
}) {
    return (
        <div className="flex gap-3">
            <span className="bg-secondary grid size-10 shrink-0 place-items-center rounded-xl">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                {href ? (
                    <a
                        href={href}
                        dir="auto"
                        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-1 block text-sm break-words underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    >
                        {value}
                    </a>
                ) : (
                    <p dir="auto" className="text-muted-foreground mt-1 text-sm break-words">
                        {value}
                    </p>
                )}
            </div>
        </div>
    );
}
