export interface BilingualName {
    name_ar?: string | null;
    name_en?: string | null;
}

export function localizedText(
    english: string | null | undefined,
    arabic: string | null | undefined,
    isArabic: boolean,
): string {
    return isArabic
        ? arabic?.trim() || english?.trim() || ''
        : english?.trim() || arabic?.trim() || '';
}

export function localizedName(item: BilingualName, isArabic: boolean): string {
    return localizedText(item.name_en, item.name_ar, isArabic);
}

export function localizedSecondaryName(item: BilingualName, isArabic: boolean): string {
    return localizedText(item.name_ar, item.name_en, isArabic);
}

export function orderBilingualFields<T>(fields: readonly T[], isArabic: boolean): T[] {
    return isArabic ? [...fields] : [...fields].reverse();
}
