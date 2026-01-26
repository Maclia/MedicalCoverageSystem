import { eq, and, desc, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { tokenPurchases, paymentMethods, users } from "../../shared/schema";
import { tokenWalletService } from "./tokenWalletService";
import { tokenPackageService } from "./tokenPackageService";
import { tokenBillingIntegration } from "./tokenBillingIntegration";
import { v4 as uuidv4 } from "uuid";

export class TokenPurchaseService {
  /**
   * Initialize purchase - creates purchase record with pending status
   */
  async initializePurchase(data: {
    organizationId: number;
    userId: number;
    purchaseType: "one_time" | "subscription" | "auto_topup";
    packageId?: number;
    customTokenQuantity?: number;
    paymentMethodId: number;
    subscriptionId?: number;
    autoTopupPolicyId?: number;
  }) {
    // Validate user has permission (checked in route middleware)
    const user = await db.query.users.findFirst({
      where: eq(users.id, data.userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Validate payment method belongs to organization
    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, data.paymentMethodId),
    });

    if (!paymentMethod) {
      throw new Error("Payment method not found");
    }

    if (paymentMethod.companyId !== data.organizationId) {
      throw new Error("Payment method does not belong to this organization");
    }

    // Calculate pricing
    let pricing;
    if (data.packageId) {
      pricing = await tokenPackageService.calculatePrice(
        data.organizationId,
        data.packageId
      );
    } else if (data.customTokenQuantity) {
      pricing = await tokenPackageService.calculateCustomPrice(
        data.organizationId,
        data.customTokenQuantity
      );
    } else {
      throw new Error("Either packageId or customTokenQuantity must be provided");
    }

    // Generate unique reference ID
    const purchaseReferenceId = `REF-${uuidv4()}`;

    // Calculate token expiration date if enabled
    const wallet = await tokenWalletService.getWallet(data.organizationId);
    let tokenExpirationDate = null;
    if (wallet.expirationEnabled && wallet.expirationDays) {
      tokenExpirationDate = new Date();
      tokenExpirationDate.setDate(tokenExpirationDate.getDate() + wallet.expirationDays);
    }

    // Create purchase record
    const [purchase] = await db
      .insert(tokenPurchases)
      .values({
        purchaseReferenceId,
        organizationId: data.organizationId,
        purchasedBy: data.userId,
        purchaseType: data.purchaseType,
        tokenQuantity: pricing.tokenQuantity.toString(),
        pricePerToken: pricing.pricePerToken.toString(),
        totalAmount: pricing.totalAmount.toString(),
        currency: pricing.currency,
        packageId: data.packageId || null,
        status: "pending",
        paymentMethodId: data.paymentMethodId,
        subscriptionId: data.subscriptionId || null,
        autoTopupPolicyId: data.autoTopupPolicyId || null,
        tokenExpirationDate,
        paymentInitiatedAt: new Date(),
      })
      .returning();

    return purchase;
  }

  /**
   * Execute purchase - processes payment through gateway
   */
  async executePurchase(purchaseReferenceId: string) {
    const purchase = await this.getPurchaseByReference(purchaseReferenceId);

    if (purchase.status !== "pending") {
      throw new Error(`Purchase ${purchaseReferenceId} is not in pending status`);
    }

    // Update status to processing
    await db
      .update(tokenPurchases)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId));

    try {
      // In a real implementation, this would call paymentGatewayService.processPayment()
      // For now, we'll simulate a successful payment
      // TODO: Integrate with actual paymentGatewayService

      const gatewayTransactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Complete the purchase
      await this.completePurchase(purchaseReferenceId, gatewayTransactionId);

      return {
        success: true,
        gatewayTransactionId,
      };
    } catch (error: any) {
      // Handle payment failure
      await this.failPurchase(purchaseReferenceId, error.message);
      throw error;
    }
  }

  /**
   * Complete purchase - called after successful payment
   */
  async completePurchase(purchaseReferenceId: string, gatewayTransactionId: string) {
    const purchase = await this.getPurchaseByReference(purchaseReferenceId);

    // Update purchase status
    await db
      .update(tokenPurchases)
      .set({
        status: "completed",
        gatewayTransactionId,
        paymentCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId));

    // Allocate tokens
    await this.allocateTokens(purchaseReferenceId);

    // Generate invoice automatically
    try {
      await tokenBillingIntegration.generateTokenPurchaseInvoice(purchaseReferenceId);
    } catch (invoiceError: any) {
      console.error("Error generating invoice:", invoiceError);
      // Continue even if invoice generation fails - tokens already allocated
    }

    // Send success notification
    // TODO: Integrate with notification service
    // await tokenNotificationService.sendPurchaseSuccessNotification(purchaseReferenceId);

    return await this.getPurchaseByReference(purchaseReferenceId);
  }

  /**
   * Allocate tokens to wallet after successful payment
   */
  async allocateTokens(purchaseReferenceId: string) {
    const purchase = await this.getPurchaseByReference(purchaseReferenceId);

    if (purchase.tokensAllocatedAt) {
      throw new Error("Tokens already allocated for this purchase");
    }

    // Add tokens to wallet
    await tokenWalletService.updateBalance(
      purchase.organizationId,
      purchase.tokenQuantity,
      "purchase",
      "token_purchase",
      purchase.id,
      purchase.purchasedBy,
      `Token purchase ${purchaseReferenceId}`
    );

    // Update purchase record
    await db
      .update(tokenPurchases)
      .set({
        tokensAllocatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId));

    // If subscription or auto top-up, update related records
    // This would be handled by TokenSubscriptionService or AutoTopupService
  }

  /**
   * Handle payment failure
   */
  async failPurchase(purchaseReferenceId: string, failureReason: string) {
    await db
      .update(tokenPurchases)
      .set({
        status: "failed",
        failureReason,
        updatedAt: new Date(),
      })
      .where(eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId));

    // Send failure notification
    // TODO: Integrate with notification service
    // await tokenNotificationService.sendPurchaseFailureNotification(purchaseReferenceId);
  }

  /**
   * Generate invoice for purchase
   */
  async generateInvoice(purchaseReferenceId: string) {
    const purchase = await this.getPurchaseByReference(purchaseReferenceId);

    // Check if invoice generation is required
    const shouldGenerateInvoice =
      purchase.purchaseType === "one_time" ||
      purchase.purchaseType === "subscription" ||
      (purchase.purchaseType === "auto_topup" && purchase.autoTopupPolicyId);

    if (!shouldGenerateInvoice) {
      return null;
    }

    // TODO: Integrate with existing billingService
    // Map token purchase data to invoice line items
    // const invoice = await billingService.generateInvoice({
    //   organizationId: purchase.organizationId,
    //   lineItems: [{
    //     description: `Token Purchase - ${purchase.tokenQuantity} tokens`,
    //     quantity: parseFloat(purchase.tokenQuantity),
    //     unitPrice: parseFloat(purchase.pricePerToken),
    //     amount: parseFloat(purchase.totalAmount),
    //   }],
    //   totalAmount: parseFloat(purchase.totalAmount),
    //   currency: purchase.currency,
    // });

    // Update purchase with invoice ID
    // await db
    //   .update(tokenPurchases)
    //   .set({ invoiceId: invoice.id, updatedAt: new Date() })
    //   .where(eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId));

    return null; // Placeholder
  }

  /**
   * Get purchase history with filters
   */
  async getPurchaseHistory(
    organizationId: number,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      purchaseType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let query = db
      .select()
      .from(tokenPurchases)
      .where(eq(tokenPurchases.organizationId, organizationId))
      .$dynamic();

    if (filters?.startDate) {
      query = query.where(gte(tokenPurchases.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      query = query.where(lte(tokenPurchases.createdAt, filters.endDate));
    }

    if (filters?.purchaseType) {
      query = query.where(eq(tokenPurchases.purchaseType, filters.purchaseType as any));
    }

    if (filters?.status) {
      query = query.where(eq(tokenPurchases.status, filters.status as any));
    }

    query = query.orderBy(desc(tokenPurchases.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    const purchases = await query;

    // Get total count
    const allPurchases = await db
      .select()
      .from(tokenPurchases)
      .where(eq(tokenPurchases.organizationId, organizationId));

    return {
      purchases,
      total: allPurchases.length,
      limit: filters?.limit || purchases.length,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Get purchase by reference ID
   */
  async getPurchaseByReference(purchaseReferenceId: string) {
    const purchase = await db.query.tokenPurchases.findFirst({
      where: eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId),
    });

    if (!purchase) {
      throw new Error(`Purchase ${purchaseReferenceId} not found`);
    }

    return purchase;
  }

  /**
   * Cancel a pending purchase
   */
  async cancelPurchase(purchaseReferenceId: string, reason?: string) {
    const purchase = await this.getPurchaseByReference(purchaseReferenceId);

    if (purchase.status !== "pending") {
      throw new Error("Only pending purchases can be cancelled");
    }

    await db
      .update(tokenPurchases)
      .set({
        status: "cancelled",
        failureReason: reason || "Cancelled by user",
        updatedAt: new Date(),
      })
      .where(eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId));
  }
}

export const tokenPurchaseService = new TokenPurchaseService();
