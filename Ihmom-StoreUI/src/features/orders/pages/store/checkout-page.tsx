import { useEffect, useState } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Download,
    Pencil,
    ShoppingBag,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert.tsx';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { SearchableSelect } from '@/shared/components/ui/searchable-select.tsx';
import { Separator } from '@/shared/components/ui/separator.tsx';
import { Spinner } from '@/shared/components/ui/spinner.tsx';
import { Textarea } from '@/shared/components/ui/textarea.tsx';
import { useToastManager } from '@/shared/components/ui/toast.tsx';
import { useCart } from '@/features/cart/context/cart-context.ts';
import { useDeliveryAreas } from '@/features/delivery/hooks/useDeliveryAreas.ts';
import { useCheckout, useOrderHistoryInvoice } from '@/features/orders/hooks/useOrders.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import type { CheckoutOrder } from '@/features/orders/types/order.ts';
import { checkoutSchema } from '@/features/orders/schemas/orders.ts';
import {
    CHECKOUT_FORM_DEFAULTS,
    INVOICE_FILENAME_PREFIX,
} from '@/features/orders/constants/orders.ts';
import { FETCH_ALL_PARAMS } from '@/shared/constants/query.ts';
import { formatOrderMoney } from '@/features/orders/utils/order-format.ts';
import { localizedText } from '@/shared/utils/localized.ts';
import { getApiErrorMessage } from '@/shared/utils/api-error.ts';
import { downloadBlob } from '@/shared/utils/download.ts';
import { applyZodErrors } from '@/shared/utils/form-errors.ts';
import { cn } from '@/shared/lib/utils.ts';

interface CheckoutFormValues {
    customer_name: string;
    customer_phone: string;
    delivery_area_id: string;
    address: string;
    notes: string;
}

const EMPTY_CHECKOUT: CheckoutFormValues = CHECKOUT_FORM_DEFAULTS;

export default function CheckoutPage() {
    const { t } = useTranslation(['orders', 'common']);
    const navigate = useNavigate();
    const { items, subtotal, clearCart } = useCart();
    const areasQuery = useDeliveryAreas(FETCH_ALL_PARAMS);
    const checkoutMutation = useCheckout();
    const invoiceMutation = useOrderHistoryInvoice();
    const toastManager = useToastManager();
    const { isArabic, locale, language } = useLocale();
    const [placedOrder, setPlacedOrder] = useState<CheckoutOrder | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [invoiceDownloaded, setInvoiceDownloaded] = useState(false);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            Boolean(placedOrder) &&
            !invoiceDownloaded &&
            currentLocation.pathname !== nextLocation.pathname,
    );

    useEffect(() => {
        if (!placedOrder || invoiceDownloaded) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [placedOrder, invoiceDownloaded]);

    const {
        register,
        handleSubmit,
        setError,
        clearErrors,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CheckoutFormValues>({ defaultValues: EMPTY_CHECKOUT });

    const areaId = watch('delivery_area_id');
    const areas = areasQuery.data?.items ?? [];
    const selectedArea = areas.find((area) => String(area.id) === areaId);
    const deliveryFee = selectedArea ? Number(selectedArea.delivery_fee) : 0;
    const total = subtotal + deliveryFee;

    const areaName = (area: { name_ar: string; name_en: string }) =>
        localizedText(area.name_en, area.name_ar, isArabic);

    const areaItems = areas.map((area) => ({
        value: String(area.id),
        label: areaName(area),
        keywords: `${area.name_ar} ${area.name_en}`,
        meta: formatOrderMoney(area.delivery_fee, locale),
    }));

    const nameFor = (nameAr: string, nameEn: string) => localizedText(nameEn, nameAr, isArabic);

    const parseCheckout = (values: CheckoutFormValues) =>
        checkoutSchema.safeParse({
            customer_name: values.customer_name,
            customer_phone: values.customer_phone,
            delivery_area_id: Number(values.delivery_area_id),
            address: values.address,
            notes: values.notes,
            items: items.map((item) => ({
                product_variant_id: item.variantId,
                quantity: item.quantity,
            })),
        });

    const goToStep = (next: 1 | 2) => {
        setStep(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submit = handleSubmit((values) => {
        if (checkoutMutation.isPending) {
            return;
        }

        const parsed = parseCheckout(values);

        if (!parsed.success) {
            applyZodErrors(parsed.error, setError, {
                customer_name: t('checkout.nameRequired'),
                customer_phone: t('checkout.phoneInvalid'),
                delivery_area_id: t('checkout.areaRequired'),
                address: t('checkout.addressRequired'),
            });

            if (step === 2) {
                setStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            return;
        }

        if (step === 1) {
            goToStep(2);

            return;
        }

        checkoutMutation.mutate(parsed.data, {
            onSuccess: (order) => {
                setPlacedOrder(order);
                clearCart();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    });

    const downloadInvoice = async (): Promise<boolean> => {
        if (!placedOrder || invoiceMutation.isPending) {
            return false;
        }

        try {
            const blob = await invoiceMutation.mutateAsync({
                token: placedOrder.history_access_token,
                language,
            });
            downloadBlob(blob, `${INVOICE_FILENAME_PREFIX}-${placedOrder.order_number}.pdf`);
            setInvoiceDownloaded(true);

            return true;
        } catch (error) {
            toastManager.add({
                type: 'error',
                title: t('checkout.invoiceErrorTitle'),
                description: getApiErrorMessage(error) ?? t('checkout.invoiceErrorDescription'),
            });

            return false;
        }
    };

    const downloadAndLeave = async () => {
        if (blocker.state !== 'blocked') {
            return;
        }

        const downloaded = await downloadInvoice();

        if (downloaded && blocker.state === 'blocked') {
            blocker.proceed();
        }
    };

    if (placedOrder) {
        return (
            <main className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
                <Card>
                    <CardContent className="flex flex-col items-center px-6 py-10 text-center">
                        <span className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-7" aria-hidden="true" />
                        </span>

                        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                            {t('checkout.successTitle')}
                        </h1>
                        <p className="text-muted-foreground mt-2 max-w-md text-sm">
                            {t('checkout.successDescription', {
                                number: placedOrder.order_number,
                            })}
                        </p>

                        <dl className="border-border mt-7 w-full max-w-md space-y-3 rounded-xl border p-5 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    {t('checkout.orderNumber')}
                                </dt>
                                <dd className="font-semibold">{placedOrder.order_number}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    {t('checkout.deliveryTo')}
                                </dt>
                                <dd className="text-end">
                                    {localizedText(
                                        placedOrder.delivery_area_name_en,
                                        placedOrder.delivery_area_name_ar,
                                        isArabic,
                                    )}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">{t('checkout.subtotal')}</dt>
                                <dd className="tabular-nums">
                                    {formatOrderMoney(placedOrder.subtotal, locale)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    {t('checkout.deliveryFee')}
                                </dt>
                                <dd className="tabular-nums">
                                    {formatOrderMoney(placedOrder.delivery_fee, locale)}
                                </dd>
                            </div>
                            <div className="border-border flex items-center justify-between gap-3 border-t pt-3 font-semibold">
                                <dt>{t('checkout.total')}</dt>
                                <dd className="tabular-nums">
                                    {formatOrderMoney(placedOrder.total, locale)}
                                </dd>
                            </div>
                        </dl>

                        <div className="mt-7 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
                            <Button
                                type="button"
                                onClick={() => void downloadInvoice()}
                                disabled={invoiceMutation.isPending}
                            >
                                {invoiceMutation.isPending ? (
                                    <Spinner className="size-4" />
                                ) : invoiceDownloaded ? (
                                    <CheckCircle2 aria-hidden="true" />
                                ) : (
                                    <Download aria-hidden="true" />
                                )}
                                {invoiceMutation.isPending
                                    ? t('checkout.downloadingInvoice')
                                    : invoiceDownloaded
                                      ? t('checkout.downloadInvoiceAgain')
                                      : t('checkout.downloadInvoice')}
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/my-orders')}>
                                {t('checkout.viewOrders')}
                            </Button>
                            <Button variant="ghost" asChild>
                                <Link to="/shop">{t('checkout.continueShopping')}</Link>
                            </Button>
                        </div>

                        {invoiceDownloaded ? (
                            <p
                                role="status"
                                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                            >
                                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                {t('checkout.invoiceDownloadedNotice')}
                            </p>
                        ) : null}

                        <p className="text-muted-foreground mt-5 text-xs">
                            {t('checkout.invoiceNote')}
                        </p>
                        <p className="text-muted-foreground mt-2 text-xs">
                            {t('checkout.cashNote')}
                        </p>
                    </CardContent>
                </Card>

                <AlertDialog
                    open={blocker.state === 'blocked'}
                    onOpenChange={(open) => {
                        if (!open && blocker.state === 'blocked' && !invoiceMutation.isPending) {
                            blocker.reset();
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogMedia className="bg-destructive/10 text-destructive">
                                <AlertTriangle aria-hidden="true" />
                            </AlertDialogMedia>
                            <AlertDialogTitle>{t('checkout.invoiceWarningTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('checkout.invoiceWarningDescription', {
                                    number: placedOrder.order_number,
                                })}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <div className="flex w-full flex-col gap-2">
                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={() => void downloadAndLeave()}
                                    disabled={invoiceMutation.isPending}
                                >
                                    {invoiceMutation.isPending ? (
                                        <Spinner className="size-4" />
                                    ) : (
                                        <Download aria-hidden="true" />
                                    )}
                                    {t('checkout.invoiceWarningDownload')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        if (blocker.state === 'blocked') {
                                            blocker.reset();
                                        }
                                    }}
                                >
                                    {t('checkout.invoiceWarningStay')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => {
                                        if (blocker.state === 'blocked') {
                                            blocker.proceed();
                                        }
                                    }}
                                >
                                    {t('checkout.invoiceWarningLeave')}
                                </Button>
                            </div>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        );
    }

    if (items.length === 0) {
        return (
            <main className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
                <div className="border-border bg-card flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
                    <span className="bg-muted text-muted-foreground grid size-14 place-items-center rounded-full">
                        <ShoppingBag className="size-6" aria-hidden="true" />
                    </span>
                    <h1 className="mt-4 text-xl font-semibold">{t('checkout.emptyTitle')}</h1>
                    <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                        {t('checkout.emptyDescription')}
                    </p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                        <Button variant="outline" asChild>
                            <Link to="/cart">
                                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                                {t('checkout.backToCart')}
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link to="/shop">{t('cart.continueShopping')}</Link>
                        </Button>
                    </div>
                </div>
            </main>
        );
    }

    const errorsFor = (field: keyof CheckoutFormValues) => {
        const message = errors[field]?.message;

        return typeof message === 'string' ? message : undefined;
    };

    const stepItems = [
        {
            id: 'delivery',
            title: t('checkout.steps.delivery.title'),
            description: t('checkout.steps.delivery.description'),
        },
        {
            id: 'review',
            title: t('checkout.steps.review.title'),
            description: t('checkout.steps.review.description'),
        },
    ];

    return (
        <main className="mx-auto w-full max-w-6xl px-4 pt-7 pb-12 sm:px-6 sm:pt-10 lg:px-8">
            <header className="mb-7 space-y-2 sm:mb-9">
                <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                    {t('checkout.meta.eyebrow')}
                </p>
                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    {t('checkout.meta.title')}
                </h1>
                <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
                    {t('checkout.meta.description')}
                </p>

                <ol
                    className="!mt-6 grid gap-2 sm:grid-cols-2"
                    aria-label={t('checkout.steps.label')}
                >
                    {stepItems.map((item, index) => {
                        const stepNumber = index + 1;
                        const isCurrent = stepNumber === step;
                        const isDone = stepNumber < step;

                        return (
                            <li
                                key={item.id}
                                aria-current={isCurrent ? 'step' : undefined}
                                className={cn(
                                    'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                                    isCurrent
                                        ? 'border-primary bg-primary/5'
                                        : isDone
                                          ? 'border-primary/40 bg-primary/5'
                                          : 'border-border',
                                )}
                            >
                                <span
                                    className={cn(
                                        'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
                                        isCurrent || isDone
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {isDone ? (
                                        <Check className="size-4" aria-hidden="true" />
                                    ) : (
                                        stepNumber
                                    )}
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium">
                                        {item.title}
                                    </span>
                                    <span className="text-muted-foreground block truncate text-xs">
                                        {item.description}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </header>

            <form
                onSubmit={submit}
                noValidate
                className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
            >
                <div className="space-y-5">
                    {step === 1 ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('checkout.contact')}</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkout-name">{t('checkout.name')}</Label>
                                        <Input
                                            id="checkout-name"
                                            autoComplete="name"
                                            placeholder={t('checkout.namePlaceholder')}
                                            aria-invalid={Boolean(errors.customer_name)}
                                            aria-describedby={
                                                errors.customer_name
                                                    ? 'checkout-name-error'
                                                    : undefined
                                            }
                                            {...register('customer_name', {
                                                onChange: () => clearErrors('customer_name'),
                                            })}
                                        />
                                        {errorsFor('customer_name') ? (
                                            <p
                                                id="checkout-name-error"
                                                role="alert"
                                                className="text-destructive text-xs"
                                            >
                                                {errorsFor('customer_name')}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkout-phone">
                                            {t('checkout.phone')}
                                        </Label>
                                        <Input
                                            id="checkout-phone"
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            dir="ltr"
                                            placeholder={t('checkout.phonePlaceholder')}
                                            aria-invalid={Boolean(errors.customer_phone)}
                                            aria-describedby={
                                                errors.customer_phone
                                                    ? 'checkout-phone-error'
                                                    : 'checkout-phone-hint'
                                            }
                                            {...register('customer_phone', {
                                                onChange: () => clearErrors('customer_phone'),
                                            })}
                                        />
                                        {errorsFor('customer_phone') ? (
                                            <p
                                                id="checkout-phone-error"
                                                role="alert"
                                                className="text-destructive text-xs"
                                            >
                                                {errorsFor('customer_phone')}
                                            </p>
                                        ) : (
                                            <p
                                                id="checkout-phone-hint"
                                                className="text-muted-foreground text-xs"
                                            >
                                                {t('checkout.phoneHint')}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('checkout.delivery')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkout-area">{t('checkout.area')}</Label>

                                        {areasQuery.isError ? (
                                            <Alert variant="destructive">
                                                <AlertTriangle aria-hidden="true" />
                                                <AlertTitle>{t('checkout.areasError')}</AlertTitle>
                                                <AlertDescription>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-2"
                                                        onClick={() => void areasQuery.refetch()}
                                                    >
                                                        {t('checkout.retry')}
                                                    </Button>
                                                </AlertDescription>
                                            </Alert>
                                        ) : (
                                            <SearchableSelect
                                                id="checkout-area"
                                                options={areaItems}
                                                value={areaId || null}
                                                onChange={(value) => {
                                                    setValue('delivery_area_id', value ?? '');
                                                    clearErrors('delivery_area_id');
                                                }}
                                                placeholder={
                                                    areasQuery.isPending
                                                        ? t('checkout.loadingAreas')
                                                        : t('checkout.selectArea')
                                                }
                                                searchPlaceholder={t('checkout.searchAreas')}
                                                emptyMessage={t('checkout.noAreasFound')}
                                                openLabel={t('checkout.area')}
                                                clearable={false}
                                                disabled={areasQuery.isPending}
                                                invalid={Boolean(errors.delivery_area_id)}
                                                aria-describedby={
                                                    errors.delivery_area_id
                                                        ? 'checkout-area-error'
                                                        : undefined
                                                }
                                            />
                                        )}

                                        {errorsFor('delivery_area_id') ? (
                                            <p
                                                id="checkout-area-error"
                                                role="alert"
                                                className="text-destructive text-xs"
                                            >
                                                {errorsFor('delivery_area_id')}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkout-address">
                                            {t('checkout.address')}
                                        </Label>
                                        <Textarea
                                            id="checkout-address"
                                            autoComplete="street-address"
                                            placeholder={t('checkout.addressPlaceholder')}
                                            aria-invalid={Boolean(errors.address)}
                                            aria-describedby={
                                                errors.address
                                                    ? 'checkout-address-error'
                                                    : undefined
                                            }
                                            {...register('address', {
                                                onChange: () => clearErrors('address'),
                                            })}
                                        />
                                        {errorsFor('address') ? (
                                            <p
                                                id="checkout-address-error"
                                                role="alert"
                                                className="text-destructive text-xs"
                                            >
                                                {errorsFor('address')}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkout-notes">
                                            {t('checkout.notes')}
                                        </Label>
                                        <Textarea
                                            id="checkout-notes"
                                            placeholder={t('checkout.notesPlaceholder')}
                                            {...register('notes')}
                                        />
                                    </div>

                                    <div className="border-border flex justify-end border-t pt-4">
                                        <Button
                                            type="submit"
                                            size="lg"
                                            className="min-h-11 w-full sm:w-auto"
                                        >
                                            {t('checkout.continueToReview')}
                                            <ArrowRight
                                                className="size-4 rtl:rotate-180"
                                                aria-hidden="true"
                                            />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <CardTitle>{t('checkout.reviewTitle')}</CardTitle>
                                        <CardDescription>
                                            {t('checkout.reviewDescription')}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => goToStep(1)}
                                    >
                                        <Pencil className="me-1 size-3.5" aria-hidden="true" />
                                        {t('checkout.editDetails')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <section aria-labelledby="checkout-review-contact">
                                    <h2
                                        id="checkout-review-contact"
                                        className="text-sm font-semibold"
                                    >
                                        {t('checkout.reviewContact')}
                                    </h2>
                                    <dl className="mt-2 space-y-2 text-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="text-muted-foreground">
                                                {t('checkout.name')}
                                            </dt>
                                            <dd className="text-end font-medium">
                                                {watch('customer_name')}
                                            </dd>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="text-muted-foreground">
                                                {t('checkout.phone')}
                                            </dt>
                                            <dd
                                                dir="ltr"
                                                className="text-end font-medium tabular-nums"
                                            >
                                                {watch('customer_phone')}
                                            </dd>
                                        </div>
                                    </dl>
                                </section>

                                <Separator />

                                <section aria-labelledby="checkout-review-delivery">
                                    <h2
                                        id="checkout-review-delivery"
                                        className="text-sm font-semibold"
                                    >
                                        {t('checkout.reviewDelivery')}
                                    </h2>
                                    <dl className="mt-2 space-y-2 text-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="text-muted-foreground">
                                                {t('checkout.area')}
                                            </dt>
                                            <dd className="text-end font-medium">
                                                {selectedArea ? areaName(selectedArea) : '-'}
                                            </dd>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="text-muted-foreground">
                                                {t('checkout.deliveryFee')}
                                            </dt>
                                            <dd className="text-end font-medium tabular-nums">
                                                {selectedArea
                                                    ? formatOrderMoney(
                                                          selectedArea.delivery_fee,
                                                          locale,
                                                      )
                                                    : '-'}
                                            </dd>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="text-muted-foreground">
                                                {t('checkout.address')}
                                            </dt>
                                            <dd className="max-w-[70%] text-end font-medium whitespace-pre-line">
                                                {watch('address')}
                                            </dd>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="text-muted-foreground">
                                                {t('checkout.reviewNotes')}
                                            </dt>
                                            <dd className="max-w-[70%] text-end whitespace-pre-line">
                                                {watch('notes')?.trim() || t('checkout.noNotes')}
                                            </dd>
                                        </div>
                                    </dl>
                                </section>

                                <Separator />

                                <dl className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-muted-foreground">
                                            {t('checkout.subtotal')}
                                        </dt>
                                        <dd className="tabular-nums">
                                            {formatOrderMoney(subtotal, locale)}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-muted-foreground">
                                            {t('checkout.deliveryFee')}
                                        </dt>
                                        <dd className="tabular-nums">
                                            {selectedArea
                                                ? formatOrderMoney(
                                                      selectedArea.delivery_fee,
                                                      locale,
                                                  )
                                                : '-'}
                                        </dd>
                                    </div>
                                    <div className="border-border flex items-center justify-between gap-3 border-t pt-2 text-base font-semibold">
                                        <dt>{t('checkout.total')}</dt>
                                        <dd className="tabular-nums">
                                            {formatOrderMoney(total, locale)}
                                        </dd>
                                    </div>
                                </dl>

                                {checkoutMutation.isError ? (
                                    <Alert variant="destructive">
                                        <AlertTriangle aria-hidden="true" />
                                        <AlertTitle>{t('checkout.errorTitle')}</AlertTitle>
                                        <AlertDescription>
                                            {getApiErrorMessage(checkoutMutation.error) ??
                                                t('checkout.errorDescription')}
                                        </AlertDescription>
                                    </Alert>
                                ) : null}

                                <p className="text-muted-foreground text-xs leading-5">
                                    {t('checkout.reviewNote')}
                                </p>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="min-h-11"
                                        onClick={() => goToStep(1)}
                                    >
                                        <ArrowLeft
                                            className="size-4 rtl:rotate-180"
                                            aria-hidden="true"
                                        />
                                        {t('checkout.backToDetails')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="min-h-11 flex-1"
                                        disabled={checkoutMutation.isPending}
                                    >
                                        {checkoutMutation.isPending ? (
                                            <Spinner className="size-4" />
                                        ) : null}
                                        {checkoutMutation.isPending
                                            ? t('checkout.placingOrder')
                                            : t('checkout.placeOrder')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <aside className="lg:sticky lg:top-24">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('checkout.summary')}</CardTitle>
                            <CardDescription>
                                {t('cart.itemCount', {
                                    count: items.reduce((count, item) => count + item.quantity, 0),
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="border-border divide-border divide-y border-y">
                                {items.map((item) => (
                                    <li
                                        key={item.variantId}
                                        className="flex items-start justify-between gap-3 py-2 text-sm"
                                    >
                                        <span className="min-w-0">
                                            <span className="line-clamp-1 font-medium">
                                                {nameFor(item.nameAr, item.nameEn)}
                                            </span>
                                            <span className="text-muted-foreground text-xs">
                                                {t('cart.units', { count: item.quantity })}
                                            </span>
                                        </span>
                                        <span className="shrink-0 tabular-nums">
                                            {formatOrderMoney(
                                                Number(item.price) * item.quantity,
                                                locale,
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <dl className="space-y-2 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-muted-foreground">
                                        {t('checkout.subtotal')}
                                    </dt>
                                    <dd className="tabular-nums">
                                        {formatOrderMoney(subtotal, locale)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-muted-foreground">
                                        {t('checkout.deliveryFee')}
                                    </dt>
                                    <dd className="tabular-nums">
                                        {selectedArea
                                            ? formatOrderMoney(selectedArea.delivery_fee, locale)
                                            : '-'}
                                    </dd>
                                </div>
                                <div className="border-border flex items-center justify-between gap-3 border-t pt-2 text-base font-semibold">
                                    <dt>{t('checkout.total')}</dt>
                                    <dd className="tabular-nums">
                                        {formatOrderMoney(total, locale)}
                                    </dd>
                                </div>
                            </dl>

                            <p className="text-muted-foreground text-center text-xs">
                                {t('checkout.cashNote')}
                            </p>

                            <Button type="button" variant="ghost" className="w-full" asChild>
                                <Link to="/cart">
                                    <ArrowLeft
                                        className="size-4 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                    {t('checkout.backToCart')}
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </aside>
            </form>
        </main>
    );
}
