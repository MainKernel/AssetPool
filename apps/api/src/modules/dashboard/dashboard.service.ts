import { DeviceStatus, Role } from '@prisma/client';

import type { AuthUser } from '../../shared/middlewares/auth.middleware.js';
import { dashboardRepository } from './dashboard.repository.js';

export const dashboardService = {
  async getStats(user: AuthUser) {
    if (user.role === Role.ADMIN) {
      const { deviceCounts, pendingRequests, issuedLast30Days } =
        await dashboardRepository.getAdminStats();

      const countByStatus = new Map(deviceCounts.map((row) => [row.status, row._count._all]));

      return {
        role: Role.ADMIN,
        devices_available: countByStatus.get(DeviceStatus.AVAILABLE) ?? 0,
        devices_issued: countByStatus.get(DeviceStatus.ISSUED) ?? 0,
        devices_written_off: countByStatus.get(DeviceStatus.WRITTEN_OFF) ?? 0,
        pending_requests: pendingRequests,
        issued_last_30_days: issuedLast30Days,
      };
    }

    const { myDevicesCount, myPendingCount, recentAssignments } =
      await dashboardRepository.getEmployeeStats(user.id);

    return {
      role: Role.EMPLOYEE,
      my_devices_count: myDevicesCount,
      my_pending_count: myPendingCount,
      recent_assignments: recentAssignments,
    };
  },
};
