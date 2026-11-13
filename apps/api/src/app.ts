import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { authRouter } from './modules/auth/auth.routes.js';
import { env } from './shared/config/env.js';
import { prisma } from './shared/db/prisma.client.js';
import { logger } from './shared/logger/logger.js';
import { errorHandlerMiddleware } from './shared/middlewares/errorHandler.js';
import { notFoundMiddleware } from './shared/middlewares/notFound.js';
import { apiRateLimiter } from './shared/middlewares/rateLimit.js';
import { requestIdMiddleware } from './shared/middlewares/requestId.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.requestId ?? 'unknown',
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api', apiRateLimiter);

  app.get('/api/health', async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'up' });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/auth', authRouter);

  app.use('/api', notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
