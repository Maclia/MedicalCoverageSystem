import { Router } from 'express';
import { auditMiddleware } from '../middleware/auditMiddleware';

import healthRoutes from './health';
import leadRoutes from './leads.routes';
import quoteRoutes from './quotes.routes';
import clientRoutes from './clients.routes';
import contactRoutes from './contacts.routes';
import companyRoutes from './companies.routes';
import opportunityRoutes from './opportunities.routes';
import activityRoutes from './activities.routes';
import campaignRoutes from './campaigns.routes';
import dashboardRoutes from './dashboard.routes';
import analyticsRoutes from './analytics.routes';
import bulkRoutes from './bulk.routes';
import dataOperationsRoutes from './data-operations.routes';

const router = Router();

// Apply audit middleware globally to ALL CRM routes
router.use(auditMiddleware);

// Mount individual route modules
router.use('/', healthRoutes);
router.use('/leads', leadRoutes);
router.use('/quotes', quoteRoutes);
router.use('/clients', clientRoutes);
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
