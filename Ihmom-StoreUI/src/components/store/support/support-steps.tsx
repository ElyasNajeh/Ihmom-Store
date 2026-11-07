import { cn } from '@/lib/utils.ts';

export interface SupportStep {
    id: string;
    title: string;
    description: string;
}

export function SupportSteps({ steps, className }: { steps: SupportStep[]; className?: string }) {
    return (
        <ol className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
            {steps.map((step, index) => (
                <li key={step.id} className="border-border bg-card relative rounded-2xl border p-5">
                    <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-sm font-semibold">
                        {index + 1}
                    </span>
                    <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                        {step.description}
                    </p>
                </li>
            ))}
        </ol>
    );
}
