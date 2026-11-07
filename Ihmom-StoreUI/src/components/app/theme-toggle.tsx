import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-context.ts';
import { Button } from '@/components/ui/button';
import { THEME } from '@/constants/theme.ts';

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    // Determine if effective theme is dark (handles explicit 'dark' or 'system' matching dark preference)
    const isDark =
        theme === THEME.DARK ||
        (theme === THEME.SYSTEM &&
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);

    const toggleTheme = () => {
        setTheme(isDark ? THEME.LIGHT : THEME.DARK);
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative size-9 shrink-0 rounded-lg focus-visible:ring-2"
        >
            <Sun
                className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
                aria-hidden="true"
            />
            <Moon
                className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
                aria-hidden="true"
            />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
