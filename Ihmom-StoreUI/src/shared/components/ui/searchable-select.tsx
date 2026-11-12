import { useMemo, useState } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { cn } from '@/shared/lib/utils.ts';

export interface SearchableSelectOption {
    value: string;
    label: string;
    keywords?: string;
    meta?: string;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value?: string | null;
    onChange: (value: string | undefined) => void;
    placeholder: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    clearLabel?: string;
    openLabel?: string;
    clearable?: boolean;
    className?: string;
    inputClassName?: string;
    disabled?: boolean;
    invalid?: boolean;
    id?: string;
    name?: string;
    'aria-describedby'?: string;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder,
    searchPlaceholder,
    emptyMessage = 'No results found.',
    clearLabel = 'Clear selection',
    openLabel = 'Open options',
    clearable = true,
    className,
    inputClassName,
    disabled = false,
    invalid = false,
    id,
    name,
    'aria-describedby': ariaDescribedBy,
}: SearchableSelectProps) {
    const [inputValue, setInputValue] = useState('');
    const selectedOption = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );

    return (
        <Combobox.Root
            items={options}
            value={selectedOption}
            onValueChange={(next) => onChange(next?.value)}
            inputValue={inputValue}
            onInputValueChange={setInputValue}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => option.value}
            isItemEqualToValue={(option, selected) => option.value === selected.value}
            filter={(option, query) => {
                const haystack = `${option.label} ${option.keywords ?? ''}`.toLocaleLowerCase();

                return haystack.includes(query.trim().toLocaleLowerCase());
            }}
            disabled={disabled}
        >
            <Combobox.InputGroup className={cn('relative flex w-full items-center', className)}>
                <Search
                    className="text-muted-foreground pointer-events-none absolute start-2.5 z-10 size-4"
                    aria-hidden="true"
                />

                <Combobox.Input
                    id={id}
                    name={name}
                    placeholder={searchPlaceholder ?? placeholder}
                    aria-label={placeholder}
                    aria-invalid={invalid ? true : undefined}
                    aria-describedby={ariaDescribedBy}
                    className={cn(
                        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-10 w-full min-w-0 rounded-lg border bg-transparent py-1 ps-9 pe-16 text-base transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
                        inputClassName,
                    )}
                />

                <div className="absolute end-1 z-10 flex items-center gap-0.5">
                    {value && clearable ? (
                        <Combobox.Clear
                            className="text-muted-foreground hover:text-foreground hover:bg-muted grid size-7 place-items-center rounded-md transition-colors"
                            aria-label={clearLabel}
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </Combobox.Clear>
                    ) : null}

                    <Combobox.Trigger
                        className="text-muted-foreground hover:text-foreground hover:bg-muted grid size-7 place-items-center rounded-md transition-colors"
                        aria-label={openLabel}
                        disabled={disabled}
                    >
                        <ChevronDown className="size-4" aria-hidden="true" />
                    </Combobox.Trigger>
                </div>
            </Combobox.InputGroup>

            <Combobox.Portal>
                <Combobox.Positioner sideOffset={4} className="z-50 outline-none">
                    <Combobox.Popup
                        className={cn(
                            'bg-popover text-popover-foreground ring-foreground/10 relative isolate z-50',
                            'w-[max(var(--anchor-width),16rem)] max-w-(--available-width)',
                            'max-h-(--available-height) overflow-x-hidden overflow-y-auto rounded-lg shadow-md ring-1',
                            'origin-(--transform-origin) transition-[scale,opacity] duration-100',
                            'data-starting-style:scale-95 data-starting-style:opacity-0',
                            'data-ending-style:scale-95 data-ending-style:opacity-0',
                        )}
                    >
                        <Combobox.Empty>
                            <p className="text-muted-foreground px-2 py-3 text-sm">
                                {emptyMessage}
                            </p>
                        </Combobox.Empty>

                        <Combobox.List className="p-1 data-empty:p-0">
                            {(option: SearchableSelectOption) => (
                                <Combobox.Item
                                    key={option.value}
                                    value={option}
                                    className={cn(
                                        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                                        'data-selected:font-medium',
                                        'relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 ps-2 pe-2 text-sm outline-none select-none',
                                    )}
                                >
                                    <Combobox.ItemIndicator className="text-primary flex size-4 shrink-0 items-center justify-center">
                                        <Check className="size-4" aria-hidden="true" />
                                    </Combobox.ItemIndicator>

                                    <span className="min-w-0 flex-1 truncate">{option.label}</span>

                                    {option.meta ? (
                                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                            {option.meta}
                                        </span>
                                    ) : null}
                                </Combobox.Item>
                            )}
                        </Combobox.List>
                    </Combobox.Popup>
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    );
}
