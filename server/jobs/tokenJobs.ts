/**
 * Background Jobs for Token System
 *
 * These jobs should be scheduled using node-cron or similar job scheduler
 * Frequencies are specified in the planning document
 */

import { tokenSubscriptionService } from "../services/tokenSubscriptionService";
import { autoTopupService } from "../services/autoTopupService";
import { tokenWalletService } from "../services/tokenWalletService";
import { tokenNotificationService } from "../services/tokenNotificationService";
import { db } from "../db";
import { tokenPurchases, lowBalanceNotifications, organizationTokenWallets, tokenSubscriptions } from "../../shared/schema";
import { eq, lte, and } from "drizzle-orm";

/**
 * Job 1: Process Subscription Billing
 * Frequency: Every hour (0 * * * *)
 * Purpose: Process subscription billing on due dates
 */
export async function processSubscriptionBilling() {
  console.log("[Job] Starting subscription billing processing");

  try {
    const dueSubscriptions = await tokenSubscriptionService.getSubscriptionsDueForBilling();

    console.log(`[Job] Found ${dueSubscriptions.length} subscriptions due for billing`);

    const results = [];

    for (const subscription of dueSubscriptions) {
      try {
        await tokenSubscriptionService.processSubscriptionBilling(subscription.id);
        results.push({ subscriptionId: subscription.id, success: true });
      } catch (error: any) {
        console.error(
          `[Job] Failed to process subscription ${subscription.id}:`,
          error.message
        );
        results.push({ subscriptionId: subscription.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `[Job] Subscription billing complete. Success: ${successCount}, Failed: ${failureCount}`
    );

    // Alert if > 10% failure rate
    if (dueSubscriptions.length > 0 && failureCount / dueSubscriptions.length > 0.1) {
      console.warn(`[Job] HIGH FAILURE RATE: ${(failureCount / dueSubscriptions.length * 100).toFixed(1)}% of subscriptions failed`);
    }

    return results;
  } catch (error: any) {
    console.error("[Job] Subscription billing job failed:", error);
    throw error;
  }
}

/**
 * Job 2: Check Auto Top-Up Thresholds
 * Frequency: Every hour (0 * * * *)
 * Purpose: Check balance thresholds and trigger auto top-ups
 */
export async function checkAutoTopupThresholds() {
  console.log("[Job] Checking auto top-up thresholds");

  try {
    const results = await autoTopupService.checkThresholdTriggers();

    const triggeredCount = results.filter((r) => r.triggered).length;
    console.log(`[Job] Auto top-up threshold check complete. Triggered: ${triggeredCount}`);

    return results;
  } catch (error: any) {
    console.error("[Job] Auto top-up threshold check failed:", error);
    throw error;
  }
}

/**
 * Job 3: Check Auto Top-Up Scheduled Triggers
 * Frequency: Every hour (0 * * * *)
 * Purpose: Execute scheduled auto top-ups
 */
export async function checkAutoTopupSchedules() {
  console.log("[Job] Checking auto top-up schedules");

  try {
    const results = await autoTopupService.checkScheduledTriggers();

    const executedCount = results.filter((r) => r.executed).length;
    console.log(`[Job] Auto top-up schedule check complete. Executed: ${executedCount}`);

    return results;
  } catch (error: any) {
    console.error("[Job] Auto top-up schedule check failed:", error);
    throw error;
  }
}

/**
 * Job 4: Check Low Balance Thresholds
 * Frequency: Every 15 minutes (cron: star-slash-15 star star star star)
 * Purpose: Send low balance alerts
 */
export async function checkLowBalanceThresholds() {
  console.log("[Job] Checking low balance thresholds");

  try {
    const wallets = await db.select().from(organizationTokenWallets);

    let alertsSent = 0;

    for (const wallet of wallets) {
      try {
        const currentBalance = parseFloat(wallet.currentBalance);

        // Check for zero balance (critical)
        if (currentBalance === 0) {
          await tokenNotificationService.sendZeroBalanceAlert(wallet.organizationId);
          alertsSent++;
          continue;
        }

        // Get configured thresholds
        const thresholds = await db
          .select()
          .from(lowBalanceNotifications)
          .where(
            and(
              eq(lowBalanceNotifications.organizationId, wallet.organizationId),
              eq(lowBalanceNotifications.isActive, true)
            )
          );

        for (const threshold of thresholds) {
          const thresholdValue = parseFloat(threshold.thresholdValue);

          // Check if balance crossed threshold
          let shouldTrigger = false;

          if (threshold.thresholdType === "percentage") {
            const totalPurchased = parseFloat(wallet.totalPurchased);
            if (totalPurchased > 0) {
              const thresholdAmount = (totalPurchased * thresholdValue) / 100;
              shouldTrigger = currentBalance <= thresholdAmount;
            }
          } else {
            // Absolute threshold
            shouldTrigger = currentBalance <= thresholdValue;
          }

          // Check if already triggered
          if (shouldTrigger) {
            const lastNotifiedBalance = threshold.lastNotifiedBalance
              ? parseFloat(threshold.lastNotifiedBalance)
              : null;

            // Only send if not already triggered, or if balance recovered and dropped again
            if (
              !lastNotifiedBalance ||
              (lastNotifiedBalance > thresholdValue * 1.1 && currentBalance <= thresholdValue)
            ) {
              await tokenNotificationService.sendLowBalanceAlert(
                wallet.organizationId,
                thresholdValue,
                currentBalance
              );
              alertsSent++;
            }
          } else {
            // Reset threshold if balance is above (threshold + 10%)
            if (
              threshold.lastTriggeredAt &&
              currentBalance > thresholdValue * 1.1
            ) {
              await db
                .update(lowBalanceNotifications)
                .set({
                  lastTriggeredAt: null,
                  lastNotifiedBalance: null,
                })
                .where(eq(lowBalanceNotifications.id, threshold.id));
            }
          }
        }
      } catch (error: any) {
        console.error(
          `[Job] Error checking low balance for org ${wallet.organizationId}:`,
          error.message
        );
      }
    }

    console.log(`[Job] Low balance check complete. Alerts sent: ${alertsSent}`);

    return { checked: wallets.length, alertsSent };
  } catch (error: any) {
    console.error("[Job] Low balance check failed:", error);
    throw error;
  }
}

/**
 * Job 5: Process Token Expiration
 * Frequency: Daily at 2 AM (0 2 * * *)
 * Purpose: Remove expired tokens from wallets
 */
export async function processTokenExpiration() {
  console.log("[Job] Processing token expiration");

  try {
    const now = new Date();

    // Get all purchases with expired tokens
    const expiredPurchases = await db
      .select()
      .from(tokenPurchases)
      .where(
        and(
          lte(tokenPurchases.tokenExpirationDate, now),
          eq(tokenPurchases.status, "completed")
        )
      );

    console.log(`[Job] Found ${expiredPurchases.length} expired token purchases`);

    let tokensExpired = 0;

    for (const purchase of expiredPurchases) {
      try {
        // Check if already processed
        if (purchase.metadata && JSON.parse(purchase.metadata).expirationProcessed) {
          continue;
        }

        // Deduct expired tokens
        const tokenQuantity = parseFloat(purchase.tokenQuantity);
        await tokenWalletService.updateBalance(
          purchase.organizationId,
          (-tokenQuantity).toString(),
          "expiration",
          "token_purchase",
          purchase.id,
          undefined,
          `Tokens expired from purchase ${purchase.purchaseReferenceId}`
        );

        // Mark as processed
        await db
          .update(tokenPurchases)
          .set({
            metadata: JSON.stringify({
              ...JSON.parse(purchase.metadata || "{}"),
              expirationProcessed: true,
              expirationProcessedAt: now.toISOString(),
            }),
            updatedAt: now,
          })
          .where(eq(tokenPurchases.id, purchase.id));

        tokensExpired += tokenQuantity;

        // Send expiration notification
        // await tokenNotificationService.sendTokenExpirationNotification(purchase.organizationId, tokenQuantity);
      } catch (error: any) {
        console.error(
          `[Job] Error expiring tokens for purchase ${purchase.id}:`,
          error.message
        );
      }
    }

    console.log(`[Job] Token expiration complete. Tokens expired: ${tokensExpired}`);

    return { processed: expiredPurchases.length, tokensExpired };
  } catch (error: any) {
    console.error("[Job] Token expiration job failed:", error);
    throw error;
  }
}

/**
 * Job 6: Process Subscription Grace Period Expiry
 * Frequency: Every 6 hours (cron: 0 star-slash-6 star star star)
 * Purpose: Cancel subscriptions and suspend wallets after grace period
 */
export async function processSubscriptionGracePeriods() {
  console.log("[Job] Processing subscription grace periods");

  try {
    const expiredSubscriptions =
      await tokenSubscriptionService.getSubscriptionsWithExpiredGracePeriod();

    console.log(`[Job] Found ${expiredSubscriptions.length} subscriptions with expired grace periods`);

    for (const subscription of expiredSubscriptions) {
      try {
        await tokenSubscriptionService.handleGracePeriodExpiry(subscription.id);
      } catch (error: any) {
        console.error(
          `[Job] Error handling grace period expiry for subscription ${subscription.id}:`,
          error.message
        );
      }
    }

    console.log(`[Job] Grace period processing complete`);

    return { processed: expiredSubscriptions.length };
  } catch (error: any) {
    console.error("[Job] Grace period processing failed:", error);
    throw error;
  }
}

/**
 * Job 7: Reset Monthly Spending Limits
 * Frequency: First day of month at midnight (0 0 1 * *)
 * Purpose: Reset monthly spending counters for auto top-up policies
 */
export async function resetAutoTopupSpending() {
  console.log("[Job] Resetting auto top-up monthly spending");

  try {
    const result = await autoTopupService.resetMonthlySpending();
    console.log(`[Job] Monthly spending reset complete. Next reset: ${result.nextResetDate}`);

    return result;
  } catch (error: any) {
    console.error("[Job] Monthly spending reset failed:", error);
    throw error;
  }
}

/**
 * Job 8: Calculate Usage Forecasts
 * Frequency: Daily at 3 AM (0 3 * * *)
 * Purpose: Calculate consumption forecasts for dashboards
 */
export async function calculateUsageForecasts() {
  console.log("[Job] Calculating usage forecasts");

  try {
    const wallets = await db.select().from(organizationTokenWallets);

    const results = [];

    for (const wallet of wallets) {
      try {
        const forecast = await tokenWalletService.calculateProjectedDepletion(
          wallet.organizationId
        );
        results.push({ organizationId: wallet.organizationId, success: true, forecast });
      } catch (error: any) {
        console.error(
          `[Job] Error calculating forecast for org ${wallet.organizationId}:`,
          error.message
        );
        results.push({ organizationId: wallet.organizationId, success: false });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`[Job] Usage forecast calculation complete. Success: ${successCount}/${wallets.length}`);

    // Clean up old forecasts (> 30 days)
    // await db.delete(tokenUsageForecasts).where(lte(tokenUsageForecasts.calculatedAt, thirtyDaysAgo));

    return results;
  } catch (error: any) {
    console.error("[Job] Usage forecast calculation failed:", error);
    throw error;
  }
}

/**
 * Job 9: Send Subscription Renewal Reminders
 * Frequency: Daily at 9 AM (0 9 * * *)
 * Purpose: Remind users of upcoming subscription billing
 */
export async function sendSubscriptionRenewalReminders() {
  console.log("[Job] Sending subscription renewal reminders");

  try {
    // Get subscriptions with billing in 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const targetDate = threeDaysFromNow.toISOString().split("T")[0];

    const upcomingSubscriptions = await db
      .select()
      .from(tokenSubscriptions)
      .where(
        and(
          eq(tokenSubscriptions.status, "active"),
          eq(tokenSubscriptions.nextBillingDate, targetDate)
        )
      );

    console.log(`[Job] Found ${upcomingSubscriptions.length} subscriptions with upcoming billing`);

    for (const subscription of upcomingSubscriptions) {
      try {
        await tokenNotificationService.sendSubscriptionRenewalNotification(subscription.id);
      } catch (error: any) {
        console.error(
          `[Job] Error sending renewal reminder for subscription ${subscription.id}:`,
          error.message
        );
      }
    }

    console.log(`[Job] Subscription renewal reminders sent`);

    return { sent: upcomingSubscriptions.length };
  } catch (error: any) {
    console.error("[Job] Subscription renewal reminders failed:", error);
    throw error;
  }
}

/**
 * Job Health Check
 * Returns status of all jobs
 */
export function getJobsHealthStatus() {
  // This would integrate with job scheduler to return last run times
  return {
    processSubscriptionBilling: {
      frequency: "Every hour",
      lastRun: null,
      status: "unknown",
    },
    checkAutoTopupThresholds: {
      frequency: "Every hour",
      lastRun: null,
      status: "unknown",
    },
    checkAutoTopupSchedules: {
      frequency: "Every hour",
      lastRun: null,
      status: "unknown",
    },
    checkLowBalanceThresholds: {
      frequency: "Every 15 minutes",
      lastRun: null,
      status: "unknown",
    },
    processTokenExpiration: {
      frequency: "Daily at 2 AM",
      lastRun: null,
      status: "unknown",
    },
    processSubscriptionGracePeriods: {
      frequency: "Every 6 hours",
      lastRun: null,
      status: "unknown",
    },
    resetAutoTopupSpending: {
      frequency: "First day of month",
      lastRun: null,
      status: "unknown",
    },
    calculateUsageForecasts: {
      frequency: "Daily at 3 AM",
      lastRun: null,
      status: "unknown",
    },
    sendSubscriptionRenewalReminders: {
      frequency: "Daily at 9 AM",
      lastRun: null,
      status: "unknown",
    },
  };
}
