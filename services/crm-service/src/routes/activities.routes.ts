import { Router, Request, Response } from 'express';
import { CrmService } from '../services/CrmService';
import {
  crmOperationMiddleware,
  crmDataAccessMiddleware,
} from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseStandardization';

const router = Router();
const crmService = new CrmService();

/**
 * @route   GET /activities
 * @desc    Search activities with filters and pagination
 * @access  Private
 */
router.get('/',
  crmDataAccessMiddleware('activities', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    const result = { activities: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'activities');
  })
);

/**
 * @route   POST /activities
 * @desc    Create a new activity
 * @access  Private
 */
router.post('/',
  crmOperationMiddleware('create_activity', 'activity'),
  asyncHandler(async (req: Request, res: Response) => {
    const activity = await crmService.createActivity(req.body, {
      userId: (req as any).user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.activityCreated(res, activity);
  })
);

/**
 * @route   GET /activities/:id
 * @desc    Get activity by ID
 * @access  Private
 */
router.get('/:id',
  crmDataAccessMiddleware('activities', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const activity = await crmService.getActivityById(parseInt(req.params.id));

    CrmResponseHelper.success(res, activity, 'Activity retrieved successfully');
  })
);

/**
 * @route   PUT /activities/:id
 * @desc    Update activity
 * @access  Private
 */
router.put('/:id',
  crmOperationMiddleware('update_activity', 'activity'),
  asyncHandler(async (req: Request, res: Response) => {
    const activity = await crmService.updateActivity(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, activity, 'Activity updated successfully');
  })
);

export default router;
