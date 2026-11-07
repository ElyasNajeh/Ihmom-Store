export function scrollToSection(sectionId: string): void {
    const target = document.getElementById(sectionId);
    if (!target) return;

    target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
    });

    if (window.location.hash !== `#${sectionId}`) {
        window.history.pushState(null, '', `#${sectionId}`);
    }
}
