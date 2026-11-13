import { AssignmentStatus, type Prisma } from '@prisma/client';

import { prisma } from '../../shared/db/prisma.client.js';
import { buildCursorPagination } from '../../shared/utils/pagination.js';
import { assignmentInclude } from '../assignments/assignments.repository.js';

const HISTORY_STATUSES = [AssignmentStatus.ACTIVE, AssignmentStatus.RETURNED];

function buildWhere(params: { deviceId?: number; userId?: number }): Prisma.AssignmentWhereInput {
  return {
    status: { in: HISTORY_STATUSES },
    ...(params.deviceId !== undefined ? { device_id: params.deviceId } : {}),
    ...(params.userId !== undefined ? { user_id: params.userId } : {}),
  };
}

export const historyRepository = {
  findMany(params: { deviceId?: number; userId?: number; cursor?: number; limit: number }) {
    return prisma.assignment.findMany({
      where: buildWhere(params),
      ...buildCursorPagination(params.cursor, params.limit),
      orderBy: { id: 'desc' },
      include: assignmentInclude,
    });
  },

  findBatchForExport(params: {
    deviceId?: number;
    userId?: number;
    cursor?: number;
    batchSize: number;
  }) {
    return prisma.assignment.findMany({
      where: buildWhere(params),
      take: params.batchSize,
      ...(params.cursor !== undefined ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
      include: assignmentInclude,
    });
  },
};
