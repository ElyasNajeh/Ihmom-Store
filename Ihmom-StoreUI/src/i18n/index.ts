import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// English resources
import enCommon from './resources/en/common.json';
import enNavigation from './resources/en/navigation.json';
import enHome from './resources/en/home.json';
import enHomeAdditions from './resources/en/home-additions.json';
import enCatalog from './resources/en/catalog.json';
import enShopCatalogAdditions from './resources/en/shop-catalog-additions.json';
import enContact from './resources/en/contact.json';
import enAbout from './resources/en/about.json';
import enOrders from './resources/en/orders.json';
import enSupport from './resources/en/support.json';
import enAdmin from './resources/en/admin.json';

// Arabic resources
import arCommon from './resources/ar/common.json';
import arNavigation from './resources/ar/navigation.json';
import arHome from './resources/ar/home.json';
import arHomeAdditions from './resources/ar/home-additions.json';
import arCatalog from './resources/ar/catalog.json';
import arShopCatalogAdditions from './resources/ar/shop-catalog-additions.json';
import arContact from './resources/ar/contact.json';
import arAbout from './resources/ar/about.json';
import arOrders from './resources/ar/orders.json';
import arSupport from './resources/ar/support.json';
import arAdmin from './resources/ar/admin.json';

import { DEFAULT_LANGUAGE, getLanguageMetadata, SUPPORTED_LANGUAGES } from './locales';

const resources = {
    en: {
        common: enCommon,
        navigation: enNavigation,
        home: enHome,
        'home-additions': enHomeAdditions,
        catalog: enCatalog,
        'shop-catalog-additions': enShopCatalogAdditions,
        contact: enContact,
        about: enAbout,
        orders: enOrders,
        support: enSupport,
        admin: enAdmin,
    },
    ar: {
        common: arCommon,
        navigation: arNavigation,
        home: arHome,
        'home-additions': arHomeAdditions,
        catalog: arCatalog,
        'shop-catalog-additions': arShopCatalogAdditions,
        contact: arContact,
        about: arAbout,
        orders: arOrders,
        support: arSupport,
        admin: arAdmin,
    },
} as const;

function syncDocumentLanguage(language: string): void {
    const metadata = getLanguageMetadata(language);
    const root = document.documentElement;

    root.lang = language.split('-')[0];
    root.dir = metadata.dir;
}

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,

        supportedLngs: [...SUPPORTED_LANGUAGES],
        fallbackLng: DEFAULT_LANGUAGE,

        defaultNS: 'common',
        ns: [
            'common',
            'navigation',
            'home',
            'home-additions',
            'catalog',
            'shop-catalog-additions',
            'contact',
            'about',
            'orders',
            'support',
            'admin',
        ],

        interpolation: {
            escapeValue: false,
        },

        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'store-language',
            caches: ['localStorage'],
        },

        react: {
            useSuspense: false,
        },
    })
    .then(() => {
        syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
    });

i18n.on('languageChanged', (language) => {
    syncDocumentLanguage(language);
});

export default i18n;
