import { useEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface ImageWithFadeProps extends ImgHTMLAttributes<HTMLImageElement> {
    wrapperClassName?: string;
}

/**
 * Fades an image in once decoded so lazy-loaded cards never pop in harshly.
 * Handles images that finish loading before React attaches its listeners.
 */
export function ImageWithFade({
    className,
    wrapperClassName,
    onLoad,
    onError,
    ...props
}: ImageWithFadeProps) {
    const [loaded, setLoaded] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (imageRef.current?.complete) setLoaded(true);
    }, []);

    return (
        <span
            className={cn(
                'block size-full opacity-0 transition-opacity duration-500 ease-out motion-reduce:opacity-100 motion-reduce:transition-none',
                loaded && 'opacity-100',
                wrapperClassName,
            )}
        >
            <img
                ref={imageRef}
                onLoad={(event) => {
                    setLoaded(true);
                    onLoad?.(event);
                }}
                onError={(event) => {
                    setLoaded(true);
                    onError?.(event);
                }}
                className={cn('size-full', className)}
                {...props}
            />
        </span>
    );
}
