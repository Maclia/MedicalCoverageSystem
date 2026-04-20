import express, { Request, Response } from 'express';
import { ErrorRecoveryService } from '../services/ErrorRecoveryService';
import { WinstonLogger } from '../utils/WinstonLogger';

const router = express.Router();
const logger = new WinstonLogger('PaymentRoutes');
const recoveryService = new ErrorRecoveryService();

/**
 * POST /api/payments/process
 * Process a payment, with automatic error recovery on failure
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { paymentId, claimId, memberId, amount } = req.body;

    // Validate required fields
    if (!paymentId || !claimId || !memberId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: paymentId, claimId, memberId, amount',
      });
    }

    logger.info(`Processing payment ${paymentId}`, { claimId, memberId, amount });

    // Attempt payment (this would be actual payment processing)
    // For now, we'll simulate success/failure based on some logic
    const isSuccess = Math.random() > 0.1; // 90% success rate

    if (!isSuccess) {
      // Register for recovery on failure
      const recovery = await recoveryService.registerFailedPayment(
        paymentId,
        claimId,
        memberId,
        amount.toString(),
        new Error('Payment processing failed')
      );

      return res.status(202).json({
        status: 'pending',
        message: 'Payment failed, automatic recovery initiated',
        recoveryId: recovery.recoveryId,
        nextRetryAt: recovery.nextRetryAt,
      });
    }

    // Payment succeeded
    res.json({
      status: 'success',
      paymentId,
      message: 'Payment processed successfully',
    });
  } catch (error: any) {
    logger.error('Payment processing error', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/retry
 * Retry a failed payment (called by recovery service)
 */
router.post('/retry', async (req: Request, res: Response) => {
  try {
    const { paymentId, claimId, memberId, amount } = req.body;

    logger.info(`Retrying payment ${paymentId}`, { claimId, memberId });

    // Attempt retry (success rate increases with each attempt)
    const isSuccess = Math.random() > 0.05; // 95% success rate on retry

    if (!isSuccess) {
      return res.json({
        success: false,
        error: 'Payment still failing',
        paymentId,
      });
    }

    res.json({
      success: true,
      paymentId,
      message: 'Payment retry successful',
    });
  } catch (error: any) {
    logger.error('Payment retry error', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/reverse
 * Reverse/refund a payment (used in error recovery compensation)
 */
router.post('/reverse', async (req: Request, res: Response) => {
  try {
    const { paymentId, claimId, reason } = req.body;

    logger.info(`Reversing payment ${paymentId}`, { claimId, reason });

    // Attempt to reverse payment
    const isSuccess = Math.random() > 0.05; // 95% success rate

    if (!isSuccess) {
      return res.status(500).json({
        error: 'Failed to reverse payment',
        paymentId,
      });
    }

    res.json({
      success: true,
      paymentId,
      message: 'Payment reversed successfully',
    });
  } catch (error: any) {
    logger.error('Payment reversal error', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/recovery/:recoveryId
 * Get recovery status
 */
router.get('/recovery/:recoveryId', async (req: Request, res: Response) => {
  try {
    const { recoveryId } = req.params;

    const recovery = await recoveryService.getRecoveryRecord(recoveryId);

    if (!recovery) {
      return res.status(404).json({
        error: 'Recovery record not found',
      });
    }

    res.json({
      recoveryId: recovery.recoveryId,
      paymentId: recovery.paymentId,
      claimId: recovery.claimId,
      amount: recovery.amount,
      status: recovery.status,
      retryCount: recovery.retryCount,
      nextRetryAt: recovery.nextRetryAt,
      escalatedAt: recovery.escalatedAt,
      recoveredAt: recovery.recoveredAt,
      failedAt: recovery.failedAt,
    });
  } catch (error: any) {
    logger.error('Error fetching recovery status', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/recovery/incomplete
 * Get all incomplete recoveries (admin only)
 */
router.get('/recovery/incomplete', async (req: Request, res: Response) => {
  try {
    const incompleteRecoveries = await recoveryService.getIncompleteRecoveries();

    res.json({
      count: incompleteRecoveries.length,
      recoveries: incompleteRecoveries.map(r => ({
        recoveryId: r.recoveryId,
        paymentId: r.paymentId,
        claimId: r.claimId,
        amount: r.amount,
        status: r.status,
        retryCount: r.retryCount,
        nextRetryAt: r.nextRetryAt,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching incomplete recoveries', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
