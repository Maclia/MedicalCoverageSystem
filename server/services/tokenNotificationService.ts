import { eq } from "drizzle-orm";
import { db } from "../db";
import { tokenPurchases, users, companies, lowBalanceNotifications } from "../../shared/schema";

export class TokenNotificationService {
  /**
   * Send purchase success notification
   */
  async sendPurchaseSuccessNotification(purchaseReferenceId: string) {
    const purchase = await db.query.tokenPurchases.findFirst({
      where: eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId),
    });

    if (!purchase) {
      throw new Error(`Purchase ${purchaseReferenceId} not found`);
    }

    const organization = await db.query.companies.findFirst({
      where: eq(companies.id, purchase.organizationId),
    });

    const user = await db.query.users.findFirst({
      where: eq(users.id, purchase.purchasedBy),
    });

    if (!organization || !user) {
      throw new Error("Organization or user not found");
    }

    // TODO: Integrate with existing email service
    console.log(`Sending purchase success notification:`, {
      to: user.email,
      organization: organization.companyName,
      tokens: purchase.tokenQuantity,
      amount: purchase.totalAmount,
      referenceId: purchaseReferenceId,
    });

    return {
      sent: true,
      recipient: user.email,
    };
  }

  /**
   * Send purchase failure notification
   */
  async sendPurchaseFailureNotification(purchaseReferenceId: string) {
    const purchase = await db.query.tokenPurchases.findFirst({
      where: eq(tokenPurchases.purchaseReferenceId, purchaseReferenceId),
    });

    if (!purchase) {
      throw new Error(`Purchase ${purchaseReferenceId} not found`);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, purchase.purchasedBy),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // TODO: Integrate with existing email service
    console.log(`Sending purchase failure notification:`, {
      to: user.email,
      failureReason: purchase.failureReason,
      referenceId: purchaseReferenceId,
    });

    return {
      sent: true,
      recipient: user.email,
    };
  }

  /**
   * Send low balance alert
   */
  async sendLowBalanceAlert(
    organizationId: number,
    thresholdValue: number,
    currentBalance: number
  ) {
    const organization = await db.query.companies.findFirst({
      where: eq(companies.id, organizationId),
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Get all users with token permissions for this organization
    const orgUsers = await db
      .select()
      .from(users)
      .where(eq(users.entityId, organizationId));

    const recipients = orgUsers.filter((u) => {
      const permissions = u.permissions || [];
      return (
        permissions.includes("tokens.view") || permissions.includes("tokens.purchase")
      );
    });

    // TODO: Integrate with existing email service
    console.log(`Sending low balance alert:`, {
      organization: organization.companyName,
      currentBalance,
      threshold: thresholdValue,
      recipients: recipients.map((r) => r.email),
    });

    // Update notification record
    const notification = await db.query.lowBalanceNotifications.findFirst({
      where: eq(lowBalanceNotifications.organizationId, organizationId),
    });

    if (notification) {
      await db
        .update(lowBalanceNotifications)
        .set({
          lastTriggeredAt: new Date(),
          lastNotifiedBalance: currentBalance.toString(),
          notificationsSentCount: (notification.notificationsSentCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(lowBalanceNotifications.id, notification.id));
    }

    return {
      sent: true,
      recipients: recipients.map((r) => r.email),
    };
  }

  /**
   * Send zero balance alert (critical)
   */
  async sendZeroBalanceAlert(organizationId: number) {
    const organization = await db.query.companies.findFirst({
      where: eq(companies.id, organizationId),
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Get all users for this organization
    const orgUsers = await db
      .select()
      .from(users)
      .where(eq(users.entityId, organizationId));

    // TODO: Integrate with existing email service
    console.log(`Sending CRITICAL zero balance alert:`, {
      organization: organization.companyName,
      recipients: orgUsers.map((r) => r.email),
    });

    return {
      sent: true,
      recipients: orgUsers.map((r) => r.email),
    };
  }

  /**
   * Send auto top-up success notification
   */
  async sendAutoTopupSuccessNotification(policyId: number, purchaseReferenceId: string) {
    // TODO: Get policy details and send notification
    console.log(`Auto top-up success notification for policy ${policyId}`);
    return { sent: true };
  }

  /**
   * Send auto top-up failure notification
   */
  async sendAutoTopupFailureNotification(policyId: number, failureReason: string) {
    // TODO: Get policy details and send notification
    console.log(`Auto top-up failure notification for policy ${policyId}: ${failureReason}`);
    return { sent: true };
  }

  /**
   * Send subscription failure notification
   */
  async sendSubscriptionFailureNotification(subscriptionId: number) {
    // TODO: Get subscription details and send notification
    console.log(`Subscription failure notification for subscription ${subscriptionId}`);
    return { sent: true };
  }

  /**
   * Send subscription grace period expiry notification
   */
  async sendSubscriptionGracePeriodExpiryNotification(subscriptionId: number) {
    // TODO: Get subscription details and send notification
    console.log(
      `Subscription grace period expiry notification for subscription ${subscriptionId}`
    );
    return { sent: true };
  }

  /**
   * Send subscription renewal reminder
   */
  async sendSubscriptionRenewalNotification(subscriptionId: number) {
    // TODO: Get subscription details and send notification
    console.log(`Subscription renewal reminder for subscription ${subscriptionId}`);
    return { sent: true };
  }
}

export const tokenNotificationService = new TokenNotificationService();
