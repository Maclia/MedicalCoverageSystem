import { Router, Request, Response } from 'express';
import { CrmService } from '../services/CrmService';
import {
  crmOperationMiddleware,
  crmDataAccessMiddleware,
  opportunityLifecycleMiddleware,
} from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseMiddleware';

const router = Router();
const crmService = new CrmService();

/**
 * @route   GET /opportunities
 * @desc    Search opportunities with filters and pagination
 * @access  Private
 */
router.get('/',
  crmDataAccessMiddleware('opportunities', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    const result = { opportunities: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'opportunities');
  })
);

/**
 * @route   POST /opportunities
 * @desc    Create a new opportunity
 * @access  Private
 */
router.post('/',
  opportunityLifecycleMiddleware('creation'),
  crmOperationMiddleware('create_opportunity', 'opportunity'),
  asyncHandler(async (req: Request, res: Response) => {
    const opportunity = await crmService.createOpportunity(req.body, {
      userId: (req as any).user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.opportunityCreated(res, opportunity);
  })
);

/**
 * @route   GET /opportunities/:id
 * @desc    Get opportunity by ID
 * @access  Private
 */
router.get('/:id',
  crmDataAccessMiddleware('opportunities', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const opportunity = await crmService.getOpportunityById(parseInt(req.params.id));

    CrmResponseHelper.success(res, opportunity, 'Opportunity retrieved successfully');
  })
);

/**
 * @route   PUT /opportunities/:id
 * @desc    Update opportunity
 * @access  Private
 */
router.put('/:id',
  opportunityLifecycleMiddleware('update'),
  crmOperationMiddleware('update_opportunity', 'opportunity'),
  asyncHandler(async (req: Request, res: Response) => {
    const opportunity = await crmService.updateOpportunity(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.opportunityUpdated(res, opportunity);
  })
);

export default router;