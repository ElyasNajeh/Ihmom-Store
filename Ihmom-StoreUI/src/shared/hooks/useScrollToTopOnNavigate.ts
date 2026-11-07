import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrollToTopOnNavigate(): void {
    const { pathname } = useLocation();

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);
}
