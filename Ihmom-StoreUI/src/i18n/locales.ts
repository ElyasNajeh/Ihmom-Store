export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export type TextDirection = 'ltr' | 'rtl';

export interface LanguageMetadata {
    label: string;
    nativeLabel: string;
    dir: TextDirection;
    locale: string;
}

export const DEFAULT_LANGUAGE: Language = 'en';

export const LANGUAGE_METADATA: Record<Language, LanguageMetadata> = {
    en: {
        label: 'English',
        nativeLabel: 'English',
        dir: 'ltr',
        locale: 'en-US',
    },
    ar: {
        label: 'Arabic',
        nativeLabel: 'العربية',
        dir: 'rtl',
        locale: 'ar',
    },
};

export function isSupportedLanguage(language: string | undefined): language is Language {
    return language !== undefined && SUPPORTED_LANGUAGES.includes(language as Language);
}

export function getLanguageMetadata(language: string): LanguageMetadata {
    const normalizedLanguage = language.split('-')[0];

    if (isSupportedLanguage(normalizedLanguage)) {
        return LANGUAGE_METADATA[normalizedLanguage];
    }

    return LANGUAGE_METADATA[DEFAULT_LANGUAGE];
}
