# Звіт фінального приймального тестування (Етап 20 — локальний стек)

- **Дата:** 2026-11-13
- **Середовище:** локальний production-подібний стек `docker compose up -d --build` (`http://127.0.0.1:8080`, Nginx → API → PostgreSQL 15) — без віддаленого VPS-сервера.

## 1. Функціональні тест-кейси (табл. 4.2.1 КП)

| №   | Сценарій                                | Перевірка на локальному стеку                                                                                                                       | Статус |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Авторизація з коректними даними         | `POST /api/auth/login` (`admin@admin` / `admin` та `employee@assetpool.local` / `Employee123!`) → `200 OK`, JWT, cookie `HttpOnly; SameSite=Strict` | Pass   |
| 2   | Авторизація з невірним паролем          | `POST /api/auth/login` → `401`, `application/problem+json`, `detail: "Невірний логін або пароль"`                                                   | Pass   |
| 3   | Фільтрація каталогу «Ноутбуки»          | `GET /api/devices?categoryId=...&limit=20` → `200 OK`, 19 записів, `allMatch: true`                                                                 | Pass   |
| 4   | Серверна курсорна пагінація             | `limit=20` + `cursor=nextCursor` → 20 + 20 записів, `overlap = 0`                                                                                   | Pass   |
| 5   | Створення заявки співробітником         | `POST /api/assignments` → `201`, статус `PENDING` (та повторна на той самий пристрій → `409`)                                                       | Pass   |
| 6   | Доступ до адмін-ендпоінту / чужих даних | `GET /api/assignments?status=PENDING` з токеном `EMPLOYEE` → `403 Forbidden`                                                                        | Pass   |
| 7   | Створення категорії                     | `POST /api/categories` з токеном `ADMIN` → `201 Created`                                                                                            | Pass   |
| 8   | Видача пристрою (транзакція)            | `POST /api/assignments/:id/issue` → `201`, заявка `ACTIVE`, пристрій `ISSUED`                                                                       | Pass   |
| 9   | Видача — стан гонитви (`E20.3`)         | Два паралельні `POST /api/assignments/:id/issue` на один пристрій → `[201, 409]`                                                                    | Pass   |
| 10  | Списання активу                         | `POST /api/devices/:id/write-off` → `200`, `WRITTEN_OFF`, відсутній у `status=AVAILABLE`                                                            | Pass   |

## 2. Нефункціональні перевірки

- **НВ-1 (`E20.4`, продуктивність):** підтверджено у [`docs/perf/quality-report.md`](../perf/quality-report.md) та [`docs/perf/explain.md`](../perf/explain.md) (`autocannon`: p50 = 6 ms, 97.5% = 23 ms < 200 ms).
- **НВ-2 (`E20.5`, хешування та RBAC):** запит `SELECT email, left(password_hash, 10) FROM users LIMIT 5;` повернув `$argon2id$` для всіх облікових записів (`admin@admin`, `admin@assetpool.local`, `admin2@assetpool.local`, `employee@assetpool.local`, `user4@assetpool.local`).
- **НВ-3 (`E20.6`, валідація):** некоректний payload на `POST /api/devices` → `400`, `https://assetpool.local/problems/validation-error`.
- **НВ-5 (`E20.8`, OpenAPI та типізація):** `pnpm --filter @assetpool/schema lint` (`redocly lint openapi.yaml`) пройшов без помилок; ручних DTO-інтерфейсів для `Device`/`Category`/`Assignment` поза `generated` не виявлено.
- **НВ-6 (`E20.9`, чисте середовище):** `docker compose down -v && docker compose up -d` підняв БД, застосував міграції, виконав сід та пройшов healthcheck.
- **Безпека (`E20.10`):** cookie містять `HttpOnly; SameSite=Strict`; rate limit на `/api/auth/login` повернув `429` на 8-й спробі у вікні тесту (після попередніх логінів у межах ліміту 10/15 хв); `helmet`-заголовки та `pnpm audit --prod` зафіксовані в [`docs/perf/quality-report.md`](../perf/quality-report.md).
- **Відмовостійкість (`E20.12`):** `docker restart assetpool-api-1` — контейнер автоматично відновився, `GET http://127.0.0.1:8080/api/health` повернув `{"status":"ok","db":"up"}`.

## 3. Пропущено (поза обсягом локального стенду без VPS / браузерів)

- Ручний прогін через віддалений домен (`https://<домен>`), TLS/HSTS/SSL Labs (`E20.1` скріншоти, `E20.10` HTTPS), `sudo reboot` сервера та відновлення бекапу на VPS (`E20.12`).
- Повний прогін Playwright та Chrome Lighthouse (`E20.2`, `E20.7`, `E20.11`) через відсутність браузерних бінарників у headless-середовищі.
