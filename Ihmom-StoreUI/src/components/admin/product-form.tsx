import { useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx';
import { SearchableSelect } from '@/components/ui/searchable-select.tsx';
import { ActiveBadge } from '@/components/admin/status-badges.tsx';
import { ProductVariantDialog } from '@/components/admin/product-variant-dialog.tsx';
import type {
    CategorySummary,
    BrandSummary,
    CreateProduct,
    CreateProductVariant,
    Product,
    UpdateProduct,
} from '@/models/product.ts';
import { createProductSchema, updateProductSchema } from '@/schemas/products.ts';
import { applyZodErrors } from '@/utils/form-errors.ts';
import { localizedName, orderBilingualFields } from '@/utils/localized.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import type { UseFormSetError } from 'react-hook-form';

export interface ProductDetailsFormValues {
    category_id: string;
    brand_id: string;
    name_ar: string;
    name_en: string;
    description_ar: string;
    description_en: string;
    is_active: boolean;
}

const detailsSchema = z.object({
    category_id: z.string().min(1, { error: 'required' }),
    brand_id: z.string().min(1, { error: 'required' }),
    name_ar: z.string().trim().min(1, { error: 'required' }).max(200, { error: 'max' }),
    name_en: z.string().trim().min(1, { error: 'required' }).max(200, { error: 'max' }),
    description_ar: z.string(),
    description_en: z.string(),
    is_active: z.boolean(),
});

const priceInputSchema = z
    .string()
    .trim()
    .min(1, { error: 'required' })
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), { error: 'amount' })
    .refine((value) => Number(value) < 100000000, { error: 'max' });

const EMPTY_DETAILS: ProductDetailsFormValues = {
    category_id: '',
    brand_id: '',
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    is_active: true,
};

type Translate = ReturnType<typeof useTranslation>['t'];

function detailMessage(field: keyof ProductDetailsFormValues, message: string, t: Translate) {
    if (message === 'max') {
        return t('validation.maxLength', { max: 200 });
    }

    if (field === 'category_id') {
        return t('products.selectCategory');
    }

    if (field === 'brand_id') {
        return t('products.selectBrand');
    }

    return t('validation.required');
}

function priceMessage(message: string, t: Translate) {
    if (message === 'max') return t('validation.maxAmount');
    if (message === 'amount') return t('validation.amount');

    return t('validation.required');
}

function ProductDetailsFields({
    form,
    categories,
    brands,
}: {
    form: UseFormReturn<ProductDetailsFormValues>;
    categories: CategorySummary[];
    brands: BrandSummary[];
}) {
    const { t } = useTranslation('admin');
    const { isArabic } = useLocale();
    const {
        register,
        setValue,
        watch,
        formState: { errors },
    } = form;

    const categoryId = watch('category_id');
    const brandId = watch('brand_id');
    const isActive = watch('is_active');

    const categoryItems = categories.map((category) => {
        const nameAr = category.name_ar || category.name_en;
        const nameEn = category.name_en || category.name_ar;

        return {
            value: String(category.id),
            label: localizedName(category, isArabic),
            keywords: `${nameAr} ${nameEn}`,
        };
    });

    const brandItems = brands.map((brand) => {
        const nameAr = brand.name_ar || brand.name_en;
        const nameEn = brand.name_en || brand.name_ar;

        return {
            value: String(brand.id),
            label: localizedName(brand, isArabic),
            keywords: `${nameAr} ${nameEn}`,
        };
    });

    const nameFields = [
        {
            field: 'name_ar' as const,
            id: 'product-name-ar',
            label: t('fields.nameAr'),
            dir: undefined,
        },
        {
            field: 'name_en' as const,
            id: 'product-name-en',
            label: t('fields.nameEn'),
            dir: 'ltr' as const,
        },
    ];

    const descriptionFields = [
        {
            field: 'description_ar' as const,
            id: 'product-description-ar',
            label: t('fields.descriptionAr'),
            dir: undefined,
        },
        {
            field: 'description_en' as const,
            id: 'product-description-en',
            label: t('fields.descriptionEn'),
            dir: 'ltr' as const,
        },
    ];

    const orderedNameFields = orderBilingualFields(nameFields, isArabic);
    const orderedDescriptionFields = orderBilingualFields(descriptionFields, isArabic);

    const errorFor = (field: keyof ProductDetailsFormValues) => {
        const error = errors[field];

        return typeof error?.message === 'string' ? error.message : undefined;
    };

    const renderError = (field: keyof ProductDetailsFormValues) => {
        const message = errorFor(field);

        if (!message) return null;

        return (
            <p id={`product-${field}-error`} role="alert" className="text-destructive text-xs">
                {message}
            </p>
        );
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="product-category">{t('fields.category')}</Label>
                    <SearchableSelect
                        id="product-category"
                        options={categoryItems}
                        value={categoryId || null}
                        onChange={(value) => {
                            if (value) {
                                setValue('category_id', value, { shouldValidate: true });
                            }
                        }}
                        placeholder={t('products.selectCategory')}
                        searchPlaceholder={t('products.searchCategories')}
                        emptyMessage={t('products.noCategoriesFound')}
                        openLabel={t('fields.category')}
                        clearable={false}
                        invalid={Boolean(errorFor('category_id'))}
                        aria-describedby={
                            errorFor('category_id') ? 'product-category_id-error' : undefined
                        }
                    />
                    {renderError('category_id')}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="product-brand">{t('fields.brand')}</Label>
                    <SearchableSelect
                        id="product-brand"
                        options={brandItems}
                        value={brandId || null}
                        onChange={(value) => {
                            if (value) {
                                setValue('brand_id', value, { shouldValidate: true });
                            }
                        }}
                        placeholder={t('products.selectBrand')}
                        searchPlaceholder={t('products.searchBrands')}
                        emptyMessage={t('products.noBrandsFound')}
                        openLabel={t('fields.brand')}
                        clearable={false}
                        invalid={Boolean(errorFor('brand_id'))}
                        aria-describedby={
                            errorFor('brand_id') ? 'product-brand_id-error' : undefined
                        }
                    />
                    {renderError('brand_id')}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {orderedNameFields.map((entry) => (
                    <div key={entry.field} className="space-y-1.5">
                        <Label htmlFor={entry.id}>{entry.label}</Label>
                        <Input
                            id={entry.id}
                            dir={entry.dir}
                            {...register(entry.field)}
                            aria-invalid={errorFor(entry.field) ? true : undefined}
                            aria-describedby={
                                errorFor(entry.field) ? `product-${entry.field}-error` : undefined
                            }
                        />
                        {renderError(entry.field)}
                    </div>
                ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {orderedDescriptionFields.map((entry) => (
                    <div key={entry.field} className="space-y-1.5">
                        <Label htmlFor={entry.id}>{entry.label}</Label>
                        <Textarea
                            id={entry.id}
                            dir={entry.dir}
                            rows={3}
                            {...register(entry.field)}
                        />
                    </div>
                ))}
            </div>

            <div className="border-border flex items-center justify-between rounded-lg border px-3 py-2.5">
                <Label htmlFor="product-active" className="cursor-pointer">
                    {t('fields.isActive')}
                </Label>
                <Switch
                    id="product-active"
                    checked={isActive}
                    onCheckedChange={(checked) =>
                        setValue('is_active', checked, { shouldValidate: true })
                    }
                />
            </div>
        </div>
    );
}

interface ProductCreateFormProps {
    categories: CategorySummary[];
    brands: BrandSummary[];
    isSubmitting: boolean;
    onSubmit: (data: CreateProduct) => Promise<void>;
}

export function ProductCreateForm({
    categories,
    brands,
    isSubmitting,
    onSubmit,
}: ProductCreateFormProps) {
    const { t } = useTranslation('admin');
    const { isArabic } = useLocale();
    const form = useForm<ProductDetailsFormValues>({ defaultValues: EMPTY_DETAILS });
    const { handleSubmit, setError } = form;

    const [mode, setMode] = useState<'simple' | 'variant'>('simple');
    const [variants, setVariants] = useState<CreateProductVariant[]>([]);
    const [variantsError, setVariantsError] = useState<string | null>(null);
    const [variantDialogOpen, setVariantDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [price, setPrice] = useState('');
    const [sku, setSku] = useState('');
    const [priceError, setPriceError] = useState<string | null>(null);

    const handleVariantSubmit = async (values: CreateProductVariant) => {
        setVariantsError(null);

        if (editingIndex === null) {
            setVariants((current) => [...current, values]);
        } else {
            setVariants((current) =>
                current.map((variant, index) => (index === editingIndex ? values : variant)),
            );
        }

        setVariantDialogOpen(false);
        setEditingIndex(null);
    };

    const submit = handleSubmit(async (values) => {
        if (isSubmitting) return;

        setVariantsError(null);

        const parsedDetails = detailsSchema.safeParse(values);

        if (!parsedDetails.success) {
            const messages = Object.fromEntries(
                (Object.keys(detailsSchema.shape) as (keyof ProductDetailsFormValues)[]).map(
                    (field) => {
                        const issue = parsedDetails.error.issues.find(
                            (entry) => entry.path[0] === field,
                        );

                        return [
                            field,
                            issue
                                ? detailMessage(field, issue.message, t)
                                : t('validation.invalidField'),
                        ];
                    },
                ),
            ) as Partial<Record<keyof ProductDetailsFormValues, string>>;

            applyZodErrors(
                parsedDetails.error,
                setError as UseFormSetError<ProductDetailsFormValues>,
                messages,
            );

            return;
        }

        const base = {
            category_id: Number(values.category_id),
            brand_id: Number(values.brand_id),
            name_ar: values.name_ar.trim(),
            name_en: values.name_en.trim(),
            description_ar: values.description_ar.trim() || null,
            description_en: values.description_en.trim() || null,
            is_active: values.is_active,
        };

        setPriceError(null);

        if (mode === 'variant' && variants.length === 0) {
            setVariantsError(t('products.variantsRequired'));
            return;
        }

        if (mode === 'simple') {
            const parsedPrice = priceInputSchema.safeParse(price);

            if (!parsedPrice.success) {
                setPriceError(priceMessage(parsedPrice.error.issues[0]?.message ?? '', t));

                return;
            }
        }

        const candidate =
            mode === 'simple'
                ? {
                      ...base,
                      price: Number(price),
                      sku: sku.trim() || null,
                  }
                : {
                      ...base,
                      variants,
                  };

        const parsed = createProductSchema.safeParse(candidate);

        if (!parsed.success) {
            const variantIssue = parsed.error.issues.find((issue) => issue.path[0] === 'variants');
            const priceIssue = parsed.error.issues.find((issue) => issue.path[0] === 'price');

            if (variantIssue) {
                setVariantsError(
                    variantIssue.message.includes('active')
                        ? t('products.activeWarning')
                        : t('products.variantsRequired'),
                );
            }

            if (priceIssue) {
                setPriceError(priceMessage(priceIssue.message, t));
            }

            if (!variantIssue && !priceIssue) {
                setVariantsError(t('validation.invalidField'));
            }

            return;
        }

        try {
            await onSubmit(parsed.data);
        } catch {
            // The parent mutation reports server errors through a toast.
        }
    });

    return (
        <div className="space-y-4">
            <form onSubmit={submit} noValidate className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('products.basicInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProductDetailsFields form={form} categories={categories} brands={brands} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('products.priceMode')}</CardTitle>
                        <CardDescription>
                            {mode === 'simple'
                                ? t('products.simplePriceHint')
                                : t('products.variableHint')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label={t('products.priceMode')}
                        >
                            <Button
                                type="button"
                                variant={mode === 'simple' ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={mode === 'simple'}
                                onClick={() => setMode('simple')}
                            >
                                {t('products.simpleProduct')}
                            </Button>
                            <Button
                                type="button"
                                variant={mode === 'variant' ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={mode === 'variant'}
                                onClick={() => setMode('variant')}
                            >
                                {t('products.variableProduct')}
                            </Button>
                        </div>

                        {mode === 'simple' ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="product-price">{t('fields.price')}</Label>
                                    <Input
                                        id="product-price"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={price}
                                        onChange={(event) => {
                                            setPrice(event.target.value);
                                            setPriceError(null);
                                        }}
                                        aria-invalid={priceError ? true : undefined}
                                        aria-describedby={
                                            priceError ? 'product-price-error' : undefined
                                        }
                                    />
                                    {priceError ? (
                                        <p
                                            id="product-price-error"
                                            role="alert"
                                            className="text-destructive text-xs"
                                        >
                                            {priceError}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="product-sku">{t('fields.sku')}</Label>
                                    <Input
                                        id="product-sku"
                                        dir="ltr"
                                        value={sku}
                                        onChange={(event) => setSku(event.target.value)}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        {t('products.skuHint')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {variants.length ? (
                                    <ul className="space-y-2">
                                        {variants.map((variant, index) => (
                                            <li
                                                key={`${variant.name_en}-${index}`}
                                                className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">
                                                        {localizedName(variant, isArabic)}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs tabular-nums">
                                                        {variant.price.toFixed(2)}
                                                        {variant.sku ? ` · ${variant.sku}` : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <ActiveBadge isActive={variant.is_active} />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        aria-label={`${t('common.edit')} ${localizedName(
                                                            variant,
                                                            isArabic,
                                                        )}`}
                                                        onClick={() => {
                                                            setEditingIndex(index);
                                                            setVariantDialogOpen(true);
                                                        }}
                                                    >
                                                        <Pencil aria-hidden="true" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="text-destructive hover:text-destructive"
                                                        aria-label={`${t('common.delete')} ${localizedName(
                                                            variant,
                                                            isArabic,
                                                        )}`}
                                                        onClick={() =>
                                                            setVariants((current) =>
                                                                current.filter(
                                                                    (_, position) =>
                                                                        position !== index,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        <Trash2 aria-hidden="true" />
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        {t('products.variantEmptyDescription')}
                                    </p>
                                )}

                                {variantsError ? (
                                    <p role="alert" className="text-destructive text-xs">
                                        {variantsError}
                                    </p>
                                ) : null}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setEditingIndex(null);
                                        setVariantDialogOpen(true);
                                    }}
                                >
                                    <Plus aria-hidden="true" />
                                    {t('products.addVariant')}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner aria-hidden="true" /> : null}
                        {t('common.create')}
                    </Button>
                </div>
            </form>

            <p className="text-muted-foreground text-xs">{t('products.imagesAfterCreate')}</p>

            <ProductVariantDialog
                open={variantDialogOpen}
                onOpenChange={(open) => {
                    setVariantDialogOpen(open);

                    if (!open) setEditingIndex(null);
                }}
                title={t('products.variantDialogTitle')}
                editing={
                    editingIndex !== null && variants[editingIndex] ? variants[editingIndex] : null
                }
                onSubmit={handleVariantSubmit}
            />
        </div>
    );
}

interface ProductEditFormProps {
    product: Product;
    categories: CategorySummary[];
    brands: BrandSummary[];
    isSubmitting: boolean;
    onSubmit: (data: UpdateProduct) => Promise<void>;
}

function toDetailsValues(product: Product): ProductDetailsFormValues {
    return {
        category_id: String(product.category_id),
        brand_id: String(product.brand_id),
        name_ar: product.name_ar,
        name_en: product.name_en,
        description_ar: product.description_ar ?? '',
        description_en: product.description_en ?? '',
        is_active: product.is_active,
    };
}

export function ProductEditForm({
    product,
    categories,
    brands,
    isSubmitting,
    onSubmit,
}: ProductEditFormProps) {
    const { t } = useTranslation('admin');
    const form = useForm<ProductDetailsFormValues>({
        defaultValues: toDetailsValues(product),
    });
    const { handleSubmit, reset, setError } = form;

    useEffect(() => {
        reset(toDetailsValues(product));
    }, [product, reset]);

    const submit = handleSubmit(async (values) => {
        if (isSubmitting) return;

        const parsedDetails = detailsSchema.safeParse(values);

        if (!parsedDetails.success) {
            const messages = Object.fromEntries(
                (Object.keys(detailsSchema.shape) as (keyof ProductDetailsFormValues)[]).map(
                    (field) => {
                        const issue = parsedDetails.error.issues.find(
                            (entry) => entry.path[0] === field,
                        );

                        return [
                            field,
                            issue
                                ? detailMessage(field, issue.message, t)
                                : t('validation.invalidField'),
                        ];
                    },
                ),
            ) as Partial<Record<keyof ProductDetailsFormValues, string>>;

            applyZodErrors(
                parsedDetails.error,
                setError as UseFormSetError<ProductDetailsFormValues>,
                messages,
            );

            return;
        }

        const parsed = updateProductSchema.safeParse({
            category_id: Number(values.category_id),
            brand_id: Number(values.brand_id),
            name_ar: values.name_ar.trim(),
            name_en: values.name_en.trim(),
            description_ar: values.description_ar.trim() || null,
            description_en: values.description_en.trim() || null,
            is_active: values.is_active,
        });

        if (!parsed.success) {
            setError('name_ar', {
                type: 'validation',
                message: t('validation.invalidField'),
            });

            return;
        }

        try {
            await onSubmit(parsed.data);
        } catch {
            // The parent mutation reports server errors through a toast.
        }
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('products.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} noValidate className="space-y-4">
                    <ProductDetailsFields form={form} categories={categories} brands={brands} />

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner aria-hidden="true" /> : null}
                            {t('products.saveDetails')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
