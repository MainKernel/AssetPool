import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import { TooManyRequestsError } from '../errors/problem.js';

const skipInTest = (req: { headers: Record<string, unknown> }) =>
  env.NODE_ENV === 'test' && req.headers['x-test-rate-limit'] !== '1';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Перевищено загальний ліміт запитів (300/хв)'));
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, _res, next) => {
    next(
      new TooManyRequestsError(
        'Забагато спроб входу або реєстрації. Спробуйте повторно через 15 хвилин',
      ),
    );
  },
});
