import { useEffect, useId, useMemo } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/ui/button.tsx';
import { cn } from '@/shared/lib/utils.ts';

interface AdminImagePickerProps {
    files: File[];
    onChange: (files: File[]) => void;
    label: string;
    hint?: string;
    multiple?: boolean;
    disabled?: boolean;
    className?: string;
    inputId?: string;
}

export function AdminImagePicker({
    files,
    onChange,
    label,
    hint,
    multiple = false,
    disabled = false,
    className,
    inputId,
}: AdminImagePickerProps) {
    const generatedId = useId();
    const id = inputId ?? generatedId;
    const { t } = useTranslation('admin');

    const previews = useMemo(
        () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [files],
    );

    useEffect(
        () => () => {
            previews.forEach((preview) => URL.revokeObjectURL(preview.url));
        },
        [previews],
    );

    return (
        <div className={cn('space-y-3', className)}>
            <label
                htmlFor={id}
                className={cn(
                    'border-border bg-muted/30 hover:border-ring/60 focus-within:border-ring focus-within:ring-ring/30 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors focus-within:ring-3',
                    disabled && 'pointer-events-none opacity-60',
                )}
            >
                <span className="bg-background text-muted-foreground grid size-10 place-items-center rounded-full border">
                    <ImagePlus className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium">{label}</span>
                {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
                <input
                    id={id}
                    type="file"
                    accept="image/*"
                    multiple={multiple}
                    disabled={disabled}
                    className="sr-only"
                    onChange={(event) => {
                        const selected = Array.from(event.target.files ?? []);

                        if (selected.length) {
                            onChange(multiple ? [...files, ...selected] : selected.slice(0, 1));
                        }

                        event.target.value = '';
                    }}
                />
            </label>

            {previews.length ? (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {previews.map((preview, index) => (
                        <li
                            key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
                            className="group border-border relative aspect-square overflow-hidden rounded-lg border"
                        >
                            <img
                                src={preview.url}
                                alt={preview.file.name}
                                className="size-full object-cover"
                            />

                            <Button
                                type="button"
                                variant="destructive"
                                size="icon-xs"
                                className="absolute end-1 top-1 opacity-90"
                                aria-label={`${t('common.delete')} ${preview.file.name}`}
                                onClick={() => onChange(files.filter((_, i) => i !== index))}
                            >
                                <Trash2 aria-hidden="true" />
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
