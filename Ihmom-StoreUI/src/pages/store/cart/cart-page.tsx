import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ImageOff, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { ConfirmDialog } from '@/components/admin/confirm-dialog.tsx';
import { StoreShell } from '@/components/store/layout/store-shell.tsx';
import { useCart } from '@/cart/cart-context.ts';
import { MAX_CART_QUANTITY } from '@/constants/cart.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import { apiAssetUrl } from '@/services/axios.ts';
import { formatOrderMoney } from '@/utils/order-format.ts';
import { localizedText } from '@/utils/localized.ts';
import { DEFAULT_VARIANT_NAME } from '@/utils/product-variant.ts';

export default function CartPage() {
    const { t } = useTranslation(['orders', 'common']);
    const { items, itemCount, subtotal, removeItem, setQuantity, clearCart } = useCart();
    const [clearOpen, setClearOpen] = useState(false);

    const { isArabic, locale } = useLocale();

    const nameFor = (nameAr: string, nameEn: string) => localizedText(nameEn, nameAr, isArabic);

    const variantFor = (nameAr: string | null, nameEn: string | null) => {
        const label = localizedText(nameEn, nameAr, isArabic);

        if (!label) return null;

        return label === DEFAULT_VARIANT_NAME ? t('cart.defaultVariant') : label;
    };

    return (
        <>
            <StoreShell>
                <main className="mx-auto w-full max-w-6xl px-4 pt-7 pb-12 sm:px-6 sm:pt-10 lg:px-8">
                    <header className="mb-7 space-y-2 sm:mb-9">
                        <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                            {t('cart.meta.eyebrow')}
                        </p>
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                                    {t('cart.meta.title')}
                                </h1>
                                <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
                                    {t('cart.meta.description')}
                                </p>
                            </div>
                            {items.length > 0 ? (
                                <p className="text-muted-foreground text-sm" aria-live="polite">
                                    {t('cart.itemCount', { count: itemCount })}
                                </p>
                            ) : null}
                        </div>
                    </header>

                    {items.length === 0 ? (
                        <div className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
                            <span className="bg-muted text-muted-foreground grid size-14 place-items-center rounded-full">
                                <ShoppingBag className="size-6" aria-hidden="true" />
                            </span>
                            <h2 className="mt-4 text-xl font-semibold">{t('cart.emptyTitle')}</h2>
                            <p className="text-muted-foreground mt-2 max-w-md text-sm">
                                {t('cart.emptyDescription')}
                            </p>
                            <Button asChild className="mt-6">
                                <Link to="/shop">{t('cart.continueShopping')}</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
                            <section aria-labelledby="cart-items-heading">
                                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                                    <div>
                                        <h2
                                            id="cart-items-heading"
                                            className="text-xl font-semibold tracking-tight"
                                        >
                                            {t('cart.itemsHeading')}
                                        </h2>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            {t('cart.itemsDescription')}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive gap-1.5"
                                        onClick={() => setClearOpen(true)}
                                    >
                                        <Trash2 className="size-3.5" aria-hidden="true" />
                                        {t('cart.clear')}
                                    </Button>
                                </div>

                                <ul className="border-border bg-card divide-border divide-y overflow-hidden rounded-2xl border">
                                    {items.map((item) => {
                                        const name = nameFor(item.nameAr, item.nameEn);
                                        const variant = variantFor(
                                            item.variantNameAr,
                                            item.variantNameEn,
                                        );
                                        const image = item.image ? apiAssetUrl(item.image) : null;
                                        const lineTotal = Number(item.price) * item.quantity;

                                        return (
                                            <li
                                                key={item.variantId}
                                                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5"
                                            >
                                                <Link
                                                    to={`/shop/${item.productId}`}
                                                    className="bg-muted focus-visible:ring-ring block size-20 shrink-0 overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                                                    aria-label={name}
                                                >
                                                    {image ? (
                                                        <img
                                                            src={image}
                                                            alt=""
                                                            loading="lazy"
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-muted-foreground grid size-full place-items-center">
                                                            <ImageOff
                                                                className="size-5"
                                                                aria-hidden="true"
                                                            />
                                                        </span>
                                                    )}
                                                </Link>

                                                <div className="min-w-0 flex-1">
                                                    <Link
                                                        to={`/shop/${item.productId}`}
                                                        className="hover:text-primary line-clamp-2 font-semibold transition-colors"
                                                    >
                                                        {name}
                                                    </Link>
                                                    {variant ? (
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            {variant}
                                                        </p>
                                                    ) : null}
                                                    <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                                                        {formatOrderMoney(item.price, locale)}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between gap-4 sm:justify-end">
                                                    <div
                                                        className="border-border inline-flex items-center rounded-xl border"
                                                        role="group"
                                                        aria-label={t('cart.quantity')}
                                                    >
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={t('cart.decrease', {
                                                                name,
                                                            })}
                                                            disabled={item.quantity <= 1}
                                                            onClick={() =>
                                                                setQuantity(
                                                                    item.variantId,
                                                                    item.quantity - 1,
                                                                )
                                                            }
                                                        >
                                                            <Minus
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                        </Button>
                                                        <span
                                                            className="min-w-9 text-center text-sm font-semibold tabular-nums"
                                                            aria-live="polite"
                                                        >
                                                            {item.quantity}
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={t('cart.increase', {
                                                                name,
                                                            })}
                                                            disabled={
                                                                item.quantity >= MAX_CART_QUANTITY
                                                            }
                                                            onClick={() =>
                                                                setQuantity(
                                                                    item.variantId,
                                                                    item.quantity + 1,
                                                                )
                                                            }
                                                        >
                                                            <Plus
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                        </Button>
                                                    </div>

                                                    <p className="min-w-24 text-end font-semibold tabular-nums">
                                                        {formatOrderMoney(lineTotal, locale)}
                                                    </p>

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive"
                                                        aria-label={t('cart.removeNamed', { name })}
                                                        onClick={() => removeItem(item.variantId)}
                                                    >
                                                        <Trash2
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                    </Button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>

                                <Button variant="link" className="mt-4 px-0" asChild>
                                    <Link to="/shop">
                                        <ArrowLeft
                                            className="size-4 rtl:rotate-180"
                                            aria-hidden="true"
                                        />
                                        {t('cart.continueShopping')}
                                    </Link>
                                </Button>
                            </section>

                            <aside className="lg:sticky lg:top-24">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('cart.subtotal')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="text-muted-foreground text-sm">
                                                {t('cart.itemCount', { count: itemCount })}
                                            </span>
                                            <span className="text-xl font-semibold tabular-nums">
                                                {formatOrderMoney(subtotal, locale)}
                                            </span>
                                        </div>

                                        <p className="text-muted-foreground text-xs">
                                            {t('cart.deliveryNote')}
                                        </p>

                                        <Button className="min-h-11 w-full" size="lg" asChild>
                                            <Link to="/checkout">{t('cart.checkout')}</Link>
                                        </Button>

                                        <Button variant="outline" className="w-full" asChild>
                                            <Link to="/shop">{t('cart.continueShopping')}</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </aside>
                        </div>
                    )}
                </main>
            </StoreShell>

            <ConfirmDialog
                open={clearOpen}
                onOpenChange={setClearOpen}
                title={t('cart.clearTitle')}
                description={t('cart.clearDescription')}
                confirmLabel={t('cart.clear')}
                cancelLabel={t('cart.cancel')}
                onConfirm={() => {
                    clearCart();
                    setClearOpen(false);
                }}
            />
        </>
    );
}
