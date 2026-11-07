import { lazy, Suspense, useState } from 'react';
import { CheckCircle2, MessageCircle, Send, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/ui/button.tsx';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select.tsx';
import { Textarea } from '@/shared/components/ui/textarea.tsx';
import type { SupportRequest, SupportTopic } from '@/features/support/types/support.ts';
import {
    SUPPORT_FORM_DEFAULTS,
    SUPPORT_MESSAGE_MAX_LENGTH,
    SUPPORT_TOPIC,
    SUPPORT_TOPICS,
} from '@/features/support/constants/support.ts';
import { supportRequestSchema } from '@/features/support/schemas/support.ts';
import { applyZodErrors } from '@/shared/utils/form-errors.ts';
import type { PickedLocation } from '@/features/delivery/components/store/delivery-location-map.tsx';
import { storeInfo } from '@/features/storefront/constants/store.ts';

const DeliveryLocationMap = lazy(
    () => import('@/features/delivery/components/store/delivery-location-map.tsx'),
);

export function ContactForm({
    className,
    initialTopic = SUPPORT_TOPIC.ORDER,
}: {
    className?: string;
    initialTopic?: SupportTopic;
}) {
    const { t } = useTranslation('support');
    const [prepared, setPrepared] = useState(false);
    const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        setError,
        clearErrors,
        reset,
        formState: { errors },
    } = useForm<SupportRequest>({
        defaultValues: { ...SUPPORT_FORM_DEFAULTS, topic: initialTopic },
    });

    const topic = watch('topic');
    const messageLength = watch('message')?.length ?? 0;
    const topicItems = SUPPORT_TOPICS.map((option) => ({
        value: option,
        label: t(`contact.form.topics.${option}`),
    }));

    const submit = handleSubmit((values) => {
        clearErrors();

        const parsed = supportRequestSchema.safeParse(values);

        if (!parsed.success) {
            applyZodErrors(parsed.error, setError, {
                name: t('contact.form.validation.name'),
                email: t('contact.form.validation.email'),
                phone: t('contact.form.validation.phone'),
                orderNumber: t('contact.form.validation.orderNumber'),
                message: t('contact.form.validation.message'),
            });

            return;
        }

        const request = parsed.data;
        const topicLabel = t(`contact.form.topics.${request.topic}`);
        const subject = t('contact.form.emailSubject', {
            topic: topicLabel,
            name: request.name,
        });
        const body = t('contact.form.emailBody', {
            topic: topicLabel,
            name: request.name,
            email: request.email,
            phone: request.phone || t('contact.form.notProvided'),
            orderNumber: request.orderNumber || t('contact.form.notProvided'),
            message: request.message,
        });
        const locationLine = pickedLocation
            ? t('contact.form.location.emailLine', {
                  lat: pickedLocation.lat.toFixed(5),
                  lng: pickedLocation.lng.toFixed(5),
                  url: `https://www.openstreetmap.org/?mlat=${pickedLocation.lat}&mlon=${pickedLocation.lng}#map=17/${pickedLocation.lat}/${pickedLocation.lng}`,
              })
            : null;
        const fullBody = locationLine ? `${body}\n\n${locationLine}` : body;

        setPrepared(true);
        window.location.assign(
            `mailto:${storeInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`,
        );
    });

    function writeAnother() {
        reset();
        setPickedLocation(null);
        setPrepared(false);
    }

    return (
        <Card className={className}>
            <CardContent className="p-5 sm:p-7">
                <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
                        <MessageCircle className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">
                            {t('contact.form.title')}
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm leading-6">
                            {t('contact.form.description')}
                        </p>
                    </div>
                </div>

                {prepared ? (
                    <div
                        role="status"
                        className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5"
                    >
                        <div className="flex items-start gap-3">
                            <CheckCircle2
                                className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                aria-hidden="true"
                            />
                            <div>
                                <h3 className="font-semibold">{t('contact.form.preparedTitle')}</h3>
                                <p className="text-muted-foreground mt-1 text-sm leading-6">
                                    {t('contact.form.emailPrepared', { email: storeInfo.email })}
                                </p>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="mt-4 min-h-10"
                            onClick={writeAnother}
                        >
                            {t('contact.form.sendAnother')}
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={submit} noValidate className="mt-6 space-y-5 sm:mt-7">
                        <div className="space-y-2">
                            <Label htmlFor="support-topic">{t('contact.form.topicLabel')}</Label>
                            <Select
                                items={topicItems}
                                value={topic}
                                onValueChange={(value) => {
                                    const nextTopic = (value as SupportTopic | null) ?? 'other';

                                    setValue('topic', nextTopic, { shouldDirty: true });

                                    if (nextTopic !== 'delivery') {
                                        setPickedLocation(null);
                                    }
                                }}
                            >
                                <SelectTrigger
                                    id="support-topic"
                                    className="h-11 w-full"
                                    aria-label={t('contact.form.topicLabel')}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUPPORT_TOPICS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {t(`contact.form.topics.${option}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="support-name">{t('contact.form.nameLabel')}</Label>
                                <Input
                                    id="support-name"
                                    autoComplete="name"
                                    placeholder={t('contact.form.namePlaceholder')}
                                    className="h-11"
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={
                                        errors.name ? 'support-name-error' : undefined
                                    }
                                    {...register('name', { onChange: () => clearErrors('name') })}
                                />
                                {errors.name && (
                                    <p
                                        id="support-name-error"
                                        role="alert"
                                        className="text-destructive text-xs"
                                    >
                                        {errors.name.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="support-email">
                                    {t('contact.form.emailLabel')}
                                </Label>
                                <Input
                                    id="support-email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder={t('contact.form.emailPlaceholder')}
                                    className="h-11"
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? 'support-email-error' : undefined
                                    }
                                    {...register('email', { onChange: () => clearErrors('email') })}
                                />
                                {errors.email && (
                                    <p
                                        id="support-email-error"
                                        role="alert"
                                        className="text-destructive text-xs"
                                    >
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="support-phone">
                                    {t('contact.form.phoneLabel')}
                                </Label>
                                <Input
                                    id="support-phone"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    dir="ltr"
                                    placeholder={t('contact.form.phonePlaceholder')}
                                    className="h-11"
                                    aria-invalid={Boolean(errors.phone)}
                                    aria-describedby={
                                        errors.phone ? 'support-phone-error' : undefined
                                    }
                                    {...register('phone', { onChange: () => clearErrors('phone') })}
                                />
                                {errors.phone && (
                                    <p
                                        id="support-phone-error"
                                        role="alert"
                                        className="text-destructive text-xs"
                                    >
                                        {errors.phone.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="support-order-number">
                                    {t('contact.form.orderNumberLabel')}
                                </Label>
                                <Input
                                    id="support-order-number"
                                    dir="ltr"
                                    placeholder={t('contact.form.orderNumberPlaceholder')}
                                    className="h-11"
                                    aria-invalid={Boolean(errors.orderNumber)}
                                    aria-describedby={
                                        errors.orderNumber
                                            ? 'support-order-number-error'
                                            : undefined
                                    }
                                    {...register('orderNumber', {
                                        onChange: () => clearErrors('orderNumber'),
                                    })}
                                />
                                {errors.orderNumber && (
                                    <p
                                        id="support-order-number-error"
                                        role="alert"
                                        className="text-destructive text-xs"
                                    >
                                        {errors.orderNumber.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="support-message">
                                    {t('contact.form.messageLabel')}
                                </Label>
                                <span className="text-muted-foreground text-xs">
                                    {t('contact.form.messageCount', {
                                        count: messageLength,
                                        max: SUPPORT_MESSAGE_MAX_LENGTH,
                                    })}
                                </span>
                            </div>
                            <Textarea
                                id="support-message"
                                placeholder={t('contact.form.messagePlaceholder')}
                                maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
                                className="min-h-36 resize-y"
                                aria-invalid={Boolean(errors.message)}
                                aria-describedby={
                                    errors.message ? 'support-message-error' : undefined
                                }
                                {...register('message', { onChange: () => clearErrors('message') })}
                            />
                            {errors.message && (
                                <p
                                    id="support-message-error"
                                    role="alert"
                                    className="text-destructive text-xs"
                                >
                                    {errors.message.message}
                                </p>
                            )}
                        </div>

                        {topic === 'delivery' ? (
                            <div className="border-border bg-muted/30 rounded-2xl border p-3 sm:p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">
                                            {t('contact.form.location.title')}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs leading-5">
                                            {t('contact.form.location.description')}
                                        </p>
                                    </div>

                                    {pickedLocation ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0"
                                            onClick={() => setPickedLocation(null)}
                                        >
                                            <X className="me-1 size-3.5" aria-hidden="true" />
                                            {t('contact.form.location.clear')}
                                        </Button>
                                    ) : null}
                                </div>

                                <div className="border-border relative z-0 mt-3 overflow-hidden rounded-xl border">
                                    <Suspense fallback={<div className="bg-muted h-64 w-full" />}>
                                        <DeliveryLocationMap
                                            value={pickedLocation}
                                            onChange={setPickedLocation}
                                            label={t('contact.form.location.mapLabel')}
                                        />
                                    </Suspense>
                                </div>

                                <p
                                    className="text-muted-foreground mt-2 text-xs"
                                    aria-live="polite"
                                >
                                    {pickedLocation ? (
                                        <>
                                            {t('contact.form.location.pinned')}{' '}
                                            <span dir="ltr" className="tabular-nums">
                                                {pickedLocation.lat.toFixed(5)},{' '}
                                                {pickedLocation.lng.toFixed(5)}
                                            </span>
                                        </>
                                    ) : (
                                        t('contact.form.location.hint')
                                    )}
                                </p>
                            </div>
                        ) : null}

                        <p className="border-border bg-muted/50 text-muted-foreground rounded-xl border p-3 text-xs leading-5">
                            {t('contact.form.privacyNotice')}
                        </p>

                        <Button type="submit" className="min-h-11 w-full sm:w-auto">
                            <Send className="me-2 size-4 rtl:rotate-180" aria-hidden="true" />
                            {t('contact.form.submit')}
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
