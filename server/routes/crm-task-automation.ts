import { Router, Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['call', 'email', 'meeting', 'follow_up', 'review', 'demo']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: z.string().datetime(),
  assignedTo: z.string().min(1),
  relatedTo: z.enum(['lead', 'contact', 'opportunity', 'account']).optional(),
  relatedId: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
}).partial();

const reassignSchema = z.object({
  newAssignee: z.string().min(1),
  reason: z.string().optional(),
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

// Get all tasks
router.get('/tasks', authenticate, proxyToCRM('/api/tasks'));

// Create new task
router.post(
  '/tasks',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = createTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM('/api/tasks')(req, res);
  }
);

// Get task by ID
router.get('/tasks/:id', authenticate, proxyToCRM('/api/tasks/:id'));

// Update task
router.put(
  '/tasks/:id',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = updateTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/tasks/${req.params.id}`)(req, res);
  }
);

// Mark task as complete
router.post(
  '/tasks/:id/complete',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  proxyToCRM('/api/tasks/:id/complete')
);

// Reassign task
router.post(
  '/tasks/:id/reassign',
  authenticate,
  requireRole('sales_manager', 'admin'),
  (req: Request, res: Response) => {
    const validation = reassignSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.message });
    }
    proxyToCRM(`/api/tasks/${req.params.id}/reassign`)(req, res);
  }
);

// Cancel task
router.post(
  '/tasks/:id/cancel',
  authenticate,
  requireRole('sales_agent', 'sales_manager', 'admin'),
  proxyToCRM('/api/tasks/:id/cancel')
);

// Delete task
router.delete(
  '/tasks/:id',
  authenticate,
  requireRole('admin'),
  proxyToCRM('/api/tasks/:id')
);

// Get tasks by assignee
router.get('/tasks/assignee/:assigneeId', authenticate, proxyToCRM('/api/tasks/assignee/:assigneeId'));

// Get overdue tasks
router.get('/tasks/status/overdue', authenticate, proxyToCRM('/api/tasks/status/overdue'));

export default router;
