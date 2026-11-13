import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../shared/middlewares/auth.middleware.js';
import { validate } from '../../shared/middlewares/validate.js';
import { idParamSchema, type IdParam } from '../../shared/schemas/common.schema.js';
import {
  createAssignmentSchema,
  directIssueSchema,
  listAssignmentsQuerySchema,
  type CreateAssignmentInput,
  type DirectIssueInput,
  type ListAssignmentsQuery,
} from './assignments.schema.js';
import { assignmentsService } from './assignments.service.js';

export const assignmentsRouter = Router();

assignmentsRouter.use(requireAuth);

assignmentsRouter.get(
  '/',
  requireRole(Role.ADMIN),
  validate({ query: listAssignmentsQuerySchema }),
  async (req, res, next) => {
    try {
      const query = req.validated!.query as ListAssignmentsQuery;
      const page = await assignmentsService.list(query);
      res.status(200).json(page);
    } catch (error) {
      next(error);
    }
  },
);

assignmentsRouter.post('/', validate({ body: createAssignmentSchema }), async (req, res, next) => {
  try {
    const body = req.validated!.body as CreateAssignmentInput;
    const created = await assignmentsService.create(body, req.user!);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

assignmentsRouter.post(
  '/issue',
  requireRole(Role.ADMIN),
  validate({ body: directIssueSchema }),
  async (req, res, next) => {
    try {
      const body = req.validated!.body as DirectIssueInput;
      const issued = await assignmentsService.issueDirect(body);
      res.status(201).json(issued);
    } catch (error) {
      next(error);
    }
  },
);

assignmentsRouter.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.validated!.params as IdParam;
    const assignment = await assignmentsService.getById(id, req.user!);
    res.status(200).json(assignment);
  } catch (error) {
    next(error);
  }
});

assignmentsRouter.post(
  '/:id/issue',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated!.params as IdParam;
      const issued = await assignmentsService.issue(id);
      res.status(201).json(issued);
    } catch (error) {
      next(error);
    }
  },
);

assignmentsRouter.post(
  '/:id/reject',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated!.params as IdParam;
      const rejected = await assignmentsService.reject(id);
      res.status(200).json(rejected);
    } catch (error) {
      next(error);
    }
  },
);

assignmentsRouter.post(
  '/:id/return',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated!.params as IdParam;
      const returned = await assignmentsService.returnDevice(id);
      res.status(200).json(returned);
    } catch (error) {
      next(error);
    }
  },
);
