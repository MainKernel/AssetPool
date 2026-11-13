import type { User } from '@assetpool/schema';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { apiClient } from '../../api/client.js';
import { unwrap } from '../../api/errors.js';
import { queryClient } from '../../api/queryClient.js';
import { tokenStore } from './tokenStore.js';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const refreshed = await tokenStore.refresh();
        if (!refreshed) {
          if (active) setUser(null);
          return;
        }
        const me = unwrap(await apiClient.GET('/auth/me'));
        if (active) setUser(me);
      } catch {
        tokenStore.clear();
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = unwrap(
      await apiClient.POST('/auth/login', {
        body: { email, password },
      }),
    );
    tokenStore.set(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string): Promise<User> => {
      const res = unwrap(
        await apiClient.POST('/auth/register', {
          body: { email, password, full_name: fullName },
        }),
      );
      tokenStore.set(res.access_token);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.POST('/auth/logout');
    } catch {
      // Ігноруємо помилку мережі при виході — локальний стан все одно очищуємо
    } finally {
      tokenStore.clear();
      queryClient.clear();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'ADMIN',
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
