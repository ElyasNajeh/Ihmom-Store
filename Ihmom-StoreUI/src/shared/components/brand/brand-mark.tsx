import brandIcon from '@/assets/Ihmom-icon.png';
import { cn } from '@/shared/lib/utils.ts';

export function BrandMark({ className }: { className?: string }) {
    return (
        <img
            src={brandIcon}
            alt=""
            aria-hidden="true"
            className={cn(
                'bg-card ring-border size-11 shrink-0 rounded-xl object-contain p-0.5 ring-1',
                className,
            )}
        />
    );
}
