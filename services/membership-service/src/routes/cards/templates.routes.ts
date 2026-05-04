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
 * Get card templates
 * GET /api/core/cards/templates
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';

    const templates = await cardManagementService.getCardTemplates(activeOnly);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Error retrieving templates:', toError(error));
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
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const templateData = req.body;

    if (!templateData.templateType) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: templateType',
      });
      return;
    }

    const template = await cardManagementService.upsertCardTemplate(templateData);

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error creating template:', toError(error));
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
router.put('/:templateId', async (req: Request, res: Response): Promise<void> => {
  try {
    const templateId = parseInt(req.params.templateId);
    const templateData = { ...req.body, id: templateId };

    if (isNaN(templateId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid template ID',
      });
      return;
    }

    const template = await cardManagementService.upsertCardTemplate(templateData);

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error updating template:', toError(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update template',
    });
  }
});

export default router;
