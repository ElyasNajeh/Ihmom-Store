import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import '@/i18n';
import {
    SearchableSelect,
    type SearchableSelectOption,
} from '@/shared/components/ui/searchable-select.tsx';

const options: SearchableSelectOption[] = [
    { value: '1', label: 'Hookahs', keywords: 'شيشة Hookahs' },
    { value: '2', label: 'Mouse Pads', keywords: 'لوحة ماوس Mouse Pads' },
    { value: '3', label: 'Keyboards', keywords: 'لوحة مفاتيح Keyboards', meta: '12 items' },
];

function ControlledSelect({
    initialValue = null,
    items = options,
    clearable = true,
    onChangeSpy,
}: {
    initialValue?: string | null;
    items?: SearchableSelectOption[];
    clearable?: boolean;
    onChangeSpy?: (value: string | undefined) => void;
}) {
    const [value, setValue] = useState<string | null>(initialValue);

    return (
        <SearchableSelect
            id="test-select"
            options={items}
            value={value}
            clearable={clearable}
            placeholder="Select category"
            searchPlaceholder="Search categories"
            emptyMessage="No categories found"
            onChange={(next) => {
                setValue(next ?? null);
                onChangeSpy?.(next);
            }}
        />
    );
}

afterEach(cleanup);

test('selecting an option immediately displays its label and retains it after popup closes', async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledSelect onChangeSpy={onChangeSpy} />);

    const input = screen.getByRole('combobox', { name: 'Select category' }) as HTMLInputElement;
    expect(input.value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Open options' }));
    const option = await screen.findByRole('option', { name: /Mouse Pads/i });
    fireEvent.click(option);

    expect(onChangeSpy).toHaveBeenCalledWith('2');
    expect(input.value).toBe('Mouse Pads');
    expect(screen.queryByRole('option', { name: /Mouse Pads/i })).toBeNull();
});

test('filters by keywords and reverts to selected label when dismissed without selecting', async () => {
    render(<ControlledSelect initialValue="1" />);

    const input = screen.getByRole('combobox', { name: 'Select category' }) as HTMLInputElement;
    expect(input.value).toBe('Hookahs');

    fireEvent.click(screen.getByRole('button', { name: 'Open options' }));
    fireEvent.change(input, { target: { value: 'لوحة' } });

    expect(await screen.findByRole('option', { name: /Mouse Pads/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Keyboards/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Hookahs/i })).toBeNull();

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
        expect(input.value).toBe('Hookahs');
    });
});

test('shows all options when reopened with an existing selection and updates label on new selection', async () => {
    render(<ControlledSelect initialValue="1" />);

    const input = screen.getByRole('combobox', { name: 'Select category' }) as HTMLInputElement;
    expect(input.value).toBe('Hookahs');

    fireEvent.click(screen.getByRole('button', { name: 'Open options' }));

    expect(await screen.findByRole('option', { name: /Hookahs/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Mouse Pads/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Keyboards/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('option', { name: /Keyboards/i }));

    expect(input.value).toBe('Keyboards');
});

test('displays the matching label once options load asynchronously after value is set', async () => {
    const { rerender } = render(
        <SearchableSelect
            options={[]}
            value="2"
            onChange={vi.fn()}
            placeholder="Select category"
        />,
    );

    const input = screen.getByRole('combobox', { name: 'Select category' }) as HTMLInputElement;
    expect(input.value).toBe('');

    rerender(
        <SearchableSelect
            options={options}
            value="2"
            onChange={vi.fn()}
            placeholder="Select category"
        />,
    );

    await waitFor(() => {
        expect(input.value).toBe('Mouse Pads');
    });
});

test('clearing resets the displayed label and calls onChange with undefined', () => {
    const onChangeSpy = vi.fn();
    render(<ControlledSelect initialValue="2" clearable onChangeSpy={onChangeSpy} />);

    const input = screen.getByRole('combobox', { name: 'Select category' }) as HTMLInputElement;
    expect(input.value).toBe('Mouse Pads');

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(onChangeSpy).toHaveBeenCalledWith(undefined);
    expect(input.value).toBe('');
});
