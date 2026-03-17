import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Filter schemas
const analyticsFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  status: z.string().optional(),
}).partial();

const proxyToCRM = (path: string) => async (req: Request, res: Response) => {
  try {
    const url = `${CRM_SERVICE_URL}${path}`;
    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      params: req.query,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
        'X-Correlation-ID': (req as any).correlationId || (req as any).id,
        'X-User-ID': ((req as any).user)?.userId || 'anonymous',
      },
      timeout: 5000,
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'CRM service error';
    res.status(status).json({ success: false, error: message });
  }
};

// Get dashboard analytics
router.get(
  '/analytics/dashboard',
  authenticate,
  (req: Request, res: Response) => {
    const validation = analyticsFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/crm/analytics/dashboard')(req, res);
  }
);

// Get leads analytics
router.get(
  '/analytics/leads',
  authenticate,
  (req: Request, res: Response) => {
    const validation = analyticsFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/crm/analytics/leads')(req, res);
  }
);

// Get opportunities analytics
router.get(
  '/analytics/opportunities',
  authenticate,
  (req: Request, res: Response) => {
    const validation = analyticsFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/crm/analytics/opportunities')(req, res);
  }
);

// Get pipeline analytics
router.get(
  '/analytics/pipeline',
  authenticate,
  (req: Request, res: Response) => {
    const validation = analyticsFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/crm/analytics/pipeline')(req, res);
  }
);

// Get conversion metrics
router.get(
  '/analytics/conversions',
  authenticate,
  (req: Request, res: Response) => {
    const validation = analyticsFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/crm/analytics/conversions')(req, res);
  }
);

// Get team analytics
router.get(
  '/analytics/team/:teamId',
  authenticate,
  (req: Request, res: Response) => {
    const validation = analyticsFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/crm/analytics/team/${req.params.teamId}`)(req, res);
  }
);

export default router;
