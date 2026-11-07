import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { DialogClose, DialogFooter } from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { AdminDialog } from '@/components/admin/admin-dialog.tsx';
import type { Customer } from '@/models/customer.ts';
import { createCustomerSchema } from '@/schemas/customers.ts';
import { applyZodErrors } from '@/utils/form-errors.ts';

export interface CustomerFormValues {
    name: string;
    phone: string;
}

interface CustomerFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: Customer | null;
    onSubmit: (values: CustomerFormValues) => Promise<void>;
    isSubmitting?: boolean;
}

const EMPTY_VALUES: CustomerFormValues = { name: '', phone: '' };

export function CustomerFormDialog({
    open,
    onOpenChange,
    editing,
    onSubmit,
    isSubmitting = false,
}: CustomerFormDialogProps) {
    const { t } = useTranslation('admin');
    const { register, handleSubmit, reset, setError, clearErrors, formState } =
        useForm<CustomerFormValues>({ defaultValues: EMPTY_VALUES });

    useEffect(() => {
        if (!open) return;

        reset(editing ? { name: editing.name, phone: editing.phone } : EMPTY_VALUES);
    }, [editing, open, reset]);

    const submit = handleSubmit(async (values) => {
        if (isSubmitting) return;

        const parsed = createCustomerSchema.safeParse(values);

        if (!parsed.success) {
            const nameIssue = parsed.error.issues.find((issue) => issue.path[0] === 'name');

            applyZodErrors(parsed.error, setError, {
                name: nameIssue?.message.includes('at most')
                    ? t('validation.maxLength', { max: 150 })
                    : t('validation.required'),
                phone: t('validation.phone'),
            });

            return;
        }

        try {
            await onSubmit(parsed.data);
        } catch {
            // The parent mutation surfaces server errors through a toast.
        }
    });

    return (
        <AdminDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!isSubmitting) onOpenChange(nextOpen);
            }}
            title={editing ? t('customers.editTitle') : t('customers.createTitle')}
            description={t('customers.description')}
        >
            <form className="grid gap-5" onSubmit={submit} noValidate>
                <div className="grid gap-2">
                    <Label htmlFor="customer-name">{t('fields.name')}</Label>

                    <Input
                        id="customer-name"
                        maxLength={150}
                        autoComplete="name"
                        disabled={isSubmitting}
                        aria-invalid={Boolean(formState.errors.name)}
                        {...register('name', { onChange: () => clearErrors('name') })}
                    />

                    {formState.errors.name?.message ? (
                        <p role="alert" className="text-destructive text-xs">
                            {formState.errors.name.message}
                        </p>
                    ) : null}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="customer-phone">{t('fields.phone')}</Label>

                    <Input
                        id="customer-phone"
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        autoComplete="tel"
                        placeholder="+97XXXXXXXXXX"
                        disabled={isSubmitting}
                        aria-invalid={Boolean(formState.errors.phone)}
                        aria-describedby={
                            formState.errors.phone ? 'customer-phone-error' : 'customer-phone-hint'
                        }
                        {...register('phone', { onChange: () => clearErrors('phone') })}
                    />

                    {formState.errors.phone?.message ? (
                        <p
                            id="customer-phone-error"
                            role="alert"
                            className="text-destructive text-xs"
                        >
                            {formState.errors.phone.message}
                        </p>
                    ) : (
                        <p id="customer-phone-hint" className="text-muted-foreground text-xs">
                            {t('validation.phone')}
                        </p>
                    )}
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
