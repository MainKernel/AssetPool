import { DeviceStatus, Role, type Prisma } from '@prisma/client';

import { ConflictError, NotFoundError, PROBLEM_TYPES } from '../../shared/errors/problem.js';
import type { AuthUser } from '../../shared/middlewares/auth.middleware.js';
import type { PaginationQuery } from '../../shared/schemas/common.schema.js';
import { toPage } from '../../shared/utils/pagination.js';
import { categoriesRepository } from '../categories/categories.repository.js';
import { devicesRepository } from './devices.repository.js';
import type { CreateDeviceInput, ListDevicesQuery, UpdateDeviceInput } from './devices.schema.js';

export const devicesService = {
  async list(query: ListDevicesQuery, user: AuthUser) {
    if (user.role === Role.EMPLOYEE && query.status === DeviceStatus.WRITTEN_OFF) {
      return { data: [], nextCursor: null };
    }

    const where: Prisma.DeviceWhereInput = {
      ...(query.categoryId !== undefined ? { category_id: query.categoryId } : {}),
      ...(user.role === Role.EMPLOYEE
        ? { status: query.status ?? { not: DeviceStatus.WRITTEN_OFF } }
        : query.status !== undefined
          ? { status: query.status }
          : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { inventory_number: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await devicesRepository.findMany({
      where,
      cursor: query.cursor,
      limit: query.limit,
    });

    return toPage(rows, query.limit);
  },

  async getById(id: number, user: AuthUser) {
    const device = await devicesRepository.findById(id);
    if (!device || (user.role === Role.EMPLOYEE && device.status === DeviceStatus.WRITTEN_OFF)) {
      throw new NotFoundError('Пристрій не знайдено');
    }
    return device;
  },

  async create(input: CreateDeviceInput) {
    const category = await categoriesRepository.findById(input.category_id);
    if (!category) {
      throw new NotFoundError('Категорію не знайдено');
    }

    const duplicate = await devicesRepository.findByInventoryNumber(input.inventory_number);
    if (duplicate) {
      throw new ConflictError(
        'Пристрій із таким інвентарним номером вже існує',
        PROBLEM_TYPES.DUPLICATE_RESOURCE,
      );
    }

    return devicesRepository.create(input);
  },

  async update(id: number, input: UpdateDeviceInput) {
    const current = await devicesRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Пристрій не знайдено');
    }

    if (input.status !== undefined && input.status !== current.status) {
      if (current.status === DeviceStatus.ISSUED || input.status === DeviceStatus.ISSUED) {
        throw new ConflictError(
          'Статус ISSUED можна змінювати лише через видачу або повернення пристрою',
          PROBLEM_TYPES.INVALID_STATE_TRANSITION,
        );
      }
    }

    if (input.category_id !== undefined) {
      const category = await categoriesRepository.findById(input.category_id);
      if (!category) {
        throw new NotFoundError('Категорію не знайдено');
      }
    }

    if (input.inventory_number !== undefined) {
      const duplicate = await devicesRepository.findByInventoryNumber(input.inventory_number);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(
          'Пристрій із таким інвентарним номером вже існує',
          PROBLEM_TYPES.DUPLICATE_RESOURCE,
        );
      }
    }

    return devicesRepository.update(id, input);
  },

  writeOff(id: number) {
    return devicesRepository.writeOff(id);
  },

  async remove(id: number) {
    const current = await devicesRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Пристрій не знайдено');
    }

    const assignmentsCount = await devicesRepository.countAssignments(id);
    if (assignmentsCount > 0) {
      throw new ConflictError(
        'Пристрій має історію видач — використайте списання',
        PROBLEM_TYPES.INVALID_STATE_TRANSITION,
      );
    }

    await devicesRepository.delete(id);
  },

  async getHistory(id: number, pagination: PaginationQuery) {
    const current = await devicesRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Пристрій не знайдено');
    }

    const rows = await devicesRepository.findHistory(id, pagination.cursor, pagination.limit);
    return toPage(rows, pagination.limit);
  },
};
