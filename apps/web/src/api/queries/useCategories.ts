import type { Schemas } from '@assetpool/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../components/ToastContext.js';
import { apiClient } from '../client.js';
import { getErrorMessage, unwrap } from '../errors.js';
import { queryKeys } from './keys.js';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => unwrap(await apiClient.GET('/categories')),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (body: Schemas['CategoryInput']) =>
      unwrap(await apiClient.POST('/categories', { body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories });
      showSuccess('Категорію створено');
    },
    onError: (err) => {
      showError(getErrorMessage(err, 'Не вдалося створити категорію'));
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Schemas['CategoryInput'] }) =>
      unwrap(await apiClient.PATCH('/categories/{id}', { params: { path: { id } }, body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      showSuccess('Категорію оновлено');
    },
    onError: (err) => {
      showError(getErrorMessage(err, 'Не вдалося оновити категорію'));
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.DELETE('/categories/{id}', { params: { path: { id } } });
      unwrap(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories });
      showSuccess('Категорію видалено');
    },
    onError: (err) => {
      showError(getErrorMessage(err, 'Не вдалося видалити категорію'));
    },
  });
}
