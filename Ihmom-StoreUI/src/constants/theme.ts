export const THEME = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
} as const;

export type Theme = (typeof THEME)[keyof typeof THEME];

export const THEME_DEFAULT: Theme = THEME.SYSTEM;

export const THEME_STORAGE_KEY = 'vite-ui-theme';
