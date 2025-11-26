/**
 * Payment Notification Service
 * Real-time payment notifications and confirmations
 * Payment failure notifications with retry instructions
 * Upcoming payment reminders and auto-payment confirmations
 * Payment method expiry notifications and update prompts
 */

import { storage } from '../storage';
import * as schema from '../../shared/schema.js';
import { billingService } from './billingService.js';

export interface PaymentNotification {
  id?: number;
  paymentId: number;
  memberId?: number;
  companyId?: number;
  type: PaymentNotificationType;
  channel: NotificationChannel;
  recipientAddress: string;
  subject?: string;
  messageContent: string;
  scheduledDate: Date;
  sentDate?: Date;
  status: NotificationStatus;
  deliveryAttempts: number;
  responseReceived: boolean;
  responseDate?: Date;
  nextActionDate?: Date;
  metadata: PaymentNotificationMetadata;
  templateId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentNotificationType =
  | 'payment_receipt'
  | 'payment_failure'
  | 'payment_retry'
  | 'upcoming_payment'
  | 'auto_payment_confirmation'
  | 'payment_method_expiry'
  | 'payment_method_update_request'
  | 'payment_allocation_confirmation'
  | 'refund_confirmation'
  | 'chargeback_notification'
  | 'reversal_notification'
  | 'payment_method_added'
  | 'payment_method_removed'
  | 'subscription_renewal'
  | 'payment_reminder'
  | 'overdue_payment'
  | 'payment_plan_update';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'postal_mail' | 'whatsapp';

export type NotificationStatus = 'scheduled' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked' | 'replied';

export interface PaymentNotificationMetadata {
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  failureReason?: string;
  retryCount?: number;
  nextRetryDate?: Date;
  invoiceNumbers?: string[];
  transactionId?: string;
  autoPaymentEnabled?: boolean;
  expiryDate?: Date;
  refundAmount?: number;
  chargebackAmount?: number;
  reversalAmount?: number;
  paymentPlanDetails?: PaymentPlanDetails;
  customFields?: Record<string, any>;
}

export interface PaymentPlanDetails {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentAmount: number;
  nextInstallmentDate: Date;
  completedInstallments: number;
  totalInstallments: number;
}

export interface NotificationTemplate {
  id?: number;
  templateName: string;
  templateType: PaymentNotificationType;
  channel: NotificationChannel;
  subjectTemplate?: string;
  messageTemplate: string;
  variables: string[];
  language: string;
  isActive: boolean;
  clientType: 'individual' | 'corporate' | 'both';
  approvalRequired: boolean;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRule {
  id?: number;
  ruleName: string;
  triggerEvent: PaymentNotificationType;
  triggerCondition: string;
  templateId: number;
  channel: NotificationChannel;
  delayMinutes: number;
  isActive: boolean;
  priority: number;
  clientType: 'individual' | 'corporate' | 'both';
  retryOnFailure: boolean;
  maxRetries: number;
  retryIntervalMinutes: number;
  stopOnSuccess: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSchedule {
  id?: number;
  notificationId: number;
  scheduledTime: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attemptCount: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface DeliveryProvider {
  id: number;
  providerName: string;
  providerType: 'email' | 'sms' | 'push' | 'whatsapp' | 'postal';
  configuration: ProviderConfiguration;
  isActive: boolean;
  rateLimits: RateLimits;
  retryConfiguration: RetryConfiguration;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderConfiguration {
  apiKey?: string;
  apiSecret?: string;
  endpointUrl?: string;
  webhookUrl?: string;
  senderId?: string;
  customSettings: Record<string, any>;
}

export interface RateLimits {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface RetryConfiguration {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelayMinutes: number;
  maxDelayMinutes: number;
  multiplier?: number;
}

export interface NotificationMetrics {
  period: DateRange;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalFailed: number;
  totalBounced: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  failureRate: number;
  bounceRate: number;
  averageDeliveryTime: number;
  byType: Record<PaymentNotificationType, TypeMetrics>;
  byChannel: Record<NotificationChannel, ChannelMetrics>;
  byProvider: Record<string, ProviderMetrics>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TypeMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface ChannelMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  averageCost: number;
}

export interface ProviderMetrics {
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  averageResponseTime: number;
  errors: number;
  cost: number;
}

export interface NotificationPreferences {
  id?: number;
  memberId?: number;
  companyId?: number;
  channelPreferences: Record<NotificationChannel, boolean>;
  typePreferences: Record<PaymentNotificationType, boolean>;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    timezone: string;
  };
  frequencyLimits: {
    maxPerHour: number;
    maxPerDay: number;
    maxPerWeek: number;
  };
  customSettings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentNotificationService {
  private providers: Map<NotificationChannel, DeliveryProvider> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private rules: Map<PaymentNotificationType, NotificationRule[]> = new Map();

  constructor() {
    this.initializeProviders();
    this.loadDefaultTemplates();
    this.loadDefaultRules();
  }

  /**
   * Send payment receipt confirmation
   */
  async sendPaymentReceipt(
    paymentId: number,
    amount: number,
    currency: string,
    paymentMethod: string,
    invoiceIds: number[] = []
  ): Promise<void> {
    try {
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      const notifications = await this.createPaymentReceiptNotifications(payment, amount, currency, paymentMethod, invoiceIds);

      for (const notification of notifications) {
        await this.scheduleNotification(notification);
      }
    } catch (error) {
      console.error('Failed to send payment receipt:', error);
      throw error;
    }
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(
    paymentId: number,
    failureReason: string,
    retryDate?: Date
  ): Promise<void> {
    try {
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      const notifications = await this.createPaymentFailureNotifications(payment, failureReason, retryDate);

      for (const notification of notifications) {
        await this.scheduleNotification(notification);
      }
    } catch (error) {
      console.error('Failed to send payment failure notification:', error);
      throw error;
    }
  }

  /**
   * Send payment method expiry warning
   */
  async sendPaymentMethodExpiryWarning(paymentMethodId: number, daysUntilExpiry: number): Promise<void> {
    try {
      const paymentMethod = await this.getPaymentMethod(paymentMethodId);
      if (!paymentMethod) {
        throw new Error(`Payment method not found: ${paymentMethodId}`);
      }

      const notifications = await this.createPaymentMethodExpiryNotifications(paymentMethod, daysUntilExpiry);

      for (const notification of notifications) {
        await this.scheduleNotification(notification);
      }
    } catch (error) {
      console.error('Failed to send payment method expiry warning:', error);
      throw error;
    }
  }

  /**
   * Send upcoming payment reminder
   */
  async sendUpcomingPaymentReminder(invoiceId: number, daysUntilDue: number): Promise<void> {
    try {
      const invoice = await billingService.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      const notifications = await this.createUpcomingPaymentNotifications(invoice, daysUntilDue);

      for (const notification of notifications) {
        await this.scheduleNotification(notification);
      }
    } catch (error) {
      console.error('Failed to send upcoming payment reminder:', error);
      throw error;
    }
  }

  /**
   * Send refund confirmation
   */
  async sendRefundConfirmation(
    paymentId: number,
    refundAmount: number,
    refundId: string,
    reason: string
  ): Promise<void> {
    try {
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      const notifications = await this.createRefundConfirmationNotifications(payment, refundAmount, refundId, reason);

      for (const notification of notifications) {
        await this.scheduleNotification(notification);
      }
    } catch (error) {
      console.error('Failed to send refund confirmation:', error);
      throw error;
    }
  }

  /**
   * Send chargeback notification
   */
  async sendChargebackNotification(
    paymentId: number,
    chargebackAmount: number,
    reason: string,
    caseNumber: string
  ): Promise<void> {
    try {
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      const notifications = await this.createChargebackNotifications(payment, chargebackAmount, reason, caseNumber);

      for (const notification of notifications) {
        await this.scheduleNotification(notification);
      }
    } catch (error) {
      console.error('Failed to send chargeback notification:', error);
      throw error;
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const scheduledNotifications = await this.getScheduledNotifications();

      let processed = 0;
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const notification of scheduledNotifications) {
        try {
          processed++;
          const result = await this.sendNotification(notification);

          if (result.success) {
            sent++;
            await this.updateNotificationStatus(notification.id!, 'sent', result);
          } else {
            failed++;
            await this.updateNotificationStatus(notification.id!, 'failed', result);
            errors.push(`Failed to send notification ${notification.id}: ${result.error}`);
          }
        } catch (error) {
          failed++;
          errors.push(`Error processing notification ${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { processed, sent, failed, errors };
    } catch (error) {
      console.error('Failed to process scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(customerId: string, customerType: 'member' | 'company'): Promise<NotificationPreferences> {
    try {
      if (customerType === 'member') {
        return await this.getMemberNotificationPreferences(parseInt(customerId));
      } else {
        return await this.getCompanyNotificationPreferences(parseInt(customerId));
      }
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      // Return default preferences
      return this.getDefaultNotificationPreferences();
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    customerId: string,
    customerType: 'member' | 'company',
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const currentPrefs = await this.getNotificationPreferences(customerId, customerType);
      const updatedPrefs = { ...currentPrefs, ...preferences };

      await this.saveNotificationPreferences(updatedPrefs, parseInt(customerId), customerType);

      return updatedPrefs;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification metrics
   */
  async getNotificationMetrics(period: DateRange): Promise<NotificationMetrics> {
    try {
      const notifications = await this.getNotificationsInPeriod(period);

      const metrics: NotificationMetrics = {
        period,
        totalSent: notifications.length,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalFailed: 0,
        totalBounced: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        failureRate: 0,
        bounceRate: 0,
        averageDeliveryTime: 0,
        byType: {},
        byChannel: {},
        byProvider: {}
      };

      if (notifications.length > 0) {
        const delivered = notifications.filter(n => n.status === 'delivered');
        const opened = notifications.filter(n => n.status === 'opened');
        const clicked = notifications.filter(n => n.status === 'clicked');
        const failed = notifications.filter(n => n.status === 'failed');
        const bounced = notifications.filter(n => n.status === 'bounced');

        metrics.totalDelivered = delivered.length;
        metrics.totalOpened = opened.length;
        metrics.totalClicked = clicked.length;
        metrics.totalFailed = failed.length;
        metrics.totalBounced = bounced.length;

        metrics.deliveryRate = (delivered.length / notifications.length) * 100;
        metrics.openRate = delivered.length > 0 ? (opened.length / delivered.length) * 100 : 0;
        metrics.clickRate = opened.length > 0 ? (clicked.length / opened.length) * 100 : 0;
        metrics.failureRate = (failed.length / notifications.length) * 100;
        metrics.bounceRate = (bounced.length / notifications.length) * 100;

        // Calculate breakdowns
        this.calculateTypeBreakdown(notifications, metrics);
        this.calculateChannelBreakdown(notifications, metrics);
        this.calculateProviderBreakdown(notifications, metrics);
      }

      return metrics;
    } catch (error) {
      console.error('Failed to get notification metrics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async createPaymentReceiptNotifications(
    payment: any,
    amount: number,
    currency: string,
    paymentMethod: string,
    invoiceIds: number[]
  ): Promise<PaymentNotification[]> {
    const notifications: PaymentNotification[] = [];

    // Email notification
    const emailNotification = await this.createNotification({
      paymentId: payment.id,
      memberId: payment.memberId,
      companyId: payment.companyId,
      type: 'payment_receipt',
      channel: 'email',
      recipientAddress: await this.getRecipientEmail(payment),
      subject: `Payment Receipt - ${new Date().toLocaleDateString()}`,
      messageContent: await this.generatePaymentReceiptContent(payment, amount, currency, paymentMethod, invoiceIds),
      scheduledDate: new Date(),
      metadata: {
        amount,
        currency,
        paymentMethod,
        invoiceNumbers: await this.getInvoiceNumbers(invoiceIds),
        transactionId: payment.gatewayTransactionId
      }
    });
    notifications.push(emailNotification);

    // SMS notification for small amounts
    if (amount < 1000) {
      const smsNotification = await this.createNotification({
        paymentId: payment.id,
        memberId: payment.memberId,
        companyId: payment.companyId,
        type: 'payment_receipt',
        channel: 'sms',
        recipientAddress: await this.getRecipientPhone(payment),
        messageContent: await this.generatePaymentReceiptSMS(payment, amount, currency),
        scheduledDate: new Date(),
        metadata: {
          amount,
          currency,
          paymentMethod,
          transactionId: payment.gatewayTransactionId
        }
      });
      notifications.push(smsNotification);
    }

    return notifications;
  }

  private async createPaymentFailureNotifications(
    payment: any,
    failureReason: string,
    retryDate?: Date
  ): Promise<PaymentNotification[]> {
    const notifications: PaymentNotification[] = [];

    // Email notification
    const emailNotification = await this.createNotification({
      paymentId: payment.id,
      memberId: payment.memberId,
      companyId: payment.companyId,
      type: 'payment_failure',
      channel: 'email',
      recipientAddress: await this.getRecipientEmail(payment),
      subject: 'Payment Failed - Action Required',
      messageContent: await this.generatePaymentFailureContent(payment, failureReason, retryDate),
      scheduledDate: new Date(),
      metadata: {
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        failureReason,
        retryCount: payment.retryCount || 1,
        nextRetryDate: retryDate
      }
    });
    notifications.push(emailNotification);

    // SMS notification
    const smsNotification = await this.createNotification({
      paymentId: payment.id,
      memberId: payment.memberId,
      companyId: payment.companyId,
      type: 'payment_failure',
      channel: 'sms',
      recipientAddress: await this.getRecipientPhone(payment),
      messageContent: await this.generatePaymentFailureSMS(payment, failureReason),
      scheduledDate: new Date(),
      metadata: {
        amount: payment.amount,
        currency: payment.currency,
        failureReason,
        retryCount: payment.retryCount || 1
      }
    });
    notifications.push(smsNotification);

    return notifications;
  }

  private async createPaymentMethodExpiryNotifications(
    paymentMethod: any,
    daysUntilExpiry: number
  ): Promise<PaymentNotification[]> {
    const notifications: PaymentNotification[] = [];

    // Email notification
    const emailNotification = await this.createNotification({
      paymentId: 0, // Not tied to specific payment
      memberId: paymentMethod.memberId,
      companyId: paymentMethod.companyId,
      type: 'payment_method_expiry',
      channel: 'email',
      recipientAddress: await this.getPaymentMethodRecipientEmail(paymentMethod),
      subject: `Payment Method Expiring in ${daysUntilExpiry} Days`,
      messageContent: await this.generatePaymentMethodExpiryContent(paymentMethod, daysUntilExpiry),
      scheduledDate: new Date(),
      metadata: {
        paymentMethod: paymentMethod.type,
        expiryDate: paymentMethod.expiryDate,
        customFields: {
          last4: paymentMethod.last4,
          brand: paymentMethod.brand
        }
      }
    });
    notifications.push(emailNotification);

    return notifications;
  }

  private async createUpcomingPaymentNotifications(
    invoice: any,
    daysUntilDue: number
  ): Promise<PaymentNotification[]> {
    const notifications: PaymentNotification[] = [];

    // Email notification
    const emailNotification = await this.createNotification({
      paymentId: 0,
      memberId: invoice.memberId,
      companyId: invoice.companyId,
      type: 'upcoming_payment',
      channel: 'email',
      recipientAddress: await this.getInvoiceRecipientEmail(invoice),
      subject: `Payment Due in ${daysUntilDue} Days`,
      messageContent: await this.generateUpcomingPaymentContent(invoice, daysUntilDue),
      scheduledDate: new Date(),
      metadata: {
        amount: invoice.totalAmount,
        currency: 'USD', // Would get from invoice
        invoiceNumbers: [invoice.invoiceNumber]
      }
    });
    notifications.push(emailNotification);

    return notifications;
  }

  private async createRefundConfirmationNotifications(
    payment: any,
    refundAmount: number,
    refundId: string,
    reason: string
  ): Promise<PaymentNotification[]> {
    const notifications: PaymentNotification[] = [];

    const emailNotification = await this.createNotification({
      paymentId: payment.id,
      memberId: payment.memberId,
      companyId: payment.companyId,
      type: 'refund_confirmation',
      channel: 'email',
      recipientAddress: await this.getRecipientEmail(payment),
      subject: 'Refund Confirmation',
      messageContent: await this.generateRefundConfirmationContent(payment, refundAmount, refundId, reason),
      scheduledDate: new Date(),
      metadata: {
        amount: payment.amount,
        refundAmount,
        refundId,
        customFields: {
          originalTransactionId: payment.gatewayTransactionId,
          refundReason: reason
        }
      }
    });
    notifications.push(emailNotification);

    return notifications;
  }

  private async createChargebackNotifications(
    payment: any,
    chargebackAmount: number,
    reason: string,
    caseNumber: string
  ): Promise<PaymentNotification[]> {
    const notifications: PaymentNotification[] = [];

    const emailNotification = await this.createNotification({
      paymentId: payment.id,
      memberId: payment.memberId,
      companyId: payment.companyId,
      type: 'chargeback_notification',
      channel: 'email',
      recipientAddress: await this.getRecipientEmail(payment),
      subject: 'Chargeback Alert',
      messageContent: await this.generateChargebackContent(payment, chargebackAmount, reason, caseNumber),
      scheduledDate: new Date(),
      metadata: {
        amount: payment.amount,
        chargebackAmount,
        customFields: {
          caseNumber,
          reason,
          originalTransactionId: payment.gatewayTransactionId
        }
      }
    });
    notifications.push(emailNotification);

    return notifications;
  }

  private async scheduleNotification(notification: PaymentNotification): Promise<void> {
    await this.saveNotification(notification);
  }

  private async sendNotification(notification: PaymentNotification): Promise<{ success: boolean; error?: string }> {
    try {
      const provider = this.providers.get(notification.channel);
      if (!provider) {
        return { success: false, error: 'Provider not found for channel: ' + notification.channel };
      }

      let result;
      switch (notification.channel) {
        case 'email':
          result = await this.sendEmailNotification(provider, notification);
          break;
        case 'sms':
          result = await this.sendSMSNotification(provider, notification);
          break;
        case 'push':
          result = await this.sendPushNotification(provider, notification);
          break;
        default:
          return { success: false, error: 'Unsupported notification channel: ' + notification.channel };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Content generation methods
  private async generatePaymentReceiptContent(payment: any, amount: number, currency: string, paymentMethod: string, invoiceIds: number[]): Promise<string> {
    return `
      <h2>Payment Receipt</h2>
      <p>Thank you for your payment!</p>
      <div>
        <p><strong>Payment ID:</strong> ${payment.gatewayTransactionId}</p>
        <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      ${invoiceIds.length > 0 ? `<p><strong>Invoices Paid:</strong> ${await this.getInvoiceNumbers(invoiceIds).join(', ')}</p>` : ''}
    `;
  }

  private async generatePaymentFailureContent(payment: any, failureReason: string, retryDate?: Date): Promise<string> {
    return `
      <h2>Payment Failed</h2>
      <p>We were unable to process your payment. Please update your payment method and try again.</p>
      <div>
        <p><strong>Payment ID:</strong> ${payment.gatewayTransactionId}</p>
        <p><strong>Amount:</strong> ${payment.currency} ${payment.amount.toFixed(2)}</p>
        <p><strong>Reason:</strong> ${failureReason}</p>
        ${retryDate ? `<p><strong>Next retry attempt:</strong> ${retryDate.toLocaleDateString()}</p>` : ''}
      </div>
      <p><a href="/billing/payment-methods">Update Payment Method</a></p>
    `;
  }

  private async generatePaymentMethodExpiryContent(paymentMethod: any, daysUntilExpiry: number): Promise<string> {
    return `
      <h2>Payment Method Expiring Soon</h2>
      <p>Your payment method ending in ${paymentMethod.last4} will expire in ${daysUntilExpiry} days.</p>
      <p>Please update your payment information to avoid service interruptions.</p>
      <p><a href="/billing/payment-methods">Update Payment Method</a></p>
    `;
  }

  private async generateUpcomingPaymentContent(invoice: any, daysUntilDue: number): Promise<string> {
    return `
      <h2>Payment Reminder</h2>
      <p>You have a payment due in ${daysUntilDue} days.</p>
      <div>
        <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Amount Due:</strong> $${invoice.totalAmount.toFixed(2)}</p>
        <p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</p>
      </div>
      <p><a href="/billing/invoices/${invoice.id}">View Invoice</a></p>
    `;
  }

  private async generateRefundConfirmationContent(payment: any, refundAmount: number, refundId: string, reason: string): Promise<string> {
    return `
      <h2>Refund Confirmation</h2>
      <p>A refund has been processed for your payment.</p>
      <div>
        <p><strong>Refund ID:</strong> ${refundId}</p>
        <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Original Payment:</strong> ${payment.gatewayTransactionId}</p>
      </div>
    `;
  }

  private async generateChargebackContent(payment: any, chargebackAmount: number, reason: string, caseNumber: string): Promise<string> {
    return `
      <h2>Chargeback Alert</h2>
      <p>A chargeback has been initiated against one of your payments.</p>
      <div>
        <p><strong>Case Number:</strong> ${caseNumber}</p>
        <p><strong>Chargeback Amount:</strong> $${chargebackAmount.toFixed(2)}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Original Payment:</strong> ${payment.gatewayTransactionId}</p>
      </div>
    `;
  }

  private async generatePaymentReceiptSMS(payment: any, amount: number, currency: string): Promise<string> {
    return `Payment received: ${currency} ${amount.toFixed(2)}. Thank you! Ref: ${payment.gatewayTransactionId}`;
  }

  private async generatePaymentFailureSMS(payment: any, failureReason: string): Promise<string> {
    return `Payment failed: ${payment.currency} ${payment.amount.toFixed(2)}. Please update payment method. Ref: ${payment.gatewayTransactionId}`;
  }

  // Placeholder methods that would connect to actual database and services
  private async createNotification(data: Partial<PaymentNotification>): Promise<PaymentNotification> {
    return {
      ...data,
      status: 'scheduled',
      deliveryAttempts: 0,
      responseReceived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    } as PaymentNotification;
  }

  private async saveNotification(notification: PaymentNotification): Promise<void> {
    console.log(`Saving notification: ${notification.type} for payment ${notification.paymentId}`);
  }

  private async updateNotificationStatus(notificationId: number, status: NotificationStatus, result: any): Promise<void> {
    console.log(`Updating notification ${notificationId} status to ${status}`);
  }

  private async getScheduledNotifications(): Promise<PaymentNotification[]> {
    console.log('Getting scheduled notifications');
    return [];
  }

  private async sendEmailNotification(provider: DeliveryProvider, notification: PaymentNotification): Promise<void> {
    console.log(`Sending email to ${notification.recipientAddress}: ${notification.subject}`);
  }

  private async sendSMSNotification(provider: DeliveryProvider, notification: PaymentNotification): Promise<void> {
    console.log(`Sending SMS to ${notification.recipientAddress}`);
  }

  private async sendPushNotification(provider: DeliveryProvider, notification: PaymentNotification): Promise<void> {
    console.log(`Sending push notification`);
  }

  private async initializeProviders(): Promise<void> {
    // Initialize email provider
    this.providers.set('email', {
      id: 1,
      providerName: 'SendGrid',
      providerType: 'email',
      configuration: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        endpointUrl: 'https://api.sendgrid.com/v3/mail/send',
        customSettings: {}
      },
      isActive: true,
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      retryConfiguration: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        baseDelayMinutes: 1,
        maxDelayMinutes: 60,
        multiplier: 2
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Initialize SMS provider
    this.providers.set('sms', {
      id: 2,
      providerName: 'Twilio',
      providerType: 'sms',
      configuration: {
        apiKey: process.env.TWILIO_API_KEY || '',
        senderId: process.env.TWILIO_SENDER_ID || '',
        customSettings: {}
      },
      isActive: true,
      rateLimits: {
        requestsPerSecond: 5,
        requestsPerMinute: 50,
        requestsPerHour: 500,
        requestsPerDay: 5000
      },
      retryConfiguration: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        baseDelayMinutes: 2,
        maxDelayMinutes: 30,
        multiplier: 2
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private async loadDefaultTemplates(): Promise<void> {
    // Load default templates from database or configuration
  }

  private async loadDefaultRules(): Promise<void> {
    // Load default notification rules from database or configuration
  }

  private async getPayment(paymentId: number): Promise<any> {
    return null;
  }

  private async getPaymentMethod(paymentMethodId: number): Promise<any> {
    return null;
  }

  private async getRecipientEmail(payment: any): Promise<string> {
    return '';
  }

  private async getRecipientPhone(payment: any): Promise<string> {
    return '';
  }

  private async getPaymentMethodRecipientEmail(paymentMethod: any): Promise<string> {
    return '';
  }

  private async getInvoiceRecipientEmail(invoice: any): Promise<string> {
    return '';
  }

  private async getInvoiceNumbers(invoiceIds: number[]): Promise<string[]> {
    return [];
  }

  private async getNotificationsInPeriod(period: DateRange): Promise<PaymentNotification[]> {
    return [];
  }

  private calculateTypeBreakdown(notifications: PaymentNotification[], metrics: NotificationMetrics): void {
    // Calculate breakdown by notification type
  }

  private calculateChannelBreakdown(notifications: PaymentNotification[], metrics: NotificationMetrics): void {
    // Calculate breakdown by channel
  }

  private calculateProviderBreakdown(notifications: PaymentNotification[], metrics: NotificationMetrics): void {
    // Calculate breakdown by provider
  }

  private async getMemberNotificationPreferences(memberId: number): Promise<NotificationPreferences> {
    return this.getDefaultNotificationPreferences();
  }

  private async getCompanyNotificationPreferences(companyId: number): Promise<NotificationPreferences> {
    return this.getDefaultNotificationPreferences();
  }

  private getDefaultNotificationPreferences(): NotificationPreferences {
    return {
      channelPreferences: {
        email: true,
        sms: true,
        push: true,
        in_app: false,
        postal_mail: false,
        whatsapp: false
      },
      typePreferences: {
        payment_receipt: true,
        payment_failure: true,
        payment_retry: true,
        upcoming_payment: true,
        auto_payment_confirmation: true,
        payment_method_expiry: true,
        payment_method_update_request: false,
        payment_allocation_confirmation: true,
        refund_confirmation: true,
        chargeback_notification: true,
        reversal_notification: true,
        payment_method_added: false,
        payment_method_removed: false,
        subscription_renewal: true,
        payment_reminder: true,
        overdue_payment: true,
        payment_plan_update: true
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC'
      },
      frequencyLimits: {
        maxPerHour: 10,
        maxPerDay: 50,
        maxPerWeek: 200
      },
      customSettings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async saveNotificationPreferences(preferences: NotificationPreferences, customerId: number, customerType: 'member' | 'company'): Promise<void> {
    console.log(`Saving notification preferences for ${customerType} ${customerId}`);
  }
}

export const paymentNotificationService = new PaymentNotificationService();