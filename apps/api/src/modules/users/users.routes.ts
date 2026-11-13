import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../shared/middlewares/auth.middleware.js';
import { validate } from '../../shared/middlewares/validate.js';
import { paginationQuerySchema, type PaginationQuery } from '../../shared/schemas/common.schema.js';
import { usersService } from './users.service.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/me/devices', async (req, res, next) => {
  try {
    const devices = await usersService.getMyDevices(req.user!.id);
    res.status(200).json(devices);
  } catch (error) {
    next(error);
  }
});

usersRouter.get(
  '/me/assignments',
  validate({ query: paginationQuerySchema }),
  async (req, res, next) => {
    try {
      const query = req.validated!.query as PaginationQuery;
      const page = await usersService.getMyAssignments(req.user!.id, query);
      res.status(200).json(page);
    } catch (error) {
      next(error);
    }
  },
);

usersRouter.get('/', requireRole(Role.ADMIN), async (_req, res, next) => {
  try {
    const users = await usersService.listAll();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});
