import rateLimit from 'express-rate-limit';

import { TooManyRequestsError } from '../errors/problem.js';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Перевищено загальний ліміт запитів (300/хв)'));
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new TooManyRequestsError(
        'Забагато спроб входу або реєстрації. Спробуйте повторно через 15 хвилин',
      ),
    );
  },
});
