import { Router } from 'express';

import cardGenerationRoutes from './generate.routes.js';
import cardManagementRoutes from './management.routes.js';
import cardMemberRoutes from './member.routes.js';
import cardVerificationRoutes from './verification.routes.js';
import cardTemplateRoutes from './templates.routes.js';
import cardBatchRoutes from './batches.routes.js';
import cardAnalyticsRoutes from './analytics.routes.js';

const router = Router();

// Mount card domain routes
router.use('/', cardManagementRoutes);
router.use('/', cardGenerationRoutes);
router.use('/member', cardMemberRoutes);
router.use('/verify', cardVerificationRoutes);
router.use('/templates', cardTemplateRoutes);
router.use('/batches', cardBatchRoutes);
router.use('/analytics', cardAnalyticsRoutes);

export default router;