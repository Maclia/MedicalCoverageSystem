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
 * @route   POST /clients/convert/:companyId
 * @desc    Convert prospect to client
 * @access  Private
 */
router.post('/convert/:companyId',
  crmOperationMiddleware('convert_client', 'client'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await crmService.convertToClient(
      parseInt(req.params.companyId),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, result, 'Prospect converted to client successfully');
  })
);

/**
 * @route   GET /clients/:id
 * @desc    Get client by ID
 * @access  Private
 */
router.get('/:id',
  crmDataAccessMiddleware('clients', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const client = await crmService.getClientById(parseInt(req.params.id));

    CrmResponseHelper.success(res, client, 'Client retrieved successfully');
  })
);

/**
 * @route   POST /clients/:id/documents
 * @desc    Upload KYC document for client
 * @access  Private
 */
router.post('/:id/documents',
  crmOperationMiddleware('upload_document', 'client'),
  asyncHandler(async (req: Request, res: Response) => {
    const document = await crmService.uploadClientDocument(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, document, 'Client document uploaded successfully');
  })
);

/**
 * @route   POST /clients/:id/sla
 * @desc    Attach SLA to client
 * @access  Private
 */
router.post('/:id/sla',
  crmOperationMiddleware('attach_sla', 'client'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await crmService.attachClientSLA(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, result, 'SLA attached to client successfully');
  })
);

export default router;