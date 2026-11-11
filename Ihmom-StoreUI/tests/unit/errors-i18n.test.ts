import { expect, test, vi } from 'vitest';
import i18n from '@/i18n';
import { getApiErrorMessage } from '@/shared/utils/api-error';
import { applyApiErrors } from '@/shared/utils/form-errors';

test.each([400, 401, 403, 404, 409, 413, 422, 429, 500, 502, 503, 504])(
    'HTTP %s errors are translated and never expose backend internals',
    async (status) => {
        const error = {
            isAxiosError: true,
            response: { status, data: { detail: 'SQL traceback secret-password' } },
        };
        await i18n.changeLanguage('en');
        const english = getApiErrorMessage(error);
        await i18n.changeLanguage('ar');
        const arabic = getApiErrorMessage(error);
        expect(english).toBeTruthy();
        expect(arabic).toBeTruthy();
        expect(arabic).not.toBe(english);
        expect(arabic).not.toContain('secret-password');
        expect(document.documentElement.dir).toBe('rtl');
        await i18n.changeLanguage('en');
        expect(document.documentElement.dir).toBe('ltr');
    },
);
test('network error is recoverable and backend 422 maps only known body fields', () => {
    expect(getApiErrorMessage({ isAxiosError: true })).toContain('connect');
    const setError = vi.fn();
    applyApiErrors(
        {
            isAxiosError: true,
            response: {
                status: 422,
                data: {
                    detail: [
                        { loc: ['body', 'customer_phone'], msg: 'raw' },
                        { loc: ['header', 'secret'] },
                    ],
                },
            },
        },
        setError,
        { customer_phone: 'Translated phone error' },
    );
    expect(setError).toHaveBeenCalledExactlyOnceWith('customer_phone', {
        type: 'server',
        message: 'Translated phone error',
    });
});
