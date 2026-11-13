import { AssignmentStatus, DeviceStatus, type Prisma } from '@prisma/client';

import { prisma } from '../../shared/db/prisma.client.js';
import { ConflictError, NotFoundError, PROBLEM_TYPES } from '../../shared/errors/problem.js';
import { buildCursorPagination } from '../../shared/utils/pagination.js';
import { userPublicSelect } from '../auth/auth.repository.js';

export const devicesRepository = {
  findMany(params: { where: Prisma.DeviceWhereInput; cursor?: number; limit: number }) {
    return prisma.device.findMany({
      where: params.where,
      ...buildCursorPagination(params.cursor, params.limit),
      orderBy: { id: 'asc' },
      include: {
        category: true,
      },
    });
  },

  findById(id: number) {
    return prisma.device.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  },

  findByInventoryNumber(inventoryNumber: string) {
    return prisma.device.findUnique({
      where: { inventory_number: inventoryNumber },
    });
  },

  create(data: { name: string; inventory_number: string; category_id: number }) {
    return prisma.device.create({
      data: {
        name: data.name,
        inventory_number: data.inventory_number,
        category_id: data.category_id,
        status: DeviceStatus.AVAILABLE,
      },
      include: {
        category: true,
      },
    });
  },

  update(
    id: number,
    data: {
      name?: string;
      inventory_number?: string;
      category_id?: number;
      status?: DeviceStatus;
    },
  ) {
    return prisma.device.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  },

  countAssignments(deviceId: number) {
    return prisma.assignment.count({
      where: { device_id: deviceId },
    });
  },

  delete(id: number) {
    return prisma.device.delete({
      where: { id },
    });
  },

  writeOff(id: number) {
    return prisma.$transaction(
      async (tx) => {
        const [locked] = await tx.$queryRaw<{ id: number; status: DeviceStatus }[]>`
          SELECT id, status FROM devices WHERE id = ${id} FOR UPDATE
        `;

        if (!locked) {
          throw new NotFoundError('Пристрій не знайдено');
        }

        if (locked.status === DeviceStatus.ISSUED) {
          throw new ConflictError(
            'Неможливо списати виданий пристрій. Спершу оформіть повернення',
            PROBLEM_TYPES.INVALID_STATE_TRANSITION,
          );
        }

        if (locked.status === DeviceStatus.WRITTEN_OFF) {
          throw new ConflictError('Пристрій уже списано', PROBLEM_TYPES.INVALID_STATE_TRANSITION);
        }

        const updatedDevice = await tx.device.update({
          where: { id },
          data: { status: DeviceStatus.WRITTEN_OFF },
          include: { category: true },
        });

        await tx.assignment.updateMany({
          where: {
            device_id: id,
            status: AssignmentStatus.PENDING,
          },
          data: { status: AssignmentStatus.REJECTED },
        });

        return updatedDevice;
      },
      { timeout: 10_000 },
    );
  },

  findHistory(deviceId: number, cursor: number | undefined, limit: number) {
    return prisma.assignment.findMany({
      where: { device_id: deviceId },
      ...buildCursorPagination(cursor, limit),
      orderBy: { id: 'desc' },
      include: {
        user: { select: userPublicSelect },
        device: { include: { category: true } },
      },
    });
  },
};
