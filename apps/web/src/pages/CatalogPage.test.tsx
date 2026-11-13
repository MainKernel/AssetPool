import type { paths } from '@assetpool/schema';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl, mockCategories, mockDevices } from '../test/msw/handlers.js';
import { server } from '../test/msw/server.js';
import { renderWithProviders } from '../test/renderWithProviders.js';
import { CatalogPage } from './CatalogPage.js';

type Devices200 = paths['/devices']['get']['responses'][200]['content']['application/json'];

describe('CatalogPage', () => {
  it('changes API query when filtering by category', async () => {
    const user = userEvent.setup();
    const requestedUrls: string[] = [];

    server.use(
      http.get(apiUrl('/devices'), ({ request }) => {
        requestedUrls.push(request.url);
        const categoryId = new URL(request.url).searchParams.get('categoryId');
        const filtered = categoryId
          ? mockDevices.filter((d) => d.category_id === Number(categoryId))
          : mockDevices;
        const body: Devices200 = { data: filtered, nextCursor: null };
        return HttpResponse.json(body, { status: 200 });
      }),
    );

    renderWithProviders(<CatalogPage />, { initialEntries: ['/catalog'] });

    expect(await screen.findByText('Lenovo ThinkPad T14')).toBeInTheDocument();
    expect(screen.getByText('Dell UltraSharp U2723QE')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Монітори/ }));

    await waitFor(() => {
      expect(requestedUrls.some((url) => url.includes('categoryId=2'))).toBe(true);
    });
    expect(screen.queryByText('Lenovo ThinkPad T14')).not.toBeInTheDocument();
    expect(screen.getByText('Dell UltraSharp U2723QE')).toBeInTheDocument();
  });

  it('appends next page when clicking "Завантажити ще"', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(apiUrl('/devices'), ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (!cursor) {
          const firstPage: Devices200 = {
            data: [mockDevices[0]!],
            nextCursor: 101,
          };
          return HttpResponse.json(firstPage, { status: 200 });
        }

        const secondPage: Devices200 = {
          data: [
            {
              id: 301,
              name: 'HP EliteBook 840',
              inventory_number: 'INV-2026-0301',
              status: 'AVAILABLE',
              category_id: 1,
              category: mockCategories[0]!,
              created_at: '2026-01-15T10:00:00.000Z',
            },
          ],
          nextCursor: null,
        };
        return HttpResponse.json(secondPage, { status: 200 });
      }),
    );

    renderWithProviders(<CatalogPage />, { initialEntries: ['/catalog'] });

    expect(await screen.findByText('Lenovo ThinkPad T14')).toBeInTheDocument();
    const loadMoreBtn = screen.getByRole('button', { name: 'Завантажити ще' });
    await user.click(loadMoreBtn);

    expect(await screen.findByText('HP EliteBook 840')).toBeInTheDocument();
    expect(screen.getByText('Lenovo ThinkPad T14')).toBeInTheDocument();
  });
});
