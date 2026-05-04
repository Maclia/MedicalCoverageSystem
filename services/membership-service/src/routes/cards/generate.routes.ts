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
 * Generate a new member card
 * POST /api/core/cards/generate
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId, cardType, templateId, expeditedShipping, deliveryAddress } = req.body;

    if (!memberId || !cardType) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: memberId, cardType',
      });
      return;
    }

    const result = await cardManagementService.generateMemberCard({
      memberId,
      cardType,
      templateId,
      expeditedShipping,
      deliveryAddress,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error generating card:', toError(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate card',
    });
  }
});

export default router;
