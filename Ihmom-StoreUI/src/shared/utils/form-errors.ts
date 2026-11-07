import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { z } from 'zod';

// @hookform/resolvers v3 cannot validate Zod v4 schemas, so forms use safeParse instead.
export function applyZodErrors<T extends FieldValues>(
    error: z.ZodError,
    setError: UseFormSetError<T>,
    messages: Partial<Record<Path<T>, string>>,
): void {
    const applied = new Set<Path<T>>();

    for (const issue of error.issues) {
        const field = issue.path[0];

        if (typeof field !== 'string') {
            continue;
        }

        const path = field as Path<T>;
        const message = messages[path];

        if (!message || applied.has(path)) {
            continue;
        }

        applied.add(path);
        setError(path, { type: 'validation', message });
    }
}
