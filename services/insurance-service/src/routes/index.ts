import { Router } from 'express';
import { auditMiddleware } from '../middleware/auditMiddleware.js';

import healthRoutes from './health.routes.js';

const router = Router();

// Apply audit middleware globally to ALL Insurance routes
router.use(auditMiddleware);

// Mount individual route modules
router.use('/', healthRoutes);

export default router;