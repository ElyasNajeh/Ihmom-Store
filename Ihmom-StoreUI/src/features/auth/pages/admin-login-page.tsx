import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';

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
import { Spinner } from '@/shared/components/ui/spinner.tsx';
import { useToastManager } from '@/shared/components/ui/toast.tsx';
import ThemeToggle from '@/shared/components/app/theme-toggle.tsx';
import { BrandMark } from '@/shared/components/brand/brand-mark.tsx';
import { LanguageSelector } from '@/i18n/components/LanguageSwitcher.tsx';
import { useAdminAuth } from '@/features/auth/context/admin-auth-context.ts';
import { loginAdminSchema } from '@/features/auth/schemas/auth.ts';
import type { LoginAdmin } from '@/features/auth/types/auth.ts';
import { ADMIN_LOGIN_FORM_DEFAULTS } from '@/features/admins/constants/admins.ts';
import { applyZodErrors } from '@/shared/utils/form-errors.ts';
import { getStoreName } from '@/features/storefront/constants/store.ts';
import { useLocale } from '@/shared/hooks/useLocale.ts';

interface LoginLocationState {
    from?: string;
}

export default function AdminLoginPage() {
    const { t, i18n } = useTranslation(['admin', 'common']);
    const { isArabic } = useLocale();
    const storeName = getStoreName(isArabic);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAdminAuth();
    const toastManager = useToastManager();

    const {
        register,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<LoginAdmin>({
        defaultValues: ADMIN_LOGIN_FORM_DEFAULTS,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const BackIcon = i18n.dir() === 'rtl' ? ArrowRight : ArrowLeft;

    const submit = handleSubmit(async (values) => {
        if (isSubmitting) return;

        setServerError(null);

        const parsed = loginAdminSchema.safeParse(values);

        if (!parsed.success) {
            applyZodErrors(parsed.error, setError, {
                username: t('validation.required'),
                password: t('validation.required'),
            });
            return;
        }

        setIsSubmitting(true);

        try {
            await login(parsed.data);

            toastManager.add({
                type: 'success',
                title: t('login.success'),
            });

            const state = location.state as LoginLocationState | null;
            const from = state?.from;

            navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
        } catch (error) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;

            setServerError(
                status === 400 || status === 401
                    ? t('login.invalidCredentials')
                    : t('login.genericError'),
            );
        } finally {
            setIsSubmitting(false);
        }
    });

    return (
        <div className="bg-background relative flex min-h-dvh flex-col overflow-hidden">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="bg-brand/15 absolute -end-32 -top-40 size-[34rem] rounded-full blur-3xl" />
                <div className="bg-primary/10 absolute -start-32 -bottom-48 size-[30rem] rounded-full blur-3xl" />
            </div>

            <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
                <Link
                    to="/"
                    className="focus-visible:ring-ring flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                >
                    <BrandMark className="size-12" />
                    <span className="text-sm font-semibold tracking-tight">{storeName}</span>
                </Link>

                <div className="flex items-center gap-2">
                    <LanguageSelector />
                    <ThemeToggle />
                </div>
            </header>

            <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
                    <section className="hidden lg:block">
                        <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
                            {t('login.console')}
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">
                            {t('nav.brand')}
                        </h1>

                        <p className="text-muted-foreground mt-4 max-w-md text-base leading-7">
                            {t('login.subtitle')}
                        </p>

                        <ul className="mt-8 space-y-3">
                            {[
                                t('login.featureCatalogue'),
                                t('login.featureOrders'),
                                t('login.featureCustomers'),
                            ].map((feature) => (
                                <li
                                    key={feature}
                                    className="text-muted-foreground flex items-center gap-3 text-sm"
                                >
                                    <span className="bg-brand/15 text-brand-foreground grid size-6 shrink-0 place-items-center rounded-full">
                                        <Check className="size-3.5" aria-hidden="true" />
                                    </span>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <Card className="border-border/70 bg-card/95 shadow-xl backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-xl">{t('login.title')}</CardTitle>
                            <CardDescription>{t('login.subtitle')}</CardDescription>
                        </CardHeader>

                        <CardContent>
                            <form className="grid gap-5" onSubmit={submit} noValidate>
                                {serverError ? (
                                    <div
                                        role="alert"
                                        className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2.5 text-sm"
                                    >
                                        {serverError}
                                    </div>
                                ) : null}

                                <div className="grid gap-2">
                                    <Label htmlFor="admin-username">{t('login.username')}</Label>

                                    <div className="relative">
                                        <UserRound
                                            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
                                            aria-hidden="true"
                                        />

                                        <Input
                                            id="admin-username"
                                            type="text"
                                            autoComplete="username"
                                            autoFocus
                                            dir="ltr"
                                            placeholder={t('login.usernamePlaceholder')}
                                            className="h-11 ps-9"
                                            aria-invalid={Boolean(errors.username)}
                                            aria-describedby={
                                                errors.username ? 'admin-username-error' : undefined
                                            }
                                            disabled={isSubmitting}
                                            {...register('username', {
                                                onChange: () => {
                                                    clearErrors('username');
                                                    setServerError(null);
                                                },
                                            })}
                                        />
                                    </div>

                                    {errors.username ? (
                                        <p
                                            id="admin-username-error"
                                            role="alert"
                                            className="text-destructive text-xs"
                                        >
                                            {errors.username.message}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="admin-password">{t('login.password')}</Label>

                                    <div className="relative">
                                        <LockKeyhole
                                            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
                                            aria-hidden="true"
                                        />

                                        <Input
                                            id="admin-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder={t('login.passwordPlaceholder')}
                                            className="h-11 ps-9 pe-11"
                                            aria-invalid={Boolean(errors.password)}
                                            aria-describedby={
                                                errors.password ? 'admin-password-error' : undefined
                                            }
                                            disabled={isSubmitting}
                                            {...register('password', {
                                                onChange: () => {
                                                    clearErrors('password');
                                                    setServerError(null);
                                                },
                                            })}
                                        />

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-foreground absolute end-1 top-1/2 size-8 -translate-y-1/2"
                                            aria-label={
                                                showPassword
                                                    ? t('login.hidePassword')
                                                    : t('login.showPassword')
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

                                    {errors.password ? (
                                        <p
                                            id="admin-password-error"
                                            role="alert"
                                            className="text-destructive text-xs"
                                        >
                                            {errors.password.message}
                                        </p>
                                    ) : null}
                                </div>

                                <Button type="submit" className="h-11" disabled={isSubmitting}>
                                    {isSubmitting ? <Spinner className="size-4" /> : null}
                                    {isSubmitting ? t('login.submitting') : t('login.submit')}
                                </Button>

                                <p className="text-muted-foreground text-xs leading-5">
                                    {t('login.securityNote')}
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <footer className="relative z-10 flex items-center justify-center px-4 pb-6">
                <Button variant="link" size="sm" asChild>
                    <Link to="/">
                        <BackIcon className="size-4" aria-hidden="true" />
                        {t('login.backToStore')}
                    </Link>
                </Button>
            </footer>
        </div>
    );
}
