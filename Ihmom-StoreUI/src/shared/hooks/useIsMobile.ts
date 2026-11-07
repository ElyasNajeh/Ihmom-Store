import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/** Mobile is any viewport narrower than Tailwind's `md` breakpoint. */
export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

    React.useEffect(() => {
        const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const update = (event: MediaQueryList | MediaQueryListEvent) => setIsMobile(event.matches);

        update(query);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return isMobile ?? false;
}
