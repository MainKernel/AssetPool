import { AssignmentStatus } from '@prisma/client';

import { prisma } from '../../shared/db/prisma.client.js';
import { buildCursorPagination } from '../../shared/utils/pagination.js';
import { assignmentInclude } from '../assignments/assignments.repository.js';
import { userPublicSelect } from '../auth/auth.repository.js';

export const usersRepository = {
  findAllPublic() {
    return prisma.user.findMany({
      select: userPublicSelect,
      orderBy: { full_name: 'asc' },
    });
  },

  async findActiveDevicesByUser(userId: number) {
    const activeAssignments = await prisma.assignment.findMany({
      where: {
        user_id: userId,
        status: AssignmentStatus.ACTIVE,
      },
      orderBy: { assigned_at: 'desc' },
      include: {
        device: {
          include: { category: true },
        },
      },
    });
    return activeAssignments.map((a) => a.device);
  },

  findAssignmentsByUser(userId: number, cursor: number | undefined, limit: number) {
    return prisma.assignment.findMany({
      where: { user_id: userId },
      ...buildCursorPagination(cursor, limit),
      orderBy: { id: 'desc' },
      include: assignmentInclude,
    });
  },
};
