import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Validation schemas
const createActivitySchema = z.object({
  activityType: z.enum(['call', 'email', 'meeting', 'demo', 'proposal', 'follow_up', 'training']),
  subject: z.string().min(1, 'Subject required'),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  leadId: z.number().optional(),
  opportunityId: z.number().optional(),
});

const updateActivitySchema = createActivitySchema.partial();

// Proxy middleware
const proxyToCRM = (path: string) => async (req: Request, res: Response) => {
  try {
    const url = `${CRM_SERVICE_URL}${path}`;
    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      params: req.query,
      headers: {
        'Authorization': req.headers.authorization,
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

// Activities endpoints

/**
 * GET /api/crm/activities
 * List all activities with filters
 */
router.get('/activities',
  authenticate,
  async (req, res) => {
    await proxyToCRM('/activities')(req, res);
  }
);

/**
 * POST /api/crm/activities
 * Create a new activity
 */
router.post('/activities',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  async (req, res) => {
    try {
      createActivitySchema.parse(req.body);
      await proxyToCRM('/activities')(req, res);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/crm/activities/:id
 * Get activity by ID
 */
router.get('/activities/:id',
  authenticate,
  async (req, res) => {
    await proxyToCRM(`/activities/${req.params.id}`)(req, res);
  }
);

/**
 * PUT /api/crm/activities/:id
 * Update activity
 */
router.put('/activities/:id',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  async (req, res) => {
    try {
      updateActivitySchema.parse(req.body);
      await proxyToCRM(`/activities/${req.params.id}`)(req, res);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/crm/activities/:id/complete
 * Mark activity as completed
 */
router.post('/activities/:id/complete',
  authenticate,
  async (req, res) => {
    await proxyToCRM(`/activities/${req.params.id}/complete`)(req, res);
  }
);

/**
 * DELETE /api/crm/activities/:id
 * Delete activity
 */
router.delete('/activities/:id',
  authenticate,
  requireRole('sales_manager', 'admin'),
  async (req, res) => {
    await proxyToCRM(`/activities/${req.params.id}`)(req, res);
  }
);

export default router;
