import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { apiClient } from '../client.js';
import { unwrap } from '../errors.js';
import { queryKeys, type HistoryFilter } from './keys.js';

export function useHistory(filters: HistoryFilter = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.history.list(filters),
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await apiClient.GET('/history', {
          params: {
            query: {
              ...(filters.deviceId ? { deviceId: filters.deviceId } : {}),
              ...(filters.userId ? { userId: filters.userId } : {}),
              ...(pageParam !== undefined ? { cursor: pageParam } : {}),
              limit: 20,
            },
          },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useDeviceHistory(deviceId: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.devices.history(deviceId),
    enabled: Number.isInteger(deviceId) && deviceId > 0,
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await apiClient.GET('/devices/{id}/history', {
          params: {
            path: { id: deviceId },
            query: {
              ...(pageParam !== undefined ? { cursor: pageParam } : {}),
              limit: 20,
            },
          },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async () => unwrap(await apiClient.GET('/dashboard/stats')),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => unwrap(await apiClient.GET('/users')),
  });
}
