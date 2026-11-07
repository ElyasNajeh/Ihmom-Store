import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export interface SupportAccordionItem {
    id: string;
    question: string;
    answer: string;
}

interface SupportAccordionProps {
    items: SupportAccordionItem[];
    defaultOpenIds?: string[];
    className?: string;
}

export function SupportAccordion({ items, defaultOpenIds = [], className }: SupportAccordionProps) {
    const baseId = useId();
    const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

    function toggle(itemId: string) {
        setOpenIds((current) =>
            current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
        );
    }

    return (
        <div className={cn('border-border bg-card overflow-hidden rounded-2xl border', className)}>
            {items.map((item, index) => {
                const isOpen = openIds.includes(item.id);
                const triggerId = `${baseId}-trigger-${index}`;
                const panelId = `${baseId}-panel-${index}`;

                return (
                    <div key={item.id} className={index > 0 ? 'border-border border-t' : undefined}>
                        <h3>
                            <button
                                type="button"
                                id={triggerId}
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                                onClick={() => toggle(item.id)}
                                className="hover:bg-muted/50 focus-visible:ring-ring flex w-full items-start justify-between gap-4 px-4 py-4 text-start text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-5"
                            >
                                <span>{item.question}</span>
                                <ChevronDown
                                    className={cn(
                                        'text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform duration-200',
                                        isOpen && 'rotate-180',
                                    )}
                                    aria-hidden="true"
                                />
                            </button>
                        </h3>

                        <div
                            id={panelId}
                            role="region"
                            aria-labelledby={triggerId}
                            hidden={!isOpen}
                            className="text-muted-foreground px-4 pb-4 text-sm leading-6 sm:px-5"
                        >
                            {item.answer}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
