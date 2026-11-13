import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../shared/middlewares/auth.middleware.js';
import { validate } from '../../shared/middlewares/validate.js';
import {
  historyFilterSchema,
  listHistoryQuerySchema,
  type HistoryFilter,
  type ListHistoryQuery,
} from './history.schema.js';
import { historyService } from './history.service.js';

export const historyRouter = Router();

historyRouter.use(requireAuth, requireRole(Role.ADMIN));

historyRouter.get('/', validate({ query: listHistoryQuerySchema }), async (req, res, next) => {
  try {
    const query = req.validated!.query as ListHistoryQuery;
    const page = await historyService.list(query);
    res.status(200).json(page);
  } catch (error) {
    next(error);
  }
});

historyRouter.get(
  '/export.csv',
  validate({ query: historyFilterSchema }),
  async (req, res, next) => {
    try {
      const filter = req.validated!.query as HistoryFilter;
      res.status(200);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="history.csv"');

      await historyService.streamCsvExport(filter, (chunk) => {
        res.write(chunk);
      });
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      } else {
        res.end();
      }
    }
  },
);
