import type { ImgHTMLAttributes } from 'react';

export type StorePhotoName =
    | 'general_shop_opening_image'
    | 'accessories_section'
    | 'games_section'
    | 'shisha_vape_section'
    | 'combination_accessories_games_shisha_vape_section';

const photos = import.meta.glob<string>('@/assets/store/*-{480,960,1440}.webp', {
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
    const source = (width: number) => photos[`/src/assets/store/${name}-${width}.webp`];
    const widths = name === 'general_shop_opening_image' ? [480, 960, 1440] : [480, 960];

    return (
        <img
            src={source(960)}
            srcSet={widths.map((width) => `${source(width)} ${width}w`).join(', ')}
            sizes={sizes}
            alt={alt}
            width={960}
            height={name === 'general_shop_opening_image' ? 720 : 1280}
            loading={loading}
            fetchPriority={fetchPriority}
            decoding="async"
            className={className}
        />
    );
}
