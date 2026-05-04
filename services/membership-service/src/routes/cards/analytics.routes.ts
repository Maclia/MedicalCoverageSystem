import { Router, Request, Response } from 'express';
import { cardManagementService } from '../../services/CardManagementService.js';
import { WinstonLogger } from '../../utils/WinstonLogger';

const router = Router();
const logger = new WinstonLogger('membership-service');

/**
 * Helper function to safely convert unknown error to Error
 */
function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * Get card analytics
 * GET /api/core/cards/analytics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const analytics = await cardManagementService.getCardAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error retrieving analytics:', toError(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve analytics',
    });
  }
});

export default router;
