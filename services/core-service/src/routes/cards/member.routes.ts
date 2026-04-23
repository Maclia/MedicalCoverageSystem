import { Router, Request, Response } from 'express';
import { cardManagementService } from '../../services/CardManagementService';
import { createLogger } from '../../utils/logger';

const router = Router();
const logger = createLogger();

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
 * Get all cards for a member
 * GET /api/core/cards/member/:memberId
 */
router.get('/:memberId', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const activeOnly = req.query.activeOnly === 'true';

    if (isNaN(memberId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member ID',
      });
    }

    const cards = await cardManagementService.getMemberCards(memberId, activeOnly);

    res.json({
      success: true,
      data: cards,
    });
  } catch (error) {
    logger.error('Error retrieving member cards:', toError(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve cards',
    });
  }
});

/**
 * Get active cards for a member
 * GET /api/core/cards/member/:memberId/active
 */
router.get('/:memberId/active', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);

    if (isNaN(memberId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member ID',
      });
    }

    const cards = await cardManagementService.getMemberCards(memberId, true);

    res.json({
      success: true,
      data: cards,
    });
  } catch (error) {
    logger.error('Error retrieving active cards:', toError(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve cards',
    });
  }
});

/**
 * Downloadable digital card payload
 * GET /api/core/cards/member/download-card/:cardId
 */
router.get('/download-card/:cardId', async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.cardId);

    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID',
      });
    }

    const payload = await cardManagementService.getDownloadableCard(cardId);

    res.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    logger.error('Error preparing downloadable card payload:', toError(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare card payload',
    });
  }
});

export default router;