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
 * @route   GET /contacts
 * @desc    Search contacts with filters and pagination
 * @access  Private
 */
router.get('/',
  crmDataAccessMiddleware('contacts', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    const result = { contacts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'contacts');
  })
);

/**
 * @route   POST /contacts
 * @desc    Create a new contact
 * @access  Private
 */
router.post('/',
  crmOperationMiddleware('create_contact', 'contact'),
  asyncHandler(async (req: Request, res: Response) => {
    const contact = await crmService.createContact(req.body, {
      userId: (req as any).user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.contactCreated(res, contact);
  })
);

/**
 * @route   GET /contacts/:id
 * @desc    Get contact by ID
 * @access  Private
 */
router.get('/:id',
  crmDataAccessMiddleware('contacts', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const contact = await crmService.getContactById(parseInt(req.params.id));

    CrmResponseHelper.success(res, contact, 'Contact retrieved successfully');
  })
);

export default router;