import type { NextFunction, Request, Response } from 'express';

import { NotFoundError } from '../errors/problem.js';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Маршрут ${req.method} ${req.originalUrl} не знайдено`));
}
