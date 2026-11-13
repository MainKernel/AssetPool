import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { NotFoundError } from '../../src/shared/errors/problem.js';
import { errorHandlerMiddleware } from '../../src/shared/middlewares/errorHandler.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    type(contentType: string) {
      this.headers['content-type'] = contentType;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function createMockReq(path = '/api/test'): Request {
  return {
    originalUrl: path,
    method: 'GET',
    requestId: 'req-test-123',
    log: {
      error: vi.fn(),
    },
  } as unknown as Request;
}

describe('errorHandlerMiddleware', () => {
  const next: NextFunction = vi.fn();

  it('returns 500 without stack trace for unexpected errors', () => {
    const req = createMockReq();
    const res = createMockRes();
    const err = new Error('Database connection string leaked');

    errorHandlerMiddleware(err, req, res as unknown as Response, next);

    expect(res.statusCode).toBe(500);
    expect(res.headers['content-type']).toBe('application/problem+json');
    const body = res.body as Record<string, unknown>;
    expect(body.status).toBe(500);
    expect(body.stack).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('Database connection string leaked');
  });

  it('maps ZodError to 400 with errors[]', () => {
    const req = createMockReq();
    const res = createMockRes();
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse({ email: 'bad' });
    if (parsed.success) throw new Error('Expected ZodError');

    errorHandlerMiddleware(parsed.error, req, res as unknown as Response, next);

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toBe('application/problem+json');
    const body = res.body as { errors: { field: string; message: string }[]; request_id: string };
    expect(body.request_id).toBe('req-test-123');
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]?.field).toBe('email');
  });

  it('maps AppError to problem+json with matching status', () => {
    const req = createMockReq('/api/devices/999');
    const res = createMockRes();

    errorHandlerMiddleware(
      new NotFoundError('Пристрій не знайдено'),
      req,
      res as unknown as Response,
      next,
    );

    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toBe('application/problem+json');
    expect(res.body).toMatchObject({
      status: 404,
      title: 'Not Found',
      detail: 'Пристрій не знайдено',
      instance: '/api/devices/999',
      request_id: 'req-test-123',
    });
  });
});
