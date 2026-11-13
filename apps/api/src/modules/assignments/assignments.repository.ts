import { AssignmentStatus, DeviceStatus, Prisma } from '@prisma/client';

import { prisma } from '../../shared/db/prisma.client.js';
import { ConflictError, NotFoundError, PROBLEM_TYPES } from '../../shared/errors/problem.js';
import { buildCursorPagination } from '../../shared/utils/pagination.js';
import { userPublicSelect } from '../auth/auth.repository.js';

export const assignmentInclude = {
  user: { select: userPublicSelect },
  device: { include: { category: true } },
} as const;

export const assignmentsRepository = {
  findMany(params: { status: AssignmentStatus; cursor?: number; limit: number }) {
    return prisma.assignment.findMany({
      where: { status: params.status },
      ...buildCursorPagination(params.cursor, params.limit),
      orderBy: { id: 'asc' },
      include: assignmentInclude,
    });
  },

  findById(id: number) {
    return prisma.assignment.findUnique({
      where: { id },
      include: assignmentInclude,
    });
  },

  async createPending(params: { userId: number; deviceId: number; isEmployee: boolean }) {
    const device = await prisma.device.findUnique({
      where: { id: params.deviceId },
    });

    if (!device || (params.isEmployee && device.status === DeviceStatus.WRITTEN_OFF)) {
      throw new NotFoundError('Пристрій не знайдено');
    }

    if (device.status !== DeviceStatus.AVAILABLE) {
      throw new ConflictError(
        'Пристрій недоступний для оформлення заявки',
        PROBLEM_TYPES.DEVICE_NOT_AVAILABLE,
      );
    }

    try {
      return await prisma.assignment.create({
        data: {
          user_id: params.userId,
          device_id: params.deviceId,
          status: AssignmentStatus.PENDING,
        },
        include: assignmentInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError(
          'У вас уже є активна заявка на цей пристрій',
          PROBLEM_TYPES.DUPLICATE_RESOURCE,
        );
      }
      throw error;
    }
  },

  issue(assignmentId: number) {
    return prisma.$transaction(
      async (tx) => {
        const current = await tx.assignment.findUnique({
          where: { id: assignmentId },
        });
        if (!current) {
          throw new NotFoundError('Заявку не знайдено');
        }

        // Фіксований порядок блокування: спочатку device, потім assignment (запобігання deadlock)
        const [device] = await tx.$queryRaw<{ id: number; status: DeviceStatus }[]>`
          SELECT id, status FROM devices WHERE id = ${current.device_id} FOR UPDATE
        `;
        const [locked] = await tx.$queryRaw<{ id: number; status: AssignmentStatus }[]>`
          SELECT id, status FROM assignments WHERE id = ${assignmentId} FOR UPDATE
        `;

        if (!device) {
          throw new NotFoundError('Пристрій не знайдено');
        }
        if (locked?.status !== AssignmentStatus.PENDING) {
          throw new ConflictError('Заявку вже оброблено', PROBLEM_TYPES.INVALID_STATE_TRANSITION);
        }
        if (device.status !== DeviceStatus.AVAILABLE) {
          throw new ConflictError(
            'Пристрій вже видано або недоступний',
            PROBLEM_TYPES.DEVICE_NOT_AVAILABLE,
          );
        }

        await tx.device.update({
          where: { id: device.id },
          data: { status: DeviceStatus.ISSUED },
        });

        const issued = await tx.assignment.update({
          where: { id: assignmentId },
          data: {
            status: AssignmentStatus.ACTIVE,
            assigned_at: new Date(),
          },
          include: assignmentInclude,
        });

        await tx.assignment.updateMany({
          where: {
            device_id: device.id,
            status: AssignmentStatus.PENDING,
            NOT: { id: assignmentId },
          },
          data: { status: AssignmentStatus.REJECTED },
        });

        return issued;
      },
      { timeout: 10_000 },
    );
  },

  async issueDirect(params: { deviceId: number; userId: number }) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundError('Користувача не знайдено');
    }

    return prisma.$transaction(
      async (tx) => {
        const [device] = await tx.$queryRaw<{ id: number; status: DeviceStatus }[]>`
          SELECT id, status FROM devices WHERE id = ${params.deviceId} FOR UPDATE
        `;

        if (!device) {
          throw new NotFoundError('Пристрій не знайдено');
        }
        if (device.status !== DeviceStatus.AVAILABLE) {
          throw new ConflictError(
            'Пристрій вже видано або недоступний',
            PROBLEM_TYPES.DEVICE_NOT_AVAILABLE,
          );
        }

        await tx.device.update({
          where: { id: device.id },
          data: { status: DeviceStatus.ISSUED },
        });

        const created = await tx.assignment.create({
          data: {
            user_id: params.userId,
            device_id: device.id,
            status: AssignmentStatus.ACTIVE,
            assigned_at: new Date(),
          },
          include: assignmentInclude,
        });

        await tx.assignment.updateMany({
          where: {
            device_id: device.id,
            status: AssignmentStatus.PENDING,
          },
          data: { status: AssignmentStatus.REJECTED },
        });

        return created;
      },
      { timeout: 10_000 },
    );
  },

  reject(assignmentId: number) {
    return prisma.$transaction(
      async (tx) => {
        const [locked] = await tx.$queryRaw<{ id: number; status: AssignmentStatus }[]>`
          SELECT id, status FROM assignments WHERE id = ${assignmentId} FOR UPDATE
        `;

        if (!locked) {
          throw new NotFoundError('Заявку не знайдено');
        }
        if (locked.status !== AssignmentStatus.PENDING) {
          throw new ConflictError(
            'Відхилити можна лише заявку зі статусом PENDING',
            PROBLEM_TYPES.INVALID_STATE_TRANSITION,
          );
        }

        return tx.assignment.update({
          where: { id: assignmentId },
          data: { status: AssignmentStatus.REJECTED },
          include: assignmentInclude,
        });
      },
      { timeout: 10_000 },
    );
  },

  returnDevice(assignmentId: number) {
    return prisma.$transaction(
      async (tx) => {
        const current = await tx.assignment.findUnique({
          where: { id: assignmentId },
        });
        if (!current) {
          throw new NotFoundError('Заявку не знайдено');
        }

        // Фіксований порядок блокування: спочатку device, потім assignment
        const [device] = await tx.$queryRaw<{ id: number; status: DeviceStatus }[]>`
          SELECT id, status FROM devices WHERE id = ${current.device_id} FOR UPDATE
        `;
        const [locked] = await tx.$queryRaw<{ id: number; status: AssignmentStatus }[]>`
          SELECT id, status FROM assignments WHERE id = ${assignmentId} FOR UPDATE
        `;

        if (!device) {
          throw new NotFoundError('Пристрій не знайдено');
        }
        if (locked?.status !== AssignmentStatus.ACTIVE) {
          throw new ConflictError(
            'Повернути можна лише активну видачу',
            PROBLEM_TYPES.INVALID_STATE_TRANSITION,
          );
        }

        await tx.device.update({
          where: { id: device.id },
          data: { status: DeviceStatus.AVAILABLE },
        });

        return tx.assignment.update({
          where: { id: assignmentId },
          data: {
            status: AssignmentStatus.RETURNED,
            returned_at: new Date(),
          },
          include: assignmentInclude,
        });
      },
      { timeout: 10_000 },
    );
  },
};
