import { DeviceStatus } from '@prisma/client';
import { z } from 'zod';

import { paginationQuerySchema } from '../../shared/schemas/common.schema.js';

export const listDevicesQuerySchema = paginationQuerySchema.extend({
  categoryId: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(DeviceStatus).optional(),
});

export const createDeviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Назва пристрою обов’язкова')
    .max(255, 'Назва пристрою не може перевищувати 255 символів'),
  inventory_number: z
    .string()
    .trim()
    .min(1, 'Інвентарний номер обов’язковий')
    .max(100, 'Інвентарний номер не може перевищувати 100 символів'),
  category_id: z.coerce.number().int().min(1, 'Оберіть коректну категорію'),
});

export const updateDeviceSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    inventory_number: z.string().trim().min(1).max(100).optional(),
    category_id: z.coerce.number().int().min(1).optional(),
    status: z.nativeEnum(DeviceStatus).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.inventory_number !== undefined ||
      data.category_id !== undefined ||
      data.status !== undefined,
    { message: 'Необхідно передати хоча б одне поле для оновлення' },
  );

export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
