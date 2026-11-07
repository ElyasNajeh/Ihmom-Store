// Order amounts arrive as decimal strings and are charged in Israeli shekels.
const CURRENCY = 'ILS';

export function formatOrderMoney(value: string | number, locale: string): string {
    const amount = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(amount)) {
        return String(value);
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

export function formatNumber(value: number, locale: string): string {
    return new Intl.NumberFormat(locale).format(value);
}

function formatDecimal(
    value: string | number,
    locale: string,
    minimumFractionDigits: number,
    maximumFractionDigits: number,
): string {
    const amount = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(amount)) {
        return String(value);
    }

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(amount);
}

export function formatPrice(value: string | number, locale: string): string {
    return formatDecimal(value, locale, 0, 2);
}

export function formatAmount(value: string | number, locale: string): string {
    return formatDecimal(value, locale, 2, 2);
}

export function formatOrderDate(value: string, locale: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}
