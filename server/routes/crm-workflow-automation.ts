import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Validation schemas
const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum(['lead_created', 'lead_qualified', 'opportunity_won', 'opportunity_lost', 'contact_created', 'activity_completed']),
  actions: z.array(z.object({
    type: z.enum(['send_email', 'create_task', 'update_field', 'send_notification', 'assign_to_agent']),
    config: z.record(z.any()),
  })),
});

const updateWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  actions: z.array(z.object({
    type: z.enum(['send_email', 'create_task', 'update_field', 'send_notification', 'assign_to_agent']),
    config: z.record(z.any()),
  })).optional(),
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

// Get all workflows
router.get('/workflows', authenticate, proxyToCRM('/api/workflows'));

// Create new workflow
router.post(
  '/workflows',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = createWorkflowSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/workflows')(req, res);
  }
);

// Get workflow by ID
router.get('/workflows/:id', authenticate, proxyToCRM('/api/workflows/:id'));

// Update workflow
router.put(
  '/workflows/:id',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = updateWorkflowSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/workflows/${req.params.id}`)(req, res);
  }
);

// Enable workflow
router.post(
  '/workflows/:id/enable',
  authenticate,
  requireRole('sales_manager', 'admin'),
  proxyToCRM('/api/workflows/:id/enable')
);

// Disable workflow
router.post(
  '/workflows/:id/disable',
  authenticate,
  requireRole('sales_manager', 'admin'),
  proxyToCRM('/api/workflows/:id/disable')
);

// Delete workflow
router.delete(
  '/workflows/:id',
  authenticate,
  requireRole('admin'),
  proxyToCRM('/api/workflows/:id')
);

// Get workflow execution history
router.get('/workflows/:id/executions', authenticate, proxyToCRM('/api/workflows/:id/executions'));

// Get execution details
router.get('/workflows/:id/executions/:executionId', authenticate, proxyToCRM('/api/workflows/:id/executions/:executionId'));

// Test workflow trigger
router.post(
  '/workflows/:id/test',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = z.object({
      triggerData: z.record(z.any()),
    }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/workflows/${req.params.id}/test`)(req, res);
  }
);

export default router;
