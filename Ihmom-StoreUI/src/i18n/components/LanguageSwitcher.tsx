import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import { LANGUAGE_METADATA, type Language } from '@/i18n/locales';

export function LanguageSelector() {
    const { i18n, t } = useTranslation('common');

    const currentLanguage: Language = i18n.resolvedLanguage?.split('-')[0] === 'ar' ? 'ar' : 'en';
    const nextLanguage: Language = currentLanguage === 'en' ? 'ar' : 'en';
    const nextMetadata = LANGUAGE_METADATA[nextLanguage];

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="group gap-2 px-2.5"
            dir={nextMetadata.dir}
            aria-label={t('language.switchTo', { language: nextMetadata.label })}
            title={t('language.switchTo', { language: nextMetadata.label })}
            onClick={() => void i18n.changeLanguage(nextLanguage)}
        >
            <Languages
                className="text-muted-foreground group-hover:text-foreground size-4 transition-colors"
                aria-hidden="true"
            />
            <span className="text-xs font-semibold tracking-wide">{nextMetadata.nativeLabel}</span>
        </Button>
    );
}
