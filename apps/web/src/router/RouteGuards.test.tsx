import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '../features/auth/AuthProvider.js';
import { ProtectedRoute, RoleRoute } from './RouteGuards.js';

vi.mock('../features/auth/AuthProvider.js', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function LoginEcho() {
  const location = useLocation();
  return <div>Login page {location.search}</div>;
}

describe('RouteGuards', () => {
  it('redirects unauthenticated user to /login?redirect=...', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAdmin: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/catalog']}>
        <Routes>
          <Route path="/login" element={<LoginEcho />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/catalog" element={<div>Каталог</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login page ?redirect=%2Fcatalog')).toBeInTheDocument();
  });

  it('redirects EMPLOYEE from ADMIN RoleRoute to /', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 2,
        email: 'emp@assetpool.local',
        full_name: 'Emp',
        role: 'EMPLOYEE',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isAdmin: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/requests']}>
        <Routes>
          <Route path="/" element={<div>Головна</div>} />
          <Route element={<RoleRoute requiredRole="ADMIN" />}>
            <Route path="/admin/requests" element={<div>Адмін заявки</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Головна')).toBeInTheDocument();
    expect(screen.queryByText('Адмін заявки')).not.toBeInTheDocument();
  });

  it('renders child route for matching role', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'admin@assetpool.local',
        full_name: 'Admin',
        role: 'ADMIN',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      isLoading: false,
      isAdmin: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/requests']}>
        <Routes>
          <Route path="/" element={<div>Головна</div>} />
          <Route element={<RoleRoute requiredRole="ADMIN" />}>
            <Route path="/admin/requests" element={<div>Адмін заявки</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Адмін заявки')).toBeInTheDocument();
  });
});
