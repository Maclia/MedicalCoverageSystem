import { eq, and, lte } from "drizzle-orm";
import { db } from "../db";
import { autoTopupPolicies } from "../../shared/schema";
import { tokenWalletService } from "./tokenWalletService";
import { tokenPurchaseService } from "./tokenPurchaseService";

export class AutoTopupService {
  /**
   * Create auto top-up policy
   */
  async createPolicy(data: {
    organizationId: number;
    triggerType: "threshold" | "scheduled" | "both";
    thresholdPercentage?: number;
    scheduleFrequency?: "daily" | "weekly" | "monthly";
    topupPackageId?: number;
    topupTokenQuantity?: number;
    paymentMethodId: number;
    maxSpendingLimitPerMonth?: number;
    invoiceEnabled?: boolean;
  }) {
    // Check if policy already exists
    const existingPolicy = await this.getPolicy(data.organizationId);
    if (existingPolicy) {
      throw new Error("Auto top-up policy already exists for this organization");
    }

    // Calculate nextScheduledRun if scheduled trigger
    let nextScheduledRun = null;
    if (
      data.scheduleFrequency &&
      (data.triggerType === "scheduled" || data.triggerType === "both")
    ) {
      nextScheduledRun = this.calculateNextScheduledRun(data.scheduleFrequency);
    }

    // Calculate spending reset date (first of next month)
    const spendingResetDate = new Date();
    spendingResetDate.setMonth(spendingResetDate.getMonth() + 1);
    spendingResetDate.setDate(1);

    const [policy] = await db
      .insert(autoTopupPolicies)
      .values({
        organizationId: data.organizationId,
        isEnabled: true,
        triggerType: data.triggerType,
        thresholdPercentage: data.thresholdPercentage?.toString() || null,
        scheduleFrequency: data.scheduleFrequency || null,
        nextScheduledRun,
        topupPackageId: data.topupPackageId || null,
        topupTokenQuantity: data.topupTokenQuantity?.toString() || null,
        paymentMethodId: data.paymentMethodId,
        maxSpendingLimitPerMonth: data.maxSpendingLimitPerMonth?.toString() || null,
        currentMonthSpending: "0",
        spendingResetDate: spendingResetDate.toISOString().split("T")[0],
        invoiceEnabled: data.invoiceEnabled || false,
      })
      .returning();

    return policy;
  }

  /**
   * Update policy
   */
  async updatePolicy(policyId: number, updates: Partial<typeof autoTopupPolicies.$inferInsert>) {
    // If scheduleFrequency changed, recalculate nextScheduledRun
    if (updates.scheduleFrequency) {
      updates.nextScheduledRun = this.calculateNextScheduledRun(
        updates.scheduleFrequency as "daily" | "weekly" | "monthly"
      );
    }

    const [updatedPolicy] = await db
      .update(autoTopupPolicies)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(autoTopupPolicies.id, policyId))
      .returning();

    return updatedPolicy;
  }

  /**
   * Enable policy
   */
  async enablePolicy(policyId: number) {
    const [enabledPolicy] = await db
      .update(autoTopupPolicies)
      .set({
        isEnabled: true,
        pausedAt: null,
        pauseReason: null,
        failureCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(autoTopupPolicies.id, policyId))
      .returning();

    return enabledPolicy;
  }

  /**
   * Disable policy
   */
  async disablePolicy(policyId: number) {
    const [disabledPolicy] = await db
      .update(autoTopupPolicies)
      .set({
        isEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(autoTopupPolicies.id, policyId))
      .returning();

    return disabledPolicy;
  }

  /**
   * Check threshold triggers (called by background job)
   */
  async checkThresholdTriggers() {
    const policies = await db
      .select()
      .from(autoTopupPolicies)
      .where(
        and(
          eq(autoTopupPolicies.isEnabled, true),
          // Only policies with threshold trigger
        )
      );

    const thresholdPolicies = policies.filter(
      (p) => p.triggerType === "threshold" || p.triggerType === "both"
    );

    const results = [];

    for (const policy of thresholdPolicies) {
      try {
        // Check if already triggered in last 24 hours
        if (policy.lastTriggeredAt) {
          const hoursSinceLastTrigger =
            (Date.now() - new Date(policy.lastTriggeredAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastTrigger < 24) {
            continue; // Skip if triggered recently
          }
        }

        const wallet = await tokenWalletService.getWallet(policy.organizationId);
        const currentBalance = parseFloat(wallet.currentBalance);
        const totalPurchased = parseFloat(wallet.totalPurchased);

        if (totalPurchased === 0) continue; // Can't calculate threshold if no purchases yet

        const thresholdAmount =
          (totalPurchased * parseFloat(policy.thresholdPercentage || "0")) / 100;

        if (currentBalance <= thresholdAmount) {
          await this.executeAutoTopup(policy.id);
          results.push({ policyId: policy.id, triggered: true });
        }
      } catch (error: any) {
        console.error(`Error checking threshold for policy ${policy.id}:`, error);
        results.push({ policyId: policy.id, triggered: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Check scheduled triggers (called by background job)
   */
  async checkScheduledTriggers() {
    const now = new Date();

    const policies = await db
      .select()
      .from(autoTopupPolicies)
      .where(
        and(eq(autoTopupPolicies.isEnabled, true), lte(autoTopupPolicies.nextScheduledRun, now))
      );

    const scheduledPolicies = policies.filter(
      (p) => p.triggerType === "scheduled" || p.triggerType === "both"
    );

    const results = [];

    for (const policy of scheduledPolicies) {
      try {
        await this.executeAutoTopup(policy.id);
        results.push({ policyId: policy.id, executed: true });
      } catch (error: any) {
        console.error(`Error executing scheduled top-up for policy ${policy.id}:`, error);
        results.push({ policyId: policy.id, executed: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Execute auto top-up
   */
  async executeAutoTopup(policyId: number) {
    const policy = await db.query.autoTopupPolicies.findFirst({
      where: eq(autoTopupPolicies.id, policyId),
    });

    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    if (!policy.isEnabled) {
      throw new Error(`Policy ${policyId} is not enabled`);
    }

    // Check spending limit
    const currentMonthSpending = parseFloat(policy.currentMonthSpending);
    const maxSpendingLimit = parseFloat(policy.maxSpendingLimitPerMonth || "0");

    if (maxSpendingLimit > 0 && currentMonthSpending >= maxSpendingLimit) {
      throw new Error("Monthly spending limit exceeded");
    }

    try {
      // Create purchase
      const purchase = await tokenPurchaseService.initializePurchase({
        organizationId: policy.organizationId,
        userId: 1, // System user
        purchaseType: "auto_topup",
        packageId: policy.topupPackageId || undefined,
        customTokenQuantity: policy.topupTokenQuantity
          ? parseFloat(policy.topupTokenQuantity)
          : undefined,
        paymentMethodId: policy.paymentMethodId,
        autoTopupPolicyId: policy.id,
      });

      // Execute payment
      await tokenPurchaseService.executePurchase(purchase.purchaseReferenceId);

      // Update policy on success
      const newSpending = currentMonthSpending + parseFloat(purchase.totalAmount);

      let nextScheduledRun = policy.nextScheduledRun;
      if (policy.scheduleFrequency) {
        nextScheduledRun = this.calculateNextScheduledRun(policy.scheduleFrequency);
      }

      await db
        .update(autoTopupPolicies)
        .set({
          lastTriggeredAt: new Date(),
          lastPurchaseId: purchase.id,
          currentMonthSpending: newSpending.toString(),
          failureCount: 0,
          nextScheduledRun,
          updatedAt: new Date(),
        })
        .where(eq(autoTopupPolicies.id, policyId));

      // Send success notification if enabled
      // TODO: Integrate with notification service

      return purchase;
    } catch (error: any) {
      // Handle failure
      const failureCount = (policy.failureCount || 0) + 1;

      const updates: any = {
        failureCount,
        updatedAt: new Date(),
      };

      // Pause policy after 3 failures
      if (failureCount >= 3) {
        updates.isEnabled = false;
        updates.pausedAt = new Date();
        updates.pauseReason = `Auto top-up failed ${failureCount} times: ${error.message}`;
      }

      await db.update(autoTopupPolicies).set(updates).where(eq(autoTopupPolicies.id, policyId));

      // Send failure notification
      // TODO: Integrate with notification service

      throw error;
    }
  }

  /**
   * Pause policy
   */
  async pausePolicy(policyId: number, reason: string) {
    const [pausedPolicy] = await db
      .update(autoTopupPolicies)
      .set({
        isEnabled: false,
        pausedAt: new Date(),
        pauseReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(autoTopupPolicies.id, policyId))
      .returning();

    return pausedPolicy;
  }

  /**
   * Reset monthly spending (called on 1st of month)
   */
  async resetMonthlySpending() {
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);
    nextResetDate.setDate(1);

    await db
      .update(autoTopupPolicies)
      .set({
        currentMonthSpending: "0",
        spendingResetDate: nextResetDate.toISOString().split("T")[0],
        updatedAt: new Date(),
      });

    return { reset: true, nextResetDate };
  }

  /**
   * Get policy for organization
   */
  async getPolicy(organizationId: number) {
    const policy = await db.query.autoTopupPolicies.findFirst({
      where: eq(autoTopupPolicies.organizationId, organizationId),
    });

    return policy;
  }

  /**
   * Calculate next scheduled run based on frequency
   */
  private calculateNextScheduledRun(frequency: "daily" | "weekly" | "monthly"): Date {
    const nextRun = new Date();

    switch (frequency) {
      case "daily":
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case "weekly":
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case "monthly":
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
    }

    return nextRun;
  }
}

export const autoTopupService = new AutoTopupService();
