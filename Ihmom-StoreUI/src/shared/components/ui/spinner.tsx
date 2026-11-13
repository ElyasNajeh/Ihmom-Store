
import { Loader2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/utils.ts';

type SpinnerProps = React.ComponentProps<'svg'>;

function Spinner({ className, ...props }: SpinnerProps) {
    const { t } = useTranslation('common');

    return (
        <Loader2Icon
            data-slot="spinner"
            role="status"
            aria-label={t('loading')}
            className={cn(
                'size-4 animate-spin motion-reduce:animate-none text-muted-foreground',
                className,
            )}
            {...props}
        />
    );
}

export { Spinner };
