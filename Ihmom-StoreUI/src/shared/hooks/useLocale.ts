import { useTranslation } from 'react-i18next';

import { LANGUAGE_METADATA, type Language } from '@/i18n/locales.ts';

export interface UseLocaleResult {
    language: Language;
    isArabic: boolean;
    locale: string;
}

export function useLocale(): UseLocaleResult {
    const { i18n } = useTranslation();
    const language: Language = i18n.resolvedLanguage?.split('-')[0] === 'ar' ? 'ar' : 'en';

    return {
        language,
        isArabic: language === 'ar',
        locale: LANGUAGE_METADATA[language].locale,
    };
}
