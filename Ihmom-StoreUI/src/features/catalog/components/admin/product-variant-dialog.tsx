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
import type { CreateProductVariant } from '@/features/catalog/types/product.ts';
import { applyApiErrors, applyZodErrors } from '@/shared/utils/form-errors.ts';
import { orderBilingualFields } from '@/shared/utils/localized.ts';
import type { UseFormSetError } from 'react-hook-form';

interface VariantFormValues {
    name_ar: string;
    name_en: string;
    sku: string;
    price: string;
    is_active: boolean;
}

export interface ProductVariantFormInitial {
    name_ar: string;
    name_en: string;
    sku?: string | null;
    price: string | number;
    is_active: boolean;
}

interface ProductVariantDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    editing: ProductVariantFormInitial | null;
    onSubmit: (values: CreateProductVariant) => Promise<void>;
    isSubmitting?: boolean;
}

const variantFormSchema = z.object({
    name_ar: z.string().trim().min(1, { error: 'required' }).max(100, { error: 'max' }),
    name_en: z.string().trim().min(1, { error: 'required' }).max(100, { error: 'max' }),
    sku: z.string().trim().max(100, { error: 'max' }),
    price: z
        .string()
        .trim()
        .min(1, { error: 'required' })
        .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), { error: 'amount' })
        .refine((value) => Number(value) < 100000000, { error: 'maxAmount' }),
    is_active: z.boolean(),
});

const EMPTY_VALUES: VariantFormValues = {
    name_ar: '',
    name_en: '',
    sku: '',
    price: '',
    is_active: true,
};

export function ProductVariantDialog({
    open,
    onOpenChange,
    title,
    editing,
    onSubmit,
    isSubmitting = false,
}: ProductVariantDialogProps) {
    const { t } = useTranslation('admin');
    const { isArabic } = useLocale();
    const { register, handleSubmit, reset, setError, setValue, watch, formState } =
        useForm<VariantFormValues>({ defaultValues: EMPTY_VALUES });

    const isActive = watch('is_active');

    useEffect(() => {
        if (!open) return;

        reset(
            editing
                ? {
                      name_ar: editing.name_ar,
                      name_en: editing.name_en,
                      sku: editing.sku ?? '',
                      price: String(editing.price),
                      is_active: editing.is_active,
                  }
                : EMPTY_VALUES,
        );
    }, [editing, open, reset]);

    const messageFor = (
        field: keyof VariantFormValues,
        issue: z.ZodIssue | undefined,
    ): string | undefined => {
        if (!issue) return undefined;

        if (issue.message === 'max') return t('validation.maxLength', { max: 100 });
        if (issue.message === 'amount') return t('validation.amount');
        if (issue.message === 'maxAmount') return t('validation.maxAmount');
        if (issue.message === 'required' && field === 'price') {
            return t('validation.required');
        }

        return t('validation.required');
    };

    const submit = handleSubmit(async (values) => {
        if (isSubmitting) return;

        const parsed = variantFormSchema.safeParse(values);

        if (!parsed.success) {
            const fields: (keyof VariantFormValues)[] = ['name_ar', 'name_en', 'sku', 'price'];

            const messages = Object.fromEntries(
                fields.map((field) => [
                    field,
                    messageFor(
                        field,
                        parsed.error.issues.find((issue) => issue.path[0] === field),
                    ),
                ]),
            ) as Partial<Record<keyof VariantFormValues, string>>;

            applyZodErrors(parsed.error, setError as UseFormSetError<VariantFormValues>, messages);

            return;
        }

        try {
            await onSubmit({
                name_ar: parsed.data.name_ar,
                name_en: parsed.data.name_en,
                sku: parsed.data.sku || null,
                price: Number(parsed.data.price),
                is_active: parsed.data.is_active,
            });
        } catch (error) {
            applyApiErrors(error, setError, {
                name_ar: t('validation.invalidField'),
                name_en: t('validation.invalidField'),
                price: t('validation.amount'),
                sku: t('validation.invalidField'),
            });
            // The parent mutation reports server errors through a toast.
        }
    });

    const errorFor = (field: keyof VariantFormValues): string | undefined => {
        const error = formState.errors[field];

        return typeof error?.message === 'string' ? error.message : undefined;
    };

    const fieldError = (field: keyof VariantFormValues) => {
        const message = errorFor(field);

        if (!message) return null;

        return (
            <p id={`variant-${field}-error`} role="alert" className="text-destructive text-xs">
                {message}
            </p>
        );
    };

    const nameFields = [
        {
            field: 'name_ar' as const,
            id: 'variant-name-ar',
            label: t('fields.nameAr'),
            dir: undefined,
        },
        {
            field: 'name_en' as const,
            id: 'variant-name-en',
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
            title={title}
        >
            <form onSubmit={submit} className="space-y-4" noValidate>
                <div className="grid gap-3 sm:grid-cols-2">
                    {orderedNameFields.map((entry) => (
                        <div key={entry.field} className="space-y-1.5">
                            <Label htmlFor={entry.id}>{entry.label}</Label>
                            <Input
                                id={entry.id}
                                dir={entry.dir}
                                {...register(entry.field)}
                                aria-invalid={errorFor(entry.field) ? true : undefined}
                                aria-describedby={
                                    errorFor(entry.field)
                                        ? `variant-${entry.field}-error`
                                        : undefined
                                }
                            />
                            {fieldError(entry.field)}
                        </div>
                    ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="variant-price">{t('products.variantPrice')}</Label>
                        <Input
                            id="variant-price"
                            inputMode="decimal"
                            placeholder="0.00"
                            {...register('price')}
                            aria-invalid={errorFor('price') ? true : undefined}
                            aria-describedby={errorFor('price') ? 'variant-price-error' : undefined}
                        />
                        {fieldError('price')}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="variant-sku">{t('products.variantSku')}</Label>
                        <Input
                            id="variant-sku"
                            dir="ltr"
                            {...register('sku')}
                            aria-invalid={errorFor('sku') ? true : undefined}
                            aria-describedby={errorFor('sku') ? 'variant-sku-error' : undefined}
                        />
                        {fieldError('sku')}
                    </div>
                </div>

                <div className="border-border flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <Label htmlFor="variant-active" className="cursor-pointer">
                        {t('fields.isActive')}
                    </Label>
                    <Switch
                        id="variant-active"
                        checked={isActive}
                        onCheckedChange={(checked) => setValue('is_active', checked)}
                    />
                </div>

                <DialogFooter>
                    <DialogClose
                        render={<Button type="button" variant="outline" disabled={isSubmitting} />}
                    >
                        {t('common.cancel')}
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner aria-hidden="true" /> : null}
                        {t('products.saveVariant')}
                    </Button>
                </DialogFooter>
            </form>
        </AdminDialog>
    );
}
