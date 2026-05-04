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
 * Get production batches
 * GET /api/core/cards/batches
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;

    const batches = await cardManagementService.getProductionBatches(status);

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    logger.error('Error retrieving batches:', toError(error));
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
router.get('/:batchId', async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = req.params.batchId;

    const batch = await cardManagementService.getBatchDetails(batchId);

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    logger.error('Error retrieving batch:', toError(error));
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
router.put('/:batchId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = req.params.batchId;
    const { status, ...additionalData } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: status',
      });
      return;
    }

    const batch = await cardManagementService.updateBatchStatus(batchId, status, additionalData);

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    logger.error('Error updating batch status:', toError(error));
    res.status(error instanceof Error && error.message === 'Batch not found' ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update batch status',
    });
  }
});

export default router;
