import { Router, Request, Response } from 'express';
import { CrmService } from '../services/CrmService';
import { crmDataAccessMiddleware } from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseStandardization';

const router = Router();
const crmService = new CrmService();

/**
 * @route   GET /dashboard/metrics
 * @desc    Get CRM dashboard metrics
 * @access  Private
 */
router.get('/metrics',
  crmDataAccessMiddleware('analytics', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const metrics = await crmService.getDashboardMetrics(req.query);

    CrmResponseHelper.dashboardMetrics(res, metrics);
  })
);

export default router;
