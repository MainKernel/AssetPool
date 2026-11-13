# Аналіз продуктивності SQL-запитів (НВ-1)

Перевірено на PostgreSQL 16 (`it_assets_dev`, після `prisma db seed`: 10 категорій, 50 користувачів, 200 пристроїв, 500 призначень).
Цільовий поріг за НВ-1: **< 200 мс**.

## 1. `GET /devices` (без фільтрів, курсорна пагінація)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT d.id, d.category_id, d.name, d.inventory_number, d.status, d.created_at
FROM devices d
ORDER BY d.id ASC
LIMIT 21;
```

- **План:** `Index Scan using devices_pkey on devices d`
- **Planning Time:** `0.580 ms`
- **Execution Time:** `0.057 ms`

## 2. `GET /devices` (фільтр `category_id` + `status`)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT d.id, d.category_id, d.name, d.inventory_number, d.status, d.created_at
FROM devices d
WHERE d.category_id = 1 AND d.status = 'AVAILABLE'
ORDER BY d.id ASC
LIMIT 21;
```

- **План:** `Limit -> Sort -> Seq Scan on devices d` (на 200 рядках таблиця займає 3 сторінки; за наявності більших вибірок доступні складені індекси `devices_category_id_id_idx` та `devices_status_id_idx`)
- **Planning Time:** `0.069 ms`
- **Execution Time:** `0.058 ms`

## 3. `GET /devices?search=...` (пошук `ILIKE` по `name` і `inventory_number`)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT d.id, d.category_id, d.name, d.inventory_number, d.status, d.created_at
FROM devices d
WHERE d.name ILIKE '%ThinkPad%' OR d.inventory_number ILIKE '%ThinkPad%'
ORDER BY d.id ASC
LIMIT 21;
```

- **План:** `Limit -> Sort -> Seq Scan on devices d` (3 shared buffers; для великих таблиць створені GIN trigram-індекси `idx_devices_name_trgm` та `idx_devices_inv_trgm`)
- **Planning Time:** `0.481 ms`
- **Execution Time:** `0.161 ms`

## 4. `GET /history` (фільтр `status IN ('ACTIVE', 'RETURNED')`, сортування `id DESC`)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.id, a.user_id, a.device_id, a.status, a.created_at, a.assigned_at, a.returned_at
FROM assignments a
WHERE a.status IN ('ACTIVE', 'RETURNED')
ORDER BY a.id DESC
LIMIT 21;
```

- **План:** `Index Scan Backward using assignments_pkey on assignments a`
- **Planning Time:** `0.506 ms`
- **Execution Time:** `0.029 ms`

## Висновок

Усі ключові запити виконуються менш ніж за **0.2 мс**, що з великим запасом задовольняє вимогу НВ-1 (< 200 мс).
