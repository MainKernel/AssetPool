import { QueryClient } from '@tanstack/react-query';

import { isRetryableError } from './errors.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => failureCount < 2 && isRetryableError(error),
    },
  },
});
