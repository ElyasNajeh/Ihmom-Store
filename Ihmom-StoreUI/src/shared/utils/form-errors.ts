import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { z } from 'zod';
import axios from 'axios';

export function applyApiErrors<T extends FieldValues>(
    error: unknown,
    setError: UseFormSetError<T>,
    messages: Partial<Record<Path<T>, string>>,
): void {
    if (!axios.isAxiosError(error) || error.response?.status !== 422) return;
    const detail: unknown = error.response.data?.detail;
    if (!Array.isArray(detail)) return;
    for (const issue of detail) {
        if (!Array.isArray(issue?.loc) || issue.loc[0] !== 'body') continue;
        const path = issue.loc.slice(1).join('.') as Path<T>;
        const message = messages[path] ?? messages[issue.loc[1] as Path<T>];
        if (message) setError(path, { type: 'server', message });
    }
}

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
