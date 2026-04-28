import { Router, Request, Response } from 'express';
import { CrmService } from '../services/CrmService';
import {
  crmOperationMiddleware,
  crmDataAccessMiddleware,
  quoteLifecycleMiddleware,
} from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseStandardization';

const router = Router();
const crmService = new CrmService();

/**
 * @route   POST /quotes
 * @desc    Create new quote for prospect/client
 * @access  Private
 */
router.post('/',
  crmOperationMiddleware('create_quote', 'quote'),
  asyncHandler(async (req: Request, res: Response) => {
    const quote = await crmService.createQuote(req.body, {
      userId: (req as any).user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.success(res, quote, 'Quote created successfully');
  })
);

/**
 * @route   GET /quotes/:id
 * @desc    Get quote by ID
 * @access  Private
 */
router.get('/:id',
  crmDataAccessMiddleware('quotes', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const quote = await crmService.getQuoteById(parseInt(req.params.id));

    CrmResponseHelper.success(res, quote, 'Quote retrieved successfully');
  })
);

/**
 * @route   POST /quotes/:id/send-to-insurances
 * @desc    Send quote to multiple insurance providers
 * @access  Private
 */
router.post('/:id/send-to-insurances',
  quoteLifecycleMiddleware('send'),
  crmOperationMiddleware('send_quote', 'quote'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await crmService.sendQuoteToInsurances(
      parseInt(req.params.id),
      req.body.insuranceProviders,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, result, 'Quote sent to insurance providers');
  })
);

/**
 * @route   POST /quotes/:id/receive
 * @desc    Record received quote from insurance
 * @access  Private
 */
router.post('/:id/receive',
  quoteLifecycleMiddleware('receive'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await crmService.recordReceivedQuote(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, result, 'Insurance quote received');
  })
);

/**
 * @route   POST /quotes/:id/approve
 * @desc    Approve quote and lock other quotes
 * @access  Private
 */
router.post('/:id/approve',
  quoteLifecycleMiddleware('approve'),
  crmOperationMiddleware('approve_quote', 'quote'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await crmService.approveQuote(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, result, 'Quote approved. All other quotes have been locked.');
  })
);

/**
 * @route   POST /quotes/:id/reject
 * @desc    Reject quote with reason code
 * @access  Private
 */
router.post('/:id/reject',
  quoteLifecycleMiddleware('reject'),
  crmOperationMiddleware('reject_quote', 'quote'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await crmService.rejectQuote(
      parseInt(req.params.id),
      req.body.rejectCode,
      req.body.rejectReason,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, result, 'Quote rejected');
  })
);

/**
 * @route   PUT /quotes/:id/negotiate
 * @desc    Update quote during negotiation phase
 * @access  Private
 */
router.put('/:id/negotiate',
  quoteLifecycleMiddleware('negotiate'),
  crmOperationMiddleware('update_quote', 'quote'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await crmService.updateQuoteNegotiation(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, result, 'Quote updated during negotiation');
  })
);

/**
 * @route   POST /quotes/:id/documents
 * @desc    Attach document to quote (RFP, acceptance letter)
 * @access  Private
 */
router.post('/:id/documents',
  crmOperationMiddleware('attach_document', 'quote'),
  asyncHandler(async (req: Request, res: Response) => {
    const document = await crmService.attachQuoteDocument(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req as any).user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, document, 'Document attached to quote');
  })
);

export default router;