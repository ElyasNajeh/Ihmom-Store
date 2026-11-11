import { useTranslation } from 'react-i18next';

type SpinnerProps = {
    size?: number;
    color?: string;
    className?: string;
};

export function Spinner({ size = 50, color = '#f03355', className }: SpinnerProps) {
    const { t } = useTranslation('common');
    return (
        <div
            role="status"
            aria-label={t('loading')}
            className={`grid shrink-0 animate-[spin_1s_steps(12)_infinite] [mask:conic-gradient(from_15deg,#0000,#000)] ${className ?? ''}`}
            style={{
                width: size,
                aspectRatio: '1',
                background: `
                    radial-gradient(closest-side at 50% 12.5%, ${color} 96%, transparent) 50% 0 / 20% 80% repeat-y,
                    radial-gradient(closest-side at 12.5% 50%, ${color} 96%, transparent) 0 50% / 80% 20% repeat-x
                `,
            }}
        >
            <div
                className="col-start-1 row-start-1 rotate-[30deg]"
                style={{
                    background: `
                        radial-gradient(closest-side at 50% 12.5%, ${color} 96%, transparent) 50% 0 / 20% 80% repeat-y,
                        radial-gradient(closest-side at 12.5% 50%, ${color} 96%, transparent) 0 50% / 80% 20% repeat-x
                    `,
                }}
            />
            <div
                className="col-start-1 row-start-1 rotate-[60deg]"
                style={{
                    background: `
                        radial-gradient(closest-side at 50% 12.5%, ${color} 96%, transparent) 50% 0 / 20% 80% repeat-y,
                        radial-gradient(closest-side at 12.5% 50%, ${color} 96%, transparent) 0 50% / 80% 20% repeat-x
                    `,
                }}
            />
            <span className="sr-only">{t('loading')}</span>
        </div>
    );
}
