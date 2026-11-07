import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
    DEFAULT_LANGUAGE,
    LANGUAGE_METADATA,
    SUPPORTED_LANGUAGES,
    type Language,
} from '@/i18n/locales';

export function DocumentLanguageSync() {
    const { i18n } = useTranslation();

    useEffect(() => {
        const resolvedLanguage = i18n.resolvedLanguage?.split('-')[0] ?? DEFAULT_LANGUAGE;

        const language: Language = SUPPORTED_LANGUAGES.includes(resolvedLanguage as Language)
            ? (resolvedLanguage as Language)
            : DEFAULT_LANGUAGE;

        const metadata = LANGUAGE_METADATA[language];

        document.documentElement.lang = language;
        document.documentElement.dir = metadata.dir;
    }, [i18n, i18n.resolvedLanguage]);

    return null;
}
