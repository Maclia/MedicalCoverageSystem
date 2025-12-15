import express, { Request, Response } from "express";
import { requireTokenPermission, verifyOrganizationAccess } from "../middleware/tokenPermissions";
import { tokenWalletService } from "../services/tokenWalletService";
import { tokenPackageService } from "../services/tokenPackageService";
import { tokenPurchaseService } from "../services/tokenPurchaseService";
import { tokenSubscriptionService } from "../services/tokenSubscriptionService";
import { autoTopupService } from "../services/autoTopupService";
import { tokenBillingIntegration } from "../services/tokenBillingIntegration";
import { db } from "../db";
import { lowBalanceNotifications } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// ===== Wallet Endpoints =====

/**
 * GET /api/tokens/wallet/:organizationId
 * Get organization's token wallet info
 */
router.get(
  "/wallet/:organizationId",
  requireTokenPermission("tokens.view"),
  verifyOrganizationAccess,
  async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const wallet = await tokenWalletService.getWallet(organizationId);

      return res.json({ wallet });
    } catch (error: any) {
      console.error("Error getting wallet:", error);
      return res.status(500).json({
        error: {
          code: "WALLET_FETCH_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/wallet/:organizationId/balance
 * Quick balance check
 */
router.get(
  "/wallet/:organizationId/balance",
  requireTokenPermission("tokens.view"),
  verifyOrganizationAccess,
  async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const balance = await tokenWalletService.getBalance(organizationId);
      const wallet = await tokenWalletService.getWallet(organizationId);

      return res.json({
        balance,
        currency: wallet.currency,
      });
    } catch (error: any) {
      console.error("Error getting balance:", error);
      return res.status(500).json({
        error: {
          code: "BALANCE_FETCH_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/wallet/:organizationId/history
 * Get balance change history
 */
router.get(
  "/wallet/:organizationId/history",
  requireTokenPermission("tokens.view"),
  verifyOrganizationAccess,
  async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        changeType: req.query.changeType as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await tokenWalletService.getBalanceHistory(organizationId, filters);

      return res.json(result);
    } catch (error: any) {
      console.error("Error getting balance history:", error);
      return res.status(500).json({
        error: {
          code: "HISTORY_FETCH_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/wallet/:organizationId/forecast
 * Get usage forecast and projections
 */
router.get(
  "/wallet/:organizationId/forecast",
  requireTokenPermission("tokens.view"),
  verifyOrganizationAccess,
  async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const forecast = await tokenWalletService.calculateProjectedDepletion(organizationId);

      return res.json({ forecast });
    } catch (error: any) {
      console.error("Error calculating forecast:", error);
      return res.status(500).json({
        error: {
          code: "FORECAST_CALCULATION_ERROR",
          message: error.message,
        },
      });
    }
  }
);

// ===== Package Endpoints =====

/**
 * GET /api/tokens/packages
 * List available token packages
 */
router.get("/packages", async (req: Request, res: Response) => {
  try {
    const packages = await tokenPackageService.getActivePackages();
    return res.json({ packages });
  } catch (error: any) {
    console.error("Error getting packages:", error);
    return res.status(500).json({
      error: {
        code: "PACKAGES_FETCH_ERROR",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/tokens/packages/:packageId/price
 * Calculate price for specific package
 */
router.get(
  "/packages/:packageId/price",
  requireTokenPermission("tokens.purchase"),
  async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.packageId);
      const organizationId = parseInt(req.query.organizationId as string);

      if (!organizationId) {
        return res.status(400).json({
          error: {
            code: "MISSING_ORGANIZATION",
            message: "organizationId query parameter is required",
          },
        });
      }

      const pricing = await tokenPackageService.calculatePrice(organizationId, packageId);

      return res.json(pricing);
    } catch (error: any) {
      console.error("Error calculating price:", error);
      return res.status(500).json({
        error: {
          code: "PRICE_CALCULATION_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * POST /api/tokens/packages/calculate-custom
 * Calculate price for custom token amount
 */
router.post(
  "/packages/calculate-custom",
  requireTokenPermission("tokens.purchase"),
  async (req: Request, res: Response) => {
    try {
      const { organizationId, tokenQuantity } = req.body;

      if (!organizationId || !tokenQuantity) {
        return res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "organizationId and tokenQuantity are required",
          },
        });
      }

      const pricing = await tokenPackageService.calculateCustomPrice(
        organizationId,
        tokenQuantity
      );

      return res.json(pricing);
    } catch (error: any) {
      console.error("Error calculating custom price:", error);
      return res.status(400).json({
        error: {
          code: "CUSTOM_PRICE_ERROR",
          message: error.message,
        },
      });
    }
  }
);

// ===== Purchase Endpoints =====

/**
 * POST /api/tokens/purchase
 * Initialize token purchase
 */
router.post(
  "/purchase",
  requireTokenPermission("tokens.purchase"),
  async (req: Request, res: Response) => {
    try {
      const { organizationId, purchaseType, packageId, customTokenQuantity, paymentMethodId } =
        req.body;

      if (!organizationId || !purchaseType || !paymentMethodId) {
        return res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "organizationId, purchaseType, and paymentMethodId are required",
          },
        });
      }

      if (!packageId && !customTokenQuantity) {
        return res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "Either packageId or customTokenQuantity must be provided",
          },
        });
      }

      const purchase = await tokenPurchaseService.initializePurchase({
        organizationId,
        userId: req.user!.id,
        purchaseType,
        packageId,
        customTokenQuantity,
        paymentMethodId,
      });

      return res.status(201).json({ purchase });
    } catch (error: any) {
      console.error("Error initializing purchase:", error);
      return res.status(400).json({
        error: {
          code: "PURCHASE_INIT_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * POST /api/tokens/purchase/:referenceId/execute
 * Execute payment for initialized purchase
 */
router.post(
  "/purchase/:referenceId/execute",
  requireTokenPermission("tokens.purchase"),
  async (req: Request, res: Response) => {
    try {
      const referenceId = req.params.referenceId;

      const result = await tokenPurchaseService.executePurchase(referenceId);
      const purchase = await tokenPurchaseService.getPurchaseByReference(referenceId);

      return res.json({
        status: purchase.status,
        gatewayTransactionId: purchase.gatewayTransactionId,
        tokensAllocated: purchase.tokensAllocatedAt !== null,
        newBalance: await tokenWalletService.getBalance(purchase.organizationId),
        invoiceId: purchase.invoiceId,
      });
    } catch (error: any) {
      console.error("Error executing purchase:", error);
      return res.status(400).json({
        error: {
          code: "PURCHASE_EXECUTION_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/purchase/:referenceId
 * Get purchase details
 */
router.get(
  "/purchase/:referenceId",
  requireTokenPermission("tokens.view"),
  async (req: Request, res: Response) => {
    try {
      const referenceId = req.params.referenceId;
      const purchase = await tokenPurchaseService.getPurchaseByReference(referenceId);

      return res.json({ purchase });
    } catch (error: any) {
      console.error("Error getting purchase:", error);
      return res.status(404).json({
        error: {
          code: "PURCHASE_NOT_FOUND",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/purchase
 * Get purchase history
 */
router.get(
  "/purchase",
  requireTokenPermission("tokens.view"),
  async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.query.organizationId as string);

      if (!organizationId) {
        return res.status(400).json({
          error: {
            code: "MISSING_ORGANIZATION",
            message: "organizationId query parameter is required",
          },
        });
      }

      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        purchaseType: req.query.purchaseType as string | undefined,
        status: req.query.status as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await tokenPurchaseService.getPurchaseHistory(organizationId, filters);

      return res.json(result);
    } catch (error: any) {
      console.error("Error getting purchase history:", error);
      return res.status(500).json({
        error: {
          code: "PURCHASE_HISTORY_ERROR",
          message: error.message,
        },
      });
    }
  }
);

// ===== Subscription Endpoints =====

/**
 * POST /api/tokens/subscription
 * Create new subscription
 */
router.post(
  "/subscription",
  requireTokenPermission("tokens.purchase"),
  async (req: Request, res: Response) => {
    try {
      const { organizationId, packageId, frequency, paymentMethodId } = req.body;

      if (!organizationId || !packageId || !frequency || !paymentMethodId) {
        return res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "organizationId, packageId, frequency, and paymentMethodId are required",
          },
        });
      }

      const subscription = await tokenSubscriptionService.createSubscription({
        organizationId,
        packageId,
        frequency,
        paymentMethodId,
        userId: req.user!.id,
      });

      return res.status(201).json({ subscription });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      return res.status(400).json({
        error: {
          code: "SUBSCRIPTION_CREATION_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/subscription/:organizationId
 * Get organization's active subscription
 */
router.get(
  "/subscription/:organizationId",
  requireTokenPermission("tokens.view"),
  verifyOrganizationAccess,
  async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const subscription = await tokenSubscriptionService.getActiveSubscription(organizationId);

      if (!subscription) {
        return res.status(404).json({
          error: {
            code: "NO_ACTIVE_SUBSCRIPTION",
            message: "No active subscription found for this organization",
          },
        });
      }

      return res.json({ subscription });
    } catch (error: any) {
      console.error("Error getting subscription:", error);
      return res.status(500).json({
        error: {
          code: "SUBSCRIPTION_FETCH_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * PUT /api/tokens/subscription/:subscriptionId/pause
 * Pause subscription billing
 */
router.put(
  "/subscription/:subscriptionId/pause",
  requireTokenPermission("tokens.configure"),
  async (req: Request, res: Response) => {
    try {
      const subscriptionId = parseInt(req.params.subscriptionId);
      const subscription = await tokenSubscriptionService.pauseSubscription(subscriptionId);

      return res.json({ subscription });
    } catch (error: any) {
      console.error("Error pausing subscription:", error);
      return res.status(400).json({
        error: {
          code: "SUBSCRIPTION_PAUSE_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * PUT /api/tokens/subscription/:subscriptionId/resume
 * Resume paused subscription
 */
router.put(
  "/subscription/:subscriptionId/resume",
  requireTokenPermission("tokens.configure"),
  async (req: Request, res: Response) => {
    try {
      const subscriptionId = parseInt(req.params.subscriptionId);
      const subscription = await tokenSubscriptionService.resumeSubscription(subscriptionId);

      return res.json({ subscription });
    } catch (error: any) {
      console.error("Error resuming subscription:", error);
      return res.status(400).json({
        error: {
          code: "SUBSCRIPTION_RESUME_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * DELETE /api/tokens/subscription/:subscriptionId
 * Cancel subscription
 */
router.delete(
  "/subscription/:subscriptionId",
  requireTokenPermission("tokens.configure"),
  async (req: Request, res: Response) => {
    try {
      const subscriptionId = parseInt(req.params.subscriptionId);
      const { reason } = req.body;

      const subscription = await tokenSubscriptionService.cancelSubscription(
        subscriptionId,
        req.user!.id,
        reason
      );

      return res.json({ subscription });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      return res.status(400).json({
        error: {
          code: "SUBSCRIPTION_CANCEL_ERROR",
          message: error.message,
        },
      });
    }
  }
);

// ===== Auto Top-Up Endpoints =====

/**
 * POST /api/tokens/auto-topup
 * Create auto top-up policy
 */
router.post(
  "/auto-topup",
  requireTokenPermission("tokens.configure"),
  async (req: Request, res: Response) => {
    try {
      const policy = await autoTopupService.createPolicy(req.body);
      return res.status(201).json({ policy });
    } catch (error: any) {
      console.error("Error creating auto top-up policy:", error);
      return res.status(400).json({
        error: {
          code: "AUTO_TOPUP_CREATION_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/auto-topup/:organizationId
 * Get auto top-up policy
 */
router.get(
  "/auto-topup/:organizationId",
  requireTokenPermission("tokens.view"),
  verifyOrganizationAccess,
  async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const policy = await autoTopupService.getPolicy(organizationId);

      if (!policy) {
        return res.status(404).json({
          error: {
            code: "NO_POLICY_FOUND",
            message: "No auto top-up policy found for this organization",
          },
        });
      }

      return res.json({ policy });
    } catch (error: any) {
      console.error("Error getting auto top-up policy:", error);
      return res.status(500).json({
        error: {
          code: "POLICY_FETCH_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * PUT /api/tokens/auto-topup/:policyId
 * Update policy settings
 */
router.put(
  "/auto-topup/:policyId",
  requireTokenPermission("tokens.configure"),
  async (req: Request, res: Response) => {
    try {
      const policyId = parseInt(req.params.policyId);
      const policy = await autoTopupService.updatePolicy(policyId, req.body);

      return res.json({ policy });
    } catch (error: any) {
      console.error("Error updating auto top-up policy:", error);
      return res.status(400).json({
        error: {
          code: "POLICY_UPDATE_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * PUT /api/tokens/auto-topup/:policyId/enable
 * Enable auto top-up
 */
router.put(
  "/auto-topup/:policyId/enable",
  requireTokenPermission("tokens.configure"),
  async (req: Request, res: Response) => {
    try {
      const policyId = parseInt(req.params.policyId);
      const policy = await autoTopupService.enablePolicy(policyId);

      return res.json({ policy });
    } catch (error: any) {
      console.error("Error enabling auto top-up policy:", error);
      return res.status(400).json({
        error: {
          code: "POLICY_ENABLE_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * PUT /api/tokens/auto-topup/:policyId/disable
 * Disable auto top-up
 */
router.put(
  "/auto-topup/:policyId/disable",
  requireTokenPermission("tokens.configure"),
  async (req: Request, res: Response) => {
    try {
      const policyId = parseInt(req.params.policyId);
      const policy = await autoTopupService.disablePolicy(policyId);

      return res.json({ policy });
    } catch (error: any) {
      console.error("Error disabling auto top-up policy:", error);
      return res.status(400).json({
        error: {
          code: "POLICY_DISABLE_ERROR",
          message: error.message,
        },
      });
    }
  }
);

// ===== Low Balance Notification Endpoints =====

/**
 * POST /api/tokens/notifications/thresholds
 * Add low balance notification threshold
 */
router.post(
  "/notifications/thresholds",
  requireTokenPermission("tokens.configure"),
  async (req: Request, res: Response) => {
    try {
      const { organizationId, thresholdType, thresholdValue } = req.body;

      if (!organizationId || !thresholdType || thresholdValue === undefined) {
        return res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "organizationId, thresholdType, and thresholdValue are required",
          },
        });
      }

      const [threshold] = await db
        .insert(lowBalanceNotifications)
        .values({
          organizationId,
          thresholdType,
          thresholdValue: thresholdValue.toString(),
          isActive: true,
        })
        .returning();

      return res.status(201).json({ threshold });
    } catch (error: any) {
      console.error("Error creating threshold:", error);
      return res.status(400).json({
        error: {
          code: "THRESHOLD_CREATION_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/notifications/thresholds/:organizationId
 * Get all notification thresholds for organization
 */
router.get(
  "/notifications/thresholds/:organizationId",
  requireTokenPermission("tokens.view"),
  verifyOrganizationAccess,
  async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);

      const thresholds = await db
        .select()
        .from(lowBalanceNotifications)
        .where(eq(lowBalanceNotifications.organizationId, organizationId));

      return res.json({ thresholds });
    } catch (error: any) {
      console.error("Error getting thresholds:", error);
      return res.status(500).json({
        error: {
          code: "THRESHOLDS_FETCH_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * DELETE /api/tokens/notifications/thresholds/:thresholdId
 * Remove notification threshold
 */
router.delete(
  "/notifications/thresholds/:thresholdId",
  requireTokenPermission("tokens.configure"),
  async (req: Request, res: Response) => {
    try {
      const thresholdId = parseInt(req.params.thresholdId);

      await db
        .update(lowBalanceNotifications)
        .set({ isActive: false })
        .where(eq(lowBalanceNotifications.id, thresholdId));

      return res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting threshold:", error);
      return res.status(400).json({
        error: {
          code: "THRESHOLD_DELETE_ERROR",
          message: error.message,
        },
      });
    }
  }
);

// ===== Finance & Revenue Endpoints =====

/**
 * GET /api/tokens/revenue
 * Calculate token revenue for a date range
 */
router.get(
  "/revenue",
  requireTokenPermission("tokens.view"),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, organizationId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "startDate and endDate query parameters are required",
          },
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const orgId = organizationId ? parseInt(organizationId as string) : undefined;

      const revenue = await tokenBillingIntegration.calculateTokenRevenue(start, end, orgId);

      return res.json({ revenue });
    } catch (error: any) {
      console.error("Error calculating revenue:", error);
      return res.status(500).json({
        error: {
          code: "REVENUE_CALCULATION_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/revenue/monthly/:year
 * Get monthly token revenue breakdown for a year
 */
router.get(
  "/revenue/monthly/:year",
  requireTokenPermission("tokens.view"),
  async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.params.year);
      const { organizationId } = req.query;

      if (isNaN(year) || year < 2020 || year > 2100) {
        return res.status(400).json({
          error: {
            code: "INVALID_YEAR",
            message: "Valid year parameter is required",
          },
        });
      }

      const orgId = organizationId ? parseInt(organizationId as string) : undefined;
      const monthlyRevenue = await tokenBillingIntegration.getMonthlyTokenRevenue(year, orgId);

      return res.json({ monthlyRevenue, year });
    } catch (error: any) {
      console.error("Error getting monthly revenue:", error);
      return res.status(500).json({
        error: {
          code: "MONTHLY_REVENUE_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/revenue/top-purchasers
 * Get top token purchasers for a date range
 */
router.get(
  "/revenue/top-purchasers",
  requireTokenPermission("tokens.view"),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, limit } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "startDate and endDate query parameters are required",
          },
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const limitNum = limit ? parseInt(limit as string) : 10;

      const topPurchasers = await tokenBillingIntegration.getTopTokenPurchasers(
        start,
        end,
        limitNum
      );

      return res.json({ topPurchasers });
    } catch (error: any) {
      console.error("Error getting top purchasers:", error);
      return res.status(500).json({
        error: {
          code: "TOP_PURCHASERS_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/invoices/:invoiceNumber
 * Get invoice by number
 */
router.get(
  "/invoices/:invoiceNumber",
  requireTokenPermission("tokens.view"),
  async (req: Request, res: Response) => {
    try {
      const { invoiceNumber } = req.params;
      const invoice = await tokenBillingIntegration.getInvoice(invoiceNumber);

      if (!invoice) {
        return res.status(404).json({
          error: {
            code: "INVOICE_NOT_FOUND",
            message: `Invoice ${invoiceNumber} not found`,
          },
        });
      }

      return res.json({ invoice });
    } catch (error: any) {
      console.error("Error getting invoice:", error);
      return res.status(500).json({
        error: {
          code: "INVOICE_FETCH_ERROR",
          message: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/tokens/invoices
 * Get invoices for organization
 */
router.get(
  "/invoices",
  requireTokenPermission("tokens.view"),
  async (req: Request, res: Response) => {
    try {
      const { organizationId, status, startDate, endDate } = req.query;

      if (!organizationId) {
        return res.status(400).json({
          error: {
            code: "MISSING_ORGANIZATION",
            message: "organizationId query parameter is required",
          },
        });
      }

      const orgId = parseInt(organizationId as string);
      const filters = {
        status: status as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const invoices = await tokenBillingIntegration.getOrganizationInvoices(orgId, filters);

      return res.json({ invoices });
    } catch (error: any) {
      console.error("Error getting invoices:", error);
      return res.status(500).json({
        error: {
          code: "INVOICES_FETCH_ERROR",
          message: error.message,
        },
      });
    }
  }
);

export default router;
