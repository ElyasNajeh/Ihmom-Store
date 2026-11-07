import {
    STORE_ADDRESS_AR,
    STORE_ADDRESS_EN,
    STORE_EMAIL,
    STORE_MAP_DIRECTIONS_URL,
    STORE_MAP_EMBED_URL,
    STORE_NAME_AR,
    STORE_NAME_EN,
    STORE_PHONE_DISPLAY,
    STORE_PHONE_LINK,
    STORE_SOCIAL_URLS,
} from '@/constants/store.ts';

import { localizedText } from '@/utils/localized.ts';

export const storeInfo = {
    nameEn: STORE_NAME_EN,
    nameAr: STORE_NAME_AR,
    taglineKey: 'common:store.tagline',
    descriptionKey: 'common:store.description',

    addressEn: STORE_ADDRESS_EN,
    addressAr: STORE_ADDRESS_AR,
    phoneDisplay: STORE_PHONE_DISPLAY,
    phoneLink: STORE_PHONE_LINK,
    email: STORE_EMAIL,

    openingHours: [
        {
            id: 'saturdayThursday',
            daysKey: 'contact:hours.saturdayThursday',
            hoursKey: 'contact:hours.toBeConfirmed',
        },
        {
            id: 'friday',
            daysKey: 'contact:hours.friday',
            hoursKey: 'contact:hours.fridayToBeConfirmed',
        },
    ],

    mapEmbedUrl: STORE_MAP_EMBED_URL,
    mapDirectionsUrl: STORE_MAP_DIRECTIONS_URL,

    instagramUrl: STORE_SOCIAL_URLS.INSTAGRAM,
    facebookUrl: STORE_SOCIAL_URLS.FACEBOOK,
    snapchatUrl: STORE_SOCIAL_URLS.SNAPCHAT,
} as const;

export function getStoreName(isArabic: boolean): string {
    return localizedText(storeInfo.nameEn, storeInfo.nameAr, isArabic);
}

export function getStoreAddress(isArabic: boolean): string {
    return localizedText(storeInfo.addressEn, storeInfo.addressAr, isArabic);
}

export const storeCategories = [
    {
        id: 'phoneAccessories',
        number: '01',
        titleKey: 'shop-catalog-additions:categories.phoneAccessories.title',
        descriptionKey: 'shop-catalog-additions:categories.phoneAccessories.description',
        image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=1000&q=85',
        altKey: 'shop-catalog-additions:categories.phoneAccessories.imageAlt',
        labelKey: 'shop-catalog-additions:categories.phoneAccessories.label',
    },
    {
        id: 'hookahAccessories',
        number: '02',
        titleKey: 'shop-catalog-additions:categories.hookahAccessories.title',
        descriptionKey: 'shop-catalog-additions:categories.hookahAccessories.description',
        image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1000&q=85',
        altKey: 'shop-catalog-additions:categories.hookahAccessories.imageAlt',
        labelKey: 'shop-catalog-additions:categories.hookahAccessories.label',
    },
    {
        id: 'lifestyleEssentials',
        number: '03',
        titleKey: 'shop-catalog-additions:categories.lifestyleEssentials.title',
        descriptionKey: 'shop-catalog-additions:categories.lifestyleEssentials.description',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85',
        altKey: 'shop-catalog-additions:categories.lifestyleEssentials.imageAlt',
        labelKey: 'shop-catalog-additions:categories.lifestyleEssentials.label',
    },
] as const;

export const storeValues = [
    {
        id: 'variety',
        titleKey: 'home-additions:whyShop.values.variety.title',
        descriptionKey: 'home-additions:whyShop.values.variety.description',
        icon: 'layers',
    },
    {
        id: 'practicalChoices',
        titleKey: 'home-additions:whyShop.values.practicalChoices.title',
        descriptionKey: 'home-additions:whyShop.values.practicalChoices.description',
        icon: 'check',
    },
    {
        id: 'support',
        titleKey: 'home-additions:whyShop.values.support.title',
        descriptionKey: 'home-additions:whyShop.values.support.description',
        icon: 'message',
    },
    {
        id: 'simplerVisit',
        titleKey: 'home-additions:whyShop.values.simplerVisit.title',
        descriptionKey: 'home-additions:whyShop.values.simplerVisit.description',
        icon: 'map',
    },
] as const;
