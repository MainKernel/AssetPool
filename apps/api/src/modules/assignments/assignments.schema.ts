import { AssignmentStatus } from '@prisma/client';
import { z } from 'zod';

import { paginationQuerySchema } from '../../shared/schemas/common.schema.js';

export const listAssignmentsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(AssignmentStatus).default(AssignmentStatus.PENDING),
});

export const createAssignmentSchema = z.object({
  device_id: z.coerce.number().int().min(1, 'Оберіть коректний пристрій'),
});

export const directIssueSchema = z.object({
  device_id: z.coerce.number().int().min(1, 'Оберіть коректний пристрій'),
  user_id: z.coerce.number().int().min(1, 'Оберіть коректного співробітника'),
});

export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type DirectIssueInput = z.infer<typeof directIssueSchema>;
