import { execSync } from 'node:child_process';
import path from 'node:path';

export default function globalSetup() {
  if (process.env.SKIP_DB_RESET === 'true') {
    return;
  }

  const repoRoot = path.resolve(import.meta.dirname, '../../..');
  execSync('pnpm --filter @assetpool/api db:reset', {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}
