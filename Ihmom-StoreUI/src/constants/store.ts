export const STORE_NAME_EN = 'Ihmom Store';

export const STORE_NAME_AR = 'هموم ستور';

export const STORE_ADDRESS_EN = 'Turmus Ayya – Main Street, next to Bravo Mall.';

export const STORE_ADDRESS_AR = 'ترمسعيا – الشارع الرئيسي، بجانب براڤو مول.';

export const STORE_COORDINATES = {
    LATITUDE: 32.034235,
    LONGITUDE: 35.287018,
} as const;

export const STORE_MAP_QUERY = `${STORE_COORDINATES.LATITUDE},${STORE_COORDINATES.LONGITUDE}`;

export const STORE_MAP_EMBED_URL = `https://www.google.com/maps?q=${STORE_MAP_QUERY}&output=embed`;

export const STORE_MAP_DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${STORE_MAP_QUERY}`;

export const STORE_PHONE_DISPLAY = '+972 56 600 9514';

export const STORE_PHONE_LINK = '+972566009514';

export const STORE_EMAIL = 'ihmom@gmail.com';

export const STORE_SOCIAL_URLS = {
    INSTAGRAM: 'https://www.instagram.com/ihmom_store?exln=Y3AyZ3o4OTB2bXY0',
    FACEBOOK: 'https://www.facebook.com/share/19j7KdSKap/?mibextid=wwXIfr',
    SNAPCHAT: 'https://snapchat.com/t/Ixx0ho2q',
} as const;
