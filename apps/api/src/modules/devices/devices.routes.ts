import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../shared/middlewares/auth.middleware.js';
import { validate } from '../../shared/middlewares/validate.js';
import {
  idParamSchema,
  paginationQuerySchema,
  type IdParam,
  type PaginationQuery,
} from '../../shared/schemas/common.schema.js';
import {
  createDeviceSchema,
  listDevicesQuerySchema,
  updateDeviceSchema,
  type CreateDeviceInput,
  type ListDevicesQuery,
  type UpdateDeviceInput,
} from './devices.schema.js';
import { devicesService } from './devices.service.js';

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

devicesRouter.get('/', validate({ query: listDevicesQuerySchema }), async (req, res, next) => {
  try {
    const query = req.validated!.query as ListDevicesQuery;
    const page = await devicesService.list(query, req.user!);
    res.status(200).json(page);
  } catch (error) {
    next(error);
  }
});

devicesRouter.post(
  '/',
  requireRole(Role.ADMIN),
  validate({ body: createDeviceSchema }),
  async (req, res, next) => {
    try {
      const body = req.validated!.body as CreateDeviceInput;
      const created = await devicesService.create(body);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  },
);

devicesRouter.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.validated!.params as IdParam;
    const device = await devicesService.getById(id, req.user!);
    res.status(200).json(device);
  } catch (error) {
    next(error);
  }
});

devicesRouter.patch(
  '/:id',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema, body: updateDeviceSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated!.params as IdParam;
      const body = req.validated!.body as UpdateDeviceInput;
      const updated = await devicesService.update(id, body);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

devicesRouter.delete(
  '/:id',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated!.params as IdParam;
      await devicesService.remove(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

devicesRouter.post(
  '/:id/write-off',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated!.params as IdParam;
      const device = await devicesService.writeOff(id);
      res.status(200).json(device);
    } catch (error) {
      next(error);
    }
  },
);

devicesRouter.get(
  '/:id/history',
  requireRole(Role.ADMIN),
  validate({ params: idParamSchema, query: paginationQuerySchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated!.params as IdParam;
      const query = req.validated!.query as PaginationQuery;
      const page = await devicesService.getHistory(id, query);
      res.status(200).json(page);
    } catch (error) {
      next(error);
    }
  },
);
