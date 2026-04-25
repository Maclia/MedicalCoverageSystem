import { Router, Request, Response } from 'express';
import { InsuranceResponseHelper, asyncHandler } from '../middleware/responseMiddleware.js';
import { database } from '../models/Database.js';

const router = Router();

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const health = await database.healthCheck();

  InsuranceResponseHelper.success(res, {
    status: health.status,
    service: 'insurance-service',
    uptime: process.uptime(),
    database: health.status,
    latency: health.latency
  });
}));

/**
 * @route   GET /
 * @desc    Root endpoint
 * @access  Public
 */
router.get('/', (req: Request, res: Response) => {
  InsuranceResponseHelper.success(res, {
    service: 'insurance-service',
    status: 'running',
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default router;