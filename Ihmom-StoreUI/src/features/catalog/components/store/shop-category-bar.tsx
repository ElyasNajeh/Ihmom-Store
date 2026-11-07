import { ImageOff, Shapes } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation('catalog', { keyPrefix: 'shop.categories' });

    return (
        <section aria-labelledby="shop-categories-heading" className="mb-7 sm:mb-9">
            <div className="mb-3 flex items-end justify-between gap-3">
                <h2 id="shop-categories-heading" className="text-sm font-semibold tracking-tight">
                    {t('title', { defaultValue: 'Shop by category' })}
                </h2>
            </div>

            <div
                className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:gap-4 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label={t('title', { defaultValue: 'Shop by category' })}
            >
                <button
                    type="button"
                    onClick={() => onSelect(undefined)}
                    aria-pressed={categoryId === undefined}
                    aria-label={t('all', { defaultValue: 'All products' })}
                    className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-2 sm:w-[108px]"
                >
                    <span
                        className={cn(
                            'relative grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border shadow-xs transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-md',
                            categoryId === undefined
                                ? 'border-brand ring-brand/35 ring-2'
                                : 'border-border hover:border-brand/60',
                        )}
                    >
                        <span className="from-brand/75 via-brand/35 to-secondary absolute inset-0 bg-linear-to-br" />
                        <Shapes
                            className="text-brand-foreground/80 relative size-7 drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
                            aria-hidden="true"
                        />
                    </span>
                    <span
                        className={cn(
                            'line-clamp-2 text-center text-xs leading-4 font-medium transition-colors',
                            categoryId === undefined
                                ? 'text-foreground'
                                : 'text-muted-foreground group-hover:text-foreground',
                        )}
                    >
                        {t('all', { defaultValue: 'All products' })}
                    </span>
                </button>

                {isLoading
                    ? Array.from({ length: 5 }).map((_, index) => (
                          <div
                              key={index}
                              className="flex w-[88px] shrink-0 flex-col items-center gap-2 sm:w-[108px]"
                          >
                              <Skeleton className="aspect-square w-full rounded-2xl" />
                              <Skeleton className="h-3 w-14" />
                          </div>
                      ))
                    : categories.map((category) => {
                          const name = categoryName(category, isArabic);
                          const image =
                              category.images.find((picture) => picture.is_primary) ??
                              category.images[0];
                          const active = categoryId === category.id;

                          return (
                              <button
                                  key={category.id}
                                  type="button"
                                  onClick={() => onSelect(category.id)}
                                  aria-pressed={active}
                                  aria-label={t('browse', {
                                      name,
                                      defaultValue: 'Browse {{name}}',
                                  })}
                                  className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-2 sm:w-[108px]"
                              >
                                  <span
                                      className={cn(
                                          'bg-muted relative block aspect-square w-full overflow-hidden rounded-2xl border shadow-xs transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-md',
                                          active
                                              ? 'border-brand ring-brand/35 ring-2'
                                              : 'border-border hover:border-brand/60',
                                      )}
                                  >
                                      {image ? (
                                          <img
                                              src={apiAssetUrl(image.image) ?? image.image}
                                              alt=""
                                              loading="lazy"
                                              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none"
                                          />
                                      ) : (
                                          <span className="text-muted-foreground grid size-full place-items-center">
                                              <ImageOff className="size-6" aria-hidden="true" />
                                          </span>
                                      )}
                                  </span>
                                  <span
                                      className={cn(
                                          'line-clamp-2 text-center text-xs leading-4 font-medium transition-colors',
                                          active
                                              ? 'text-foreground'
                                              : 'text-muted-foreground group-hover:text-foreground',
                                      )}
                                  >
                                      {name}
                                  </span>
                              </button>
                          );
                      })}
            </div>
        </section>
    );
}
