import { Router } from 'express';
import { paymentGatewayService } from '../services/paymentGatewayService';
import { paymentNotificationService } from '../services/paymentNotificationService';
import { paymentReconciliationService } from '../services/paymentReconciliationService';
import { storage } from '../storage';

const router = Router();

// ============================================================================
// PAYMENT GATEWAY ENDPOINTS
// ============================================================================

/**
 * Process payment through gateway
 * POST /api/payments/process
 */
router.post('/api/payments/process', async (req, res) => {
  try {
    const {
      amount,
      currency = 'USD',
      paymentMethodId,
      memberId,
      description,
      metadata
    } = req.body;

    if (!amount || !paymentMethodId) {
      return res.status(400).json({
        error: "amount and paymentMethodId are required"
      });
    }

    const result = await paymentGatewayService.processPayment({
      amount: Number(amount),
      currency,
      paymentMethodId: Number(paymentMethodId),
      memberId: memberId ? Number(memberId) : undefined,
      description,
      metadata
    });

    res.status(201).json({
      success: true,
      transaction: result
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: "Failed to process payment" });
  }
});

/**
 * Get available payment methods
 * GET /api/payments/methods
 */
router.get('/api/payments/methods', async (req, res) => {
  try {
    const { memberId, organizationId } = req.query;

    const methods = await paymentGatewayService.getPaymentMethods({
      memberId: memberId ? Number(memberId) : undefined,
      organizationId: organizationId ? Number(organizationId) : undefined
    });

    res.json({
      success: true,
      methods,
      count: methods.length
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: "Failed to fetch payment methods" });
  }
});

/**
 * Register payment method
 * POST /api/payments/methods/register
 */
router.post('/api/payments/methods/register', async (req, res) => {
  try {
    const {
      memberId,
      organizationId,
      type,
      provider,
      token,
      last4,
      expiryDate,
      isDefault = false
    } = req.body;

    if (!type || !provider || !token) {
      return res.status(400).json({
        error: "type, provider, and token are required"
      });
    }

    const paymentMethod = await paymentGatewayService.registerPaymentMethod({
      memberId: memberId ? Number(memberId) : undefined,
      organizationId: organizationId ? Number(organizationId) : undefined,
      type,
      provider,
      token,
      last4,
      expiryDate,
      isDefault
    });

    res.status(201).json({
      success: true,
      paymentMethod
    });

  } catch (error) {
    console.error('Error registering payment method:', error);
    res.status(500).json({ error: "Failed to register payment method" });
  }
});

/**
 * Remove payment method
 * DELETE /api/payments/methods/:methodId
 */
router.delete('/api/payments/methods/:methodId', async (req, res) => {
  try {
    const { methodId } = req.params;

    await paymentGatewayService.removePaymentMethod(Number(methodId));

    res.json({
      success: true,
      message: "Payment method removed successfully"
    });

  } catch (error) {
    console.error('Error removing payment method:', error);
    res.status(500).json({ error: "Failed to remove payment method" });
  }
});

/**
 * Process refund
 * POST /api/payments/refund
 */
router.post('/api/payments/refund', async (req, res) => {
  try {
    const {
      transactionId,
      amount,
      reason,
      refundedBy
    } = req.body;

    if (!transactionId || !amount) {
      return res.status(400).json({
        error: "transactionId and amount are required"
      });
    }

    const refund = await paymentGatewayService.processRefund({
      transactionId,
      amount: Number(amount),
      reason,
      refundedBy
    });

    res.status(201).json({
      success: true,
      refund
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: "Failed to process refund" });
  }
});

/**
 * Get transaction details
 * GET /api/payments/transaction/:transactionId
 */
router.get('/api/payments/transaction/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await paymentGatewayService.getTransaction(transactionId);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

// ============================================================================
// PAYMENT NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * Send payment success notification
 * POST /api/payments/notify/success
 */
router.post('/api/payments/notify/success', async (req, res) => {
  try {
    const { transactionId, memberId, amount } = req.body;

    if (!transactionId || !memberId) {
      return res.status(400).json({
        error: "transactionId and memberId are required"
      });
    }

    const notification = await paymentNotificationService.sendPaymentSuccessNotification(
      transactionId,
      Number(memberId),
      amount ? Number(amount) : undefined
    );

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending success notification:', error);
    res.status(500).json({ error: "Failed to send success notification" });
  }
});

/**
 * Send payment failure notification
 * POST /api/payments/notify/failure
 */
router.post('/api/payments/notify/failure', async (req, res) => {
  try {
    const { transactionId, memberId, errorMessage } = req.body;

    if (!transactionId || !memberId) {
      return res.status(400).json({
        error: "transactionId and memberId are required"
      });
    }

    const notification = await paymentNotificationService.sendPaymentFailureNotification(
      transactionId,
      Number(memberId),
      errorMessage
    );

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending failure notification:', error);
    res.status(500).json({ error: "Failed to send failure notification" });
  }
});

/**
 * Send refund notification
 * POST /api/payments/notify/refund
 */
router.post('/api/payments/notify/refund', async (req, res) => {
  try {
    const { refundId, memberId, refundAmount } = req.body;

    if (!refundId || !memberId) {
      return res.status(400).json({
        error: "refundId and memberId are required"
      });
    }

    const notification = await paymentNotificationService.sendRefundNotification(
      refundId,
      Number(memberId),
      refundAmount ? Number(refundAmount) : undefined
    );

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending refund notification:', error);
    res.status(500).json({ error: "Failed to send refund notification" });
  }
});

/**
 * Get notification history
 * GET /api/payments/notifications/:paymentId
 */
router.get('/api/payments/notifications/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const notifications = await paymentNotificationService.getNotificationHistory(paymentId);

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ error: "Failed to fetch notification history" });
  }
});

// ============================================================================
// PAYMENT RECONCILIATION ENDPOINTS
// ============================================================================

/**
 * Reconcile payments
 * POST /api/payments/reconcile
 */
router.post('/api/payments/reconcile', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      paymentGateway,
      autoReconcile = false
    } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "startDate and endDate are required"
      });
    }

    const reconciliation = await paymentReconciliationService.reconcilePayments({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      paymentGateway,
      autoReconcile
    });

    res.json({
      success: true,
      reconciliation
    });

  } catch (error) {
    console.error('Error reconciling payments:', error);
    res.status(500).json({ error: "Failed to reconcile payments" });
  }
});

/**
 * Get reconciliation status
 * GET /api/payments/reconciliation/status
 */
router.get('/api/payments/reconciliation/status', async (req, res) => {
  try {
    const { reconciliationId } = req.query;

    const status = await paymentReconciliationService.getReconciliationStatus(
      reconciliationId as string
    );

    if (!status) {
      return res.status(404).json({ error: "Reconciliation not found" });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Error fetching reconciliation status:', error);
    res.status(500).json({ error: "Failed to fetch reconciliation status" });
  }
});

/**
 * Get reconciliation report
 * GET /api/payments/reconciliation/report
 */
router.get('/api/payments/reconciliation/report', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      format = 'json'
    } = req.query;

    const report = await paymentReconciliationService.generateReconciliationReport({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      format: format as 'json' | 'csv' | 'pdf'
    });

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error generating reconciliation report:', error);
    res.status(500).json({ error: "Failed to generate reconciliation report" });
  }
});

/**
 * Run auto-reconciliation
 * POST /api/payments/reconciliation/auto
 */
router.post('/api/payments/reconciliation/auto', async (req, res) => {
  try {
    const { paymentGateway } = req.body;

    const result = await paymentReconciliationService.runAutoReconciliation({
      paymentGateway
    });

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error running auto-reconciliation:', error);
    res.status(500).json({ error: "Failed to run auto-reconciliation" });
  }
});

/**
 * Get discrepancies
 * GET /api/payments/reconciliation/discrepancies
 */
router.get('/api/payments/reconciliation/discrepancies', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status = 'unresolved'
    } = req.query;

    const discrepancies = await paymentReconciliationService.getDiscrepancies({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status as string
    });

    res.json({
      success: true,
      discrepancies,
      count: discrepancies.length
    });

  } catch (error) {
    console.error('Error fetching discrepancies:', error);
    res.status(500).json({ error: "Failed to fetch discrepancies" });
  }
});

export default router;
