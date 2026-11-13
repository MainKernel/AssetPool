import type { AuthResponse } from '@assetpool/schema';

let accessToken: string | null = null;
let inflightRefresh: Promise<AuthResponse | null> | null = null;

async function performRefresh(): Promise<AuthResponse | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      accessToken = null;
      return null;
    }

    const data = (await res.json()) as AuthResponse;
    accessToken = data.access_token;
    return data;
  } catch {
    accessToken = null;
    return null;
  }
}

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },

  set(token: string): void {
    accessToken = token;
  },

  clear(): void {
    accessToken = null;
  },

  async refreshSession(): Promise<AuthResponse | null> {
    if (!inflightRefresh) {
      inflightRefresh = performRefresh().finally(() => {
        inflightRefresh = null;
      });
    }
    return inflightRefresh;
  },

  async refresh(): Promise<boolean> {
    const session = await this.refreshSession();
    return session !== null;
  },
};
