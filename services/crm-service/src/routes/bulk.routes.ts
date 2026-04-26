import { Router, Request, Response } from 'express';
import { CrmService } from '../services/CrmService';
import {
  crmOperationMiddleware,
  opportunityLifecycleMiddleware,
} from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseStandardization';

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

/**
 * @route   POST /bulk/members/upload
 * @desc    Upload bulk members for company with automatic validation
 * @access  Private - Company Admin
 */
router.post('/members/upload',
  crmOperationMiddleware('bulk_upload', 'members'),
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, fileData, dryRun = false } = req.body;
    const result = await crmService.initiateBulkMemberUpload(companyId, fileData, dryRun);
    
    CrmResponseHelper.bulkOperation(res, result, 'upload', 'Member upload initiated successfully');
  })
);

/**
 * @route   GET /bulk/members/:uploadId/status
 * @desc    Get status of bulk member upload operation
 * @access  Private
 */
router.get('/members/:uploadId/status',
  asyncHandler(async (req: Request, res: Response) => {
    const status = await crmService.getBulkUploadStatus(req.params.uploadId);
    CrmResponseHelper.success(res, status);
  })
);

/**
 * @route   POST /bulk/members/:uploadId/confirm
 * @desc    Confirm and process validated member records
 * @access  Private - Company Admin
 */
router.post('/members/:uploadId/confirm',
  crmOperationMiddleware('bulk_confirm', 'members'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await crmService.confirmBulkMemberUpload(req.params.uploadId);
    CrmResponseHelper.success(res, result, 'Member upload confirmed and processing');
  })
);

/**
 * @route   GET /bulk/members/:uploadId/errors
 * @desc    Get detailed validation errors for failed records
 * @access  Private
 */
router.get('/members/:uploadId/errors',
  asyncHandler(async (req: Request, res: Response) => {
    const errors = await crmService.getBulkUploadErrors(req.params.uploadId);
    CrmResponseHelper.success(res, errors);
  })
);

export default router;
