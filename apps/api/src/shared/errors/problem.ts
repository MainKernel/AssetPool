export const PROBLEM_TYPES = {
  VALIDATION_ERROR: 'https://assetpool.local/problems/validation-error',
  UNAUTHORIZED: 'https://assetpool.local/problems/unauthorized',
  FORBIDDEN: 'https://assetpool.local/problems/forbidden',
  NOT_FOUND: 'https://assetpool.local/problems/not-found',
  DEVICE_NOT_AVAILABLE: 'https://assetpool.local/problems/device-not-available',
  DUPLICATE_RESOURCE: 'https://assetpool.local/problems/duplicate-resource',
  INVALID_STATE_TRANSITION: 'https://assetpool.local/problems/invalid-state-transition',
  RATE_LIMITED: 'https://assetpool.local/problems/rate-limited',
  INTERNAL_ERROR: 'https://assetpool.local/problems/internal-error',
} as const;

export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly type: string,
    public readonly title: string,
    public readonly detail?: string,
    public readonly errors?: FieldError[],
  ) {
    super(detail ?? title);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(detail = 'Перевірте коректність заповнення полів', errors?: FieldError[]) {
    super(400, PROBLEM_TYPES.VALIDATION_ERROR, 'Validation Error', detail, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(detail = 'Необхідна авторизація') {
    super(401, PROBLEM_TYPES.UNAUTHORIZED, 'Unauthorized', detail);
  }
}

export class ForbiddenError extends AppError {
  constructor(detail = 'Недостатньо прав доступу') {
    super(403, PROBLEM_TYPES.FORBIDDEN, 'Forbidden', detail);
  }
}

export class NotFoundError extends AppError {
  constructor(detail = 'Запитуваний ресурс не знайдено') {
    super(404, PROBLEM_TYPES.NOT_FOUND, 'Not Found', detail);
  }
}

export class ConflictError extends AppError {
  constructor(
    detail = 'Конфлікт стану ресурсу',
    type: string = PROBLEM_TYPES.INVALID_STATE_TRANSITION,
  ) {
    super(409, type, 'Conflict', detail);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(detail = 'Забагато запитів, спробуйте пізніше') {
    super(429, PROBLEM_TYPES.RATE_LIMITED, 'Too Many Requests', detail);
  }
}
