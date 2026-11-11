import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import '@/i18n';
import { AppErrorBoundary } from '@/shared/components/app/app-error-boundary';

afterEach(cleanup);
test('an error outside the router renders recovery actions without exposing the exception', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): never {
        throw new Error('secret-internal-exception');
    }
    render(
        <AppErrorBoundary>
            <Broken />
        </AppErrorBoundary>,
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe('/');
    expect(screen.getByRole('button')).toBeTruthy();
    expect(screen.queryByText('secret-internal-exception')).toBeNull();
});
