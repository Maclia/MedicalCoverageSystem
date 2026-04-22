import { Router } from 'express';
import { MembershipServiceSimplified } from '../services/MembershipService';
import { ResponseHelper, asyncHandler } from '../middleware/responseMiddleware';

const router = Router();
const membershipService = new MembershipServiceSimplified();

router.get('/dashboard/summary', asyncHandler(async (_req, res) => {
  const summary = await membershipService.getAdminDashboardSummary();
  ResponseHelper.success(res, summary, 'Admin dashboard summary retrieved successfully');
}));

router.get('/documents/review-queue', asyncHandler(async (req, res) => {
  const result = await membershipService.getAdminDocumentReviewQueue({
    status: req.query.status as string | undefined,
    search: req.query.search as string | undefined,
    documentType: req.query.documentType as string | undefined,
    priority: req.query.priority as string | undefined,
  });

  ResponseHelper.success(res, result, 'Admin document review queue retrieved successfully');
}));

router.post('/documents/:documentId/review', asyncHandler(async (req, res) => {
  const reviewedDocument = await membershipService.reviewAdminDocument(
    parseInt(req.params.documentId, 10),
    {
      action: req.body.action,
      notes: req.body.notes,
    },
    {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      userId: (req.user as any)?.userId ?? req.headers['x-user-id'],
    }
  );

  ResponseHelper.success(res, reviewedDocument, 'Document review saved successfully');
}));

export default router;
