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
 * Verify a card
 * POST /api/core/cards/verify
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { qrCodeData, providerId, verificationType, location, deviceInfo, ipAddress, geolocation } = req.body;

    if (!qrCodeData || !providerId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: qrCodeData, providerId',
      });
      return;
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
    logger.error('Error verifying card:', toError(error));
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Card verification failed',
    });
  }
});

export default router;
