import type { paths } from '@assetpool/schema';
import createClient, { type Middleware } from 'openapi-fetch';

import { tokenStore } from '../features/auth/tokenStore.js';

export const apiClient = createClient<paths>({
  baseUrl: '/api',
  credentials: 'include',
});

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = tokenStore.get();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },

  async onResponse({ request, response }) {
    if (response.status !== 401 || request.url.includes('/auth/')) {
      return response;
    }

    const refreshed = await tokenStore.refresh();
    if (!refreshed) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/login?redirect=${redirect}`);
      }
      return response;
    }

    const retry = new Request(request, {
      headers: new Headers(request.headers),
    });
    const nextToken = tokenStore.get();
    if (nextToken) {
      retry.headers.set('Authorization', `Bearer ${nextToken}`);
    }
    return fetch(retry);
  },
};

apiClient.use(authMiddleware);
