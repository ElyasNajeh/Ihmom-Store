import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/button.tsx';
import { DialogClose, DialogFooter } from '@/shared/components/ui/dialog.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { Spinner } from '@/shared/components/ui/spinner.tsx';
import { Switch } from '@/shared/components/ui/switch.tsx';
import { AdminDialog } from '@/shared/components/admin/admin-dialog.tsx';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import type { DeliveryArea } from '@/features/delivery/types/delivery-area.ts';
import { applyApiErrors, applyZodErrors } from '@/shared/utils/form-errors.ts';
import { orderBilingualFields } from '@/shared/utils/localized.ts';

export interface DeliveryAreaFormValues {
    name_ar: string;
    name_en: string;
    delivery_fee: number;
    is_active: boolean;
}

interface DeliveryAreaFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: DeliveryArea | null;
    onSubmit: (values: DeliveryAreaFormValues) => Promise<void>;
    isSubmitting?: boolean;
}

const areaFormSchema = z.object({
    name_ar: z.string().trim().min(1, { error: 'required' }).max(150, { error: 'max' }),
    name_en: z.string().trim().min(1, { error: 'required' }).max(150, { error: 'max' }),
    delivery_fee: z
        .number({ error: 'amount' })
        .min(0, { error: 'negative' })
        .multipleOf(0.01, { error: 'decimal' })
        .refine((value) => value < 100000000, { error: 'max' }),
    is_active: z.boolean(),
});

const EMPTY_VALUES: DeliveryAreaFormValues = {
    name_ar: '',
    name_en: '',
    delivery_fee: 0,
    is_active: true,
};

export function DeliveryAreaFormDialog({
    open,
    onOpenChange,
    editing,
    onSubmit,
    isSubmitting = false,
}: DeliveryAreaFormDialogProps) {
    const { t } = useTranslation('admin');
    const { isArabic } = useLocale();
    const { register, handleSubmit, reset, setError, clearErrors, watch, setValue, formState } =
        useForm<DeliveryAreaFormValues>({ defaultValues: EMPTY_VALUES });

    const isActive = watch('is_active');

    useEffect(() => {
        if (!open) return;

        reset(
            editing
                ? {
                      name_ar: editing.name_ar,
                      name_en: editing.name_en,
                      delivery_fee: Number(editing.delivery_fee),
                      is_active: editing.is_active,
                  }
                : EMPTY_VALUES,
        );
    }, [editing, open, reset]);

    const submit = handleSubmit(async (values) => {
        if (isSubmitting) return;

        const parsed = areaFormSchema.safeParse(values);

        if (!parsed.success) {
            const messageFor = (field: 'name_ar' | 'name_en') => {
                const issue = parsed.error.issues.find((entry) => entry.path[0] === field);

                return issue?.message === 'max'
                    ? t('validation.maxLength', { max: 150 })
                    : t('validation.required');
            };

            const feeIssue = parsed.error.issues.find((entry) => entry.path[0] === 'delivery_fee');

            const feeMessage =
                feeIssue?.message === 'negative'
                    ? t('validation.nonNegative')
                    : feeIssue?.message === 'decimal'
                      ? t('validation.twoDecimals')
                      : feeIssue?.message === 'max'
                        ? t('validation.maxAmount')
                        : t('validation.nonNegative');

            applyZodErrors(parsed.error, setError, {
                name_ar: messageFor('name_ar'),
                name_en: messageFor('name_en'),
                delivery_fee: feeMessage,
            });

            return;
        }

        try {
            await onSubmit(parsed.data);
        } catch (error) {
            applyApiErrors(error, setError, {
                name_ar: t('validation.invalidField'),
                name_en: t('validation.invalidField'),
                delivery_fee: t('validation.amount'),
            });
            // The parent mutation surfaces server errors through a toast.
        }
    });

    const fieldError = (field: 'name_ar' | 'name_en' | 'delivery_fee') => {
        const message = formState.errors[field]?.message;

        return typeof message === 'string' ? message : undefined;
    };

    const nameFields = [
        {
            field: 'name_ar' as const,
            id: 'area-name-ar',
            label: t('fields.nameAr'),
            dir: 'rtl' as const,
        },
        {
            field: 'name_en' as const,
            id: 'area-name-en',
            label: t('fields.nameEn'),
            dir: 'ltr' as const,
        },
    ];

    const orderedNameFields = orderBilingualFields(nameFields, isArabic);

    return (
        <AdminDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!isSubmitting) onOpenChange(nextOpen);
            }}
            title={editing ? t('deliveryAreas.editTitle') : t('deliveryAreas.createTitle')}
            description={t('deliveryAreas.description')}
        >
            <form className="grid gap-5" onSubmit={submit} noValidate>
                {orderedNameFields.map((entry) => (
                    <div key={entry.field} className="grid gap-2">
                        <Label htmlFor={entry.id}>{entry.label}</Label>

                        <Input
                            id={entry.id}
                            dir={entry.dir}
                            maxLength={150}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(fieldError(entry.field))}
                            {...register(entry.field, {
                                onChange: () => clearErrors(entry.field),
                            })}
                        />

                        {fieldError(entry.field) ? (
                            <p role="alert" className="text-destructive text-xs">
                                {fieldError(entry.field)}
                            </p>
                        ) : null}
                    </div>
                ))}

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="area-fee">{t('fields.deliveryFee')}</Label>

                        <Input
                            id="area-fee"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.01}
                            dir="ltr"
                            disabled={isSubmitting}
                            aria-invalid={Boolean(fieldError('delivery_fee'))}
                            {...register('delivery_fee', {
                                valueAsNumber: true,
                                onChange: () => clearErrors('delivery_fee'),
                            })}
                        />

                        {fieldError('delivery_fee') ? (
                            <p role="alert" className="text-destructive text-xs">
                                {fieldError('delivery_fee')}
                            </p>
                        ) : null}
                    </div>

                    <div className="border-border flex items-center justify-between gap-3 self-end rounded-lg border px-3 py-2.5">
                        <div className="min-w-0">
                            <Label htmlFor="area-active" className="cursor-pointer">
                                {t('fields.isActive')}
                            </Label>
                            <p className="text-muted-foreground text-xs">
                                {t('common.active')} / {t('common.inactive')}
                            </p>
                        </div>

                        <Switch
                            id="area-active"
                            checked={isActive}
                            onCheckedChange={(checked) => setValue('is_active', checked)}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose
                        render={<Button type="button" variant="outline" disabled={isSubmitting} />}
                    >
                        {t('common.cancel')}
                    </DialogClose>

                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner className="size-4" /> : null}
                        {isSubmitting
                            ? t('common.saving')
                            : editing
                              ? t('common.save')
                              : t('common.create')}
                    </Button>
                </DialogFooter>
            </form>
        </AdminDialog>
    );
}
