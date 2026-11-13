import { Role } from '@prisma/client';

import { NotFoundError } from '../../shared/errors/problem.js';
import type { AuthUser } from '../../shared/middlewares/auth.middleware.js';
import { assertOwnerOrAdmin } from '../../shared/utils/ownership.js';
import { toPage } from '../../shared/utils/pagination.js';
import { assignmentsRepository } from './assignments.repository.js';
import type {
  CreateAssignmentInput,
  DirectIssueInput,
  ListAssignmentsQuery,
} from './assignments.schema.js';

export const assignmentsService = {
  async list(query: ListAssignmentsQuery) {
    const rows = await assignmentsRepository.findMany({
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
    return toPage(rows, query.limit);
  },

  async getById(id: number, user: AuthUser) {
    const assignment = await assignmentsRepository.findById(id);
    if (!assignment) {
      throw new NotFoundError('Заявку не знайдено');
    }
    assertOwnerOrAdmin(assignment.user_id, user, 'Заявку не знайдено');
    return assignment;
  },

  create(input: CreateAssignmentInput, user: AuthUser) {
    return assignmentsRepository.createPending({
      userId: user.id,
      deviceId: input.device_id,
      isEmployee: user.role === Role.EMPLOYEE,
    });
  },

  issue(assignmentId: number) {
    return assignmentsRepository.issue(assignmentId);
  },

  issueDirect(input: DirectIssueInput) {
    return assignmentsRepository.issueDirect({
      deviceId: input.device_id,
      userId: input.user_id,
    });
  },

  reject(assignmentId: number) {
    return assignmentsRepository.reject(assignmentId);
  },

  returnDevice(assignmentId: number) {
    return assignmentsRepository.returnDevice(assignmentId);
  },
};
