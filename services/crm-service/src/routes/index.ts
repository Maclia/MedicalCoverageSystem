import { Router } from 'express';
import { auditMiddleware } from '../middleware/auditMiddleware';

import healthRoutes from './health.routes.js';
import leadRoutes from './leads.routes.js';
import contactRoutes from './contacts.routes.js';
import companyRoutes from './companies.routes.js';
import opportunityRoutes from './opportunities.routes.js';
import activityRoutes from './activities.routes.js';
import campaignRoutes from './campaigns.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import analyticsRoutes from './analytics.routes.js';
import bulkRoutes from './bulk.routes.js';
import dataOperationsRoutes from './data-operations.routes.js';

const router = Router();

// Apply audit middleware globally to ALL CRM routes
router.use(auditMiddleware);

// Mount individual route modules
router.use('/', healthRoutes);
router.use('/leads', leadRoutes);
router.use('/contacts', contactRoutes);
router.use('/companies', companyRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/activities', activityRoutes);
router.use('/email-campaigns', campaignRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/bulk', bulkRoutes);
router.use('/', dataOperationsRoutes);

export default router;