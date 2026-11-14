import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Switch } from '@/shared/components/ui/switch';

afterEach(cleanup);

test('toggles controlled checked state and data attributes on click', () => {
    const onCheckedChange = vi.fn();

    function ControlledSwitch() {
        const [checked, setChecked] = useState(true);
        return (
            <Switch
                id="active-switch"
                aria-label="Active"
                checked={checked}
                onCheckedChange={(next) => {
                    setChecked(next);
                    onCheckedChange(next);
                }}
            />
        );
    }

    render(<ControlledSwitch />);

    const toggle = screen.getByRole('switch', { name: 'Active' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.hasAttribute('data-checked')).toBe(true);

    fireEvent.click(toggle);

    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(toggle.hasAttribute('data-unchecked')).toBe(true);
});

test('does not toggle or fire handler when disabled', () => {
    const onCheckedChange = vi.fn();

    render(
        <Switch aria-label="Active" checked={false} disabled onCheckedChange={onCheckedChange} />,
    );

    const toggle = screen.getByRole('switch', { name: 'Active' });
    fireEvent.click(toggle);

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(toggle.getAttribute('aria-checked')).toBe('false');
});
