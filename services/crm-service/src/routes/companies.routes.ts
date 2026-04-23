import { Router, Request, Response } from 'express';
import { CrmService } from '../services/CrmService';
import {
  crmOperationMiddleware,
  crmDataAccessMiddleware,
} from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseMiddleware';

const router = Router();
const crmService = new CrmService();

/**
 * @route   GET /companies
 * @desc    Search companies with filters and pagination
 * @access  Private
 */
router.get('/',
  crmDataAccessMiddleware('companies', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    const result = { companies: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'companies');
  })
);

/**
 * @route   POST /companies
 * @desc    Create a new company
 * @access  Private
 */
router.post('/',
  crmOperationMiddleware('create_company', 'company'),
  asyncHandler(async (req: Request, res: Response) => {
    const company = await crmService.createCompany(req.body, {
      userId: (req as any).user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.companyCreated(res, company);
  })
);

/**
 * @route   GET /companies/:id
 * @desc    Get company by ID
 * @access  Private
 */
router.get('/:id',
  crmDataAccessMiddleware('companies', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const company = await crmService.getCompanyById(parseInt(req.params.id));

    CrmResponseHelper.success(res, company, 'Company retrieved successfully');
  })
);

export default router;