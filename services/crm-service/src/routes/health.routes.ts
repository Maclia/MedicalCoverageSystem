import { Router, Request, Response } from 'express';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseMiddleware';

const router = Router();

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const db = require('../models/Database').database;
  const health = await db.healthCheck();

  CrmResponseHelper.success(res, {
    status: health.status,
    service: 'crm-service',
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
  CrmResponseHelper.success(res, {
    service: 'crm-service',
    status: 'running',
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default router;