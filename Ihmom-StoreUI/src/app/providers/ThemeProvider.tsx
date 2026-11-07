import { useEffect, useState } from 'react';
import { THEME, type Theme } from '@/features/theme/constants/theme.ts';
import { ThemeProviderContext } from '@/features/theme/context/theme-context.ts';

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const stored = window.localStorage.getItem(storageKey);

    if (stored === THEME.LIGHT || stored === THEME.DARK || stored === THEME.SYSTEM) {
        return stored;
    }

    return fallback;
}

export function ThemeProvider({
    children,
    defaultTheme = THEME.SYSTEM,
    storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme));

    useEffect(() => {
        const root = document.documentElement;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const applyTheme = () => {
            root.classList.remove(THEME.LIGHT, THEME.DARK);

            const resolvedTheme =
                theme === THEME.SYSTEM ? (mediaQuery.matches ? THEME.DARK : THEME.LIGHT) : theme;

            root.classList.add(resolvedTheme);
        };

        applyTheme();

        mediaQuery.addEventListener('change', applyTheme);

        return () => {
            mediaQuery.removeEventListener('change', applyTheme);
        };
    }, [theme]);

    const setTheme = (theme: Theme) => {
        localStorage.setItem(storageKey, theme);
        setThemeState(theme);
    };

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    );
}
