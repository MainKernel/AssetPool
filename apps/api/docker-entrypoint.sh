#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] Seeding demo data..."
  SEED_FORCE=true node dist/prisma/seed.js
fi

exec "$@"

