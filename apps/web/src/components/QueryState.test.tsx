import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { QueryState } from './QueryState.js';

describe('QueryState', () => {
  it('renders loading state', () => {
    render(
      <QueryState isLoading isError={false}>
        <div>Контент</div>
      </QueryState>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Контент')).not.toBeInTheDocument();
  });

  it('renders error state and triggers onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <QueryState isLoading={false} isError errorMessage="Помилка завантаження" onRetry={onRetry}>
        <div>Контент</div>
      </QueryState>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Помилка завантаження');
    await user.click(screen.getByRole('button', { name: 'Повторити' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when empty=true', () => {
    render(
      <QueryState isLoading={false} isError={false} empty emptyTitle="Список порожній">
        <div>Контент</div>
      </QueryState>,
    );

    expect(screen.getByText('Список порожній')).toBeInTheDocument();
    expect(screen.queryByText('Контент')).not.toBeInTheDocument();
  });

  it('renders children when data is ready', () => {
    render(
      <QueryState isLoading={false} isError={false} empty={false}>
        <div>Готовий контент</div>
      </QueryState>,
    );

    expect(screen.getByText('Готовий контент')).toBeInTheDocument();
  });
});
