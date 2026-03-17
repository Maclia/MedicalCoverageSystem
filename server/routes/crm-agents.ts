import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Validation schemas
const createAgentSchema = z.object({
  userId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  title: z.string().optional(),
  department: z.enum(['sales', 'support', 'management', 'operations']).optional(),
});

const updateAgentSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional(),
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

// Get all agents
router.get('/agents', authenticate, proxyToCRM('/api/agents'));

// Create new agent
router.post(
  '/agents',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = createAgentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/agents')(req, res);
  }
);

// Get agent by ID
router.get('/agents/:id', authenticate, proxyToCRM('/api/agents/:id'));

// Update agent
router.put(
  '/agents/:id',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = updateAgentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/agents/${req.params.id}`)(req, res);
  }
);

// Delete agent
router.delete(
  '/agents/:id',
  authenticate,
  requireRole('admin'),
  proxyToCRM('/api/agents/:id')
);

// Get agent performance metrics
router.get('/agents/:id/performance', authenticate, proxyToCRM('/api/agents/:id/performance'));

// Get agent commission history
router.get('/agents/:id/commissions', authenticate, proxyToCRM('/api/agents/:id/commissions'));

export default router;
