import type { Problem } from '@assetpool/schema';

export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly detail?: string;
  readonly errors?: Problem['errors'];

  constructor(problem: Partial<Problem> & { status: number }) {
    const message = problem.detail ?? problem.title ?? `Помилка запиту (${problem.status})`;
    super(message);
    this.name = 'ApiError';
    this.status = problem.status;
    this.type = problem.type ?? 'about:blank';
    this.title = problem.title ?? 'Error';
    this.detail = problem.detail;
    this.errors = problem.errors;
  }
}

export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || !result.response.ok) {
    const err = result.error as Partial<Problem> | undefined;
    throw new ApiError({
      status: err?.status ?? result.response.status,
      type: err?.type,
      title: err?.title,
      detail: err?.detail,
      errors: err?.errors,
    });
  }

  return result.data as T;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500;
  }
  return true;
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Виникла непередбачена помилка',
): string {
  if (error instanceof ApiError) {
    return error.detail ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
