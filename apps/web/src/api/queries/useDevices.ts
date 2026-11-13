import type { Schemas } from '@assetpool/schema';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../components/ToastContext.js';
import { apiClient } from '../client.js';
import { getErrorMessage, unwrap } from '../errors.js';
import { queryKeys, type DevicesFilter } from './keys.js';

export function useDevicesInfinite(filters: DevicesFilter = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.devices.list(filters),
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await apiClient.GET('/devices', {
          params: {
            query: {
              ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
              ...(filters.search ? { search: filters.search } : {}),
              ...(filters.status ? { status: filters.status } : {}),
              ...(pageParam !== undefined ? { cursor: pageParam } : {}),
              limit: 20,
            },
          },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useDevice(id: number) {
  return useQuery({
    queryKey: queryKeys.devices.detail(id),
    enabled: Number.isInteger(id) && id > 0,
    queryFn: async () => unwrap(await apiClient.GET('/devices/{id}', { params: { path: { id } } })),
  });
}

export function useCreateDevice() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (body: Schemas['DeviceInput']) =>
      unwrap(await apiClient.POST('/devices', { body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.categories });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      showSuccess('Пристрій додано');
    },
    onError: (err) => {
      showError(getErrorMessage(err, 'Не вдалося додати пристрій'));
    },
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Schemas['DeviceUpdate'] }) =>
      unwrap(await apiClient.PATCH('/devices/{id}', { params: { path: { id } }, body })),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.detail(vars.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.categories });
      showSuccess('Дані пристрою оновлено');
    },
    onError: (err) => {
      showError(getErrorMessage(err, 'Не вдалося оновити пристрій'));
    },
  });
}

export function useWriteOffDevice() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: number) =>
      unwrap(await apiClient.POST('/devices/{id}/write-off', { params: { path: { id } } })),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.detail(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      showSuccess('Пристрій списано');
    },
    onError: (err) => {
      showError(getErrorMessage(err, 'Не вдалося списати пристрій'));
    },
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      unwrap(await apiClient.DELETE('/devices/{id}', { params: { path: { id } } }));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.categories });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      showSuccess('Пристрій видалено');
    },
    onError: (err) => {
      showError(getErrorMessage(err, 'Не вдалося видалити пристрій'));
    },
  });
}
