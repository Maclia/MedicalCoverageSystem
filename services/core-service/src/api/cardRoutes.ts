import { Router, Request, Response } from 'express';
import { cardManagementService } from '../services/CardManagementService';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger();

/**
 * Generate a new member card
 * POST /api/core/cards/generate
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { memberId, cardType, templateId, expeditedShipping, deliveryAddress } = req.body;

    if (!memberId || !cardType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: memberId, cardType',
      });
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
    logger.error('Error generating card:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate card',
    });
  }
});

/**
 * Get all cards for a member
 * GET /api/core/cards/member/:memberId
 */
router.get('/member/:memberId', async (req: Request, res: Response) => {
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
    logger.error('Error retrieving member cards:', error);
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
router.get('/member/:memberId/active', async (req: Request, res: Response) => {
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
    logger.error('Error retrieving active cards:', error);
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
router.get('/:cardId', async (req: Request, res: Response) => {
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
    logger.error('Error retrieving card:', error);
    res.status(error instanceof Error && error.message === 'Card not found' ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve card',
    });
  }
});

/**
 * Verify a card
 * POST /api/core/cards/verify
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { qrCodeData, providerId, verificationType, location, deviceInfo, ipAddress, geolocation } = req.body;

    if (!qrCodeData || !providerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: qrCodeData, providerId',
      });
    }

    const result = await cardManagementService.verifyCard(
      {
        qrCodeData,
        providerId,
        verificationType: verificationType || 'qr_scan',
        location,
        deviceInfo,
        ipAddress,
        geolocation,
      },
      null
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error verifying card:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Card verification failed',
    });
  }
});

/**
 * Update card status
 * PUT /api/core/cards/:cardId/status
 */
router.put('/:cardId/status', async (req: Request, res: Response) => {
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
    logger.error('Error updating card status:', error);
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
router.post('/:cardId/replace', async (req: Request, res: Response) => {
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
    logger.error('Error requesting card replacement:', error);
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
    logger.error('Error retrieving verification history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve history',
    });
  }
});

/**
 * Get card templates
 * GET /api/core/cards/templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';

    const templates = await cardManagementService.getCardTemplates(activeOnly);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Error retrieving templates:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve templates',
    });
  }
});

/**
 * Create card template
 * POST /api/core/cards/templates
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const templateData = req.body;

    if (!templateData.templateType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: templateType',
      });
    }

    const template = await cardManagementService.upsertCardTemplate(templateData);

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create template',
    });
  }
});

/**
 * Update card template
 * PUT /api/core/cards/templates/:templateId
 */
router.put('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const templateData = { ...req.body, id: templateId };

    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID',
      });
    }

    const template = await cardManagementService.upsertCardTemplate(templateData);

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update template',
    });
  }
});

/**
 * Get production batches
 * GET /api/core/cards/batches
 */
router.get('/batches', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;

    const batches = await cardManagementService.getProductionBatches(status);

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    logger.error('Error retrieving batches:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve batches',
    });
  }
});

/**
 * Get batch details
 * GET /api/core/cards/batches/:batchId
 */
router.get('/batches/:batchId', async (req: Request, res: Response) => {
  try {
    const batchId = req.params.batchId;

    const batch = await cardManagementService.getBatchDetails(batchId);

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    logger.error('Error retrieving batch:', error);
    res.status(error instanceof Error && error.message === 'Batch not found' ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve batch',
    });
  }
});

/**
 * Update batch status
 * PUT /api/core/cards/batches/:batchId/status
 */
router.put('/batches/:batchId/status', async (req: Request, res: Response) => {
  try {
    const batchId = req.params.batchId;
    const { status, ...additionalData } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: status',
      });
    }

    const batch = await cardManagementService.updateBatchStatus(batchId, status, additionalData);

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    logger.error('Error updating batch status:', error);
    res.status(error instanceof Error && error.message === 'Batch not found' ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update batch status',
    });
  }
});

/**
 * Get card analytics
 * GET /api/core/cards/analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await cardManagementService.getCardAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error retrieving analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve analytics',
    });
  }
});

export default router;
