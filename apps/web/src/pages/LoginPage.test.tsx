import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../test/renderWithProviders.js';
import { LoginPage } from './LoginPage.js';

describe('LoginPage', () => {
  it('shows 401 problem+json error message on invalid credentials', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { initialEntries: ['/login'], withAuth: true });

    const emailInput = await screen.findByLabelText('Електронна пошта');
    const passwordInput = screen.getByLabelText('Пароль');

    await user.type(emailInput, 'wrong@assetpool.local');
    await user.type(passwordInput, 'WrongPass123!');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Невірний логін або пароль');
  });
});
