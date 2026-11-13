import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button.js';
import { DeviceCard } from './DeviceCard.js';

describe('DeviceCard', () => {
  it('disables request button when device is not AVAILABLE', () => {
    render(
      <DeviceCard
        name="MacBook Pro 14"
        inventoryNumber="INV-2026-0102"
        categoryName="Ноутбуки"
        status="ISSUED"
        actions={
          <Button variant="primary" disabled>
            Замовити
          </Button>
        }
      />,
    );

    expect(screen.getByRole('button', { name: 'Замовити' })).toBeDisabled();
  });

  it('calls onRequest with device id when AVAILABLE and clicked', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn<(id: number) => void>();

    render(
      <DeviceCard
        name="Lenovo ThinkPad T14"
        inventoryNumber="INV-2026-0101"
        categoryName="Ноутбуки"
        status="AVAILABLE"
        actions={
          <Button variant="primary" onClick={() => onRequest(101)}>
            Замовити
          </Button>
        }
      />,
    );

    const button = screen.getByRole('button', { name: 'Замовити' });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onRequest).toHaveBeenCalledWith(101);
  });
});
