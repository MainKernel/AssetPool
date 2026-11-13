import type { Schemas } from '@assetpool/schema';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../components/ToastContext.js';
import { apiClient } from '../client.js';
import { ApiError, getErrorMessage, unwrap } from '../errors.js';
import { queryKeys } from './keys.js';

export function useAssignments(status: Schemas['AssignmentStatus'] = 'PENDING') {
  return useInfiniteQuery({
    queryKey: queryKeys.assignments.list(status),
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await apiClient.GET('/assignments', {
          params: {
            query: {
              status,
              ...(pageParam !== undefined ? { cursor: pageParam } : {}),
              limit: 20,
            },
          },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useMyDevices() {
  return useQuery({
    queryKey: queryKeys.users.myDevices,
    queryFn: async () => unwrap(await apiClient.GET('/users/me/devices')),
  });
}

export function useMyAssignments() {
  return useInfiniteQuery({
    queryKey: queryKeys.users.myAssignments,
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await apiClient.GET('/users/me/assignments', {
          params: {
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

export function useCreateAssignment() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (deviceId: number) =>
      unwrap(await apiClient.POST('/assignments', { body: { device_id: deviceId } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.users.myAssignments });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
      showSuccess('Заявку на пристрій подано');
    },
    onError: (err) => {
      showError(getErrorMessage(err, 'Не вдалося створити заявку'));
    },
  });
}

export function useIssueAssignment() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (assignmentId: number) =>
      unwrap(
        await apiClient.POST('/assignments/{id}/issue', {
          params: { path: { id: assignmentId } },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.history.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      showSuccess('Пристрій успішно видано');
    },
    onError: (err) => {
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      if (err instanceof ApiError && err.status === 409) {
        showError('Пристрій уже видано або заявку вже оброблено');
        return;
      }
      showError(getErrorMessage(err, 'Не вдалося видати пристрій'));
    },
  });
}

export function useIssueDirect() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (body: Schemas['AssignmentIssueDirect']) =>
      unwrap(await apiClient.POST('/assignments/issue', { body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.history.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      showSuccess('Пристрій напряму видано співробітнику');
    },
    onError: (err) => {
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      if (err instanceof ApiError && err.status === 409) {
        showError('Пристрій уже видано або недоступний');
        return;
      }
      showError(getErrorMessage(err, 'Не вдалося виконати видачу'));
    },
  });
}

export function useRejectAssignment() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (assignmentId: number) =>
      unwrap(
        await apiClient.POST('/assignments/{id}/reject', {
          params: { path: { id: assignmentId } },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      showSuccess('Заявку відхилено');
    },
    onError: (err) => {
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
      showError(getErrorMessage(err, 'Не вдалося відхилити заявку'));
    },
  });
}

export function useReturnAssignment() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (assignmentId: number) =>
      unwrap(
        await apiClient.POST('/assignments/{id}/return', {
          params: { path: { id: assignmentId } },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.history.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      showSuccess('Пристрій повернено на склад');
    },
    onError: (err) => {
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      showError(getErrorMessage(err, 'Не вдалося оформити повернення'));
    },
  });
}
