import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().min(1, 'Ідентифікатор має бути додатним цілим числом'),
});

export const paginationQuerySchema = z.object({
  cursor: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
