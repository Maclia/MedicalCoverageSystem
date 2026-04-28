import { Router, Request, Response } from 'express';
import { CrmService } from '../services/CrmService';
import {
  crmOperationMiddleware,
  crmDataAccessMiddleware,
  leadLifecycleMiddleware,
} from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseStandardization';

const router = Router();
const crmService = new CrmService();

/**
 * @route   GET /leads
 * @desc    Search leads with filters and pagination
 * @access  Private
 */
router.get('/',
  crmDataAccessMiddleware('leads', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    const result = await crmService.searchLeads(searchParams);

    CrmResponseHelper.searchResults(res, result, 'leads');
  })
);

/**
 * @route   POST /leads
 * @desc    Create a new lead
 * @access  Private
 */
router.post('/',
  crmOperationMiddleware('create_lead', 'lead'),
  asyncHandler(async (req: Request, res: Response) => {
    const lead = await crmService.createLead(req.body, {
      userId: (req as any).user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.leadCreated(res, lead);
  })
);

/**
 * @route   GET /leads/:id
 * @desc    Get lead by ID
 * @access  Private
 */
router.get('/:id',
  crmDataAccessMiddleware('leads', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const lead = await crmService.getLeadById(parseInt(req.params.id));

    CrmResponseHelper.success(res, lead, 'Lead retrieved successfully');
  })
);

/**
 * @route   PUT /leads/:id
 * @desc    Update lead information
 * @access  Private
 */
router.put('/:id',
  crmOperationMiddleware('update_lead', 'lead'),
  asyncHandler(async (req: Request, res: Response) => {
    const lead = await crmService.updateLead(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, lead, 'Lead updated successfully');
  })
);

/**
 * @route   POST /leads/:id/convert
 * @desc    Convert lead to prospect
 * @access  Private
 */
router.post('/:id/convert',
  leadLifecycleMiddleware('conversion'),
  crmOperationMiddleware('convert_lead', 'lead'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await crmService.convertToProspect(parseInt(req.params.id), {
      userId: (req as any).user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.leadConverted(res, result);
  })
);

/**
 * @route   POST /leads/:id/activities
 * @desc    Add activity/note to lead
 * @access  Private
 */
router.post('/:id/activities',
  crmOperationMiddleware('add_activity', 'lead'),
  asyncHandler(async (req: Request, res: Response) => {
    const activity = await crmService.addActivity(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, activity, 'Activity added successfully');
  })
);

/**
 * @route   GET /leads/:id/activities
 * @desc    Get all activities for lead
 * @access  Private
 */
router.get('/:id/activities',
  crmDataAccessMiddleware('leads', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const activities = await crmService.getLeadActivities(parseInt(req.params.id));

    CrmResponseHelper.success(res, activities, 'Activities retrieved successfully');
  })
);

/**
 * @route   POST /leads/:id/documents
 * @desc    Attach document to lead
 * @access  Private
 */
router.post('/:id/documents',
  crmOperationMiddleware('attach_document', 'lead'),
  asyncHandler(async (req: Request, res: Response) => {
    const document = await crmService.attachDocument(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, document, 'Document attached successfully');
  })
);

export default router;
