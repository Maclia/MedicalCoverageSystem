import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  targetAudience: z.enum(['all_leads', 'qualified_leads', 'cold_leads', 'custom']),
  emailTemplate: z.string().min(1),
  frequency: z.enum(['daily', 'weekly', 'bi_weekly', 'monthly']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'bi_weekly', 'monthly']).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
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

// Get all campaigns
router.get('/campaigns', authenticate, proxyToCRM('/api/campaigns'));

// Create new campaign
router.post(
  '/campaigns',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = createCampaignSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/campaigns')(req, res);
  }
);

// Get campaign by ID
router.get('/campaigns/:id', authenticate, proxyToCRM('/api/campaigns/:id'));

// Update campaign
router.put(
  '/campaigns/:id',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = updateCampaignSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/campaigns/${req.params.id}`)(req, res);
  }
);

// Start campaign
router.post(
  '/campaigns/:id/start',
  authenticate,
  requireRole('sales_manager', 'admin'),
  proxyToCRM('/api/campaigns/:id/start')
);

// Pause campaign
router.post(
  '/campaigns/:id/pause',
  authenticate,
  requireRole('sales_manager', 'admin'),
  proxyToCRM('/api/campaigns/:id/pause')
);

// Stop campaign
router.post(
  '/campaigns/:id/stop',
  authenticate,
  requireRole('sales_manager', 'admin'),
  proxyToCRM('/api/campaigns/:id/stop')
);

// Get campaign engagement metrics
router.get('/campaigns/:id/engagement', authenticate, proxyToCRM('/api/campaigns/:id/engagement'));

// Delete campaign
router.delete(
  '/campaigns/:id',
  authenticate,
  requireRole('admin'),
  proxyToCRM('/api/campaigns/:id')
);

export default router;
