import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  managerId: z.string().min(1),
  region: z.string().optional(),
  department: z.enum(['sales', 'support', 'management', 'operations']).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  managerId: z.string().optional(),
  region: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
}).partial();

const teamMemberSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(['member', 'lead', 'assistant_manager']).optional(),
});

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

// Get all teams
router.get('/teams', authenticate, proxyToCRM('/api/teams'));

// Create new team
router.post(
  '/teams',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = createTeamSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/teams')(req, res);
  }
);

// Get team by ID
router.get('/teams/:id', authenticate, proxyToCRM('/api/teams/:id'));

// Update team
router.put(
  '/teams/:id',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = updateTeamSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/teams/${req.params.id}`)(req, res);
  }
);

// Delete team
router.delete(
  '/teams/:id',
  authenticate,
  requireRole('admin'),
  proxyToCRM('/api/teams/:id')
);

// Get team members
router.get('/teams/:id/members', authenticate, proxyToCRM('/api/teams/:id/members'));

// Add member to team
router.post(
  '/teams/:id/members',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = teamMemberSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/teams/${req.params.id}/members`)(req, res);
  }
);

// Remove member from team
router.delete(
  '/teams/:id/members/:memberId',
  authenticate,
  requireRole('sales_manager', 'admin'),
  proxyToCRM('/api/teams/:id/members/:memberId')
);

// Get team territory
router.get('/teams/:id/territory', authenticate, proxyToCRM('/api/teams/:id/territory'));

// Update team territory
router.put(
  '/teams/:id/territory',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response) => {
    const validation = z.object({
      region: z.string().optional(),
      territory: z.string().optional(),
      boundaries: z.record(z.any()).optional(),
    }).partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/teams/${req.params.id}/territory`)(req, res);
  }
);

export default router;
