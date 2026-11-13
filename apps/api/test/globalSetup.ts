import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DATABASE_URL =
  'postgresql://assetpool:assetpool@localhost:5432/it_assets_test?schema=public';

export default function globalSetup() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const apiRoot = path.resolve(__dirname, '..');

  execSync('npx prisma migrate reset --force --skip-seed', {
    cwd: apiRoot,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
    stdio: 'inherit',
  });
}
