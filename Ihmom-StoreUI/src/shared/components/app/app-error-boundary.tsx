import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
    const { t } = useTranslation('common');

    return (
        <div className="bg-background flex min-h-dvh items-center justify-center px-4 py-16">
            <div className="border-border bg-card w-full max-w-lg rounded-2xl border p-8 text-center shadow-sm">
                <span className="bg-destructive/10 text-destructive mx-auto grid size-12 place-items-center rounded-full">
                    <AlertTriangle className="size-6" aria-hidden="true" />
                </span>

                <h1 className="mt-5 text-xl font-semibold tracking-tight">
                    {t('errors.unexpectedTitle')}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {t('errors.unexpectedDescription')}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Button onClick={onRetry}>{t('errors.tryAgain')}</Button>
                    <Button variant="outline" asChild>
                        <a href="/">{t('errors.backHome')}</a>
                    </Button>
                </div>
            </div>
        </div>
    );
}

interface AppErrorBoundaryProps {
    children: ReactNode;
}

interface AppErrorBoundaryState {
    hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): AppErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        if (import.meta.env.DEV) {
            console.error('Unhandled application error', error, info);
            // Only log the component stack in development; never surface it to users.
            console.error(info.componentStack);
        }
    }

    private readonly handleRetry = () => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback onRetry={this.handleRetry} />;
        }

        return this.props.children;
    }
}
