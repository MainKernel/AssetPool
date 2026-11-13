import { createApp } from './app.js';
import { env } from './shared/config/env.js';
import { disconnectPrisma } from './shared/db/prisma.client.js';
import { logger } from './shared/logger/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'AssetPool API server started');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down server gracefully...');

  const forceTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error closing HTTP server');
      process.exit(1);
    }

    disconnectPrisma()
      .then(() => {
        logger.info('Database connection closed');
        process.exit(0);
      })
      .catch((dbErr: unknown) => {
        logger.error({ err: dbErr }, 'Error disconnecting database');
        process.exit(1);
      });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
