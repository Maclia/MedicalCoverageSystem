import { Router, Request, Response } from 'express';
import { companyBalanceService } from '../services/CompanyBalanceService.js';
import { WinstonLogger } from '../utils/WinstonLogger.js';

const logger = new WinstonLogger('SchemeFundController');

const router = Router();

/**
 * FR-16: Get real-time fund utilization tracking for funded schemes
 * Returns balance, utilization metrics, carry-forward status and alerts
 */
router.get('/schemes/:schemeId/fund-balance', async (req: Request, res: Response) => {
  try {
    const { schemeId } = req.params;
    const result = await companyBalanceService.getSchemeFundBalance(schemeId);
    
    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to get scheme fund balance', { error: error as Error, schemeId: req.params.schemeId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve fund balance information'
    });
  }
});

/**
 * FR-16: Toggle balance carry-forward setting for funded schemes
 */
router.put('/schemes/:schemeId/carry-forward', async (req: Request, res: Response) => {
  try {
    const { schemeId } = req.params;
    const { enabled, userId } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Enabled flag must be a boolean value'
      });
    }

    if (!userId || typeof userId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const result = await companyBalanceService.updateCarryForwardSetting(schemeId, enabled, userId);
    
    res.status(200).json({
      success: true,
      data: {
        schemeId,
        balanceCarryForwardEnabled: enabled,
        updated: result
      }
    });

  } catch (error: any) {
    logger.error('Failed to update carry-forward setting', { error: error.message, schemeId: req.params.schemeId });
    
    if (error.message === 'Only Funded schemes support balance carry-forward') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update carry-forward setting'
    });
  }
});

/**
 * FR-17: Fund Replenishment - Process fund replenishment request
 */
router.post('/schemes/:schemeId/replenish', async (req: Request, res: Response) => {
  try {
    const { schemeId } = req.params;
    const { amount, referenceNumber, userId, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid positive amount is required'
      });
    }

    if (!userId || typeof userId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const result = await companyBalanceService.processFundReplenishment(schemeId, {
      amount,
      referenceNumber,
      userId,
      notes
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('Failed to process fund replenishment', { error: error.message, schemeId: req.params.schemeId });
    res.status(500).json({
      success: false,
      error: 'Failed to process fund replenishment'
    });
  }
});

/**
 * FR-17: Fund Replenishment - Get replenishment history
 */
router.get('/schemes/:schemeId/replenishment-history', async (req: Request, res: Response) => {
  try {
    const { schemeId } = req.params;
    const history = await companyBalanceService.getReplenishmentHistory(schemeId);

    res.status(200).json({
      success: true,
      data: history
    });

  } catch (error: any) {
    logger.error('Failed to retrieve replenishment history', { error: error.message, schemeId: req.params.schemeId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve replenishment history'
    });
  }
});

export default router;
