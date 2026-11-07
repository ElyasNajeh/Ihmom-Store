import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { Compass, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';

export function RouteErrorPage() {
    const { t } = useTranslation('common');
    const error = useRouteError();
    const isNotFound = isRouteErrorResponse(error) && error.status === 404;

    return (
        <div className="bg-background flex min-h-dvh items-center justify-center px-4 py-16">
            <div className="border-border bg-card w-full max-w-lg rounded-2xl border p-8 text-center shadow-sm">
                <span className="bg-muted text-muted-foreground mx-auto grid size-12 place-items-center rounded-full">
                    <Compass className="size-6" aria-hidden="true" />
                </span>

                <h1 className="mt-5 text-xl font-semibold tracking-tight">
                    {isNotFound ? t('errors.notFoundTitle') : t('errors.unexpectedTitle')}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {isNotFound
                        ? t('errors.notFoundDescription')
                        : t('errors.unexpectedDescription')}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Button onClick={() => window.location.reload()}>
                        <RotateCcw className="size-4" aria-hidden="true" />
                        {t('errors.reload')}
                    </Button>
                    <Button variant="outline" asChild>
                        <Link to="/">{t('errors.backHome')}</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
