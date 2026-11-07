import { createContext, useContext } from 'react';

import { THEME, type Theme } from '@/features/theme/constants/theme.ts';

export type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

export const ThemeProviderContext = createContext<ThemeProviderState>({
    theme: THEME.SYSTEM,
    setTheme: () => null,
});

export function useTheme() {
    return useContext(ThemeProviderContext);
}
