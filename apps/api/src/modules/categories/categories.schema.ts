import { z } from 'zod';

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Назва категорії обов’язкова')
    .max(100, 'Назва категорії не може перевищувати 100 символів'),
  description: z
    .string()
    .trim()
    .max(500, 'Опис не може перевищувати 500 символів')
    .nullable()
    .optional(),
});

export const categoryUpdateSchema = categoryInputSchema
  .partial()
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'Необхідно передати хоча б одне поле для оновлення',
  });

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
