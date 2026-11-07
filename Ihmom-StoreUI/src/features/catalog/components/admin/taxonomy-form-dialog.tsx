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
import { applyZodErrors } from '@/shared/utils/form-errors.ts';
import { orderBilingualFields } from '@/shared/utils/localized.ts';
import type { FieldErrors, UseFormSetError } from 'react-hook-form';

export interface TaxonomyFormValues {
    name_ar: string;
    name_en: string;
    is_active: boolean;
}

interface TaxonomyFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    initialValues?: Partial<TaxonomyFormValues>;
    onSubmit: (values: TaxonomyFormValues) => Promise<void>;
    isSubmitting?: boolean;
}

const taxonomySchema = z.object({
    name_ar: z.string().trim().min(1, { error: 'required' }).max(100, { error: 'max' }),
    name_en: z.string().trim().min(1, { error: 'required' }).max(100, { error: 'max' }),
    is_active: z.boolean(),
});

const EMPTY_VALUES: TaxonomyFormValues = {
    name_ar: '',
    name_en: '',
    is_active: true,
};

export function TaxonomyFormDialog({
    open,
    onOpenChange,
    title,
    description,
    initialValues,
    onSubmit,
    isSubmitting = false,
}: TaxonomyFormDialogProps) {
    const { t } = useTranslation('admin');
    const { isArabic } = useLocale();
    const { register, handleSubmit, reset, setError, clearErrors, watch, setValue, formState } =
        useForm<TaxonomyFormValues>({ defaultValues: EMPTY_VALUES });

    const isActive = watch('is_active');

    useEffect(() => {
        if (!open) return;

        reset({ ...EMPTY_VALUES, ...initialValues });
    }, [open, initialValues, reset]);

    const submit = handleSubmit(async (values) => {
        if (isSubmitting) return;

        const parsed = taxonomySchema.safeParse(values);

        if (!parsed.success) {
            const messageFor = (field: 'name_ar' | 'name_en') => {
                const issue = parsed.error.issues.find((entry) => entry.path[0] === field);

                return issue?.message === 'max'
                    ? t('validation.maxLength', { max: 100 })
                    : t('validation.required');
            };

            const messages = {
                name_ar: messageFor('name_ar'),
                name_en: messageFor('name_en'),
            } satisfies Partial<Record<keyof TaxonomyFormValues, string>>;

            applyZodErrors(parsed.error, setError as UseFormSetError<TaxonomyFormValues>, messages);

            return;
        }

        try {
            await onSubmit(parsed.data);
        } catch {
            // The parent mutation surfaces server errors through a toast.
        }
    });

    const fieldError = (field: keyof TaxonomyFormValues): string | undefined => {
        const error = (formState.errors as FieldErrors<TaxonomyFormValues>)[field];

        return typeof error?.message === 'string' ? error.message : undefined;
    };

    const renderFieldError = (field: 'name_ar' | 'name_en') => {
        const message = fieldError(field);

        if (!message) return null;

        return (
            <p id={`taxonomy-${field}-error`} role="alert" className="text-destructive text-xs">
                {message}
            </p>
        );
    };

    const nameFields = [
        {
            field: 'name_ar' as const,
            id: 'taxonomy-name-ar',
            label: t('fields.nameAr'),
            dir: 'rtl' as const,
        },
        {
            field: 'name_en' as const,
            id: 'taxonomy-name-en',
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
            description={description}
        >
            <form className="grid gap-5" onSubmit={submit} noValidate>
                {orderedNameFields.map((entry) => (
                    <div key={entry.field} className="grid gap-2">
                        <Label htmlFor={entry.id}>{entry.label}</Label>

                        <Input
                            id={entry.id}
                            dir={entry.dir}
                            maxLength={100}
                            aria-invalid={Boolean(fieldError(entry.field))}
                            aria-describedby={
                                fieldError(entry.field)
                                    ? `taxonomy-${entry.field}-error`
                                    : undefined
                            }
                            disabled={isSubmitting}
                            {...register(entry.field, {
                                onChange: () => clearErrors(entry.field),
                            })}
                        />

                        {renderFieldError(entry.field)}
                    </div>
                ))}

                <div className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <div className="min-w-0">
                        <Label htmlFor="taxonomy-active" className="cursor-pointer">
                            {t('fields.isActive')}
                        </Label>
                        <p className="text-muted-foreground text-xs">
                            {t('common.active')} / {t('common.inactive')}
                        </p>
                    </div>

                    <Switch
                        id="taxonomy-active"
                        checked={isActive}
                        onCheckedChange={(checked) => setValue('is_active', checked)}
                        disabled={isSubmitting}
                    />
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
                            : initialValues
                              ? t('common.save')
                              : t('common.create')}
                    </Button>
                </DialogFooter>
            </form>
        </AdminDialog>
    );
}
