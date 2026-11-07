import { z } from 'zod';

import { MAX_MONEY_AMOUNT } from '@/shared/constants/common.ts';

export const requiredText = (label: string, max: number) =>
    z
        .string()
        .trim()
        .min(1, { error: `${label} is required` })
        .max(max, { error: `${label} must be at most ${max} characters` });

export const optionalText = (label: string, max: number) => requiredText(label, max).optional();

export const moneyField = (label: string) =>
    z
        .number()
        .min(0, { error: `${label} cannot be negative` })
        .multipleOf(0.01, { error: `${label} can have at most 2 decimal places` })
        .refine((value) => value < MAX_MONEY_AMOUNT, {
            error: `${label} must have at most 10 digits`,
        });

type BilingualShape<Ar extends string, En extends string> = {
    [K in Ar | En]: z.ZodString;
};

type PartialBilingualShape<Ar extends string, En extends string> = {
    [K in Ar | En]: z.ZodOptional<z.ZodString>;
};

export function bilingualTextShape<Ar extends string, En extends string>(
    arKey: Ar,
    enKey: En,
    label: string,
    max: number,
): BilingualShape<Ar, En> {
    return {
        [arKey]: requiredText(`Arabic ${label}`, max),
        [enKey]: requiredText(`English ${label}`, max),
    } as BilingualShape<Ar, En>;
}

export function partialBilingualTextShape<Ar extends string, En extends string>(
    arKey: Ar,
    enKey: En,
    label: string,
    max: number,
): PartialBilingualShape<Ar, En> {
    return {
        [arKey]: requiredText(`Arabic ${label}`, max).optional(),
        [enKey]: requiredText(`English ${label}`, max).optional(),
    } as PartialBilingualShape<Ar, En>;
}

export const palestinianPhoneSchema = z
    .string()
    .trim()
    .transform((value, ctx) => {
        if (value.length === 10 && /^05\d{8}$/.test(value)) {
            return `+970${value.slice(1)}`;
        }

        if (value.length === 12 && /^(9705|9725)\d{8}$/.test(value)) {
            return `+${value}`;
        }

        if (value.length === 13 && /^\+(970|972)5\d{8}$/.test(value)) {
            return value;
        }

        ctx.issues.push({
            code: 'custom',
            message: 'Phone must use +970 or +972 followed by a 9-digit number beginning with 5',
            input: value,
        });

        return z.NEVER;
    });

export function atLeastOneField<Shape extends z.ZodRawShape>(shape: Shape) {
    return z
        .object(shape)
        .strict()
        .refine((data) => Object.keys(data).length !== 0, {
            message: 'At least one field must be provided',
        });
}
