import { AssignmentStatus } from '@prisma/client';

import { prisma } from '../../shared/db/prisma.client.js';
import { assignmentInclude } from '../assignments/assignments.repository.js';

export const dashboardRepository = {
  async getAdminStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [deviceCounts, pendingRequests, issuedLast30Days] = await Promise.all([
      prisma.device.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.assignment.count({
        where: { status: AssignmentStatus.PENDING },
      }),
      prisma.assignment.count({
        where: {
          assigned_at: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return { deviceCounts, pendingRequests, issuedLast30Days };
  },

  async getEmployeeStats(userId: number) {
    const [myDevicesCount, myPendingCount, recentAssignments] = await Promise.all([
      prisma.assignment.count({
        where: { user_id: userId, status: AssignmentStatus.ACTIVE },
      }),
      prisma.assignment.count({
        where: { user_id: userId, status: AssignmentStatus.PENDING },
      }),
      prisma.assignment.findMany({
        where: { user_id: userId },
        take: 5,
        orderBy: { id: 'desc' },
        include: assignmentInclude,
      }),
    ]);

    return { myDevicesCount, myPendingCount, recentAssignments };
  },
};
