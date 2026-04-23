/**
 * Card Management API Routes
 * RESTful endpoints for member card operations
 */

import express, { Request, Response, Router } from 'express';
import { cardManagementService } from '../services/CardManagementService.js';

// Initialize card management service with database connection
// Note: This will be properly injected with actual DB connection in production
// @ts-ignore - db will be available at runtime
const cardService = cardManagementService((globalThis as any).db || {});

const router: Router = express.Router();

/**
 * POST /api/cards/generate
 * Generate a new card for a member
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { memberId, cardType, templateId, expeditedShipping, deliveryAddress } = req.body;

    if (!memberId || !cardType) {
      return res.status(400).json({
        error: 'Missing required fields: memberId, cardType',
      });
    }

    if (!['digital', 'physical', 'both'].includes(cardType)) {
      return res.status(400).json({
        error: 'Invalid cardType. Must be: digital, physical, or both',
      });
    }

    const result = await cardService.generateMemberCard({
      memberId,
      cardType,
      templateId,
      expeditedShipping,
      deliveryAddress,
    });

    res.status(201).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: errorMessage || 'Failed to generate card',
    });
  }
});

/**
 * GET /api/cards/member/:memberId
 * Get all cards for a member
 */
router.get('/member/:memberId', async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { activeOnly } = req.query;

    const cards = await cardService.getMemberCards(parseInt(memberId), activeOnly === 'true');

    res.json({
      success: true,
      count: cards.length,
      cards,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: errorMessage || 'Failed to retrieve cards cards',
    });
  }
});

/**
 * GET /api/cards/member/:memberId/active
 * Get active cards for a member
 */
router.get('/member/:memberId/active', async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    const cards = await cardService.getMemberCards(parseInt(memberId), true);

    res.json({
      success: true,
      count: cards.length,
      cards,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: errorMessage || 'Failed to retrieve active cards',
    });
  }
});

/**
 * GET /api/cards/:cardId
 * Get a specific card
 */
router.get('/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;

    const card = await cardService.getCard(parseInt(cardId));

    res.json({
      success: true,
      card,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(404).json({
      error: errorMessage || 'Card not found',
    });
  }
});

/**
 * POST /api/cards/verify
 * Verify a card
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { qrCodeData, providerId, verificationType, location, deviceInfo, ipAddress, geolocation } = req.body;

    if (!qrCodeData || !providerId || !verificationType) {
      return res.status(400).json({
        error: 'Missing required fields: qrCodeData, providerId, verificationType',
      });
    }

    const result = await cardService.verifyCard(
      {
        qrCodeData,
        providerId,
        verificationType,
        location,
        deviceInfo,
        ipAddress,
        geolocation,
      },
      null
    );

    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({
      success: false,
      error: errorMessage || 'Card verification failed',
    });
  }
});

/**
 * PUT /api/cards/:cardId/status
 * Update card status
 */
router.put('/:cardId/status', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Missing required field: status',
      });
    }

    const validStatuses = ['active', 'inactive', 'expired', 'lost', 'stolen', 'damaged', 'replaced'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const result = await cardService.updateCardStatus({
      cardId: parseInt(cardId),
      status,
      reason,
    });

    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({
      error: errorMessage || 'Failed to update card status',
    });
  }
});

/**
 * POST /api/cards/:cardId/replace
 * Request card replacement
 */
router.post('/:cardId/replace', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const { reason, expedited } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Missing required field: reason',
      });
    }

    const result = await cardService.requestCardReplacement(parseInt(cardId), reason, expedited);

    res.status(201).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({
      error: errorMessage || 'Failed to request replacement',
    });
  }
});

/**
 * GET /api/cards/history/:cardId
 * Get verification history for a card
 */
router.get('/history/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const { limit } = req.query;

    const history = await cardService.getCardVerificationHistory(
      parseInt(cardId),
      limit ? parseInt(limit as string) : 20
    );

    res.json({
      success: true,
      count: history.length,
      events: history,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: errorMessage || 'Failed to retrieve verification history',
    });
  }
});

/**
 * === Template Management Routes ===
 */

/**
 * GET /api/cards/templates
 * Get all card templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { activeOnly } = req.query;

    const templates = await cardService.getCardTemplates(activeOnly !== 'false');

    res.json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: errorMessage || 'Failed to retrieve templates',
    });
  }
});

/**
 * POST /api/cards/templates
 * Create a new card template (admin only)
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const templateData = req.body;

    if (!templateData.templateName || !templateData.templateType) {
      return res.status(400).json({
        error: 'Missing required fields: templateName, templateType',
      });
    }

    const template = await cardService.upsertCardTemplate(templateData);

    res.status(201).json({
      success: true,
      template,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: errorMessage || 'Failed to create template',
    });
  }
});

/**
 * PUT /api/cards/templates/:templateId
 * Update a card template (admin only)
 */
router.put('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const templateData = req.body;

    templateData.id = parseInt(templateId);

    const template = await cardService.upsertCardTemplate(templateData);

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: errorMessage || 'Failed to update template',
    });
  }
});

/**
 * === Production Batch Routes ===
 */

/**
 * GET /api/cards/batches
 * Get all production batches
 */
router.get('/batches', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const batches = await cardService.getProductionBatches(status as string);

    res.json({
      success: true,
      count: batches.length,
      batches,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: errorMessage || 'Failed to retrieve batches',
    });
  }
});

/**
 * GET /api/cards/batches/:batchId
 * Get batch details
 */
router.get('/batches/:batchId', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;

    const batch = await cardService.getBatchDetails(batchId);

    res.json({
      success: true,
      batch,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(404).json({
      error: errorMessage || 'Batch not found',
    });
  }
});

/**
 * PUT /api/cards/batches/:batchId/status
 * Update batch status
 */
router.put('/batches/:batchId/status', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { status, ...additionalData } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Missing required field: status',
      });
    }

    const batch = await cardService.updateBatchStatus(batchId, status, additionalData);

    res.json({
      success: true,
      batch,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({
      error: errorMessage || 'Failed to update batch status',
    });
  }
});

/**
 * === Analytics Routes ===
 */

/**
 * GET /api/cards/analytics
 * Get card system analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await cardService.getCardAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: errorMessage || 'Failed to generate analytics',
    });
  }
});

export default router;
