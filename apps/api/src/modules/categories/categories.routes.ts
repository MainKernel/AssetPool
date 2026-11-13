import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../shared/middlewares/auth.middleware.js';
import { validate } from '../../shared/middlewares/validate.js';
import { idParamSchema, type IdParam } from '../../shared/schemas/common.schema.js';
import {
  categoryInputSchema,
  categoryUpdateSchema,
  type CategoryInput,
  type CategoryUpdateInput,
} from './categories.schema.js';
import { categoriesService } from './categories.service.js';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get('/', async (_req, res, next) => {
  try {
    const categories = await categoriesService.list();
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post(
  '/',
  requireRole(Role.ADMIN),
  validate({ body: categoryInputSchema }),
  async (req, res, next) => {
    try {
      const body = req.validated!.body as CategoryInput;
      const created = await categoriesService.create(body);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  },
);

categoriesRouter.patch(
  '/:id',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema, body: categoryUpdateSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated!.params as IdParam;
      const body = req.validated!.body as CategoryUpdateInput;
      const updated = await categoriesService.update(id, body);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

categoriesRouter.delete(
  '/:id',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated!.params as IdParam;
      await categoriesService.remove(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
