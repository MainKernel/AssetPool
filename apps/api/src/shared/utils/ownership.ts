import { Role } from '@prisma/client';

import { NotFoundError } from '../errors/problem.js';
import type { AuthUser } from '../middlewares/auth.middleware.js';

/**
 * Повертає фільтр user_id для запитів Prisma згідно з правилом НВ-2 («чужий ресурс = 404»):
 * ADMIN бачить усі ресурси, EMPLOYEE — лише власні.
 */
export function ownerFilter(user: AuthUser): { user_id?: number } {
  return user.role === Role.ADMIN ? {} : { user_id: user.id };
}

/**
 * Перевіряє право доступу до ресурсу. Якщо ресурс належить іншому користувачеві
 * і поточний користувач не є ADMIN, кидає NotFoundError (404 замість 403).
 */
export function assertOwnerOrAdmin(
  resourceUserId: number,
  user: AuthUser,
  notFoundDetail = 'Запитуваний ресурс не знайдено',
): void {
  if (user.role !== Role.ADMIN && resourceUserId !== user.id) {
    throw new NotFoundError(notFoundDetail);
  }
}
