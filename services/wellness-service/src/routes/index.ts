import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/responseMiddleware.js';

const router = Router();

// Basic wellness routes - can be expanded later
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    message: 'Wellness API',
    version: '1.0.0'
  });
}));

router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'wellness-service',
    timestamp: new Date().toISOString()
  });
}));

export default router;