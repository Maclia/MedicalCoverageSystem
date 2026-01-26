import { eq, and, lte } from "drizzle-orm";
import { db } from "../db";
import { tokenSubscriptions } from "../../shared/schema";
import { tokenPurchaseService } from "./tokenPurchaseService";
import { tokenWalletService } from "./tokenWalletService";
import { tokenPackageService } from "./tokenPackageService";

export class TokenSubscriptionService {
  /**
   * Create new subscription
   */
  async createSubscription(data: {
    organizationId: number;
    packageId: number;
    frequency: "monthly" | "quarterly" | "annual";
    paymentMethodId: number;
    userId: number;
  }) {
    // Check if organization already has active subscription
    const existingSubscription = await this.getActiveSubscription(data.organizationId);
    if (existingSubscription) {
      throw new Error("Organization already has an active subscription");
    }

    // Calculate pricing
    const pricing = await tokenPackageService.calculatePrice(
      data.organizationId,
      data.packageId
    );

    // Calculate first billing date
    const nextBillingDate = this.calculateNextBillingDate(new Date(), data.frequency);

    // Create subscription
    const [subscription] = await db
      .insert(tokenSubscriptions)
      .values({
        organizationId: data.organizationId,
        packageId: data.packageId,
        tokenQuantity: pricing.tokenQuantity.toString(),
        pricePerToken: pricing.pricePerToken.toString(),
        totalAmount: pricing.totalAmount.toString(),
        currency: pricing.currency,
        frequency: data.frequency,
        status: "active",
        paymentMethodId: data.paymentMethodId,
        nextBillingDate: nextBillingDate.toISOString().split("T")[0],
        startedAt: new Date(),
      })
      .returning();

    // Process first payment immediately
    const purchase = await tokenPurchaseService.initializePurchase({
      organizationId: data.organizationId,
      userId: data.userId,
      purchaseType: "subscription",
      packageId: data.packageId,
      paymentMethodId: data.paymentMethodId,
      subscriptionId: subscription.id,
    });

    await tokenPurchaseService.executePurchase(purchase.purchaseReferenceId);

    return subscription;
  }

  /**
   * Process subscription billing (called by background job)
   */
  async processSubscriptionBilling(subscriptionId: number) {
    const subscription = await db.query.tokenSubscriptions.findFirst({
      where: eq(tokenSubscriptions.id, subscriptionId),
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.status !== "active") {
      throw new Error(`Subscription ${subscriptionId} is not active`);
    }

    try {
      // Create purchase for subscription billing
      const purchase = await tokenPurchaseService.initializePurchase({
        organizationId: subscription.organizationId,
        userId: subscription.cancelledBy || 1, // System user
        purchaseType: "subscription",
        packageId: subscription.packageId,
        paymentMethodId: subscription.paymentMethodId,
        subscriptionId: subscription.id,
      });

      // Execute payment
      await tokenPurchaseService.executePurchase(purchase.purchaseReferenceId);

      // Update subscription on success
      const nextBillingDate = this.calculateNextBillingDate(
        new Date(subscription.nextBillingDate),
        subscription.frequency
      );

      await db
        .update(tokenSubscriptions)
        .set({
          lastBillingDate: new Date().toISOString().split("T")[0],
          lastSuccessfulPayment: new Date(),
          nextBillingDate: nextBillingDate.toISOString().split("T")[0],
          failedPaymentCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(tokenSubscriptions.id, subscriptionId));
    } catch (error: any) {
      // Handle billing failure
      await this.handlePaymentFailure(subscriptionId);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: number, userId: number, reason?: string) {
    const [cancelledSubscription] = await db
      .update(tokenSubscriptions)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(tokenSubscriptions.id, subscriptionId))
      .returning();

    return cancelledSubscription;
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(subscriptionId: number) {
    const [pausedSubscription] = await db
      .update(tokenSubscriptions)
      .set({
        status: "paused",
        updatedAt: new Date(),
      })
      .where(eq(tokenSubscriptions.id, subscriptionId))
      .returning();

    return pausedSubscription;
  }

  /**
   * Resume paused subscription
   */
  async resumeSubscription(subscriptionId: number) {
    const subscription = await db.query.tokenSubscriptions.findFirst({
      where: eq(tokenSubscriptions.id, subscriptionId),
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    // Recalculate next billing date from today
    const nextBillingDate = this.calculateNextBillingDate(new Date(), subscription.frequency);

    const [resumedSubscription] = await db
      .update(tokenSubscriptions)
      .set({
        status: "active",
        nextBillingDate: nextBillingDate.toISOString().split("T")[0],
        updatedAt: new Date(),
      })
      .where(eq(tokenSubscriptions.id, subscriptionId))
      .returning();

    return resumedSubscription;
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(subscriptionId: number) {
    const subscription = await db.query.tokenSubscriptions.findFirst({
      where: eq(tokenSubscriptions.id, subscriptionId),
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const failedPaymentCount = (subscription.failedPaymentCount || 0) + 1;
    const gracePeriodEnds = new Date();
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 3); // 3 days grace period

    await db
      .update(tokenSubscriptions)
      .set({
        status: "payment_failed",
        failedPaymentCount,
        gracePeriodEnds,
        updatedAt: new Date(),
      })
      .where(eq(tokenSubscriptions.id, subscriptionId));

    // Send failure notification
    // TODO: Integrate with notification service
  }

  /**
   * Handle grace period expiry
   */
  async handleGracePeriodExpiry(subscriptionId: number) {
    const subscription = await db.query.tokenSubscriptions.findFirst({
      where: eq(tokenSubscriptions.id, subscriptionId),
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    // Cancel subscription
    await this.cancelSubscription(
      subscriptionId,
      1, // System user
      "Payment failed - grace period expired"
    );

    // Suspend wallet
    await tokenWalletService.suspendWallet(
      subscription.organizationId,
      "Subscription payment failed after grace period"
    );

    // Send suspension notification
    // TODO: Integrate with notification service
  }

  /**
   * Get active subscription for organization
   */
  async getActiveSubscription(organizationId: number) {
    const subscription = await db.query.tokenSubscriptions.findFirst({
      where: and(
        eq(tokenSubscriptions.organizationId, organizationId),
        eq(tokenSubscriptions.status, "active")
      ),
    });

    return subscription;
  }

  /**
   * Get subscriptions due for billing
   */
  async getSubscriptionsDueForBilling() {
    const today = new Date().toISOString().split("T")[0];

    const dueSubscriptions = await db
      .select()
      .from(tokenSubscriptions)
      .where(
        and(
          eq(tokenSubscriptions.status, "active"),
          lte(tokenSubscriptions.nextBillingDate, today)
        )
      );

    return dueSubscriptions;
  }

  /**
   * Get subscriptions with expired grace period
   */
  async getSubscriptionsWithExpiredGracePeriod() {
    const now = new Date();

    const expiredSubscriptions = await db
      .select()
      .from(tokenSubscriptions)
      .where(
        and(
          eq(tokenSubscriptions.status, "payment_failed"),
          lte(tokenSubscriptions.gracePeriodEnds, now)
        )
      );

    return expiredSubscriptions;
  }

  /**
   * Calculate next billing date based on frequency
   */
  private calculateNextBillingDate(
    currentDate: Date,
    frequency: "monthly" | "quarterly" | "annual"
  ): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "annual":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }
}

export const tokenSubscriptionService = new TokenSubscriptionService();
