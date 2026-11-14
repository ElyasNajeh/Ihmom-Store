import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ImageOff, Shapes } from 'lucide-react';

import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { apiAssetUrl } from '@/shared/api/axios.ts';
import { cn } from '@/shared/lib/utils.ts';
import type { Category } from '@/features/catalog/types/category.ts';

interface ShopCategoryBarProps {
    categories: Category[];
    categoryId?: number;
    isLoading: boolean;
    isArabic: boolean;
    onSelect: (categoryId: number | undefined) => void;
}

function categoryName(category: Category, isArabic: boolean) {
    return isArabic ? category.name_ar || category.name_en : category.name_en || category.name_ar;
}

export function ShopCategoryBar({
    categories,
    categoryId,
    isLoading,
    isArabic,
    onSelect,
}: ShopCategoryBarProps) {
    const { t } = useTranslation('catalog', {
        keyPrefix: 'shop.categories',
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    const categoryButtonRefs = useRef(new Map<number | 'all', HTMLButtonElement>());

    const title = t('title', {
        defaultValue: 'Shop by category',
    });

    const allLabel = t('all', {
        defaultValue: 'All products',
    });

    const PreviousIcon = isArabic ? ChevronRight : ChevronLeft;
    const NextIcon = isArabic ? ChevronLeft : ChevronRight;

    // Center the selected category whenever the selection or category list changes.
    useEffect(() => {
        const container = scrollRef.current;
        const selectedButton = categoryButtonRefs.current.get(categoryId ?? 'all');

        if (!container || !selectedButton) return;

        const containerRect = container.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();

        const containerCenter = containerRect.left + container.clientWidth / 2;
        const buttonCenter = buttonRect.left + buttonRect.width / 2;

        const offset = buttonCenter - containerCenter;

        container.scrollTo({
            left: container.scrollLeft + offset,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'auto'
                : 'smooth',
        });
    }, [categoryId, categories.length, isLoading]);

    const scrollCategories = (direction: 'previous' | 'next') => {
        const container = scrollRef.current;

        if (!container) return;

        const directionMultiplier = isArabic ? -1 : 1;
        const movement = direction === 'next' ? 1 : -1;

        container.scrollBy({
            left: container.clientWidth * 0.65 * movement * directionMultiplier,
            behavior: 'smooth',
        });
    };

    const getCategoryButtonClass = (active: boolean) =>
        cn(
            'group flex w-[88px] shrink-0 snap-center flex-col items-center gap-2',
            'origin-center transition-transform duration-300 ease-out',
            'motion-reduce:transition-none',
            active ? 'scale-110' : 'scale-90',
        );

    const getCategoryImageClass = (active: boolean) =>
        cn(
            'relative block aspect-square w-full overflow-hidden rounded-2xl border',
            'transition-[border-color,box-shadow] duration-300 ease-out',
            active
                ? 'border-brand ring-brand/50 shadow-md ring-2'
                : 'border-border shadow-xs group-hover:border-brand/60',
            'group-focus-visible:ring-ring group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:outline-none',
        );

    const getCategoryLabelClass = (active: boolean) =>
        cn(
            'line-clamp-2 w-full text-center text-xs leading-4 font-medium',
            'transition-colors duration-200',
            active
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground group-hover:text-foreground',
        );

    return (
        <section aria-labelledby="shop-categories-heading" className="mb-7 sm:mb-9">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="shop-categories-heading" className="text-sm font-semibold tracking-tight">
                    {title}
                </h2>

                <div className="hidden items-center gap-1 sm:flex">
                    <button
                        type="button"
                        onClick={() => scrollCategories('previous')}
                        aria-label={t('previous', {
                            defaultValue: 'Previous categories',
                        })}
                        className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-8 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        <PreviousIcon className="size-4" aria-hidden="true" />
                    </button>

                    <button
                        type="button"
                        onClick={() => scrollCategories('next')}
                        aria-label={t('next', {
                            defaultValue: 'Next categories',
                        })}
                        className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-8 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        <NextIcon className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollRef}
                    role="group"
                    aria-label={title}
                    className={cn(
                        'flex snap-x snap-mandatory items-start gap-3 overflow-x-auto',
                        'overscroll-x-contain py-3',
                        'px-[calc(50%_-_44px)]',
                        '[scrollbar-width:none] scroll-smooth [&::-webkit-scrollbar]:hidden',
                        'motion-reduce:scroll-auto',
                        'sm:gap-4 sm:px-[calc(50%_-_52px)]',
                    )}
                >
                    {/* All categories */}
                    <button
                        ref={(node) => {
                            if (node) {
                                categoryButtonRefs.current.set('all', node);
                            } else {
                                categoryButtonRefs.current.delete('all');
                            }
                        }}
                        type="button"
                        onClick={() => onSelect(undefined)}
                        aria-pressed={categoryId === undefined}
                        className={getCategoryButtonClass(categoryId === undefined)}
                    >
                        <span
                            className={cn(
                                getCategoryImageClass(categoryId === undefined),
                                'grid place-items-center',
                            )}
                        >
                            <span className="from-brand/75 via-brand/35 to-secondary absolute inset-0 bg-linear-to-br" />

                            <Shapes
                                className="text-brand-foreground/80 relative size-7 transition-transform duration-300 group-hover:scale-110"
                                aria-hidden="true"
                            />
                        </span>

                        <span className={getCategoryLabelClass(categoryId === undefined)}>
                            {allLabel}
                        </span>
                    </button>

                    {/* Loading skeletons */}
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, index) => (
                              <div
                                  key={index}
                                  className="flex w-[88px] shrink-0 snap-center flex-col items-center gap-2"
                              >
                                  <Skeleton className="aspect-square w-full rounded-2xl" />
                                  <Skeleton className="h-3 w-14" />
                                  <Skeleton className="h-3 w-10" />
                              </div>
                          ))
                        : categories.map((category) => {
                              const name = categoryName(category, isArabic);
                              const image = category.image;
                              const active = categoryId === category.id;

                              return (
                                  <button
                                      key={category.id}
                                      ref={(node) => {
                                          if (node) {
                                              categoryButtonRefs.current.set(category.id, node);
                                          } else {
                                              categoryButtonRefs.current.delete(category.id);
                                          }
                                      }}
                                      type="button"
                                      onClick={() => onSelect(category.id)}
                                      aria-pressed={active}
                                      aria-label={t('browse', {
                                          name,
                                          defaultValue: 'Browse {{name}}',
                                      })}
                                      className={getCategoryButtonClass(active)}
                                  >
                                      <span className={getCategoryImageClass(active)}>
                                          {image ? (
                                              <img
                                                  src={apiAssetUrl(image) ?? image}
                                                  alt=""
                                                  loading="lazy"
                                                  className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transform-none"
                                              />
                                          ) : (
                                              <span className="text-muted-foreground grid size-full place-items-center">
                                                  <ImageOff className="size-6" aria-hidden="true" />
                                              </span>
                                          )}
                                      </span>

                                      <span className={getCategoryLabelClass(active)}>{name}</span>
                                  </button>
                              );
                          })}
                </div>
            </div>
        </section>
    );
}
