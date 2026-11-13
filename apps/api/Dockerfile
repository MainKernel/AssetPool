# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat openssl && corepack enable
WORKDIR /app

# 1) Вирізаємо з монорепо лише api та його залежності
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2 prune @assetpool/api --docker

# 2) Встановлення залежностей (кешований шар) + збірка
FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@assetpool/api

# 3) Лише production-залежності + Prisma Client
FROM base AS prod-deps
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile --prod
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && pnpm exec prisma generate

# 4) Фінальний мінімальний образ
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder  --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder  --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER node
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]

