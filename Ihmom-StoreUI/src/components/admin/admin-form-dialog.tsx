import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { DialogClose, DialogFooter } from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { AdminDialog } from '@/components/admin/admin-dialog.tsx';
import type { CreateAdmin } from '@/models/admin.ts';
import { createAdminSchema } from '@/schemas/admins.ts';
import { applyZodErrors } from '@/utils/form-errors.ts';

interface AdminFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: CreateAdmin) => Promise<void>;
    isSubmitting?: boolean;
}

const EMPTY_VALUES: CreateAdmin = { username: '', email: '', password: '' };

export function AdminFormDialog({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting = false,
}: AdminFormDialogProps) {
    const { t } = useTranslation('admin');
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, reset, setError, clearErrors, formState } =
        useForm<CreateAdmin>({ defaultValues: EMPTY_VALUES });

    useEffect(() => {
        if (!open) return;

        reset(EMPTY_VALUES);
    }, [open, reset]);

    const submit = handleSubmit(async (values) => {
        if (isSubmitting) return;

        const parsed = createAdminSchema.safeParse(values);

        if (!parsed.success) {
            const issueFor = (field: string) =>
                parsed.error.issues.find((issue) => issue.path[0] === field)?.message;

            const usernameIssue = issueFor('username');
            const passwordIssue = issueFor('password');

            applyZodErrors(parsed.error, setError, {
                username: usernameIssue?.includes('at least')
                    ? t('validation.minLength', { min: 3 })
                    : usernameIssue?.includes('at most')
                      ? t('validation.maxLength', { max: 100 })
                      : t('validation.required'),
                email: t('validation.email'),
                password: passwordIssue?.includes('72')
                    ? t('validation.passwordBytes')
                    : passwordIssue?.includes('at least')
                      ? t('validation.minLength', { min: 8 })
                      : t('validation.required'),
            });

            return;
        }

        try {
            await onSubmit(parsed.data);
            setShowPassword(false);
        } catch {
            // The parent mutation surfaces server errors through a toast.
        }
    });

    return (
        <AdminDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (isSubmitting) return;

                if (!nextOpen) {
                    setShowPassword(false);
                }

                onOpenChange(nextOpen);
            }}
            title={t('admins.createTitle')}
            description={t('admins.description')}
        >
            <form className="grid gap-5" onSubmit={submit} noValidate>
                <div className="grid gap-2">
                    <Label htmlFor="admin-username">{t('fields.username')}</Label>

                    <Input
                        id="admin-username"
                        autoComplete="username"
                        maxLength={100}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(formState.errors.username)}
                        {...register('username', { onChange: () => clearErrors('username') })}
                    />

                    {formState.errors.username?.message ? (
                        <p role="alert" className="text-destructive text-xs">
                            {formState.errors.username.message}
                        </p>
                    ) : null}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="admin-new-email">{t('fields.email')}</Label>

                    <Input
                        id="admin-new-email"
                        type="email"
                        inputMode="email"
                        dir="ltr"
                        autoComplete="email"
                        maxLength={255}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(formState.errors.email)}
                        {...register('email', { onChange: () => clearErrors('email') })}
                    />

                    {formState.errors.email?.message ? (
                        <p role="alert" className="text-destructive text-xs">
                            {formState.errors.email.message}
                        </p>
                    ) : null}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="admin-new-password">{t('fields.password')}</Label>

                    <div className="relative">
                        <Input
                            id="admin-new-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            className="pe-11"
                            disabled={isSubmitting}
                            aria-invalid={Boolean(formState.errors.password)}
                            aria-describedby="admin-password-hint"
                            {...register('password', {
                                onChange: () => clearErrors('password'),
                            })}
                        />

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground absolute end-1 top-1/2 size-8 -translate-y-1/2"
                            aria-label={
                                showPassword ? t('login.hidePassword') : t('login.showPassword')
                            }
                            aria-pressed={showPassword}
                            onClick={() => setShowPassword((visible) => !visible)}
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <EyeOff className="size-4" aria-hidden="true" />
                            ) : (
                                <Eye className="size-4" aria-hidden="true" />
                            )}
                        </Button>
                    </div>

                    {formState.errors.password?.message ? (
                        <p role="alert" className="text-destructive text-xs">
                            {formState.errors.password.message}
                        </p>
                    ) : (
                        <p id="admin-password-hint" className="text-muted-foreground text-xs">
                            {t('admins.passwordHint')}
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
                        {isSubmitting ? t('common.saving') : t('common.create')}
                    </Button>
                </DialogFooter>
            </form>
        </AdminDialog>
    );
}
