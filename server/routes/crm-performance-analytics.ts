import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Filter schemas
const performanceFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
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

// Get agent performance metrics
router.get(
  '/performance/agents/:agentId',
  authenticate,
  (req: Request, res: Response) => {
    const validation = performanceFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/performance/agents/${req.params.agentId}`)(req, res);
  }
);

// Get team performance metrics
router.get(
  '/performance/teams/:teamId',
  authenticate,
  (req: Request, res: Response) => {
    const validation = performanceFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/performance/teams/${req.params.teamId}`)(req, res);
  }
);

// Get commission payouts
router.get(
  '/performance/commissions',
  authenticate,
  (req: Request, res: Response) => {
    const validation = performanceFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/performance/commissions')(req, res);
  }
);

// Get agent commission details
router.get(
  '/performance/agents/:agentId/commissions',
  authenticate,
  (req: Request, res: Response) => {
    const validation = performanceFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/performance/agents/${req.params.agentId}/commissions`)(req, res);
  }
);

// Get sales targets
router.get(
  '/performance/targets/:agentId',
  authenticate,
  proxyToCRM('/api/performance/targets/:agentId')
);

// Update sales targets
router.put(
  '/performance/targets/:agentId',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = z.object({
      targetAmount: z.number().positive().optional(),
      targetLeads: z.number().positive().optional(),
      targetConversions: z.number().positive().optional(),
    }).partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/performance/targets/${req.params.agentId}`)(req, res);
  }
);

// Generate performance report
router.post(
  '/performance/report',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      type: z.enum(['individual', 'team', 'department']),
      targetId: z.string().min(1),
    }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/performance/report')(req, res);
  }
);

export default router;
