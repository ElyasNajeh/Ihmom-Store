import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Clock3, Mail, MapPin, MessageCircle, Navigation, Phone, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import type { ContactFormValues } from '@/features/support/types/contact';
import { CONTACT_FORM_DEFAULTS } from '@/features/support/constants/support';
import { contactFormSchema } from '@/features/support/schemas/contact';
import { applyZodErrors } from '@/shared/utils/form-errors';
import { getStoreAddress, storeInfo } from '@/features/storefront/constants/store.ts';
import { useLocale } from '@/shared/hooks/useLocale';

export function StoreContact() {
    const [prepared, setPrepared] = useState(false);
    const { t } = useTranslation('contact');
    const { isArabic } = useLocale();
    const address = getStoreAddress(isArabic);
    const {
        register,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<ContactFormValues>({
        defaultValues: CONTACT_FORM_DEFAULTS,
    });

    function onSubmit(values: ContactFormValues) {
        const parsed = contactFormSchema.safeParse(values);

        if (!parsed.success) {
            applyZodErrors(parsed.error, setError, {
                name: t('validation.name'),
                email: t('validation.email'),
                message: t('validation.message'),
            });

            return;
        }

        const data = parsed.data;
        const subject = encodeURIComponent(t('emailSubject', { name: data.name }));
        const body = encodeURIComponent(
            t('emailBody', {
                name: data.name,
                email: data.email,
                message: data.message,
            }),
        );

        setPrepared(true);
        window.location.assign(`mailto:${storeInfo.email}?subject=${subject}&body=${body}`);
    }

    return (
        <section
            id="contact"
            className="border-border bg-secondary/45 scroll-mt-20 border-t sm:scroll-mt-24"
        >
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
                <div className="max-w-2xl">
                    <p className="text-muted-foreground font-emphasis text-xs tracking-[0.08em] uppercase italic">
                        {t('eyebrow')}
                    </p>
                    <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">
                        {t('title')}
                    </h2>
                    <p className="text-muted-foreground mt-4 text-sm leading-6 sm:leading-7">
                        {t('description')}
                    </p>
                </div>

                <div className="mt-7 grid gap-4 sm:mt-9 sm:gap-5 lg:grid-cols-[0.82fr_1.18fr]">
                    <div className="space-y-4">
                        <Card className="rounded-2xl shadow-none">
                            <CardContent className="p-4 sm:p-6">
                                <h3 className="font-semibold">{t('storeInformation')}</h3>

                                <div className="mt-5 space-y-5">
                                    <InfoRow icon={MapPin} label={t('address')} value={address} />
                                    <InfoRow
                                        icon={Phone}
                                        label={t('phone')}
                                        value={storeInfo.phoneDisplay}
                                        href={`tel:${storeInfo.phoneLink}`}
                                    />
                                    <InfoRow
                                        icon={Mail}
                                        label={t('email')}
                                        value={storeInfo.email}
                                        href={`mailto:${storeInfo.email}`}
                                    />

                                    <div className="flex gap-3">
                                        <span className="bg-secondary grid size-10 shrink-0 place-items-center rounded-xl">
                                            <Clock3 className="size-4" aria-hidden="true" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium">
                                                {t('openingHours')}
                                            </p>
                                            <div className="mt-2 space-y-2">
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
                                </div>

                                <Button className="mt-6 min-h-11 w-full" asChild>
                                    <a
                                        href={storeInfo.mapDirectionsUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Navigation className="me-2 size-4" aria-hidden="true" />
                                        {t('getDirections')}
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden rounded-2xl shadow-none">
                            <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
                                <div className="min-w-0">
                                    <h3 className="font-semibold">{t('visitStore')}</h3>
                                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                                        {t('mapNote')}
                                    </p>
                                </div>
                                <MapPin
                                    className="text-muted-foreground size-5 shrink-0"
                                    aria-hidden="true"
                                />
                            </div>
                            <div className="p-3 pt-4">
                                <iframe
                                    title={t('mapTitle')}
                                    src={storeInfo.mapEmbedUrl}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="bg-muted h-56 w-full rounded-xl border-0 sm:h-[280px]"
                                    allowFullScreen
                                />
                            </div>
                        </Card>
                    </div>

                    <Card className="rounded-2xl shadow-none">
                        <CardContent className="p-4 sm:p-7">
                            <div className="flex items-start gap-3">
                                <span className="bg-brand/20 grid size-10 shrink-0 place-items-center rounded-xl sm:size-11">
                                    <MessageCircle className="size-5" aria-hidden="true" />
                                </span>
                                <div>
                                    <h3 className="text-lg font-semibold tracking-tight">
                                        {t('formTitle')}
                                    </h3>
                                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                                        {t('formDescription')}
                                    </p>
                                </div>
                            </div>

                            <form
                                onSubmit={handleSubmit(onSubmit)}
                                noValidate
                                className="mt-6 space-y-5 sm:mt-7"
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="contact-name">{t('nameLabel')}</Label>
                                        <Input
                                            id="contact-name"
                                            autoComplete="name"
                                            placeholder={t('namePlaceholder')}
                                            className="min-h-11"
                                            aria-invalid={Boolean(errors.name)}
                                            aria-describedby={
                                                errors.name ? 'contact-name-error' : undefined
                                            }
                                            {...register('name', {
                                                onChange: () => clearErrors('name'),
                                            })}
                                        />
                                        {errors.name && (
                                            <p
                                                id="contact-name-error"
                                                className="text-destructive text-sm"
                                                role="alert"
                                            >
                                                {t('validation.name')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="contact-email">{t('emailLabel')}</Label>
                                        <Input
                                            id="contact-email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder={t('emailPlaceholder')}
                                            className="min-h-11"
                                            aria-invalid={Boolean(errors.email)}
                                            aria-describedby={
                                                errors.email ? 'contact-email-error' : undefined
                                            }
                                            {...register('email', {
                                                onChange: () => clearErrors('email'),
                                            })}
                                        />
                                        {errors.email && (
                                            <p
                                                id="contact-email-error"
                                                className="text-destructive text-sm"
                                                role="alert"
                                            >
                                                {t('validation.email')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact-message">{t('messageLabel')}</Label>
                                    <Textarea
                                        id="contact-message"
                                        placeholder={t('messagePlaceholder')}
                                        className="min-h-36 resize-y"
                                        aria-invalid={Boolean(errors.message)}
                                        aria-describedby={
                                            errors.message ? 'contact-message-error' : undefined
                                        }
                                        {...register('message', {
                                            onChange: () => clearErrors('message'),
                                        })}
                                    />
                                    {errors.message && (
                                        <p
                                            id="contact-message-error"
                                            className="text-destructive text-sm"
                                            role="alert"
                                        >
                                            {t('validation.message')}
                                        </p>
                                    )}
                                </div>

                                <p className="border-border bg-muted/50 text-muted-foreground rounded-xl border p-3 text-xs leading-5">
                                    {t('privacyNotice')}
                                </p>

                                <Button type="submit" className="min-h-11 w-full sm:w-auto">
                                    <Send
                                        className="me-2 size-4 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                    {t('submit')}
                                </Button>

                                {prepared && (
                                    <p
                                        role="status"
                                        className="text-muted-foreground text-sm leading-6"
                                    >
                                        {t('emailPrepared', { email: storeInfo.email })}
                                    </p>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
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
