import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    ImageOff,
    Maximize2,
    Minus,
    Plus,
    ShoppingBag,
    X,
} from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useToastManager } from '@/components/ui/toast.tsx';
import { ImageWithFade } from '@/components/ui/image-with-fade.tsx';
import { StoreShell } from '@/components/store/layout/store-shell.tsx';
import { ShopProductCard } from '@/components/store/shop/shop-product-card.tsx';
import { useProduct, useProductRecommendations } from '@/hooks/useProducts.ts';
import { useCart } from '@/cart/cart-context.ts';
import { MAX_CART_QUANTITY } from '@/constants/cart.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import { formatOrderMoney } from '@/utils/order-format.ts';
import { apiAssetUrl } from '@/services/axios.ts';
import { localizedName, localizedText } from '@/utils/localized.ts';
import { localizedVariantName } from '@/utils/product-variant.ts';
import { cn } from '@/lib/utils.ts';

export default function ProductDetailPage() {
    const { productId: productIdParam } = useParams();
    const { t } = useTranslation('catalog');
    const toastManager = useToastManager();
    const { addItem } = useCart();
    const { isArabic, locale } = useLocale();

    const productId = Number(productIdParam);
    const isValidId = Number.isInteger(productId) && productId > 0;
    const productQuery = useProduct(isValidId ? productId : 0);
    const recommendationsQuery = useProductRecommendations(isValidId ? productId : 0, 4);

    const [selection, setSelection] = useState<{
        productId: number | null;
        variantId: number | null;
        imageId: number | null;
        quantity: number;
    }>({ productId: null, variantId: null, imageId: null, quantity: 1 });
    const [fullscreenOpen, setFullscreenOpen] = useState(false);

    const product = productQuery.data;

    const images = useMemo(() => {
        if (!product) return [];

        return [...product.images].sort(
            (first, second) => Number(second.is_primary) - Number(first.is_primary),
        );
    }, [product]);

    const productSelection =
        selection.productId === product?.id
            ? selection
            : { productId: product?.id ?? null, variantId: null, imageId: null, quantity: 1 };

    const selectedVariant =
        product?.variants.find((variant) => variant.id === productSelection.variantId) ??
        product?.variants[0];

    const activeImage = images.find((image) => image.id === productSelection.imageId) ?? images[0];
    const activeImageIndex = activeImage
        ? Math.max(
              0,
              images.findIndex((image) => image.id === activeImage.id),
          )
        : 0;
    const hasPreviousImage = activeImageIndex > 0;
    const hasNextImage = activeImageIndex < images.length - 1;

    const quantity = productSelection.quantity;

    const selectVariant = (variantId: number) => {
        setSelection((current) => ({
            ...current,
            productId: product?.id ?? null,
            variantId,
        }));
    };

    const selectImage = (imageId: number) => {
        setSelection((current) => ({
            ...current,
            productId: product?.id ?? null,
            imageId,
        }));
    };

    const showImageAt = (index: number) => {
        const image = images[index];
        if (image) selectImage(image.id);
    };

    const changeQuantity = (update: (current: number) => number) => {
        setSelection((current) => {
            const baseQuantity = current.productId === product?.id ? current.quantity : 1;

            return {
                ...current,
                productId: product?.id ?? null,
                quantity: update(baseQuantity),
            };
        });
    };

    const productName = product ? localizedName(product, isArabic) : '';

    const description = product
        ? localizedText(product.description_en, product.description_ar, isArabic) || null
        : null;

    const handleAddToCart = () => {
        if (!product || !selectedVariant) {
            return;
        }

        addItem(
            {
                variantId: selectedVariant.id,
                productId: product.id,
                nameAr: product.name_ar,
                nameEn: product.name_en,
                variantNameAr: selectedVariant.name_ar ?? null,
                variantNameEn: selectedVariant.name_en ?? null,
                price: selectedVariant.price,
                image: activeImage?.image ?? images[0]?.image ?? null,
            },
            quantity,
        );

        toastManager.add({
            type: 'success',
            title: t('product.added'),
            description: productName,
        });
    };

    if (!isValidId) {
        return (
            <StoreShell>
                <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
                    <h1 className="text-2xl font-semibold">{t('product.notFoundTitle')}</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        {t('product.notFoundDescription')}
                    </p>
                    <Button asChild variant="outline" className="mt-6">
                        <Link to="/shop">
                            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                            {t('product.backToShop')}
                        </Link>
                    </Button>
                </section>
            </StoreShell>
        );
    }

    if (productQuery.isPending) {
        return (
            <StoreShell>
                <div
                    className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8"
                    aria-busy="true"
                >
                    <Skeleton className="aspect-square w-full rounded-2xl" />
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-12 w-full max-w-xs" />
                    </div>
                </div>
            </StoreShell>
        );
    }

    const isNotFound =
        axios.isAxiosError(productQuery.error) && productQuery.error.response?.status === 404;

    if (isNotFound || !product) {
        return (
            <StoreShell>
                <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
                    <h1 className="text-2xl font-semibold">{t('product.notFoundTitle')}</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        {t('product.notFoundDescription')}
                    </p>
                    <Button asChild variant="outline" className="mt-6">
                        <Link to="/shop">
                            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                            {t('product.backToShop')}
                        </Link>
                    </Button>
                </section>
            </StoreShell>
        );
    }

    if (productQuery.isError) {
        return (
            <StoreShell>
                <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
                    <h1 className="text-2xl font-semibold">{t('product.errorTitle')}</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        {t('product.errorDescription')}
                    </p>
                    <Button className="mt-6" onClick={() => void productQuery.refetch()}>
                        {t('product.retry')}
                    </Button>
                </section>
            </StoreShell>
        );
    }

    const price = selectedVariant?.price ?? product.starting_price;
    const showVariantPicker = product.has_selectable_variants && product.variants.length > 1;
    const recommendations = recommendationsQuery.data ?? [];

    return (
        <StoreShell>
            <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <Link
                    to="/shop"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
                >
                    <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                    {t('product.backToShop')}
                </Link>

                <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
                    <div className="space-y-3">
                        <div className="bg-muted group relative aspect-square overflow-hidden rounded-2xl">
                            {activeImage ? (
                                <ImageWithFade
                                    key={activeImage.id}
                                    src={apiAssetUrl(activeImage.image) ?? activeImage.image}
                                    alt={productName}
                                    fetchPriority="high"
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
                                    <ImageOff className="size-10" aria-hidden="true" />
                                    <span className="text-sm">{t('product.noImage')}</span>
                                </div>
                            )}

                            {activeImage ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="absolute end-3 top-3 rounded-full border border-white/40 bg-white/80 text-neutral-900 shadow-sm backdrop-blur transition-colors hover:bg-white"
                                        aria-label={t('product.openFullscreen')}
                                        onClick={() => setFullscreenOpen(true)}
                                    >
                                        <Maximize2 className="size-4" aria-hidden="true" />
                                    </Button>

                                    {images.length > 1 ? (
                                        <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center justify-between">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="icon"
                                                className="pointer-events-auto rounded-full border border-white/40 bg-white/80 text-neutral-900 shadow-sm backdrop-blur transition-colors hover:bg-white disabled:opacity-35"
                                                aria-label={t('product.previousImage')}
                                                disabled={!hasPreviousImage}
                                                onClick={() => showImageAt(activeImageIndex - 1)}
                                            >
                                                <ChevronLeft
                                                    className="size-5 rtl:rotate-180"
                                                    aria-hidden="true"
                                                />
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="icon"
                                                className="pointer-events-auto rounded-full border border-white/40 bg-white/80 text-neutral-900 shadow-sm backdrop-blur transition-colors hover:bg-white disabled:opacity-35"
                                                aria-label={t('product.nextImage')}
                                                disabled={!hasNextImage}
                                                onClick={() => showImageAt(activeImageIndex + 1)}
                                            >
                                                <ChevronRight
                                                    className="size-5 rtl:rotate-180"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        </div>
                                    ) : null}

                                    {images.length > 1 ? (
                                        <span className="bg-background/80 text-foreground absolute start-3 bottom-3 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums backdrop-blur">
                                            {activeImageIndex + 1} / {images.length}
                                        </span>
                                    ) : null}
                                </>
                            ) : null}
                        </div>

                        {images.length > 1 ? (
                            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                                {images.map((image, index) => (
                                    <li key={image.id}>
                                        <button
                                            type="button"
                                            aria-label={t('product.chooseImage', {
                                                number: index + 1,
                                            })}
                                            aria-current={
                                                image.id === activeImage?.id ? 'true' : undefined
                                            }
                                            onClick={() => selectImage(image.id)}
                                            className={cn(
                                                'focus-visible:ring-ring block aspect-square w-full overflow-hidden rounded-lg border transition-colors focus-visible:ring-2 focus-visible:outline-none',
                                                image.id === activeImage?.id
                                                    ? 'border-brand ring-brand/30 ring-2'
                                                    : 'border-border hover:border-brand/60',
                                            )}
                                        >
                                            <img
                                                src={apiAssetUrl(image.image) ?? image.image}
                                                alt=""
                                                loading="lazy"
                                                className="size-full object-cover"
                                            />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>

                    <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Link
                                to="/shop"
                                className="bg-muted text-muted-foreground hover:text-foreground rounded-full px-2.5 py-1 transition-colors"
                            >
                                {localizedName(product.category, isArabic)}
                            </Link>
                            <span className="text-muted-foreground">
                                {localizedName(product.brand, isArabic)}
                            </span>
                        </div>

                        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {productName}
                        </h1>

                        <p className="text-primary mt-3 text-2xl font-semibold tabular-nums">
                            {formatOrderMoney(price, locale)}
                        </p>

                        {description ? (
                            <p className="text-muted-foreground mt-4 text-sm leading-7 whitespace-pre-line">
                                {description}
                            </p>
                        ) : (
                            <p className="text-muted-foreground mt-4 text-sm">
                                {t('product.noDescription')}
                            </p>
                        )}

                        {showVariantPicker ? (
                            <fieldset className="mt-6">
                                <legend className="text-sm font-medium">
                                    {t('product.selectOption')}
                                </legend>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {product.variants.map((variant) => {
                                        const label = localizedVariantName(
                                            variant.name_ar,
                                            variant.name_en,
                                            isArabic,
                                            t('product.defaultVariant'),
                                        );

                                        return (
                                            <Button
                                                key={variant.id}
                                                type="button"
                                                variant={
                                                    variant.id === selectedVariant?.id
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                aria-pressed={variant.id === selectedVariant?.id}
                                                onClick={() => selectVariant(variant.id)}
                                            >
                                                <span>{label}</span>
                                                <span className="text-xs tabular-nums opacity-80">
                                                    {formatOrderMoney(variant.price, locale)}
                                                </span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </fieldset>
                        ) : null}

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <div
                                className="border-border inline-flex items-center rounded-xl border"
                                role="group"
                                aria-label={t('product.quantity')}
                            >
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('product.decrease')}
                                    disabled={quantity <= 1}
                                    onClick={() =>
                                        changeQuantity((current) => Math.max(1, current - 1))
                                    }
                                >
                                    <Minus className="size-4" aria-hidden="true" />
                                </Button>
                                <span
                                    className="min-w-10 text-center text-sm font-semibold tabular-nums"
                                    aria-live="polite"
                                >
                                    {quantity}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('product.increase')}
                                    disabled={quantity >= MAX_CART_QUANTITY}
                                    onClick={() =>
                                        changeQuantity((current) =>
                                            Math.min(MAX_CART_QUANTITY, current + 1),
                                        )
                                    }
                                >
                                    <Plus className="size-4" aria-hidden="true" />
                                </Button>
                            </div>

                            <Button
                                type="button"
                                size="lg"
                                className="min-h-12 flex-1 sm:flex-none"
                                disabled={!selectedVariant}
                                onClick={handleAddToCart}
                            >
                                <ShoppingBag className="size-4" aria-hidden="true" />
                                {t('product.addToCart')}
                            </Button>
                        </div>

                        {!selectedVariant ? (
                            <p className="text-destructive mt-3 text-sm">
                                {t('product.unavailable')}
                            </p>
                        ) : null}
                    </div>
                </div>

                {recommendations.length ? (
                    <section
                        aria-labelledby="product-recommendations"
                        className="border-border mt-14 border-t pt-10"
                    >
                        <h2
                            id="product-recommendations"
                            className="text-2xl font-semibold tracking-tight"
                        >
                            {t('product.recommendations')}
                        </h2>

                        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                            {recommendations.map((item) => (
                                <ShopProductCard key={item.id} product={item} isArabic={isArabic} />
                            ))}
                        </div>
                    </section>
                ) : null}
            </main>

            <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
                <DialogContent
                    showCloseButton={false}
                    className="h-[100dvh] w-screen max-w-none gap-0 rounded-none bg-neutral-950 p-0 text-white ring-0 sm:max-w-none"
                    onKeyDown={(event) => {
                        const isRtl = isArabic;
                        const previousKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
                        const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';

                        if (event.key === previousKey) {
                            event.preventDefault();
                            if (hasPreviousImage) showImageAt(activeImageIndex - 1);
                        } else if (event.key === nextKey) {
                            event.preventDefault();
                            if (hasNextImage) showImageAt(activeImageIndex + 1);
                        }
                    }}
                >
                    <DialogTitle className="sr-only">{productName}</DialogTitle>

                    <div className="relative flex h-full items-center justify-center p-4 sm:p-14">
                        {activeImage ? (
                            <img
                                src={apiAssetUrl(activeImage.image) ?? activeImage.image}
                                alt={productName}
                                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
                            />
                        ) : null}

                        <DialogClose
                            render={
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="absolute end-4 top-4 rounded-full bg-white/10 text-white hover:bg-white/20"
                                    aria-label={t('product.closeFullscreen')}
                                />
                            }
                        >
                            <X className="size-5" aria-hidden="true" />
                        </DialogClose>

                        {images.length > 1 ? (
                            <>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="absolute start-4 top-1/2 size-11 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
                                    aria-label={t('product.previousImage')}
                                    disabled={!hasPreviousImage}
                                    onClick={() => showImageAt(activeImageIndex - 1)}
                                >
                                    <ChevronLeft
                                        className="size-6 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="absolute end-4 top-1/2 size-11 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
                                    aria-label={t('product.nextImage')}
                                    disabled={!hasNextImage}
                                    onClick={() => showImageAt(activeImageIndex + 1)}
                                >
                                    <ChevronRight
                                        className="size-6 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                </Button>

                                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium tabular-nums">
                                    {activeImageIndex + 1} / {images.length}
                                </span>
                            </>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </StoreShell>
    );
}
