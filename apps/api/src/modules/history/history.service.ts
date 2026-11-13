import { toPage } from '../../shared/utils/pagination.js';
import { historyRepository } from './history.repository.js';
import type { HistoryFilter, ListHistoryQuery } from './history.schema.js';

const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(raw: string | null | undefined): string {
  let value = raw ?? '';
  if (CSV_FORMULA_PREFIX.test(value)) {
    value = `'${value}`;
  }
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

export const historyService = {
  async list(query: ListHistoryQuery) {
    const rows = await historyRepository.findMany({
      deviceId: query.deviceId,
      userId: query.userId,
      cursor: query.cursor,
      limit: query.limit,
    });
    return toPage(rows, query.limit);
  },

  async streamCsvExport(filter: HistoryFilter, writeChunk: (chunk: string) => void): Promise<void> {
    // UTF-8 BOM для коректного відображення кирилиці в Excel
    writeChunk('\uFEFF');
    writeChunk(
      [
        'Дата видачі',
        'Дата повернення',
        'Інвентарний номер',
        'Пристрій',
        'Категорія',
        'Співробітник',
        'Статус',
      ]
        .map(escapeCsvCell)
        .join(',') + '\r\n',
    );

    const batchSize = 200;
    let cursor: number | undefined;

    while (true) {
      const batch = await historyRepository.findBatchForExport({
        deviceId: filter.deviceId,
        userId: filter.userId,
        cursor,
        batchSize,
      });

      if (batch.length === 0) {
        break;
      }

      const lines = batch
        .map((row) =>
          [
            row.assigned_at ? row.assigned_at.toISOString() : '',
            row.returned_at ? row.returned_at.toISOString() : '',
            row.device.inventory_number,
            row.device.name,
            row.device.category.name,
            row.user.full_name,
            row.status,
          ]
            .map(escapeCsvCell)
            .join(','),
        )
        .join('\r\n');

      writeChunk(`${lines}\r\n`);

      if (batch.length < batchSize) {
        break;
      }
      cursor = batch[batch.length - 1]!.id;
    }
  },
};
