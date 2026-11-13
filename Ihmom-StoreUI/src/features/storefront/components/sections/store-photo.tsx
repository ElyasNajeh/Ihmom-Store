import type { ImgHTMLAttributes } from 'react';

export type StorePhotoName =
    | 'accessories_section'
    | 'games_section'
    | 'shisha_vape_section'
    | 'combination_accessories_games_shisha_vape_section';

const widths = [480, 960] as const;

const photos = import.meta.glob<string>('@/assets/store/*-{480,960}.webp', {
    eager: true,
    query: '?url',
    import: 'default',
});

type StorePhotoProps = {
    name: StorePhotoName;
    alt: string;
    className?: string;
    sizes: string;
    loading?: ImgHTMLAttributes<HTMLImageElement>['loading'];
    fetchPriority?: ImgHTMLAttributes<HTMLImageElement>['fetchPriority'];
};

export function StorePhoto({
    name,
    alt,
    className,
    sizes,
    loading = 'lazy',
    fetchPriority = 'auto',
}: StorePhotoProps) {
    const source = (width: (typeof widths)[number]) => {
        const path = `/src/assets/store/${name}-${width}.webp`;
        const url = photos[path];

        if (!url) {
            throw new Error(`Missing store photo asset: ${path}`);
        }

        return url;
    };

    return (
        <img
            src={source(960)}
            srcSet={widths.map((width) => `${source(width)} ${width}w`).join(', ')}
            sizes={sizes}
            alt={alt}
            width={960}
            height={1280}
            loading={loading}
            fetchPriority={fetchPriority}
            decoding="async"
            className={className}
        />
    );
}
