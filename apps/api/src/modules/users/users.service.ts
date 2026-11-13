import type { PaginationQuery } from '../../shared/schemas/common.schema.js';
import { toPage } from '../../shared/utils/pagination.js';
import { usersRepository } from './users.repository.js';

export const usersService = {
  listAll() {
    return usersRepository.findAllPublic();
  },

  getMyDevices(userId: number) {
    return usersRepository.findActiveDevicesByUser(userId);
  },

  async getMyAssignments(userId: number, pagination: PaginationQuery) {
    const rows = await usersRepository.findAssignmentsByUser(
      userId,
      pagination.cursor,
      pagination.limit,
    );
    return toPage(rows, pagination.limit);
  },
};
