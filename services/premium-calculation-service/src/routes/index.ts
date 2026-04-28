import { Router } from 'express';
import { PremiumCalculationController } from '../controllers/PremiumCalculationController.js';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = Router();

/**
 * Premium Calculation Service API Routes
 * Base Path: /api
 */

// Health check (public)
router.get('/health', PremiumCalculationController.healthCheck);

// Protected routes
router.use(authMiddleware);
router.use(rateLimitMiddleware);

// Premium calculation endpoints
router.post('/calculate', PremiumCalculationController.calculatePremium);
router.post('/calculate/batch', PremiumCalculationController.calculateBatch);

// Reference data endpoints
router.get('/rate-table/active', PremiumCalculationController.getActiveRateTable);

// History endpoints
router.get('/history/:calculationId', PremiumCalculationController.getCalculationHistory);

export default router;