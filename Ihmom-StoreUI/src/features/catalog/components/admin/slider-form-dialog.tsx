import { useEffect, useState } from 'react';
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
import { AdminImagePicker } from '@/shared/components/admin/admin-image-picker.tsx';
import { useLocale } from '@/shared/hooks/useLocale.ts';
import type { Slider } from '@/features/catalog/types/slider.ts';
import { applyApiErrors, applyZodErrors } from '@/shared/utils/form-errors.ts';
import { orderBilingualFields } from '@/shared/utils/localized.ts';
import { apiAssetUrl } from '@/shared/api/axios.ts';

export interface SliderFormValues {
    title_ar: string;
    title_en: string;
    display_order: number;
    is_active: boolean;
}

interface SliderFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: Slider | null;
    onSubmit: (values: SliderFormValues, image: File | null) => Promise<void>;
    isSubmitting?: boolean;
}

const sliderFormSchema = z.object({
    title_ar: z.string().trim().min(1, { error: 'required' }).max(200, { error: 'max' }),
    title_en: z.string().trim().min(1, { error: 'required' }).max(200, { error: 'max' }),
    display_order: z.number({ error: 'number' }).int({ error: 'number' }),
    is_active: z.boolean(),
});

const EMPTY_VALUES: SliderFormValues = {
    title_ar: '',
    title_en: '',
    display_order: 0,
    is_active: true,
};

export function SliderFormDialog({
    open,
    onOpenChange,
    editing,
    onSubmit,
    isSubmitting = false,
}: SliderFormDialogProps) {
    const { t } = useTranslation('admin');
    const { isArabic } = useLocale();
    const { register, handleSubmit, reset, setError, clearErrors, watch, setValue, formState } =
        useForm<SliderFormValues>({ defaultValues: EMPTY_VALUES });

    const [files, setFiles] = useState<File[]>([]);
    const [imageError, setImageError] = useState<string | null>(null);

    const isActive = watch('is_active');

    useEffect(() => {
        if (!open) return;

        reset(
            editing
                ? {
                      title_ar: editing.title_ar,
                      title_en: editing.title_en,
                      display_order: editing.display_order,
                      is_active: editing.is_active,
                  }
                : EMPTY_VALUES,
        );
        setFiles([]);
        setImageError(null);
    }, [editing, open, reset]);

    const submit = handleSubmit(async (values) => {
        if (isSubmitting) return;

        setImageError(null);

        const parsed = sliderFormSchema.safeParse(values);

        if (!parsed.success) {
            const messageFor = (field: 'title_ar' | 'title_en') => {
                const issue = parsed.error.issues.find((entry) => entry.path[0] === field);

                return issue?.message === 'max'
                    ? t('validation.maxLength', { max: 200 })
                    : t('validation.required');
            };

            applyZodErrors(parsed.error, setError, {
                title_ar: messageFor('title_ar'),
                title_en: messageFor('title_en'),
                display_order: t('validation.wholeNumber'),
            });

            return;
        }

        if (!editing && files.length === 0) {
            setImageError(t('sliders.imageRequired'));
            return;
        }

        try {
            await onSubmit(parsed.data, files[0] ?? null);
        } catch (error) {
            applyApiErrors(error, setError, {
                title_ar: t('validation.invalidField'),
                title_en: t('validation.invalidField'),
                display_order: t('validation.invalidField'),
            });
            // The parent mutation surfaces server errors through a toast.
        }
    });

    const fieldError = (field: 'title_ar' | 'title_en' | 'display_order') => {
        const message = formState.errors[field]?.message;

        return typeof message === 'string' ? message : undefined;
    };

    const titleFields = [
        {
            field: 'title_ar' as const,
            id: 'slider-title-ar',
            label: t('fields.titleAr'),
            dir: 'rtl' as const,
        },
        {
            field: 'title_en' as const,
            id: 'slider-title-en',
            label: t('fields.titleEn'),
            dir: 'ltr' as const,
        },
    ];

    const orderedTitleFields = orderBilingualFields(titleFields, isArabic);

    return (
        <AdminDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!isSubmitting) onOpenChange(nextOpen);
            }}
            title={editing ? t('sliders.editTitle') : t('sliders.createTitle')}
            description={t('sliders.description')}
            className="sm:max-w-xl"
        >
            <form className="grid gap-5" onSubmit={submit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                    {orderedTitleFields.map((entry) => (
                        <div key={entry.field} className="grid gap-2">
                            <Label htmlFor={entry.id}>{entry.label}</Label>

                            <Input
                                id={entry.id}
                                dir={entry.dir}
                                maxLength={200}
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
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="slider-display-order">{t('fields.displayOrder')}</Label>

                        <Input
                            id="slider-display-order"
                            type="number"
                            inputMode="numeric"
                            step={1}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(fieldError('display_order'))}
                            {...register('display_order', {
                                valueAsNumber: true,
                                onChange: () => clearErrors('display_order'),
                            })}
                        />

                        {fieldError('display_order') ? (
                            <p role="alert" className="text-destructive text-xs">
                                {fieldError('display_order')}
                            </p>
                        ) : null}
                    </div>

                    <div className="border-border flex items-center justify-between gap-3 self-end rounded-lg border px-3 py-2.5">
                        <Label htmlFor="slider-active" className="cursor-pointer">
                            {t('fields.isActive')}
                        </Label>

                        <Switch
                            id="slider-active"
                            checked={isActive}
                            onCheckedChange={(checked) => setValue('is_active', checked)}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {editing ? (
                    <div className="border-border overflow-hidden rounded-lg border">
                        <img
                            src={apiAssetUrl(editing.image) ?? editing.image}
                            alt={
                                isArabic
                                    ? editing.title_ar || editing.title_en
                                    : editing.title_en || editing.title_ar
                            }
                            className="h-36 w-full object-cover"
                        />
                    </div>
                ) : null}

                <div className="grid gap-2">
                    <AdminImagePicker
                        files={files}
                        onChange={(nextFiles) => {
                            setFiles(nextFiles);
                            setImageError(null);
                        }}
                        label={editing ? t('sliders.replaceImage') : t('fields.image')}
                        hint={t('sliders.imageHint')}
                        disabled={isSubmitting}
                    />

                    {imageError ? (
                        <p role="alert" className="text-destructive text-xs">
                            {imageError}
                        </p>
                    ) : null}
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
