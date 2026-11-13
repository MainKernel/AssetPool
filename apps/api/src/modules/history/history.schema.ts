import { z } from 'zod';

import { paginationQuerySchema } from '../../shared/schemas/common.schema.js';

export const historyFilterSchema = z.object({
  deviceId: z.coerce.number().int().min(1).optional(),
  userId: z.coerce.number().int().min(1).optional(),
});

export const listHistoryQuerySchema = paginationQuerySchema.merge(historyFilterSchema);

export type HistoryFilter = z.infer<typeof historyFilterSchema>;
export type ListHistoryQuery = z.infer<typeof listHistoryQuerySchema>;
