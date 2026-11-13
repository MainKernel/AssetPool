export interface PageResult<T> {
  data: T[];
  nextCursor: number | null;
}

/**
 * Формує сторінку курсорної пагінації з масиву довжиною до `limit + 1`.
 * Якщо отримано більше `limit` елементів, останній (зайвий) вилучається,
 * а `nextCursor` дорівнює `id` останнього ВІДДАНОГО запису (для skip: 1 без пропусків).
 */
export function toPage<T extends { id: number }>(rows: T[], limit: number): PageResult<T> {
  let nextCursor: number | null = null;
  if (rows.length > limit) {
    rows.pop();
    nextCursor = rows[rows.length - 1]!.id;
  }
  return { data: rows, nextCursor };
}

export function buildCursorPagination(cursor: number | undefined, limit: number) {
  return {
    take: limit + 1,
    ...(cursor !== undefined ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}
