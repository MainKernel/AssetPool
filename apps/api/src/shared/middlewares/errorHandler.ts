import type { Schemas } from '@assetpool/schema';
import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError, PROBLEM_TYPES } from '../errors/problem.js';
import { logger } from '../logger/logger.js';

type ProblemPayload = Schemas['Problem'];

function sendProblem(res: Response, problem: ProblemPayload): void {
  res.status(problem.status).type('application/problem+json').json(problem);
}

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const instance = req.originalUrl;
  const requestId = req.requestId;

  if (err instanceof AppError) {
    sendProblem(res, {
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.detail,
      instance,
      ...(requestId ? { request_id: requestId } : {}),
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    sendProblem(res, {
      type: PROBLEM_TYPES.VALIDATION_ERROR,
      title: 'Validation Error',
      status: 400,
      detail: 'Перевірте коректність заповнення полів',
      instance,
      ...(requestId ? { request_id: requestId } : {}),
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendProblem(res, {
        type: PROBLEM_TYPES.DUPLICATE_RESOURCE,
        title: 'Conflict',
        status: 409,
        detail: 'Запис із такими унікальними даними вже існує',
        instance,
        ...(requestId ? { request_id: requestId } : {}),
      });
      return;
    }
    if (err.code === 'P2025') {
      sendProblem(res, {
        type: PROBLEM_TYPES.NOT_FOUND,
        title: 'Not Found',
        status: 404,
        detail: 'Запитуваний запис не знайдено',
        instance,
        ...(requestId ? { request_id: requestId } : {}),
      });
      return;
    }
    if (err.code === 'P2003') {
      sendProblem(res, {
        type: PROBLEM_TYPES.INVALID_STATE_TRANSITION,
        title: 'Conflict',
        status: 409,
        detail: 'Операція неможлива через пов’язані записи',
        instance,
        ...(requestId ? { request_id: requestId } : {}),
      });
      return;
    }
  }

  // Невідома помилка — логуємо повністю, клієнту віддаємо 500 без стектрейсу (НВ-3)
  logger.error({ err, requestId, path: instance }, 'Unhandled server error');
  sendProblem(res, {
    type: PROBLEM_TYPES.INTERNAL_ERROR,
    title: 'Internal Server Error',
    status: 500,
    detail: 'Внутрішня помилка сервера',
    instance,
    ...(requestId ? { request_id: requestId } : {}),
  });
}
