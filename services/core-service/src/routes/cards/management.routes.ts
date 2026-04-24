import { Router, Request, Response } from 'express';
import { cardManagementService } from '../../../../membership-service/src/services/CardManagementService';
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
 * Get all cards
 * GET /api/core/cards
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const cards = await cardManagementService.listCards();

    res.json({
      success: true,
      data: cards,
    });
  } catch (error) {
    logger.error('Error retrieving cards:', toError(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve cards',
    });
  }
});

/**
 * Get a specific card by ID
 * GET /api/core/cards/:cardId
 */
router.get('/:cardId(\\d+)', async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.cardId);

    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID',
      });
    }

    const card = await cardManagementService.getCard(cardId);

    res.json({
      success: true,
      data: card,
    });
  } catch (error) {
    logger.error('Error retrieving card:', toError(error));
    res.status(error instanceof Error && error.message === 'Card not found' ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve card',
    });
  }
});

/**
 * Update card status
 * PUT /api/core/cards/:cardId/status
 */
router.put('/:cardId(\\d+)/status', async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const { status, reason } = req.body;

    if (isNaN(cardId) || !status) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID or missing status',
      });
    }

    const result = await cardManagementService.updateCardStatus({
      cardId,
      status,
      reason,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error updating card status:', toError(error));
    res.status(error instanceof Error && error.message === 'Card not found' ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update card status',
    });
  }
});

/**
 * Request card replacement
 * POST /api/core/cards/:cardId/replace
 */
router.post('/:cardId(\\d+)/replace', async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const { reason, expedited } = req.body;

    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID',
      });
    }

    const result = await cardManagementService.requestCardReplacement(cardId, reason || 'Member requested', expedited || false);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error requesting card replacement:', toError(error));
    res.status(error instanceof Error && error.message === 'Card not found' ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to request replacement',
    });
  }
});

/**
 * Get card verification history
 * GET /api/core/cards/history/:cardId
 */
router.get('/history/:cardId', async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID',
      });
    }

    const history = await cardManagementService.getCardVerificationHistory(cardId, limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Error retrieving verification history:', toError(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve history',
    });
  }
});

/**
 * Get recent verification events across all cards
 * GET /api/core/cards/verifications
 */
router.get('/verifications', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await cardManagementService.getRecentVerificationEvents(limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Error retrieving recent verifications:', toError(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve verification events',
    });
  }
});

export default router;