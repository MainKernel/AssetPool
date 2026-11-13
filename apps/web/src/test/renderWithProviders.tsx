import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { ToastProvider } from '../components/ToastContext.js';
import { AuthProvider } from '../features/auth/AuthProvider.js';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  withAuth?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ['/'], withAuth = false, ...options }: WrapperOptions = {},
) {
  const client = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    const inner = (
      <MemoryRouter initialEntries={initialEntries}>
        {withAuth ? <AuthProvider>{children}</AuthProvider> : children}
      </MemoryRouter>
    );

    return (
      <QueryClientProvider client={client}>
        <ToastProvider>{inner}</ToastProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
