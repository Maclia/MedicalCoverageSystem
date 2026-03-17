import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Validation schemas
const createLeadSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  leadSource: z.string().min(1, 'Lead source required'),
  estimatedValue: z.number().optional(),
});

const updateLeadSchema = createLeadSchema.partial();

// Proxy middleware for CRM service
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

// Leads endpoints

/**
 * GET /api/crm/leads
 * Search and list leads with filters and pagination
 */
router.get('/leads',
  authenticate,
  async (req, res) => {
    await proxyToCRM('/leads')(req, res);
  }
);

/**
 * POST /api/crm/leads
 * Create a new lead
 */
router.post('/leads',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  async (req, res) => {
    try {
      createLeadSchema.parse(req.body);
      await proxyToCRM('/leads')(req, res);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/crm/leads/:id
 * Get lead by ID
 */
router.get('/leads/:id',
  authenticate,
  async (req, res) => {
    await proxyToCRM(`/leads/${req.params.id}`)(req, res);
  }
);

/**
 * PUT /api/crm/leads/:id
 * Update lead information
 */
router.put('/leads/:id',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  async (req, res) => {
    try {
      updateLeadSchema.parse(req.body);
      await proxyToCRM(`/leads/${req.params.id}`)(req, res);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/crm/leads/:id/convert
 * Convert lead to contact and company
 */
router.post('/leads/:id/convert',
  authenticate,
  requireRole('sales_manager', 'admin'),
  async (req, res) => {
    await proxyToCRM(`/leads/${req.params.id}/convert`)(req, res);
  }
);

/**
 * DELETE /api/crm/leads/:id
 * Delete lead
 */
router.delete('/leads/:id',
  authenticate,
  requireRole('sales_manager', 'admin'),
  async (req, res) => {
    await proxyToCRM(`/leads/${req.params.id}`)(req, res);
  }
);

export default router;
