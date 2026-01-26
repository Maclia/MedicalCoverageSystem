import { Router } from 'express';
import { tokenAuditService } from '../services/tokenAuditService';
import { tokenBillingIntegration } from '../services/tokenBillingIntegration';
import { tokenNotificationService } from '../services/tokenNotificationService';
import { tokenPackageService } from '../services/tokenPackageService';
import { tokenPurchaseService } from '../services/tokenPurchaseService';
import { autoTopupService } from '../services/autoTopupService';
import { storage } from '../storage';

const router = Router();

// ============================================================================
// TOKEN PURCHASE ENDPOINTS
// ============================================================================

/**
 * Purchase token package
 * POST /api/tokens/purchase
 */
router.post('/api/tokens/purchase', async (req, res) => {
  try {
    const {
      organizationId,
      userId,
      purchaseType,
      packageId,
      customTokenQuantity,
      paymentMethodId,
      subscriptionId,
      autoTopupPolicyId
    } = req.body;

    if (!organizationId || !userId || !paymentMethodId) {
      return res.status(400).json({
        error: "organizationId, userId, and paymentMethodId are required"
      });
    }

    if (!packageId && !customTokenQuantity) {
      return res.status(400).json({
        error: "Either packageId or customTokenQuantity is required"
      });
    }

    const purchase = await tokenPurchaseService.initializePurchase({
      organizationId: Number(organizationId),
      userId: Number(userId),
      purchaseType: purchaseType || 'one_time',
      packageId: packageId ? Number(packageId) : undefined,
      customTokenQuantity: customTokenQuantity ? Number(customTokenQuantity) : undefined,
      paymentMethodId: Number(paymentMethodId),
      subscriptionId: subscriptionId ? Number(subscriptionId) : undefined,
      autoTopupPolicyId: autoTopupPolicyId ? Number(autoTopupPolicyId) : undefined
    });

    res.status(201).json({
      success: true,
      purchase
    });

  } catch (error) {
    console.error('Error initializing purchase:', error);
    res.status(500).json({ error: "Failed to initialize purchase" });
  }
});

/**
 * Get purchase details
 * GET /api/tokens/purchase/:purchaseId
 */
router.get('/api/tokens/purchase/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const purchase = await tokenPurchaseService.getPurchaseByReference(purchaseId);

    res.json({
      success: true,
      purchase
    });

  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ error: "Failed to fetch purchase" });
  }
});

/**
 * Get purchase history
 * GET /api/tokens/purchase/member/:memberId
 */
router.get('/api/tokens/purchase/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      startDate,
      endDate,
      purchaseType,
      status,
      limit = 50,
      offset = 0
    } = req.query;

    const history = await tokenPurchaseService.getPurchaseHistory(
      Number(memberId),
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        purchaseType: purchaseType as string,
        status: status as string,
        limit: Number(limit),
        offset: Number(offset)
      }
    );

    res.json({
      success: true,
      ...history
    });

  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({ error: "Failed to fetch purchase history" });
  }
});

/**
 * Cancel pending purchase
 * POST /api/tokens/purchase/:purchaseId/cancel
 */
router.post('/api/tokens/purchase/:purchaseId/cancel', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { reason } = req.body;

    await tokenPurchaseService.cancelPurchase(purchaseId, reason);

    res.json({
      success: true,
      message: "Purchase cancelled successfully",
      purchaseId
    });

  } catch (error) {
    console.error('Error cancelling purchase:', error);
    res.status(500).json({ error: "Failed to cancel purchase" });
  }
});

/**
 * Get available token packages
 * GET /api/tokens/packages
 */
router.get('/api/tokens/packages', async (req, res) => {
  try {
    const { organizationId } = req.query;

    const packages = await tokenPackageService.getActivePackages(
      organizationId ? Number(organizationId) : undefined
    );

    res.json({
      success: true,
      packages,
      count: packages.length
    });

  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: "Failed to fetch packages" });
  }
});

/**
 * Create new token package (admin)
 * POST /api/tokens/packages
 */
router.post('/api/tokens/packages', async (req, res) => {
  try {
    const {
      name,
      description,
      tokenQuantity,
      price,
      currency = 'USD',
      discountPercentage,
      isActive = true,
      metadata
    } = req.body;

    if (!name || !tokenQuantity || !price) {
      return res.status(400).json({
        error: "name, tokenQuantity, and price are required"
      });
    }

    const package = await tokenPackageService.createPackage({
      name,
      description,
      tokenQuantity: Number(tokenQuantity),
      price: Number(price),
      currency,
      discountPercentage: discountPercentage ? Number(discountPercentage) : undefined,
      isActive,
      metadata
    });

    res.status(201).json({
      success: true,
      package
    });

  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: "Failed to create package" });
  }
});

// ============================================================================
// TOKEN PACKAGE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get package details
 * GET /api/tokens/packages/:packageId
 */
router.get('/api/tokens/packages/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;
    const { organizationId } = req.query;

    const packageDetails = await tokenPackageService.getPackage(
      Number(packageId),
      organizationId ? Number(organizationId) : undefined
    );

    if (!packageDetails) {
      return res.status(404).json({ error: "Package not found" });
    }

    res.json({
      success: true,
      package: packageDetails
    });

  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: "Failed to fetch package" });
  }
});

/**
 * Update package
 * PUT /api/tokens/packages/:packageId
 */
router.put('/api/tokens/packages/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;
    const updates = req.body;

    const package = await tokenPackageService.updatePackage(
      Number(packageId),
      updates
    );

    res.json({
      success: true,
      package
    });

  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: "Failed to update package" });
  }
});

/**
 * Delete package
 * DELETE /api/tokens/packages/:packageId
 */
router.delete('/api/tokens/packages/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;

    await tokenPackageService.deletePackage(Number(packageId));

    res.json({
      success: true,
      message: "Package deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: "Failed to delete package" });
  }
});

/**
 * Get active packages
 * GET /api/tokens/packages/active
 */
router.get('/api/tokens/packages/active', async (req, res) => {
  try {
    const { organizationId } = req.query;

    const packages = await tokenPackageService.getActivePackages(
      organizationId ? Number(organizationId) : undefined
    );

    res.json({
      success: true,
      packages,
      count: packages.length
    });

  } catch (error) {
    console.error('Error fetching active packages:', error);
    res.status(500).json({ error: "Failed to fetch active packages" });
  }
});

// ============================================================================
// TOKEN BALANCE & USAGE ENDPOINTS
// ============================================================================

/**
 * Get token balance
 * GET /api/tokens/balance/member/:memberId
 */
router.get('/api/tokens/balance/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;

    const balance = await tokenPackageService.getTokenBalance(Number(memberId));

    res.json({
      success: true,
      balance
    });

  } catch (error) {
    console.error('Error fetching token balance:', error);
    res.status(500).json({ error: "Failed to fetch token balance" });
  }
});

/**
 * Deduct tokens for service usage
 * POST /api/tokens/deduct
 */
router.post('/api/tokens/deduct', async (req, res) => {
  try {
    const {
      organizationId,
      tokenQuantity,
      reason,
      referenceType,
      referenceId,
      userId
    } = req.body;

    if (!organizationId || !tokenQuantity) {
      return res.status(400).json({
        error: "organizationId and tokenQuantity are required"
      });
    }

    const result = await tokenPackageService.deductTokens(
      Number(organizationId),
      Number(tokenQuantity),
      reason,
      referenceType,
      referenceId,
      userId
    );

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error deducting tokens:', error);
    res.status(500).json({ error: "Failed to deduct tokens" });
  }
});

/**
 * Get token usage history
 * GET /api/tokens/usage/member/:memberId
 */
router.get('/api/tokens/usage/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    const usage = await tokenAuditService.getTokenUsage(
      Number(memberId),
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: Number(limit),
        offset: Number(offset)
      }
    );

    res.json({
      success: true,
      ...usage
    });

  } catch (error) {
    console.error('Error fetching token usage:', error);
    res.status(500).json({ error: "Failed to fetch token usage" });
  }
});

/**
 * Get usage summary
 * GET /api/tokens/usage/summary
 */
router.get('/api/tokens/usage/summary', async (req, res) => {
  try {
    const { organizationId, period = '30days' } = req.query;

    const summary = await tokenAuditService.getUsageSummary({
      organizationId: organizationId ? Number(organizationId) : undefined,
      period: period as string
    });

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error fetching usage summary:', error);
    res.status(500).json({ error: "Failed to fetch usage summary" });
  }
});

// ============================================================================
// AUTO-TOPUP ENDPOINTS
// ============================================================================

/**
 * Configure auto-topup
 * POST /api/tokens/topup/configure
 */
router.post('/api/tokens/topup/configure', async (req, res) => {
  try {
    const {
      organizationId,
      threshold,
      topupAmount,
      packageId,
      paymentMethodId,
      maxTopupsPerMonth = 5,
      isActive = true
    } = req.body;

    if (!organizationId || !threshold || !topupAmount || !paymentMethodId) {
      return res.status(400).json({
        error: "organizationId, threshold, topupAmount, and paymentMethodId are required"
      });
    }

    const policy = await autoTopupService.createAutoTopupPolicy({
      organizationId: Number(organizationId),
      threshold: Number(threshold),
      topupAmount: Number(topupAmount),
      packageId: packageId ? Number(packageId) : undefined,
      paymentMethodId: Number(paymentMethodId),
      maxTopupsPerMonth: Number(maxTopupsPerMonth),
      isActive
    });

    res.status(201).json({
      success: true,
      policy
    });

  } catch (error) {
    console.error('Error configuring auto-topup:', error);
    res.status(500).json({ error: "Failed to configure auto-topup" });
  }
});

/**
 * Get topup configuration
 * GET /api/tokens/topup/member/:memberId
 */
router.get('/api/tokens/topup/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;

    const policies = await autoTopupService.getActivePolicies(Number(memberId));

    res.json({
      success: true,
      policies,
      count: policies.length
    });

  } catch (error) {
    console.error('Error fetching topup configuration:', error);
    res.status(500).json({ error: "Failed to fetch topup configuration" });
  }
});

/**
 * Update topup configuration
 * PUT /api/tokens/topup/:topupId
 */
router.put('/api/tokens/topup/:topupId', async (req, res) => {
  try {
    const { topupId } = req.params;
    const updates = req.body;

    const policy = await autoTopupService.updatePolicy(
      Number(topupId),
      updates
    );

    res.json({
      success: true,
      policy
    });

  } catch (error) {
    console.error('Error updating topup configuration:', error);
    res.status(500).json({ error: "Failed to update topup configuration" });
  }
});

/**
 * Disable auto-topup
 * DELETE /api/tokens/topup/:topupId
 */
router.delete('/api/tokens/topup/:topupId', async (req, res) => {
  try {
    const { topupId } = req.params;

    await autoTopupService.disablePolicy(Number(topupId));

    res.json({
      success: true,
      message: "Auto-topup disabled successfully"
    });

  } catch (error) {
    console.error('Error disabling auto-topup:', error);
    res.status(500).json({ error: "Failed to disable auto-topup" });
  }
});

/**
 * Get topup history
 * GET /api/tokens/topup/history/:memberId
 */
router.get('/api/tokens/topup/history/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    const history = await autoTopupService.getTopupHistory(
      Number(memberId),
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: Number(limit),
        offset: Number(offset)
      }
    );

    res.json({
      success: true,
      ...history
    });

  } catch (error) {
    console.error('Error fetching topup history:', error);
    res.status(500).json({ error: "Failed to fetch topup history" });
  }
});

// ============================================================================
// TOKEN BILLING INTEGRATION ENDPOINTS
// ============================================================================

/**
 * Get unbilled token usage
 * GET /api/tokens/billing/unbilled
 */
router.get('/api/tokens/billing/unbilled', async (req, res) => {
  try {
    const { organizationId } = req.query;

    const unbilledUsage = await tokenBillingIntegration.getUnbilledUsage(
      organizationId ? Number(organizationId) : undefined
    );

    res.json({
      success: true,
      unbilledUsage
    });

  } catch (error) {
    console.error('Error fetching unbilled usage:', error);
    res.status(500).json({ error: "Failed to fetch unbilled usage" });
  }
});

/**
 * Generate invoice for token usage
 * POST /api/tokens/billing/generate-invoice
 */
router.post('/api/tokens/billing/generate-invoice', async (req, res) => {
  try {
    const { organizationId, billingPeriodEnd, includeUnbilledOnly = true } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const invoice = await tokenBillingIntegration.generateTokenUsageInvoice({
      organizationId: Number(organizationId),
      billingPeriodEnd: billingPeriodEnd ? new Date(billingPeriodEnd) : new Date(),
      includeUnbilledOnly
    });

    res.status(201).json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

/**
 * Get token billing invoice
 * GET /api/tokens/billing/invoice/:invoiceId
 */
router.get('/api/tokens/billing/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await tokenBillingIntegration.getInvoiceDetails(Number(invoiceId));

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

/**
 * Get billing history
 * GET /api/tokens/billing/member/:memberId
 */
router.get('/api/tokens/billing/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      startDate,
      endDate,
      status,
      limit = 50,
      offset = 0
    } = req.query;

    const history = await tokenBillingIntegration.getBillingHistory(
      Number(memberId),
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string,
        limit: Number(limit),
        offset: Number(offset)
      }
    );

    res.json({
      success: true,
      ...history
    });

  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ error: "Failed to fetch billing history" });
  }
});

// ============================================================================
// TOKEN AUDIT ENDPOINTS
// ============================================================================

/**
 * Get audit log of all transactions
 * GET /api/tokens/audit/transactions
 */
router.get('/api/tokens/audit/transactions', async (req, res) => {
  try {
    const {
      organizationId,
      transactionType,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    const transactions = await tokenAuditService.getAuditLog({
      organizationId: organizationId ? Number(organizationId) : undefined,
      transactionType: transactionType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json({
      success: true,
      ...transactions
    });

  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

/**
 * Get audit log for specific member
 * GET /api/tokens/audit/member/:memberId
 */
router.get('/api/tokens/audit/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      transactionType,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    const auditLog = await tokenAuditService.getMemberAuditLog(
      Number(memberId),
      {
        transactionType: transactionType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: Number(limit),
        offset: Number(offset)
      }
    );

    res.json({
      success: true,
      ...auditLog
    });

  } catch (error) {
    console.error('Error fetching member audit log:', error);
    res.status(500).json({ error: "Failed to fetch member audit log" });
  }
});

/**
 * Get purchase audit trail
 * GET /api/tokens/audit/purchase/:purchaseId
 */
router.get('/api/tokens/audit/purchase/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const auditTrail = await tokenAuditService.getPurchaseAuditTrail(purchaseId);

    res.json({
      success: true,
      auditTrail
    });

  } catch (error) {
    console.error('Error fetching purchase audit trail:', error);
    res.status(500).json({ error: "Failed to fetch purchase audit trail" });
  }
});

/**
 * Export audit logs
 * POST /api/tokens/audit/export
 */
router.post('/api/tokens/audit/export', async (req, res) => {
  try {
    const {
      organizationId,
      startDate,
      endDate,
      format = 'csv'
    } = req.body;

    const exportData = await tokenAuditService.exportAuditLogs({
      organizationId: organizationId ? Number(organizationId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format: format as 'csv' | 'json' | 'xlsx'
    });

    res.json({
      success: true,
      exportData
    });

  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

// ============================================================================
// TOKEN NOTIFICATIONS ENDPOINTS
// ============================================================================

/**
 * Send low balance warning
 * POST /api/tokens/notifications/low-balance
 */
router.post('/api/tokens/notifications/low-balance', async (req, res) => {
  try {
    const { organizationId, threshold, currentBalance } = req.body;

    const notification = await tokenNotificationService.sendLowBalanceWarning(
      Number(organizationId),
      Number(threshold),
      Number(currentBalance)
    );

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending low balance warning:', error);
    res.status(500).json({ error: "Failed to send low balance warning" });
  }
});

/**
 * Send purchase confirmation
 * POST /api/tokens/notifications/purchase-complete
 */
router.post('/api/tokens/notifications/purchase-complete', async (req, res) => {
  try {
    const { purchaseId, organizationId } = req.body;

    const notification = await tokenNotificationService.sendPurchaseConfirmation(
      purchaseId,
      Number(organizationId)
    );

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending purchase confirmation:', error);
    res.status(500).json({ error: "Failed to send purchase confirmation" });
  }
});

/**
 * Send topup success notification
 * POST /api/tokens/notifications/topup-success
 */
router.post('/api/tokens/notifications/topup-success', async (req, res) => {
  try {
    const { organizationId, topupAmount, newBalance } = req.body;

    const notification = await tokenNotificationService.sendTopupSuccessNotification(
      Number(organizationId),
      Number(topupAmount),
      Number(newBalance)
    );

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending topup success notification:', error);
    res.status(500).json({ error: "Failed to send topup success notification" });
  }
});

/**
 * Get notification preferences
 * GET /api/tokens/notifications/settings/:memberId
 */
router.get('/api/tokens/notifications/settings/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;

    const preferences = await tokenNotificationService.getNotificationPreferences(
      Number(memberId)
    );

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: "Failed to fetch notification preferences" });
  }
});

/**
 * Update notification preferences
 * PUT /api/tokens/notifications/settings/:memberId
 */
router.put('/api/tokens/notifications/settings/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const preferences = req.body;

    const updatedPreferences = await tokenNotificationService.updateNotificationPreferences(
      Number(memberId),
      preferences
    );

    res.json({
      success: true,
      preferences: updatedPreferences
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

export default router;
