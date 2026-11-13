# Звіт про якість, продуктивність і безпеку (Етап 15)

## 1. Розмір фронтенд-бандла (`E15.6`)

- Інструмент аналізу: `rollup-plugin-visualizer` (`pnpm --filter @assetpool/web analyze` → [`bundle-stats.html`](./bundle-stats.html)).
- Початковий JS-бандл (`dist/assets/index-*.js`): **305.77 kB** (**96.91 kB gzip**), що менше цільового ліміту 200 KB gzip.
- Сторінки (`LoginPage`, `DashboardPage`, `CatalogPage`, `DeviceDetailsPage`, `MyDevicesPage`, `AdminRequestsPage`, `AdminAssetsPage`, `AdminCategoriesPage`, `AdminHistoryPage`, `NotFoundPage`) завантажуються ліниво (`React.lazy`) окремими чанками розміром **0.77 kB – 7.27 kB** (0.50 – 2.83 kB gzip).
- CSS: `index-*.css` — **16.21 kB** (3.48 kB gzip), `Pages-*.css` — **8.12 kB** (2.18 kB gzip).

## 2. Продуктивність API (`E15.7`)

### `autocannon` на `GET /api/devices?limit=20`

Стенд: локальний API (`node apps/api/dist/server.js`) проти PostgreSQL 15 (`assetpool-db-dev`) на сидованих демо-даних (10 категорій, 50 користувачів, 200 пристроїв, 500 призначень).

Команда: `pnpm dlx autocannon -c 10 -a 200 -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:3000/api/devices?limit=20"` (у межах rate limit 300 req/60s):

| Метрика                     | Значення                                  |
| --------------------------- | ----------------------------------------- |
| 50% (p50)                   | 6 ms                                      |
| Avg                         | 7.54 ms                                   |
| 97.5% (верхня межа для p95) | 23 ms (ціль: < 200 ms)                    |
| 99%                         | 25 ms                                     |
| Max                         | 26 ms                                     |
| Throughput                  | 200 req/s (200 запитів за 1.01s, 1.36 MB) |

Аналіз планів запитів PostgreSQL (`EXPLAIN ANALYZE`) зафіксовано у [`explain.md`](./explain.md).

## 3. Безпека (`E15.8`)

### Заголовки `helmet` (`curl -sI http://127.0.0.1:3000/api/health`)

- `Content-Security-Policy`: `default-src 'self'; ... object-src 'none'; script-src 'self'; ...`
- `Cross-Origin-Opener-Policy`: `same-origin`
- `Cross-Origin-Resource-Policy`: `same-origin`
- `Referrer-Policy`: `no-referrer`
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains`
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `SAMEORIGIN`
- `RateLimit`: `limit=300, remaining=298, reset=60`

### `pnpm audit --prod`

- **Critical:** 0
- **High:** 1 транзитивна вразливість `deepmerge-ts < 8.0.0` (`GHSA-ggr8-5vv4-36mx`) у ланцюжку `apps__api > prisma > @prisma/config > deepmerge-ts` (пакет `prisma` CLI потрібен у production-контейнері лише для `prisma migrate deploy` на старті, у runtime HTTP-обробці запитів не використовується).

### Секрети в репозиторії

- Перевірка відстежуваних файлів через `git grep` на патерни приватних ключів і токенів не виявила витоків (`gitleaks` CLI у середовищі не встановлено).
