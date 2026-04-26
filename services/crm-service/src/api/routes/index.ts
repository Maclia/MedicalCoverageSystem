import { Router } from 'express';
import { auditMiddleware } from '../../middleware/auditMiddleware';

import healthRoutes from '../../routes/health';
import leadRoutes from '../../routes/leads.routes';
import contactRoutes from '../../routes/contacts.routes';
import companyRoutes from '../../routes/companies.routes';
import opportunityRoutes from '../../routes/opportunities.routes';
import activityRoutes from '../../routes/activities.routes';
import campaignRoutes from '../../routes/campaigns.routes';
import dashboardRoutes from '../../routes/dashboard.routes';
import analyticsRoutes from '../../routes/analytics.routes';
import bulkRoutes from '../../routes/bulk.routes';
import dataOperationsRoutes from '../../routes/data-operations.routes';

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