import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import '@/i18n';
import { AdminTable, type AdminColumnDef } from '@/shared/components/admin/admin-table';
import { AdminRowActions } from '@/shared/components/admin/admin-row-actions';

const items = [
    { id: 1, name: 'Current admin', pending: false },
    { id: 2, name: 'Pending admin', pending: true },
    { id: 3, name: 'Other admin', pending: false },
];
const onDelete = vi.fn();
const columns: AdminColumnDef<(typeof items)[number]>[] = [
    {
        id: 'thumbnail-not-image',
        mobileRole: 'image',
        header: <span>Photo</span>,
        cell: (item) => <img src="/test.png" alt={item.name} />,
    },
    {
        id: 'identity',
        header: <span>Name</span>,
        cell: (item, index) => (
            <div className="min-w-0">
                <p className="truncate">{item.name}</p>
                <p dir="ltr" className="truncate">
                    {index}-very-long-email-address@example.com
                </p>
            </div>
        ),
    },
    {
        id: 'created',
        header: 'Created',
        className: 'hidden whitespace-nowrap lg:table-cell',
        cell: () => <time>2026-01-01</time>,
    },
    {
        id: 'placed',
        header: 'Placed date',
        className: 'hidden md:table-cell',
        cell: () => <time>2026-02-02</time>,
    },
    { id: 'phone', header: 'Phone', cell: () => <span dir="ltr">+964 12345678901234567890</span> },
    {
        id: 'controls-not-actions',
        mobileRole: 'actions',
        header: 'Actions',
        className: 'w-16 text-end',
        cell: (item) => (
            <AdminRowActions
                label={item.name}
                onDelete={() => onDelete(item.id)}
                deleteDisabled={item.id === 1 || item.pending}
            />
        ),
    },
];
const base = {
    items,
    columns,
    keyExtractor: (item: (typeof items)[number]) => item.id,
    toolbar: <div>Toolbar</div>,
    footer: <div>Pagination</div>,
};

afterEach(() => {
    cleanup();
    onDelete.mockClear();
});

function expectChromeOnce() {
    expect(screen.getAllByText('Toolbar')).toHaveLength(1);
    expect(screen.getAllByText('Pagination')).toHaveLength(1);
}

test('cards reuse every header/cell, including hidden dates, with semantic hierarchy and no column classes', () => {
    const { container } = render(
        <div dir="rtl">
            <AdminTable {...base} />
        </div>,
    );
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
    const card = cards[0];
    expect(
        within(card)
            .getAllByRole('term')
            .map((node) => node.textContent),
    ).toEqual(['Photo', 'Name', 'Created', 'Placed date', 'Phone', 'Actions']);
    expect(within(card).getByText('2026-01-01')).toBeTruthy();
    expect(within(card).getByText('2026-02-02')).toBeTruthy();
    expect(within(card).getByRole('img').closest('dl')).toBe(
        within(card).getByText('Current admin').closest('dl'),
    );
    expect(within(card).getByText('Current admin').closest('dd')?.className).toContain(
        'text-base font-semibold',
    );
    expect(card.querySelector('footer button')).toBeTruthy();
    expect(card.querySelector('.hidden')).toBeNull();
    expect(card.querySelector('.w-16')).toBeNull();
    expect(card.className).toContain('[&_.truncate]:whitespace-normal');
    expect(card.className).toContain('[overflow-wrap:anywhere]');
    expect(card.querySelector('[dir="ltr"]')?.textContent).toBe(
        '0-very-long-email-address@example.com',
    );
    expect(container.querySelector('ul')?.className).toContain('sm:grid-cols-2');
    expect(container.querySelector('ul')?.parentElement?.className).toBe('md:hidden');
    const table = screen.getByRole('table');
    expect(table.parentElement?.parentElement?.parentElement?.className).toBe('hidden md:block');
    expect(table.querySelector('th.hidden')).toBeTruthy();
    expect(container.firstElementChild?.firstElementChild?.className).toContain(
        'max-md:[&_button]:min-h-11',
    );
    expectChromeOnce();
});

test('current-admin and pending delete remain disabled; enabled actions call the original handler', () => {
    render(<AdminTable {...base} />);
    const cards = screen.getAllByRole('article');
    cards.forEach((card, index) => {
        const button = within(card).getByRole('button') as HTMLButtonElement;
        expect(button.disabled).toBe(index !== 2);
        fireEvent.click(button);
    });
    expect(onDelete.mock.calls).toEqual([[3]]);
});

test('unannotated columns fall back to first-field prominence without losing any fields', () => {
    render(<AdminTable {...base} columns={columns.filter((column) => !column.mobileRole)} />);
    const card = screen.getAllByRole('article')[0];
    expect(within(card).getByText('Current admin').closest('dd')?.className).toContain('text-base');
    expect(within(card).getAllByRole('term')).toHaveLength(4);
    expect(card.querySelector('footer')).toBeNull();
});

test('explicit primary role overrides order without relying on IDs', () => {
    render(
        <AdminTable
            {...base}
            columns={[
                { id: 'first', header: 'First', cell: () => 'Metadata' },
                { id: 'last', mobileRole: 'primary', header: 'Last', cell: () => 'Primary' },
            ]}
        />,
    );
    const card = screen.getAllByRole('article')[0];
    expect(
        within(card)
            .getAllByRole('term')
            .map((node) => node.textContent),
    ).toEqual(['Last', 'First']);
});

test('empty content and action render once with toolbar/footer', () => {
    const create = vi.fn();
    render(
        <AdminTable
            {...base}
            items={[]}
            emptyTitle="No records"
            emptyDescription="Create one"
            emptyAction={<button onClick={create}>Create record</button>}
        />,
    );
    expect(screen.getAllByText('No records')).toHaveLength(1);
    expect(screen.getByText('Create one')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create record' }));
    expect(create).toHaveBeenCalledOnce();
    expect(screen.queryByRole('table')).toBeNull();
    expectChromeOnce();
});

test('error takes precedence over empty content and retry renders once', () => {
    const retry = vi.fn();
    render(<AdminTable {...base} items={[]} isError onRetry={retry} emptyTitle="No records" />);
    fireEvent.click(screen.getByRole('button'));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByText('No records')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expectChromeOnce();
});

test('loading takes precedence and supplies card skeletons plus unchanged desktop skeletons', () => {
    const { container } = render(<AdminTable {...base} isLoading isError skeletonRowCount={4} />);
    const loading = container.querySelectorAll('[aria-busy="true"]');
    expect(loading).toHaveLength(2);
    expect(loading[0].children).toHaveLength(4);
    expect(loading[0].className).toContain('sm:grid-cols-2');
    expect(loading[0].parentElement?.className).toBe('md:hidden');
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expectChromeOnce();
});
