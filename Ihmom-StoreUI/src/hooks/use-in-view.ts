import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
}

/**
 * One-shot visibility observer used for scroll-reveal transitions. Falls back
 * to visible when the API is missing or the user prefers reduced motion.
 */
export function useInView<T extends HTMLElement>({
    threshold = 0.15,
    rootMargin = '0px 0px -8% 0px',
    once = true,
}: UseInViewOptions = {}) {
    const ref = useRef<T | null>(null);
    const prefersReducedMotion =
        typeof window === 'undefined' ||
        typeof IntersectionObserver === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [inView, setInView] = useState(prefersReducedMotion);

    useEffect(() => {
        if (prefersReducedMotion) return;

        const node = ref.current;

        if (!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setInView(true);
                        if (once) observer.disconnect();
                    } else if (!once) {
                        setInView(false);
                    }
                }
            },
            { threshold, rootMargin },
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [once, prefersReducedMotion, rootMargin, threshold]);

    return { ref, inView };
}
