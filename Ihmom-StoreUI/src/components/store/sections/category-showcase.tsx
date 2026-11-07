import { ArrowUpRight, ImageOff, Shapes } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Category } from '@/models/category';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageWithFade } from '@/components/ui/image-with-fade';
import { GridView } from '@/components/data/views/grid-view.tsx';
import { SectionHeader } from '@/components/store/sections/section-header.tsx';
import { useLocale } from '@/hooks/use-locale.ts';
import { apiAssetUrl } from '@/services/axios';
import { localizedName } from '@/utils/localized.ts';

interface CategoryShowcaseProps {
    categories: Category[];
    isLoading: boolean;
    isError: boolean;
}

export function CategoryShowcase({ categories, isLoading, isError }: CategoryShowcaseProps) {
    const { t } = useTranslation('shop-catalog-additions');
    const { isArabic } = useLocale();

    const loadingState = (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
                <Card key={index} className="overflow-hidden rounded-2xl py-0 shadow-none">
                    <Skeleton className="aspect-[16/10] w-full rounded-none" />
                    <CardContent className="space-y-3 p-5">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    const errorState = (
        <p
            className="border-border bg-card text-muted-foreground mt-8 rounded-2xl border p-6 text-sm"
            role="status"
        >
            {t('categoryShowcase.error')}
        </p>
    );

    const emptyState = (
        <div className="border-border mt-8 rounded-2xl border border-dashed p-8 text-center">
            <Shapes className="text-muted-foreground mx-auto size-8" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">{t('categoryShowcase.emptyTitle')}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
                {t('categoryShowcase.emptyDescription')}
            </p>
        </div>
    );

    return (
        <section className="border-border bg-secondary/45 border-y">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <SectionHeader
                    eyebrow={t('categoryShowcase.eyebrow')}
                    title={t('categoryShowcase.title')}
                    description={t('categoryShowcase.description')}
                    action={
                        <Button
                            variant="outline"
                            asChild
                            className="min-h-11 self-start sm:self-auto"
                        >
                            <Link to="/shop">
                                {t('categoryShowcase.viewAll')}
                                <ArrowUpRight className="ms-2 size-4" aria-hidden="true" />
                            </Link>
                        </Button>
                    }
                />

                <GridView<Category>
                    items={categories}
                    keyExtractor={(category) => category.id}
                    renderItem={(category, index) => {
                        const categoryName = localizedName(category, isArabic);
                        const image =
                            category.images.find((picture) => picture.is_primary) ??
                            category.images[0];

                        return (
                            <Link
                                to={`/shop?category=${category.id}`}
                                aria-label={t('categoryShowcase.browseCategory', {
                                    name: categoryName,
                                })}
                                className="group focus-visible:ring-ring block h-full rounded-2xl focus-visible:ring-2 focus-visible:outline-none"
                            >
                                <Card className="border-border/80 group-hover:border-brand/60 h-full gap-0 overflow-hidden rounded-2xl py-0 shadow-none transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-black/[0.04]">
                                    <div className="bg-secondary relative aspect-[16/10] overflow-hidden">
                                        {image ? (
                                            <ImageWithFade
                                                src={apiAssetUrl(image.image) ?? image.image}
                                                alt=""
                                                loading="lazy"
                                                className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none"
                                            />
                                        ) : (
                                            <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
                                                <ImageOff className="size-7" aria-hidden="true" />
                                                <span className="text-xs">
                                                    {t('categoryShowcase.noImage')}
                                                </span>
                                            </div>
                                        )}

                                        <div
                                            aria-hidden="true"
                                            className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent"
                                        />

                                        <span className="bg-background/85 text-foreground absolute end-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums backdrop-blur">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>

                                    <CardContent className="flex flex-1 flex-col p-5">
                                        <h3 className="font-semibold tracking-tight">
                                            {categoryName}
                                        </h3>

                                        <p className="text-muted-foreground mt-2 text-sm leading-6">
                                            {t('categoryShowcase.categoryDescription')}
                                        </p>

                                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                                            {t('categoryShowcase.exploreCategory')}
                                            <ArrowUpRight
                                                className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    }}
                    className="mt-8"
                    gridClassName="gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
                    isLoading={isLoading}
                    isError={isError}
                    loadingState={loadingState}
                    errorState={errorState}
                    emptyState={emptyState}
                />
            </div>
        </section>
    );
}
