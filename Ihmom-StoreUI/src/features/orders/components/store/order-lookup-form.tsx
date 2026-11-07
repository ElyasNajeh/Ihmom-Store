import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { Spinner } from '@/shared/components/ui/spinner.tsx';
import type { OrderHistoryRequest } from '@/features/orders/types/order.ts';
import { ORDER_LOOKUP_FORM_DEFAULTS } from '@/features/orders/constants/orders.ts';
import { orderHistorySchema } from '@/features/orders/schemas/orders.ts';
import { applyZodErrors } from '@/shared/utils/form-errors.ts';

interface OrderLookupFormProps {
    isSearching: boolean;
    onSubmit: (values: OrderHistoryRequest) => void;
}

export function OrderLookupForm({ isSearching, onSubmit }: OrderLookupFormProps) {
    const { t } = useTranslation('orders');
    const {
        register,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<OrderHistoryRequest>({
        defaultValues: ORDER_LOOKUP_FORM_DEFAULTS,
    });

    const submit = handleSubmit((values) => {
        if (isSearching) {
            return;
        }

        const parsed = orderHistorySchema.safeParse(values);

        if (!parsed.success) {
            applyZodErrors(parsed.error, setError, {
                phone: t('lookup.phoneError'),
                order_number: t('lookup.orderNumberError'),
            });
            return;
        }

        onSubmit(parsed.data);
    });

    return (
        <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
            onSubmit={submit}
            noValidate
        >
            <div className="min-w-0 space-y-2">
                <Label htmlFor="order-phone">{t('lookup.phoneLabel')}</Label>

                <Input
                    id="order-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder={t('lookup.phonePlaceholder')}
                    className="h-11"
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'order-phone-error' : 'order-phone-hint'}
                    {...register('phone', { onChange: () => clearErrors('phone') })}
                />

                {errors.phone ? (
                    <p id="order-phone-error" role="alert" className="text-destructive text-xs">
                        {errors.phone.message}
                    </p>
                ) : (
                    <p id="order-phone-hint" className="text-muted-foreground text-xs">
                        {t('lookup.phoneHint')}
                    </p>
                )}
            </div>

            <div className="min-w-0 space-y-2">
                <Label htmlFor="order-number">{t('lookup.orderNumberLabel')}</Label>

                <Input
                    id="order-number"
                    type="text"
                    dir="ltr"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={50}
                    placeholder={t('lookup.orderNumberPlaceholder')}
                    className="h-11 font-mono"
                    aria-invalid={Boolean(errors.order_number)}
                    aria-describedby={
                        errors.order_number ? 'order-number-error' : 'order-number-hint'
                    }
                    {...register('order_number', {
                        onChange: () => clearErrors('order_number'),
                    })}
                />

                {errors.order_number ? (
                    <p id="order-number-error" role="alert" className="text-destructive text-xs">
                        {errors.order_number.message}
                    </p>
                ) : (
                    <p id="order-number-hint" className="text-muted-foreground text-xs">
                        {t('lookup.orderNumberHint')}
                    </p>
                )}
            </div>

            <div className="sm:pt-[22px]">
                <Button
                    type="submit"
                    className="h-11 w-full gap-1.5 sm:w-auto"
                    disabled={isSearching}
                >
                    {isSearching ? (
                        <Spinner className="size-4" />
                    ) : (
                        <Search className="size-4" aria-hidden="true" />
                    )}
                    {isSearching ? t('lookup.searching') : t('lookup.submit')}
                </Button>
            </div>
        </form>
    );
}
