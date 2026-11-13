import type { ReactNode } from 'react';

import { EmptyState } from './EmptyState.js';
import { ErrorMessage } from './ErrorMessage.js';
import { LoadingSpinner } from './LoadingSpinner.js';

export interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}

export function QueryState({
  isLoading,
  isError,
  errorMessage,
  onRetry,
  empty = false,
  emptyTitle,
  emptyDescription,
  children,
}: QueryStateProps) {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorMessage message={errorMessage} onRetry={onRetry} />;
  }

  if (empty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <>{children}</>;
}
