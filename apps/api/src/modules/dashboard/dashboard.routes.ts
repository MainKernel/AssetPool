import { Router } from 'express';

import { requireAuth } from '../../shared/middlewares/auth.middleware.js';
import { dashboardService } from './dashboard.service.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/stats', async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats(req.user!);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
});
