import { Router } from 'express';
import { MembershipServiceSimplified } from '../services/MembershipService';
import { auditMiddleware, memberLifecycleMiddleware, sensitiveOperationMiddleware, dataAccessMiddleware } from '../middleware/auditMiddleware';
import { ResponseHelper, asyncHandler } from '../middleware/responseMiddleware';
import { validateRequest } from '../utils/validation';
import { createMemberSchema, suspendMemberSchema, renewMemberSchema, searchMembersSchema } from '../types/MembershipTypes';

const router = Router();
const membershipService = new MembershipServiceSimplified();

// Apply audit middleware to all routes
router.use(auditMiddleware);

/**
 * @route   POST /api/members
 * @desc    Create a new member
 * @access  Private
 */
router.post('/',
  sensitiveOperationMiddleware('member_creation'),
  validateRequest(createMemberSchema),
  asyncHandler(async (req, res) => {
    const member = await membershipService.createMember(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      userId: (req.user as any)?.userId
    });

    ResponseHelper.created(res, member, 'Member created successfully');
  })
);

/**
 * @route   GET /api/members
 * @desc    Search members with filters and pagination
 * @access  Private
 */
router.get('/',
  dataAccessMiddleware('members'),
  validateRequest(searchMembersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const searchParams = {
      query: req.query.query as string,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      pagination: req.query.pagination ? JSON.parse(req.query.pagination as string) : { page: 1, limit: 20 }
    };

    const result = await membershipService.searchMembers(searchParams);

    ResponseHelper.successWithPagination(
      res,
      result.members,
      result.pagination,
      'Members retrieved successfully'
    );
  })
);

/**
 * @route   GET /api/members/:id
 * @desc    Get member by ID
 * @access  Private
 */
router.get('/:id',
  dataAccessMiddleware('member'),
  asyncHandler(async (req, res) => {
    const member = await membershipService.getMemberById(parseInt(req.params.id));

    if (!member) {
      return ResponseHelper.notFound(res, 'Member');
    }

    ResponseHelper.success(res, member, 'Member retrieved successfully');
  })
);

/**
 * @route   PUT /api/members/:id
 * @desc    Update member information
 * @access  Private
 */
router.put('/:id',
  dataAccessMiddleware('member'),
  asyncHandler(async (req, res) => {
    const member = await membershipService.updateMember(
      parseInt(req.params.id),
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: (req.user as any)?.userId
      }
    );

    ResponseHelper.success(res, member, 'Member updated successfully');
  })
);

/**
 * @route   POST /api/members/:id/activate
 * @desc    Activate a member
 * @access  Private
 */
router.post('/:id/activate',
  memberLifecycleMiddleware('activation'),
  asyncHandler(async (req, res) => {
    const member = await membershipService.activateMember(
      parseInt(req.params.id),
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: (req.user as any)?.userId
      }
    );

    ResponseHelper.success(res, member, 'Member activated successfully');
  })
);

/**
 * @route   POST /api/members/:id/suspend
 * @desc    Suspend a member
 * @access  Private
 */
router.post('/:id/suspend',
  memberLifecycleMiddleware('suspension'),
  validateRequest(suspendMemberSchema),
  asyncHandler(async (req, res) => {
    const member = await membershipService.suspendMember(
      parseInt(req.params.id),
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: (req.user as any)?.userId
      }
    );

    ResponseHelper.success(res, member, 'Member suspended successfully');
  })
);

/**
 * @route   POST /api/members/:id/terminate
 * @desc    Terminate a member
 * @access  Private
 */
router.post('/:id/terminate',
  memberLifecycleMiddleware('termination'),
  asyncHandler(async (req, res) => {
    const member = await membershipService.terminateMember(
      parseInt(req.params.id),
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: (req.user as any)?.userId
      }
    );

    ResponseHelper.success(res, member, 'Member terminated successfully');
  })
);

/**
 * @route   POST /api/members/:id/renew
 * @desc    Renew a member
 * @access  Private
 */
router.post('/:id/renew',
  memberLifecycleMiddleware('renewal'),
  validateRequest(renewMemberSchema),
  asyncHandler(async (req, res) => {
    const member = await membershipService.renewMember(
      parseInt(req.params.id),
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: (req.user as any)?.userId
      }
    );

    ResponseHelper.success(res, member, 'Member renewed successfully');
  })
);

/**
 * @route   GET /api/members/:id/lifecycle
 * @desc    Get member lifecycle events
 * @access  Private
 */
router.get('/:id/lifecycle',
  dataAccessMiddleware('member_lifecycle'),
  asyncHandler(async (req, res) => {
    const events = await membershipService.getMemberLifecycleEvents(parseInt(req.params.id));

    ResponseHelper.success(res, events, 'Lifecycle events retrieved successfully');
  })
);

/**
 * @route   GET /api/members/:id/documents
 * @desc    Get member documents
 * @access  Private
 */
router.get('/:id/documents',
  dataAccessMiddleware('member_documents'),
  asyncHandler(async (req, res) => {
    const documents = await membershipService.getMemberDocuments(parseInt(req.params.id));

    ResponseHelper.success(res, documents, 'Member documents retrieved successfully');
  })
);

/**
 * @route   POST /api/members/:id/documents
 * @desc    Upload member document
 * @access  Private
 */
router.post('/:id/documents',
  sensitiveOperationMiddleware('document_upload'),
  asyncHandler(async (req, res) => {
    const document = await membershipService.uploadDocument(
      parseInt(req.params.id),
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: (req.user as any)?.userId
      }
    );

    ResponseHelper.created(res, document, 'Document uploaded successfully');
  })
);

/**
 * @route   DELETE /api/members/:memberId/documents/:documentId
 * @desc    Delete member document
 * @access  Private
 */
router.delete('/:memberId/documents/:documentId',
  sensitiveOperationMiddleware('document_deletion'),
  asyncHandler(async (req, res) => {
    await membershipService.deleteDocument(
      parseInt(req.params.memberId),
      parseInt(req.params.documentId),
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: (req.user as any)?.userId
      }
    );

    ResponseHelper.noContent(res);
  })
);

/**
 * @route   GET /api/members/stats
 * @desc    Get membership statistics
 * @access  Private
 */
router.get('/stats',
  dataAccessMiddleware('membership_stats'),
  asyncHandler(async (req, res) => {
    const stats = await membershipService.getMembershipStats({
      companyId: req.query.companyId ? parseInt(req.query.companyId as string) : undefined,
      membershipStatus: req.query.membershipStatus as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string
    });

    ResponseHelper.success(res, stats, 'Membership statistics retrieved successfully');
  })
);

/**
 * @route   POST /api/members/bulk-update
 * @desc    Bulk update members
 * @access  Private
 */
router.post('/bulk-update',
  sensitiveOperationMiddleware('bulk_member_update'),
  asyncHandler(async (req, res) => {
    const result = await membershipService.bulkUpdateMembers(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      userId: (req.user as any)?.userId
    });

    ResponseHelper.success(res, result, 'Bulk update completed successfully');
  })
);

/**
 * @route   GET /api/members/:id/eligibility
 * @desc    Check member eligibility
 * @access  Private
 */
router.get('/:id/eligibility',
  dataAccessMiddleware('member_eligibility'),
  asyncHandler(async (req, res) => {
    const eligibility = await membershipService.checkEligibility(
      parseInt(req.params.id),
      {
        benefitId: req.query.benefitId ? parseInt(req.query.benefitId as string) : undefined,
        coverageType: req.query.coverageType as string,
        serviceType: req.query.serviceType as string
      }
    );

    ResponseHelper.success(res, eligibility, 'Eligibility check completed');
  })
);

/**
 * @route   POST /api/members/:id/notifications
 * @desc    Send notification to member
 * @access  Private
 */
router.post('/:id/notifications',
  sensitiveOperationMiddleware('member_notification'),
  asyncHandler(async (req, res) => {
    const notification = await membershipService.sendNotification(
      parseInt(req.params.id),
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: (req.user as any)?.userId
      }
    );

    ResponseHelper.created(res, notification, 'Notification sent successfully');
  })
);

/**
 * @route   GET /api/members/:id/consents
 * @desc    Get member consents
 * @access  Private
 */
router.get('/:id/consents',
  dataAccessMiddleware('member_consents'),
  asyncHandler(async (req, res) => {
    const consents = await membershipService.getMemberConsents(parseInt(req.params.id));

    ResponseHelper.success(res, consents, 'Member consents retrieved successfully');
  })
);

/**
 * @route   POST /api/members/:id/consents
 * @desc    Update member consent
 * @access  Private
 */
router.post('/:id/consents',
  sensitiveOperationMiddleware('consent_update'),
  asyncHandler(async (req, res) => {
    const consent = await membershipService.updateConsent(
      parseInt(req.params.id),
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: (req.user as any)?.userId
      }
    );

    ResponseHelper.created(res, consent, 'Consent updated successfully');
  })
);

export default router;