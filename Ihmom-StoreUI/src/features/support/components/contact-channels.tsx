import { Mail, MapPin, Phone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/ui/button.tsx';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';
import { getStoreAddress, storeInfo } from '@/features/storefront/constants/store.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';

interface Channel {
    id: 'call' | 'email' | 'visit';
    icon: LucideIcon;
    href: string;
    value: string;
    external?: boolean;
}

export function ContactChannels({ className }: { className?: string }) {
    const { t } = useTranslation('support');
    const { isArabic } = useLocale();
    const address = getStoreAddress(isArabic);

    const channels: Channel[] = [
        {
            id: 'call',
            icon: Phone,
            href: `tel:${storeInfo.phoneLink}`,
            value: storeInfo.phoneDisplay,
        },
        {
            id: 'email',
            icon: Mail,
            href: `mailto:${storeInfo.email}`,
            value: storeInfo.email,
        },
        {
            id: 'visit',
            icon: MapPin,
            href: storeInfo.mapDirectionsUrl,
            value: address,
            external: true,
        },
    ];

    return (
        <div className={className}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {channels.map(({ id, icon: Icon, href, value, external }) => (
                    <Card key={id} className="flex flex-col shadow-none">
                        <CardContent className="flex flex-1 flex-col p-5">
                            <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
                                <Icon className="size-4" aria-hidden="true" />
                            </span>

                            <h3 className="mt-3 font-semibold">
                                {t(`contact.channels.${id}.title`)}
                            </h3>
                            <p className="text-muted-foreground mt-1 text-sm leading-6">
                                {t(`contact.channels.${id}.description`)}
                            </p>
                            <p dir="auto" className="text-muted-foreground mt-3 text-xs break-all">
                                {value}
                            </p>

                            <Button asChild variant="outline" className="mt-4 min-h-9 w-full">
                                {external ? (
                                    <a href={href} target="_blank" rel="noreferrer">
                                        {t(`contact.channels.${id}.cta`)}
                                    </a>
                                ) : (
                                    <a href={href}>{t(`contact.channels.${id}.cta`)}</a>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
