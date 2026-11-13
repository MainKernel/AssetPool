import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некоректний формат email').max(255),
  password: z
    .string()
    .min(8, 'Пароль має містити щонайменше 8 символів')
    .max(128, 'Пароль не може перевищувати 128 символів'),
  full_name: z
    .string()
    .trim()
    .min(2, 'Ім’я має містити щонайменше 2 символи')
    .max(255, 'Ім’я не може перевищувати 255 символів'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+$/, 'Некоректний формат email')
    .max(255),
  password: z
    .string()
    .min(1, 'Введіть пароль')
    .max(128, 'Пароль не може перевищувати 128 символів'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
