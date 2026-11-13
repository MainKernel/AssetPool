import { type CookieOptions, type Request, type Response, Router } from 'express';

import { env } from '../../shared/config/env.js';
import { requireAuth } from '../../shared/middlewares/auth.middleware.js';
import { authRateLimiter } from '../../shared/middlewares/rateLimit.js';
import { validate } from '../../shared/middlewares/validate.js';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from './auth.schema.js';
import { authService } from './auth.service.js';

const REFRESH_COOKIE_NAME = 'refresh_token';

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  };
}

function setRefreshCookie(res: Response, token: string, maxAgeMs: number): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: maxAgeMs,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}

function getRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const raw = cookies?.[REFRESH_COOKIE_NAME];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

export const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  async (req, res, next) => {
    try {
      const body = req.validated!.body as RegisterInput;
      const result = await authService.register(body);
      setRefreshCookie(res, result.refreshToken, result.refreshMaxAgeMs);
      res.status(201).json(result.authResponse);
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  async (req, res, next) => {
    try {
      const body = req.validated!.body as LoginInput;
      const result = await authService.login(body);
      setRefreshCookie(res, result.refreshToken, result.refreshMaxAgeMs);
      res.status(200).json(result.authResponse);
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const rawToken = getRefreshCookie(req);
    const result = await authService.refresh(rawToken);
    setRefreshCookie(res, result.refreshToken, result.refreshMaxAgeMs);
    res.status(200).json(result.authResponse);
  } catch (error) {
    clearRefreshCookie(res);
    next(error);
  }
});

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const rawToken = getRefreshCookie(req);
    await authService.logout(rawToken);
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});
