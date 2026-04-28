import { Router } from 'express';
import healthRoutes from './health.js';
import paymentRoutes from './payments.js';
import reportRoutes from '../api/reportsController.js';
import schemeFundRoutes from '../api/schemeFundController.js';

const router = Router();

// Health check
router.use('/health', healthRoutes);

// API Routes
router.use('/payments', paymentRoutes);
router.use('/reports', reportRoutes);
router.use('/api', schemeFundRoutes);

export default router;
