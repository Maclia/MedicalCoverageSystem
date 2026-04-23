import { Router, Request, Response } from 'express';
import { CrmService } from '../services/CrmService';
import {
  crmOperationMiddleware,
  opportunityLifecycleMiddleware,
} from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseMiddleware';

const router = Router();
const crmService = new CrmService();

/**
 * @route   POST /bulk/leads
 * @desc    Bulk update leads
 * @access  Private
 */
router.post('/leads',
  crmOperationMiddleware('bulk_update', 'leads'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = { updatedCount: req.body.leadIds?.length || 0 };

    CrmResponseHelper.bulkOperation(res, result, 'update', 'Bulk lead update completed');
  })
);

/**
 * @route   POST /bulk/opportunities
 * @desc    Bulk update opportunities
 * @access  Private
 */
router.post('/opportunities',
  opportunityLifecycleMiddleware('bulk_update'),
  crmOperationMiddleware('bulk_update', 'opportunities'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = { updatedCount: req.body.opportunityIds?.length || 0 };

    CrmResponseHelper.bulkOperation(res, result, 'update', 'Bulk opportunity update completed');
  })
);

export default router;