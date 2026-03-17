import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Validation schemas
const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Title required'),
  leadId: z.number(),
  stage: z.enum(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  estimatedValue: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  description: z.string().optional(),
});

const updateOpportunitySchema = createOpportunitySchema.partial();

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

// Opportunities endpoints

/**
 * GET /api/crm/opportunities
 * List all opportunities with filters
 */
router.get('/opportunities',
  authenticate,
  async (req, res) => {
    await proxyToCRM('/opportunities')(req, res);
  }
);

/**
 * POST /api/crm/opportunities
 * Create a new opportunity
 */
router.post('/opportunities',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  async (req, res) => {
    try {
      createOpportunitySchema.parse(req.body);
      await proxyToCRM('/opportunities')(req, res);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/crm/opportunities/:id
 * Get opportunity by ID
 */
router.get('/opportunities/:id',
  authenticate,
  async (req, res) => {
    await proxyToCRM(`/opportunities/${req.params.id}`)(req, res);
  }
);

/**
 * PUT /api/crm/opportunities/:id
 * Update opportunity
 */
router.put('/opportunities/:id',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  async (req, res) => {
    try {
      updateOpportunitySchema.parse(req.body);
      await proxyToCRM(`/opportunities/${req.params.id}`)(req, res);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/crm/opportunities/:id/close
 * Close opportunity (won or lost)
 */
router.post('/opportunities/:id/close',
  authenticate,
  requireRole('sales_manager', 'admin'),
  async (req, res) => {
    await proxyToCRM(`/opportunities/${req.params.id}/close`)(req, res);
  }
);

/**
 * DELETE /api/crm/opportunities/:id
 * Delete opportunity
 */
router.delete('/opportunities/:id',
  authenticate,
  requireRole('sales_manager', 'admin'),
  async (req, res) => {
    await proxyToCRM(`/opportunities/${req.params.id}`)(req, res);
  }
);

export default router;
