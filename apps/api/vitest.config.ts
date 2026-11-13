import { defineConfig } from 'vitest/config';

const testEnv = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://assetpool:assetpool@localhost:5432/it_assets_test?schema=public',
  JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-chars!!',
  JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars!',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  CORS_ORIGIN: 'http://localhost:5173',
  LOG_LEVEL: 'silent',
};

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/modules/**/*.service.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
          env: testEnv,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['./test/globalSetup.ts'],
          fileParallelism: false,
          maxWorkers: 1,
          testTimeout: 30_000,
          hookTimeout: 30_000,
          env: testEnv,
        },
      },
    ],
  },
});
