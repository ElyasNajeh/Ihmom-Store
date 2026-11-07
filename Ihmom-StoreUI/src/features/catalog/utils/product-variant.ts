import { DEFAULT_VARIANT_NAME } from '@/features/catalog/constants/products.ts';
import { localizedText } from '@/shared/utils/localized.ts';

export { DEFAULT_VARIANT_NAME };

export function localizedVariantName(
    nameAr: string | null | undefined,
    nameEn: string | null | undefined,
    isArabic: boolean,
    defaultLabel: string,
): string {
    const label = localizedText(nameEn, nameAr, isArabic);

    return !label || label === DEFAULT_VARIANT_NAME ? defaultLabel : label;
}
