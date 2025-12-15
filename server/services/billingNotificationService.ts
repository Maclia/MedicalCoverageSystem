/**
 * Billing Notification Service
 * Automated payment reminders, overdue notices, and billing communications
 * Multi-channel delivery: email, SMS, postal mail integration
 */

import { storage } from '../storage';
import * as schema from '../../shared/schema.js';
import { billingService, Invoice } from './billingService.js';
import { accountsReceivableService, AccountsReceivable } from './accountsReceivableService.js';

export interface BillingCommunication {
  id?: number;
  memberId?: number;
  companyId?: number;
  invoiceId?: number;
  type: 'payment_reminder' | 'overdue_notice' | 'suspension_warning' | 'termination_notice' | 'payment_receipt' | 'invoice_sent' | 'collection_notice';
  templateId: number;
  channel: 'email' | 'sms' | 'postal_mail' | 'phone' | 'portal';
  recipientAddress: string;
  subject?: string;
  messageContent: string;
  scheduledDate: Date;
  sentDate?: Date;
  status: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  deliveryAttempts: number;
  responseReceived: boolean;
  responseDate?: Date;
  nextActionDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id?: number;
  templateName: string;
  templateType: BillingCommunication['type'];
  channel: BillingCommunication['channel'];
  subjectTemplate?: string;
  messageTemplate: string;
  variables: string[];
  isActive: boolean;
  language: string;
  clientType: 'individual' | 'corporate' | 'both';
  approvalRequired: boolean;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationRule {
  id?: number;
  ruleName: string;
  triggerEvent: string;
  triggerCondition: string;
  templateId: number;
  channel: BillingCommunication['channel'];
  delayDays: number;
  frequency: 'once' | 'weekly' | 'monthly';
  isActive: boolean;
  priority: number;
  clientType: 'individual' | 'corporate' | 'both';
  stopOnPayment: boolean;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSchedule {
  id?: number;
  communicationId: number;
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
  providerType: 'email' | 'sms' | 'postal' | 'voice';
  apiKey?: string;
  apiEndpoint?: string;
  isActive: boolean;
  configuration: Record<string, any>;
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  createdAt: Date;
}

export interface CommunicationMetrics {
  periodStart: Date;
  periodEnd: Date;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  failureRate: number;
  byType: Record<string, CommunicationMetrics>;
  byChannel: Record<string, CommunicationMetrics>;
}

export class BillingNotificationService {

  /**
   * Process all scheduled billing notifications
   */
  async processScheduledNotifications(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      let processed = 0;
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Get scheduled notifications ready to be sent
      const scheduledNotifications = await this.getScheduledNotifications();

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
   * Generate payment reminders for upcoming due dates
   */
  async generatePaymentReminders(daysAhead: number = 7): Promise<number> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysAhead);

    const upcomingInvoices = await billingService.getInvoices({
      status: 'sent',
      dateTo: dueDate
    });

    let remindersCreated = 0;

    for (const invoice of upcomingInvoices) {
      // Check if reminder already scheduled
      const existingReminder = await this.getExistingCommunication(invoice.id!, 'payment_reminder');
      if (existingReminder) continue;

      // Create reminder
      const reminder = await this.createPaymentReminder(invoice, daysAhead);
      if (reminder) {
        remindersCreated++;
      }
    }

    return remindersCreated;
  }

  /**
   * Generate overdue notices for past due invoices
   */
  async generateOverdueNotices(): Promise<number> {
    const today = new Date();
    const overdueInvoices = await billingService.getInvoices({
      status: 'sent',
      dateTo: today // Include all invoices, we'll check due dates
    }).then(invoices => invoices.filter(invoice =>
      invoice.dueDate < today && invoice.status !== 'paid' && invoice.status !== 'written_off'
    ));

    let noticesCreated = 0;

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor((today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine notice type based on days overdue
      let noticeType: BillingCommunication['type'];
      let templateName: string;

      if (daysOverdue <= 15) {
        noticeType = 'payment_reminder';
        templateName = 'first_overdue_reminder';
      } else if (daysOverdue <= 30) {
        noticeType = 'overdue_notice';
        templateName = 'second_overdue_notice';
      } else if (daysOverdue <= 60) {
        noticeType = 'overdue_notice';
        templateName = 'final_demand_letter';
      } else {
        noticeType = 'collection_notice';
        templateName = 'collection_referral_notice';
      }

      // Check if notice already sent for this period
      const existingNotice = await this.getExistingCommunication(invoice.id!, noticeType);
      if (existingNotice) {
        // Check if enough time has passed to send another notice
        const daysSinceLastNotice = Math.floor((today.getTime() - existingNotice.sentDate!.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastNotice < 14) continue; // Wait at least 14 days between notices
      }

      const notice = await this.createOverdueNotice(invoice, noticeType, templateName);
      if (notice) {
        noticesCreated++;
      }
    }

    return noticesCreated;
  }

  /**
   * Generate suspension warnings for seriously overdue accounts
   */
  async generateSuspensionWarnings(): Promise<number> {
    const overdueAccounts = await this.getAccountsNeedingSuspensionWarning();
    let warningsCreated = 0;

    for (const arRecord of overdueAccounts) {
      const existingWarning = await this.getExistingARCommunication(arRecord.id!, 'suspension_warning');
      if (existingWarning) continue;

      const warning = await this.createSuspensionWarning(arRecord);
      if (warning) {
        warningsCreated++;
      }
    }

    return warningsCreated;
  }

  /**
   * Send invoice delivery notifications
   */
  async sendInvoiceNotification(invoiceId: number): Promise<void> {
    const invoice = await billingService.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    const communication = await this.createInvoiceNotification(invoice);
    if (communication) {
      await this.sendNotification(communication);
    }
  }

  /**
   * Send payment receipt confirmation
   */
  async sendPaymentReceipt(invoiceId: number, paymentAmount: number, paymentDate: Date): Promise<void> {
    const invoice = await billingService.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    const receipt = await this.createPaymentReceipt(invoice, paymentAmount, paymentDate);
    if (receipt) {
      await this.sendNotification(receipt);
    }
  }

  /**
   * Create payment reminder for invoice
   */
  private async createPaymentReminder(invoice: Invoice, daysAhead: number): Promise<BillingCommunication | null> {
    const template = await this.getTemplate('payment_reminder', invoice.invoiceType === 'corporate' ? 'corporate' : 'individual');
    if (!template) return null;

    const recipient = await this.getRecipientAddress(invoice);
    if (!recipient) return null;

    const variables = await this.getTemplateVariables(invoice);
    const subject = template.subjectTemplate ? this.processTemplate(template.subjectTemplate, variables) : undefined;
    const message = this.processTemplate(template.messageTemplate, variables);

    return await this.createCommunication({
      invoiceId: invoice.id,
      memberId: invoice.memberId,
      companyId: invoice.companyId,
      type: 'payment_reminder',
      templateId: template.id!,
      channel: template.channel,
      recipientAddress: recipient.address,
      subject,
      messageContent: message,
      scheduledDate: new Date(),
      metadata: {
        daysUntilDue: daysAhead,
        dueDate: invoice.dueDate,
        amount: invoice.totalAmount
      }
    });
  }

  /**
   * Create overdue notice
   */
  private async createOverdueNotice(invoice: Invoice, noticeType: BillingCommunication['type'], templateName: string): Promise<BillingCommunication | null> {
    const template = await this.getTemplateByName(templateName);
    if (!template) return null;

    const recipient = await this.getRecipientAddress(invoice);
    if (!recipient) return null;

    const variables = await this.getTemplateVariables(invoice);
    const daysOverdue = Math.floor((new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    variables.daysOverdue = daysOverdue.toString();

    const subject = template.subjectTemplate ? this.processTemplate(template.subjectTemplate, variables) : undefined;
    const message = this.processTemplate(template.messageTemplate, variables);

    return await this.createCommunication({
      invoiceId: invoice.id,
      memberId: invoice.memberId,
      companyId: invoice.companyId,
      type: noticeType,
      templateId: template.id!,
      channel: template.channel,
      recipientAddress: recipient.address,
      subject,
      messageContent: message,
      scheduledDate: new Date(),
      metadata: {
        daysOverdue,
        originalDueDate: invoice.dueDate,
        amount: invoice.totalAmount
      }
    });
  }

  /**
   * Create suspension warning
   */
  private async createSuspensionWarning(arRecord: AccountsReceivable): Promise<BillingCommunication | null> {
    const template = await this.getTemplate('suspension_warning', arRecord.companyId ? 'corporate' : 'individual');
    if (!template) return null;

    const recipient = await this.getARRecipientAddress(arRecord);
    if (!recipient) return null;

    const variables = await this.getARTemplateVariables(arRecord);
    const subject = template.subjectTemplate ? this.processTemplate(template.subjectTemplate, variables) : undefined;
    const message = this.processTemplate(template.messageTemplate, variables);

    return await this.createCommunication({
      memberId: arRecord.memberId,
      companyId: arRecord.companyId,
      type: 'suspension_warning',
      templateId: template.id!,
      channel: template.channel,
      recipientAddress: recipient.address,
      subject,
      messageContent: message,
      scheduledDate: new Date(),
      metadata: {
        currentBalance: arRecord.currentBalance,
        daysOverdue: this.calculateOverdueDays(arRecord),
        suspensionDate: this.calculateSuspensionDate(arRecord)
      }
    });
  }

  /**
   * Create invoice notification
   */
  private async createInvoiceNotification(invoice: Invoice): Promise<BillingCommunication | null> {
    const template = await this.getTemplate('invoice_sent', invoice.invoiceType === 'corporate' ? 'corporate' : 'individual');
    if (!template) return null;

    const recipient = await this.getRecipientAddress(invoice);
    if (!recipient) return null;

    const variables = await this.getTemplateVariables(invoice);
    const subject = template.subjectTemplate ? this.processTemplate(template.subjectTemplate, variables) : undefined;
    const message = this.processTemplate(template.messageTemplate, variables);

    return await this.createCommunication({
      invoiceId: invoice.id,
      memberId: invoice.memberId,
      companyId: invoice.companyId,
      type: 'invoice_sent',
      templateId: template.id!,
      channel: template.channel,
      recipientAddress: recipient.address,
      subject,
      messageContent: message,
      scheduledDate: new Date(),
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        dueDate: invoice.dueDate
      }
    });
  }

  /**
   * Create payment receipt
   */
  private async createPaymentReceipt(invoice: Invoice, paymentAmount: number, paymentDate: Date): Promise<BillingCommunication | null> {
    const template = await this.getTemplate('payment_receipt', invoice.invoiceType === 'corporate' ? 'corporate' : 'individual');
    if (!template) return null;

    const recipient = await this.getRecipientAddress(invoice);
    if (!recipient) return null;

    const outstandingBalance = invoice.totalAmount - paymentAmount;
    const variables = await this.getTemplateVariables(invoice);
    variables.paymentAmount = paymentAmount.toFixed(2);
    variables.paymentDate = paymentDate.toLocaleDateString();
    variables.outstandingBalance = outstandingBalance.toFixed(2);

    const subject = template.subjectTemplate ? this.processTemplate(template.subjectTemplate, variables) : undefined;
    const message = this.processTemplate(template.messageTemplate, variables);

    return await this.createCommunication({
      invoiceId: invoice.id,
      memberId: invoice.memberId,
      companyId: invoice.companyId,
      type: 'payment_receipt',
      templateId: template.id!,
      channel: template.channel,
      recipientAddress: recipient.address,
      subject,
      messageContent: message,
      scheduledDate: new Date(),
      metadata: {
        paymentAmount,
        paymentDate,
        outstandingBalance
      }
    });
  }

  /**
   * Send notification through appropriate channel
   */
  private async sendNotification(communication: BillingCommunication): Promise<{ success: boolean; error?: string; providerResponse?: any }> {
    try {
      let providerResponse: any;

      switch (communication.channel) {
        case 'email':
          providerResponse = await this.sendEmailNotification(communication);
          break;
        case 'sms':
          providerResponse = await this.sendSMSNotification(communication);
          break;
        case 'postal_mail':
          providerResponse = await this.sendPostalNotification(communication);
          break;
        default:
          throw new Error(`Unsupported channel: ${communication.channel}`);
      }

      return { success: true, providerResponse };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(communication: BillingCommunication): Promise<any> {
    // This would integrate with email service provider (SendGrid, AWS SES, etc.)
    const emailData = {
      to: communication.recipientAddress,
      subject: communication.subject,
      html: communication.messageContent,
      text: this.stripHtml(communication.messageContent),
      metadata: communication.metadata
    };

    // Simulate email sending
    console.log(`Sending email to ${communication.recipientAddress}: ${communication.subject}`);
    return { messageId: `email_${Date.now()}`, status: 'sent' };
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(communication: BillingCommunication): Promise<any> {
    // This would integrate with SMS provider (Twilio, AWS SNS, etc.)
    const smsData = {
      to: communication.recipientAddress,
      message: this.stripHtml(communication.messageContent),
      metadata: communication.metadata
    };

    // Simulate SMS sending
    console.log(`Sending SMS to ${communication.recipientAddress}`);
    return { messageId: `sms_${Date.now()}`, status: 'sent' };
  }

  /**
   * Send postal mail notification
   */
  private async sendPostalNotification(communication: BillingCommunication): Promise<any> {
    // This would integrate with postal mail service (Lob, etc.)
    const postalData = {
      to: communication.recipientAddress,
      content: communication.messageContent,
      metadata: communication.metadata
    };

    // Simulate postal mail sending
    console.log(`Sending postal mail to ${communication.recipientAddress}`);
    return { messageId: `postal_${Date.now()}`, status: 'processed' };
  }

  /**
   * Process template with variables
   */
  private processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), value);
    }

    return processed;
  }

  /**
   * Get template variables for invoice
   */
  private async getTemplateVariables(invoice: Invoice): Promise<Record<string, string>> {
    const variables: Record<string, string> = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate.toLocaleDateString(),
      dueDate: invoice.dueDate.toLocaleDateString(),
      amount: invoice.totalAmount.toFixed(2),
      billingPeriodStart: invoice.billingPeriodStart.toLocaleDateString(),
      billingPeriodEnd: invoice.billingPeriodEnd.toLocaleDateString()
    };

    if (invoice.memberId) {
      const member = await storage.getMember(invoice.memberId);
      if (member) {
        variables.memberName = `${member.firstName} ${member.lastName}`;
        variables.memberNumber = member.memberNumber || '';
      }
    }

    if (invoice.companyId) {
      const company = await storage.getCompany(invoice.companyId);
      if (company) {
        variables.companyName = company.name;
        variables.companyNumber = company.companyNumber || '';
      }
    }

    return variables;
  }

  /**
   * Get template variables for AR record
   */
  private async getARTemplateVariables(arRecord: AccountsReceivable): Promise<Record<string, string>> {
    const variables: Record<string, string> = {
      currentBalance: arRecord.currentBalance.toFixed(2),
      aging30Days: arRecord.aging30Days.toFixed(2),
      aging60Days: arRecord.aging60Days.toFixed(2),
      aging90Days: arRecord.aging90Days.toFixed(2),
      aging90PlusDays: arRecord.aging90PlusDays.toFixed(2)
    };

    if (arRecord.memberId) {
      const member = await storage.getMember(arRecord.memberId);
      if (member) {
        variables.memberName = `${member.firstName} ${member.lastName}`;
        variables.memberNumber = member.memberNumber || '';
      }
    }

    if (arRecord.companyId) {
      const company = await storage.getCompany(arRecord.companyId);
      if (company) {
        variables.companyName = company.name;
        variables.companyNumber = company.companyNumber || '';
      }
    }

    return variables;
  }

  /**
   * Get recipient address
   */
  private async getRecipientAddress(invoice: Invoice): Promise<{ address: string; type: string } | null> {
    if (invoice.memberId) {
      const member = await storage.getMember(invoice.memberId);
      if (member) {
        return { address: member.email || '', type: 'email' };
      }
    } else if (invoice.companyId) {
      const company = await storage.getCompany(invoice.companyId);
      if (company) {
        return { address: company.billingEmail || company.email || '', type: 'email' };
      }
    }

    return null;
  }

  /**
   * Get recipient address for AR record
   */
  private async getARRecipientAddress(arRecord: AccountsReceivable): Promise<{ address: string; type: string } | null> {
    if (arRecord.memberId) {
      const member = await storage.getMember(arRecord.memberId);
      if (member) {
        return { address: member.email || '', type: 'email' };
      }
    } else if (arRecord.companyId) {
      const company = await storage.getCompany(arRecord.companyId);
      if (company) {
        return { address: company.billingEmail || company.email || '', type: 'email' };
      }
    }

    return null;
  }

  /**
   * Calculate overdue days for AR record
   */
  private calculateOverdueDays(arRecord: AccountsReceivable): number {
    if (arRecord.aging90PlusDays > 0) return 90;
    if (arRecord.aging90Days > 0) return 60;
    if (arRecord.aging60Days > 0) return 30;
    if (arRecord.aging30Days > 0) return 15;
    return 0;
  }

  /**
   * Calculate suspension date
   */
  private calculateSuspensionDate(arRecord: AccountsReceivable): Date {
    const suspensionDate = new Date();
    suspensionDate.setDate(suspensionDate.getDate() + 14); // 14 days warning
    return suspensionDate;
  }

  /**
   * Strip HTML from content
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Helper methods (would connect to database)
   */
  private async getScheduledNotifications(): Promise<BillingCommunication[]> {
    // This would query database for scheduled notifications ready to send
    return [];
  }

  private async getTemplate(type: BillingCommunication['type'], clientType: string): Promise<NotificationTemplate | null> {
    // This would query database for appropriate template
    return null;
  }

  private async getTemplateByName(templateName: string): Promise<NotificationTemplate | null> {
    // This would query database for template by name
    return null;
  }

  private async getExistingCommunication(invoiceId: number, type: BillingCommunication['type']): Promise<BillingCommunication | null> {
    // This would query database for existing communication
    return null;
  }

  private async getExistingARCommunication(arRecordId: number, type: BillingCommunication['type']): Promise<BillingCommunication | null> {
    // This would query database for existing communication
    return null;
  }

  private async getAccountsNeedingSuspensionWarning(): Promise<AccountsReceivable[]> {
    // This would query database for accounts needing suspension warnings
    return [];
  }

  private async createCommunication(data: Partial<BillingCommunication>): Promise<BillingCommunication> {
    // This would create communication record in database
    return {
      ...data,
      id: Math.floor(Math.random() * 10000),
      deliveryAttempts: 0,
      responseReceived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    } as BillingCommunication;
  }

  private async updateNotificationStatus(communicationId: number, status: BillingCommunication['status'], result: any): Promise<void> {
    // This would update communication status in database
    console.log(`Updating notification ${communicationId} status to ${status}`);
  }

  /**
   * Generate communication metrics report
   */
  async generateCommunicationMetrics(startDate: Date, endDate: Date): Promise<CommunicationMetrics> {
    // This would generate comprehensive metrics report
    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalBounced: 0,
      totalFailed: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      failureRate: 0,
      byType: {},
      byChannel: {}
    };
  }
}

export const billingNotificationService = new BillingNotificationService();