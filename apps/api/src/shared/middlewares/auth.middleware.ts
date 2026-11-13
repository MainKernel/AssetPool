import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../errors/problem.js';

export interface AuthUser {
  id: number;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface AccessTokenPayload extends jwt.JwtPayload {
  sub?: string;
  role?: Role;
}

function isValidRole(role: unknown): role is Role {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Відсутній або некоректний заголовок Authorization'));
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    next(new UnauthorizedError('Порожній access-токен'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;

    const userId = Number(decoded.sub);
    if (!Number.isInteger(userId) || userId <= 0 || !isValidRole(decoded.role)) {
      next(new UnauthorizedError('Некоректний формат access-токена'));
      return;
    }

    req.user = {
      id: userId,
      role: decoded.role,
    };
    next();
  } catch {
    next(new UnauthorizedError('Недійсний або прострочений access-токен'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Недостатньо прав для виконання цієї операції'));
      return;
    }

    next();
  };
}
