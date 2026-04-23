import { Router, Request, Response } from 'express';
import { CrmService } from '../services/CrmService';
import {
  crmOperationMiddleware,
  crmDataAccessMiddleware,
  emailCampaignMiddleware,
} from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseMiddleware';

const router = Router();
const crmService = new CrmService();

/**
 * @route   GET /email-campaigns
 * @desc    Get email campaigns with pagination
 * @access  Private
 */
router.get('/',
  crmDataAccessMiddleware('email_campaigns', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = { campaigns: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'campaigns');
  })
);

/**
 * @route   POST /email-campaigns
 * @desc    Create a new email campaign
 * @access  Private
 */
router.post('/',
  emailCampaignMiddleware('creation'),
  crmOperationMiddleware('create_email_campaign', 'campaign'),
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = { id: 1, ...req.body, createdAt: new Date() };

    CrmResponseHelper.emailCampaignCreated(res, campaign);
  })
);

/**
 * @route   POST /email-campaigns/:id/send
 * @desc    Send email campaign
 * @access  Private
 */
router.post('/:id/send',
  emailCampaignMiddleware('send'),
  crmOperationMiddleware('send_email_campaign', 'campaign'),
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = { id: parseInt(req.params.id), sentAt: new Date() };
    const recipientCount = req.body.recipientCount || 0;

    CrmResponseHelper.emailCampaignSent(res, campaign, recipientCount);
  })
);

export default router;