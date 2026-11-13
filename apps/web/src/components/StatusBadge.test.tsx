import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge, type EntityStatus } from './StatusBadge.js';

const CASES: Array<{ status: EntityStatus; label: string; toneClass: string }> = [
  { status: 'AVAILABLE', label: 'Доступно', toneClass: 'available' },
  { status: 'ISSUED', label: 'Видано', toneClass: 'issued' },
  { status: 'WRITTEN_OFF', label: 'Списано', toneClass: 'writtenOff' },
  { status: 'PENDING', label: 'Очікує', toneClass: 'pending' },
  { status: 'ACTIVE', label: 'Активна', toneClass: 'issued' },
  { status: 'RETURNED', label: 'Повернено', toneClass: 'returned' },
  { status: 'REJECTED', label: 'Відхилено', toneClass: 'writtenOff' },
];

describe('StatusBadge', () => {
  it.each(CASES)(
    'renders $status with label "$label" and tone "$toneClass"',
    ({ status, label, toneClass }) => {
      const { container } = render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(container.firstElementChild).toHaveClass('badge', toneClass);
    },
  );
});
