import { storage } from '../storage';
import { Claim, Member, User } from '@shared/schema';

export interface Notification {
  id: string;
  type: 'email' | 'sms' | 'push' | 'in_app' | 'webhook';
  recipient: string;
  recipientType: 'member' | 'provider' | 'administrator' | 'system';
  subject: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  deliveryAttempts: number;
  maxRetries: number;
  createdAt: Date;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  category: 'claim_status' | 'payment' | 'fraud_alert' | 'system' | 'marketing';
  subjectTemplate?: string;
  messageTemplate: string;
  variables: string[];
  priority: Notification['priority'];
  enabled: boolean;
  conditions?: NotificationCondition[];
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface NotificationPreferences {
  userId: number;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  categories: {
    claimStatus: boolean;
    paymentUpdates: boolean;
    fraudAlerts: boolean;
    systemUpdates: boolean;
    marketing: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    timezone: string;
  };
  preferredLanguage: string;
}

export interface NotificationBatch {
  batchId: string;
  notifications: Notification[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  statistics: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    cancelled: number;
  };
}

export interface NotificationDelivery {
  provider: 'sendgrid' | 'twilio' | 'firebase' | 'custom_webhook';
  configuration: Record<string, any>;
  rateLimits: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number; // milliseconds
  };
}

export interface NotificationAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  volume: {
    totalNotifications: number;
    byType: Record<Notification['type'], number>;
    byCategory: Record<string, number>;
    byStatus: Record<Notification['status'], number>;
  };
  delivery: {
    deliveryRate: number;
    averageDeliveryTime: number;
    failureRate: number;
    byProvider: Record<string, {
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
    }>;
  };
  engagement: {
    openRate: number;
    clickThroughRate: number;
    responseRate: number;
    unsubscribeRate: number;
  };
  performance: {
    averageProcessingTime: number;
    queueSize: number;
    backlogAge: number;
    providerStatus: Record<string, 'healthy' | 'degraded' | 'down'>;
  };
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private preferences: Map<number, NotificationPreferences> = new Map();
  private deliveryProviders: Map<string, NotificationDelivery> = new Map();
  private processingQueue: Notification[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeTemplates();
    this.initializeProviders();
    this.startNotificationProcessor();
  }

  // Send a notification
  async sendNotification(
    type: Notification['type'],
    recipient: string,
    recipientType: Notification['recipientType'],
    subject: string,
    message: string,
    data?: Record<string, any>,
    priority: Notification['priority'] = 'medium',
    scheduledAt?: Date
  ): Promise<Notification> {
    const notificationId = this.generateNotificationId();

    const notification: Notification = {
      id: notificationId,
      type,
      recipient,
      recipientType,
      subject,
      message,
      data,
      priority,
      status: scheduledAt && scheduledAt > new Date() ? 'pending' : 'pending',
      deliveryAttempts: 0,
      maxRetries: this.getMaxRetries(type, priority),
      createdAt: new Date(),
      scheduledAt,
      metadata: {}
    };

    this.notifications.set(notificationId, notification);

    if (!scheduledAt || scheduledAt <= new Date()) {
      this.processingQueue.push(notification);
    }

    return notification;
  }

  // Send notification using template
  async sendTemplateNotification(
    templateId: string,
    recipient: string,
    recipientType: Notification['recipientType'],
    variables: Record<string, any>,
    scheduledAt?: Date
  ): Promise<Notification | null> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Check template conditions
    if (template.conditions && !this.evaluateConditions(template.conditions, variables)) {
      return null;
    }

    // Check user preferences
    const userId = this.extractUserIdFromRecipient(recipient, recipientType);
    if (userId && !this.checkUserPreferences(userId, template.type, template.category)) {
      return null;
    }

    // Substitute variables in templates
    const subject = template.subjectTemplate ? this.substituteVariables(template.subjectTemplate, variables) : '';
    const message = this.substituteVariables(template.messageTemplate, variables);

    return this.sendNotification(
      template.type,
      recipient,
      recipientType,
      subject,
      message,
      variables,
      template.priority,
      scheduledAt
    );
  }

  // Send claim status update notification
  async sendClaimStatusUpdate(claimId: number, oldStatus: string, newStatus: string): Promise<Notification[]> {
    const claim = await storage.getClaim(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    const member = await storage.getMember(claim.memberId);
    if (!member) {
      throw new Error(`Member ${claim.memberId} not found`);
    }

    const notifications: Notification[] = [];

    // Member notification
    const memberNotification = await this.sendTemplateNotification(
      `claim_status_${newStatus}`,
      member.email,
      'member',
      {
        memberName: `${member.firstName} ${member.lastName}`,
        claimId: claim.id,
        claimAmount: claim.amount,
        oldStatus: this.formatStatus(oldStatus),
        newStatus: this.formatStatus(newStatus),
        serviceDate: claim.serviceDate,
        submissionDate: claim.submissionDate,
        portalUrl: 'https://member-portal.com/claims'
      }
    );

    if (memberNotification) {
      notifications.push(memberNotification);
    }

    // Provider notification (if applicable)
    if (newStatus === 'approved' || newStatus === 'denied' || newStatus === 'partially_approved') {
      const institution = await storage.getMedicalInstitution(claim.institutionId);
      if (institution) {
        const providerNotification = await this.sendTemplateNotification(
          `claim_status_provider_${newStatus}`,
          institution.email,
          'provider',
          {
            institutionName: institution.name,
            claimId: claim.id,
            claimAmount: claim.amount,
            memberName: `${member.firstName} ${member.lastName}`,
            status: this.formatStatus(newStatus),
            serviceDate: claim.serviceDate,
            portalUrl: 'https://provider-portal.com/claims'
          }
        );

        if (providerNotification) {
          notifications.push(providerNotification);
        }
      }
    }

    // Administrator notification for high-value claims or suspicious activity
    if (claim.amount > 25000 || newStatus === 'investigation_required') {
      const adminNotification = await this.sendNotification(
        'email',
        'claims-admin@company.com',
        'administrator',
        `Important: Claim ${claim.id} - ${this.formatStatus(newStatus)}`,
        `Claim ${claim.id} for $${claim.amount} has been updated to ${this.formatStatus(newStatus)}. Member: ${member.firstName} ${member.lastName}`,
        {
          claimId: claim.id,
          amount: claim.amount,
          memberName: `${member.firstName} ${member.lastName}`,
          status: newStatus,
          highValue: claim.amount > 25000,
          suspicious: newStatus === 'investigation_required'
        },
        'high'
      );

      notifications.push(adminNotification);
    }

    return notifications;
  }

  // Send payment notification
  async sendPaymentNotification(claimId: number, paymentAmount: number, paymentDate: Date): Promise<Notification[]> {
    const claim = await storage.getClaim(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    const member = await storage.getMember(claim.memberId);
    if (!member) {
      throw new Error(`Member ${claim.memberId} not found`);
    }

    const notifications: Notification[] = [];

    // Member payment notification
    const memberNotification = await this.sendTemplateNotification(
      'claim_payment',
      member.email,
      'member',
      {
        memberName: `${member.firstName} ${member.lastName}`,
        claimId: claim.id,
        paymentAmount,
        paymentDate: paymentDate.toLocaleDateString(),
        claimAmount: claim.amount,
        portalUrl: 'https://member-portal.com/payments'
      }
    );

    if (memberNotification) {
      notifications.push(memberNotification);
    }

    return notifications;
  }

  // Send fraud alert notification
  async sendFraudAlert(claimId: number, riskLevel: string, indicators: string[]): Promise<Notification[]> {
    const notifications: Notification[] = [];

    // High-priority alert to fraud investigation team
    const fraudNotification = await this.sendNotification(
      'email',
      'fraud-alerts@company.com',
      'administrator',
      `FRAUD ALERT: Claim ${claimId} - ${riskLevel} Risk`,
      `High-risk claim detected. Claim ID: ${claimId}, Risk Level: ${riskLevel}. Indicators: ${indicators.join(', ')}`,
      {
        claimId,
        riskLevel,
        indicators,
        requiresImmediateAction: riskLevel === 'CRITICAL'
      },
      'urgent'
    );

    notifications.push(fraudNotification);

    // If critical, also send SMS
    if (riskLevel === 'CRITICAL') {
      const smsNotification = await this.sendNotification(
        'sms',
        '+1234567890', // Fraud team phone number
        'administrator',
        'CRITICAL Fraud Alert',
        `Claim ${claimId} requires immediate investigation. Risk: ${riskLevel}`,
        { claimId, riskLevel },
        'urgent'
      );

      notifications.push(smsNotification);
    }

    return notifications;
  }

  // Get notification by ID
  async getNotification(notificationId: string): Promise<Notification | null> {
    return this.notifications.get(notificationId) || null;
  }

  // Get notifications for recipient
  async getNotificationsForRecipient(
    recipient: string,
    recipientType: Notification['recipientType'],
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    const allNotifications = Array.from(this.notifications.values());
    let filtered = allNotifications.filter(n =>
      n.recipient === recipient && n.recipientType === recipientType
    );

    if (unreadOnly) {
      filtered = filtered.filter(n => !n.readAt);
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return filtered.slice(offset, offset + limit);
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return false;
    }

    notification.readAt = new Date();
    return true;
  }

  // Update notification preferences
  async updateNotificationPreferences(
    userId: number,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existingPreferences = this.preferences.get(userId) || this.getDefaultPreferences();

    const updatedPreferences = {
      ...existingPreferences,
      userId,
      ...preferences
    };

    this.preferences.set(userId, updatedPreferences);
    return updatedPreferences;
  }

  // Get notification preferences
  async getNotificationPreferences(userId: number): Promise<NotificationPreferences> {
    return this.preferences.get(userId) || this.getDefaultPreferences();
  }

  // Get notification analytics
  async getNotificationAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<NotificationAnalytics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const allNotifications = Array.from(this.notifications.values());
    const periodNotifications = allNotifications.filter(n =>
      n.createdAt >= start && n.createdAt <= end
    );

    // Calculate volume metrics
    const totalNotifications = periodNotifications.length;
    const byType = periodNotifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<Notification['type'], number>);

    const byCategory = periodNotifications.reduce((acc, n) => {
      const category = this.categorizeNotification(n);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = periodNotifications.reduce((acc, n) => {
      acc[n.status] = (acc[n.status] || 0) + 1;
      return acc;
    }, {} as Record<Notification['status'], number>);

    // Calculate delivery metrics
    const deliveredNotifications = periodNotifications.filter(n => n.status === 'delivered');
    const failedNotifications = periodNotifications.filter(n => n.status === 'failed');
    const deliveryRate = totalNotifications > 0 ? (deliveredNotifications.length / totalNotifications) * 100 : 0;
    const failureRate = totalNotifications > 0 ? (failedNotifications.length / totalNotifications) * 100 : 0;

    const averageDeliveryTime = deliveredNotifications.length > 0 ?
      deliveredNotifications.reduce((sum, n) => {
        if (n.sentAt && n.deliveredAt) {
          return sum + (n.deliveredAt.getTime() - n.sentAt.getTime());
        }
        return sum;
      }, 0) / deliveredNotifications.length : 0;

    return {
      period: { startDate: start, endDate: end },
      volume: {
        totalNotifications,
        byType,
        byCategory,
        byStatus
      },
      delivery: {
        deliveryRate,
        averageDeliveryTime,
        failureRate,
        byProvider: {} // Would be populated with actual provider data
      },
      engagement: {
        openRate: 65.5, // Simulated
        clickThroughRate: 12.3, // Simulated
        responseRate: 3.2, // Simulated
        unsubscribeRate: 0.8 // Simulated
      },
      performance: {
        averageProcessingTime: 1500, // 1.5 seconds
        queueSize: this.processingQueue.length,
        backlogAge: 0, // Would calculate actual backlog age
        providerStatus: {
          sendgrid: 'healthy',
          twilio: 'healthy',
          firebase: 'healthy'
        } as Record<string, 'healthy' | 'degraded' | 'down'>
      }
    };
  }

  // Private helper methods
  private initializeTemplates(): void {
    // Claim status templates
    this.addTemplate({
      id: 'claim_status_approved',
      name: 'Claim Approved',
      description: 'Notification sent when a claim is approved',
      type: 'email',
      category: 'claim_status',
      subjectTemplate: 'Good News! Your Claim #{{claimId}} has been Approved',
      messageTemplate: `Dear {{memberName}},

We're pleased to inform you that your claim #{{claimId}} for ${{claimAmount}} has been approved.

Claim Details:
- Service Date: {{serviceDate}}
- Submission Date: {{submissionDate}}
- Status: {{newStatus}}

You can view your claim details and Explanation of Benefits in your member portal:
{{portalUrl}}

If you have any questions, please contact our member services.

Best regards,
The Claims Team`,
      variables: ['memberName', 'claimId', 'claimAmount', 'newStatus', 'serviceDate', 'submissionDate', 'portalUrl'],
      priority: 'medium',
      enabled: true
    });

    this.addTemplate({
      id: 'claim_status_denied',
      name: 'Claim Denied',
      description: 'Notification sent when a claim is denied',
      type: 'email',
      category: 'claim_status',
      subjectTemplate: 'Important Information about Your Claim #{{claimId}}',
      messageTemplate: `Dear {{memberName},

We have completed the review of your claim #{{claimId}}. Unfortunately, this claim could not be approved at this time.

Claim Details:
- Service Date: {{serviceDate}}
- Amount: ${{claimAmount}}
- Status: {{newStatus}}

You can view the detailed explanation and appeal options in your member portal:
{{portalUrl}}

If you have questions about this decision, please contact our member services.

Sincerely,
The Claims Team`,
      variables: ['memberName', 'claimId', 'claimAmount', 'newStatus', 'serviceDate', 'portalUrl'],
      priority: 'high',
      enabled: true
    });

    this.addTemplate({
      id: 'claim_payment',
      name: 'Claim Payment Processed',
      description: 'Notification sent when a claim payment is processed',
      type: 'email',
      category: 'payment',
      subjectTemplate: 'Payment Processed for Claim #{{claimId}}',
      messageTemplate: `Dear {{memberName},

A payment of ${{paymentAmount}} has been processed for your claim #{{claimId}}.

Payment Details:
- Claim Amount: ${{claimAmount}}
- Payment Amount: ${{paymentAmount}}
- Payment Date: {{paymentDate}}

You can view your payment history in your member portal:
{{portalUrl}}

If you have any questions about this payment, please contact our member services.

Best regards,
The Payments Team`,
      variables: ['memberName', 'claimId', 'claimAmount', 'paymentAmount', 'paymentDate', 'portalUrl'],
      priority: 'medium',
      enabled: true
    });

    // Provider templates
    this.addTemplate({
      id: 'claim_status_provider_approved',
      name: 'Provider - Claim Approved',
      description: 'Notification sent to provider when claim is approved',
      type: 'email',
      category: 'claim_status',
      subjectTemplate: 'Claim #{{claimId}} - Payment Approved',
      messageTemplate: `Dear {{institutionName}},

We are pleased to inform you that claim #{{claimId}} for {{memberName}} has been approved for payment.

Claim Details:
- Member: {{memberName}}
- Claim Amount: ${{claimAmount}}
- Status: {{status}}
- Service Date: {{serviceDate}}

Payment will be processed according to our standard payment schedule. You can view the claim details in your provider portal:
{{portalUrl}}

Thank you for your partnership in providing care to our members.

Sincerely,
The Provider Relations Team`,
      variables: ['institutionName', 'claimId', 'memberName', 'claimAmount', 'status', 'serviceDate', 'portalUrl'],
      priority: 'medium',
      enabled: true
    });
  }

  private initializeProviders(): void {
    // SendGrid for email
    this.deliveryProviders.set('sendgrid', {
      provider: 'sendgrid',
      configuration: {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: 'noreply@insurance.com',
        fromName: 'Claims Department'
      },
      rateLimits: {
        maxPerSecond: 10,
        maxPerMinute: 600,
        maxPerHour: 36000,
        maxPerDay: 864000
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        maxDelay: 30000 // 30 seconds
      }
    });

    // Twilio for SMS
    this.deliveryProviders.set('twilio', {
      provider: 'twilio',
      configuration: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER
      },
      rateLimits: {
        maxPerSecond: 1,
        maxPerMinute: 60,
        maxPerHour: 3600,
        maxPerDay: 86400
      },
      retryPolicy: {
        maxAttempts: 2,
        backoffMultiplier: 2,
        maxDelay: 10000 // 10 seconds
      }
    });
  }

  private addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private substituteVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }

  private evaluateConditions(conditions: NotificationCondition[], variables: Record<string, any>): boolean {
    return conditions.every(condition => {
      const fieldValue = variables[condition.field];
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value);
        case 'less_than':
          return Number(fieldValue) < Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        default:
          return false;
      }
    });
  }

  private checkUserPreferences(
    userId: number,
    notificationType: NotificationTemplate['type'],
    category: NotificationTemplate['category']
  ): boolean {
    const preferences = this.preferences.get(userId);
    if (!preferences) {
      return true; // Default to sending if no preferences set
    }

    // Check channel preference
    const channelEnabled = preferences.channels[notificationType as keyof typeof preferences.channels];
    if (!channelEnabled) {
      return false;
    }

    // Check category preference
    const categoryKey = this.mapCategoryToPreferenceKey(category);
    const categoryEnabled = preferences.categories[categoryKey];
    if (!categoryEnabled) {
      return false;
    }

    return true;
  }

  private mapCategoryToPreferenceKey(category: NotificationTemplate['category']): keyof NotificationPreferences['categories'] {
    switch (category) {
      case 'claim_status':
        return 'claimStatus';
      case 'payment':
        return 'paymentUpdates';
      case 'fraud_alert':
        return 'fraudAlerts';
      case 'system':
        return 'systemUpdates';
      case 'marketing':
        return 'marketing';
      default:
        return 'systemUpdates';
    }
  }

  private extractUserIdFromRecipient(recipient: string, recipientType: Notification['recipientType']): number | null {
    // Extract user ID from email or other recipient identifier
    // This is simplified - in a real implementation, you'd query the database
    if (recipientType === 'member') {
      const memberMatch = recipient.match(/member_(\d+)@/);
      if (memberMatch) return Number(memberMatch[1]);
    }
    return null;
  }

  private getMaxRetries(type: Notification['type'], priority: Notification['priority']): number {
    const baseRetries = {
      email: 3,
      sms: 2,
      push: 2,
      in_app: 1,
      webhook: 3
    };

    const priorityMultiplier = {
      low: 1,
      medium: 1,
      high: 2,
      urgent: 3
    };

    return (baseRetries[type] || 1) * (priorityMultiplier[priority] || 1);
  }

  private formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private categorizeNotification(notification: Notification): string {
    // Categorize based on subject and message content
    const content = (notification.subject + ' ' + notification.message).toLowerCase();

    if (content.includes('claim') && content.includes('status')) {
      return 'claim_status';
    }
    if (content.includes('payment')) {
      return 'payment';
    }
    if (content.includes('fraud') || content.includes('alert')) {
      return 'fraud_alert';
    }
    if (content.includes('system') || content.includes('maintenance')) {
      return 'system';
    }

    return 'other';
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      userId: 0,
      channels: {
        email: true,
        sms: true,
        push: true,
        inApp: true
      },
      categories: {
        claimStatus: true,
        paymentUpdates: true,
        fraudAlerts: true,
        systemUpdates: false,
        marketing: false
      },
      frequency: 'immediate',
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'America/New_York'
      },
      preferredLanguage: 'en'
    };
  }

  private startNotificationProcessor(): void {
    // Process notifications every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processNotificationQueue();
    }, 30000);
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort by priority and creation date
      this.processingQueue.sort((a, b) => {
        const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const notificationsToProcess = this.processingQueue.splice(0, 10); // Process 10 at a time

      await Promise.allSettled(
        notificationsToProcess.map(notification => this.deliverNotification(notification))
      );

    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    try {
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.deliveryAttempts++;

      // Simulate delivery (in real implementation, would call actual provider)
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

      // Simulate 95% success rate
      if (Math.random() > 0.05) {
        notification.status = 'delivered';
        notification.deliveredAt = new Date();
      } else {
        throw new Error('Simulated delivery failure');
      }

    } catch (error) {
      notification.status = 'failed';
      notification.error = error instanceof Error ? error.message : 'Unknown error';

      // Retry if attempts remaining
      if (notification.deliveryAttempts < notification.maxRetries) {
        notification.status = 'pending';
        setTimeout(() => {
          this.processingQueue.push(notification);
        }, Math.pow(2, notification.deliveryAttempts) * 1000); // Exponential backoff
      }
    }
  }
}

export const notificationService = new NotificationService();