import { db } from '../db.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  users,
  agents,
  leads,
  opportunities,
  members,
  notifications,
  notificationTemplates,
  notificationPreferences,
  communicationLogs,
  insertNotificationSchema,
  insertNotificationTemplateSchema,
  insertNotificationPreferenceSchema
} from '../../shared/schema.js';

export interface NotificationRequest {
  recipientId: number;
  recipientType: 'user' | 'agent' | 'lead' | 'member';
  type: 'email' | 'sms' | 'in_app' | 'push' | 'webhook';
  channel: 'email' | 'sms' | 'mobile_app' | 'web' | 'api';
  subject?: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: Date;
  metadata?: Record<string, any>;
  triggerEvent?: string;
  templateId?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'in_app' | 'push';
  category: string;
  subject: string;
  message: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  userId?: number;
  agentId?: number;
  channels: {
    email: boolean;
    sms: boolean;
    in_app: boolean;
    push: boolean;
  };
  categories: Record<string, boolean>;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  frequency: {
    immediate: boolean;
    digest: boolean;
    digestFrequency: 'hourly' | 'daily' | 'weekly';
  };
}

export class NotificationService {
  private emailProvider?: any;
  private smsProvider?: any;
  private pushProvider?: any;

  constructor() {
    // Initialize notification providers
    this.initializeProviders();
  }

  private initializeProviders() {
    // In production, these would be real providers like SendGrid, Twilio, etc.
    // For now, we'll mock them
    this.emailProvider = {
      send: async (options: any) => {
        console.log('Sending email:', options);
        return { success: true, messageId: `email_${Date.now()}` };
      }
    };

    this.smsProvider = {
      send: async (options: any) => {
        console.log('Sending SMS:', options);
        return { success: true, messageId: `sms_${Date.now()}` };
      }
    };

    this.pushProvider = {
      send: async (options: any) => {
        console.log('Sending push notification:', options);
        return { success: true, messageId: `push_${Date.now()}` };
      }
    };
  }

  async sendNotification(request: NotificationRequest) {
    try {
      // Get recipient preferences
      const preferences = await this.getRecipientPreferences(
        request.recipientId,
        request.recipientType
      );

      // Check if user wants to receive this type of notification
      if (!this.shouldSendNotification(request, preferences)) {
        return { success: true, skipped: true, reason: 'User preferences' };
      }

      // Get recipient contact information
      const recipientInfo = await this.getRecipientInfo(
        request.recipientId,
        request.recipientType
      );

      if (!recipientInfo) {
        return { success: false, error: 'Recipient not found' };
      }

      // Process template if specified
      let processedMessage = request.message;
      let processedSubject = request.subject || '';

      if (request.templateId) {
        const template = await this.getTemplate(request.templateId);
        if (template) {
          const templateData = { ...request.data, recipient: recipientInfo };
          processedSubject = this.processTemplate(template.subject, templateData);
          processedMessage = this.processTemplate(template.message, templateData);
        }
      }

      // Schedule notification if needed
      if (request.scheduledAt && request.scheduledAt > new Date()) {
        return await this.scheduleNotification({
          ...request,
          message: processedMessage,
          subject: processedSubject
        });
      }

      // Send notification based on type and channel
      const results = await this.sendNotificationChannel({
        ...request,
        message: processedMessage,
        subject: processedSubject,
        recipientInfo
      });

      // Log the communication
      await this.logCommunication({
        ...request,
        message: processedMessage,
        subject: processedSubject,
        results
      });

      // Store notification record
      const [notification] = await db.insert(notifications)
        .values({
          recipientId: request.recipientId,
          recipientType: request.recipientType,
          type: request.type,
          channel: request.channel,
          subject: processedSubject,
          message: processedMessage,
          data: request.data ? JSON.stringify(request.data) : null,
          priority: request.priority || 'medium',
          status: results.some(r => r.success) ? 'sent' : 'failed',
          sentAt: results.some(r => r.success) ? new Date() : null,
          scheduledAt: request.scheduledAt || null,
          metadata: request.metadata ? JSON.stringify(request.metadata) : null,
          triggerEvent: request.triggerEvent || null,
          templateId: request.templateId || null,
          createdAt: new Date()
        })
        .returning();

      return { success: true, notification, results };

    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  private async sendNotificationChannel(request: any) {
    const results = [];

    switch (request.type) {
      case 'email':
        if (request.channel === 'email' && request.recipientInfo.email) {
          const result = await this.emailProvider.send({
            to: request.recipientInfo.email,
            subject: request.subject,
            text: request.message,
            html: this.formatAsHtml(request.message),
            data: request.data
          });
          results.push({ channel: 'email', ...result });
        }
        break;

      case 'sms':
        if (request.channel === 'sms' && request.recipientInfo.phone) {
          const result = await this.smsProvider.send({
            to: request.recipientInfo.phone,
            message: request.message,
            data: request.data
          });
          results.push({ channel: 'sms', ...result });
        }
        break;

      case 'in_app':
        if (request.channel === 'mobile_app' || request.channel === 'web') {
          // Store in-app notification (this is already handled by the notifications table)
          results.push({ channel: 'in_app', success: true, messageId: `in_app_${Date.now()}` });
        }
        break;

      case 'push':
        if (request.channel === 'mobile_app' && request.recipientInfo.deviceTokens) {
          const result = await this.pushProvider.send({
            tokens: request.recipientInfo.deviceTokens,
            title: request.subject,
            body: request.message,
            data: request.data
          });
          results.push({ channel: 'push', ...result });
        }
        break;

      case 'webhook':
        if (request.channel === 'api' && request.recipientInfo.webhookUrl) {
          try {
            const response = await fetch(request.recipientInfo.webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Notification-Event': request.triggerEvent || 'manual'
              },
              body: JSON.stringify({
                recipient: request.recipientInfo,
                subject: request.subject,
                message: request.message,
                data: request.data,
                priority: request.priority,
                timestamp: new Date().toISOString()
              })
            });

            results.push({
              channel: 'webhook',
              success: response.ok,
              messageId: `webhook_${Date.now()}`,
              status: response.status
            });
          } catch (error) {
            results.push({
              channel: 'webhook',
              success: false,
              error: error.message
            });
          }
        }
        break;
    }

    return results;
  }

  private async getRecipientPreferences(recipientId: number, recipientType: string) {
    try {
      let preference;

      if (recipientType === 'agent') {
        const [pref] = await db.select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.agentId, recipientId))
          .limit(1);
        preference = pref;
      } else {
        const [pref] = await db.select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, recipientId))
          .limit(1);
        preference = pref;
      }

      if (preference) {
        return {
          channels: JSON.parse(preference.channels as string),
          categories: JSON.parse(preference.categories as string),
          quietHours: JSON.parse(preference.quietHours as string),
          frequency: JSON.parse(preference.frequency as string)
        };
      }

      // Default preferences
      return {
        channels: {
          email: true,
          sms: true,
          in_app: true,
          push: true
        },
        categories: {},
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC'
        },
        frequency: {
          immediate: true,
          digest: false,
          digestFrequency: 'daily'
        }
      };
    } catch (error) {
      console.error('Error getting recipient preferences:', error);
      return null;
    }
  }

  private shouldSendNotification(request: NotificationRequest, preferences: any) {
    if (!preferences) return true;

    // Check channel preference
    if (!preferences.channels[request.channel]) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { startTime, endTime } = preferences.quietHours;

      let isQuietHours = false;
      if (startTime < endTime) {
        isQuietHours = currentTime >= startTime && currentTime <= endTime;
      } else {
        // Handle overnight quiet hours (e.g., 22:00 to 08:00)
        isQuietHours = currentTime >= startTime || currentTime <= endTime;
      }

      // Skip non-urgent notifications during quiet hours
      if (isQuietHours && request.priority !== 'urgent') {
        return false;
      }
    }

    return true;
  }

  private async getRecipientInfo(recipientId: number, recipientType: string) {
    try {
      switch (recipientType) {
        case 'user':
          const [user] = await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phoneNumber,
            username: users.username
          })
          .from(users)
          .where(eq(users.id, recipientId));

          return user ? {
            ...user,
            fullName: `${user.firstName} ${user.lastName}`,
            type: 'user'
          } : null;

        case 'agent':
          const [agent] = await db.select({
            id: agents.id,
            firstName: agents.firstName,
            lastName: agents.lastName,
            email: agents.email,
            phone: agents.phoneNumber,
            agentCode: agents.agentCode
          })
          .from(agents)
          .where(eq(agents.id, recipientId));

          return agent ? {
            ...agent,
            fullName: `${agent.firstName} ${agent.lastName}`,
            type: 'agent'
          } : null;

        case 'lead':
          const [lead] = await db.select({
            id: leads.id,
            firstName: leads.firstName,
            lastName: leads.lastName,
            email: leads.email,
            phone: leads.phone,
            company: leads.company
          })
          .from(leads)
          .where(eq(leads.id, recipientId));

          return lead ? {
            ...lead,
            fullName: `${lead.firstName} ${lead.lastName}`,
            type: 'lead'
          } : null;

        case 'member':
          const [member] = await db.select({
            id: members.id,
            firstName: members.firstName,
            lastName: members.lastName,
            email: members.email,
            phone: members.phoneNumber
          })
          .from(members)
          .where(eq(members.id, recipientId));

          return member ? {
            ...member,
            fullName: `${member.firstName} ${member.lastName}`,
            type: 'member'
          } : null;

        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting recipient info:', error);
      return null;
    }
  }

  private async getTemplate(templateId: string) {
    try {
      const [template] = await db.select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.id, templateId));

      return template;
    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  private processTemplate(template: string, data: Record<string, any>) {
    if (!template) return '';

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], data);
      return value !== undefined ? String(value) : match;
    });
  }

  private formatAsHtml(message: string) {
    // Simple text to HTML conversion
    return message
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  private async scheduleNotification(request: NotificationRequest) {
    // In production, this would use a job scheduler like Bull, Agenda, or similar
    // For now, we'll store it with a scheduled timestamp
    const [notification] = await db.insert(notifications)
      .values({
        recipientId: request.recipientId,
        recipientType: request.recipientType,
        type: request.type,
        channel: request.channel,
        subject: request.subject,
        message: request.message,
        data: request.data ? JSON.stringify(request.data) : null,
        priority: request.priority || 'medium',
        status: 'scheduled',
        scheduledAt: request.scheduledAt,
        metadata: request.metadata ? JSON.stringify(request.metadata) : null,
        triggerEvent: request.triggerEvent || null,
        templateId: request.templateId || null,
        createdAt: new Date()
      })
      .returning();

    return { success: true, notification, scheduled: true };
  }

  private async logCommunication(request: any) {
    try {
      // Log successful communications to communication_logs table
      const successfulResults = request.results.filter((r: any) => r.success);

      for (const result of successfulResults) {
        await db.insert(communicationLogs)
          .values({
            memberId: request.recipientType === 'member' ? request.recipientId : null,
            leadId: request.recipientType === 'lead' ? request.recipientId : null,
            type: this.getCommunicationType(result.channel),
            channel: result.channel,
            subject: request.subject,
            content: request.message,
            status: 'sent',
            sentAt: new Date(),
            createdAt: new Date()
          });
      }
    } catch (error) {
      console.error('Error logging communication:', error);
    }
  }

  private getCommunicationType(channel: string): string {
    const typeMap: Record<string, string> = {
      email: 'email',
      sms: 'sms',
      in_app: 'mobile_app',
      push: 'mobile_app',
      webhook: 'api'
    };
    return typeMap[channel] || 'other';
  }

  async createTemplate(templateData: typeof insertNotificationTemplateSchema._type) {
    try {
      const [template] = await db.insert(notificationTemplates)
        .values({
          ...templateData,
          isActive: true,
          createdAt: new Date()
        })
        .returning();

      return { success: true, template };
    } catch (error) {
      console.error('Error creating template:', error);
      return { success: false, error: 'Failed to create template' };
    }
  }

  async updateTemplate(templateId: string, updateData: Partial<typeof insertNotificationTemplateSchema._type>) {
    try {
      const [updatedTemplate] = await db.update(notificationTemplates)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(notificationTemplates.id, templateId))
        .returning();

      if (!updatedTemplate) {
        return { success: false, error: 'Template not found' };
      }

      return { success: true, template: updatedTemplate };
    } catch (error) {
      console.error('Error updating template:', error);
      return { success: false, error: 'Failed to update template' };
    }
  }

  async updatePreferences(userId: number, agentId: number, preferences: Partial<NotificationPreference>) {
    try {
      const existingPref = await db.select()
        .from(notificationPreferences)
        .where(
          userId ? eq(notificationPreferences.userId, userId) :
          eq(notificationPreferences.agentId, agentId)
        )
        .limit(1);

      const prefData = {
        ...(userId && { userId }),
        ...(agentId && { agentId }),
        channels: JSON.stringify(preferences.channels || {}),
        categories: JSON.stringify(preferences.categories || {}),
        quietHours: JSON.stringify(preferences.quietHours || {}),
        frequency: JSON.stringify(preferences.frequency || {}),
        updatedAt: new Date()
      };

      if (existingPref.length > 0) {
        const [updatedPref] = await db.update(notificationPreferences)
          .set(prefData)
          .where(
            userId ? eq(notificationPreferences.userId, userId) :
            eq(notificationPreferences.agentId, agentId)
          )
          .returning();

        return { success: true, preferences: updatedPref };
      } else {
        const [newPref] = await db.insert(notificationPreferences)
          .values({
            ...prefData,
            createdAt: new Date()
          })
          .returning();

        return { success: true, preferences: newPref };
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      return { success: false, error: 'Failed to update preferences' };
    }
  }

  async getNotifications(userId: number, agentId: number, filters: {
    type?: string;
    status?: string;
    unread?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    try {
      const { page = 1, limit = 20, type, status, unread } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [];

      if (userId) {
        whereConditions.push(eq(notifications.recipientId, userId));
        whereConditions.push(eq(notifications.recipientType, 'user'));
      } else if (agentId) {
        whereConditions.push(eq(notifications.recipientId, agentId));
        whereConditions.push(eq(notifications.recipientType, 'agent'));
      }

      if (type) {
        whereConditions.push(eq(notifications.type, type));
      }

      if (status) {
        whereConditions.push(eq(notifications.status, status));
      }

      if (unread) {
        whereConditions.push(eq(notifications.isRead, false));
      }

      const notificationsList = await db.select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      return { success: true, notifications: notificationsList };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { success: false, error: 'Failed to get notifications' };
    }
  }

  async markAsRead(notificationId: string, userId?: number, agentId?: number) {
    try {
      const whereConditions = [eq(notifications.id, notificationId)];

      if (userId) {
        whereConditions.push(eq(notifications.recipientId, userId));
        whereConditions.push(eq(notifications.recipientType, 'user'));
      } else if (agentId) {
        whereConditions.push(eq(notifications.recipientId, agentId));
        whereConditions.push(eq(notifications.recipientType, 'agent'));
      }

      const [updatedNotification] = await db.update(notifications)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(and(...whereConditions))
        .returning();

      if (!updatedNotification) {
        return { success: false, error: 'Notification not found' };
      }

      return { success: true, notification: updatedNotification };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }

  async markAllAsRead(userId?: number, agentId?: number) {
    try {
      let whereConditions = [];

      if (userId) {
        whereConditions.push(eq(notifications.recipientId, userId));
        whereConditions.push(eq(notifications.recipientType, 'user'));
      } else if (agentId) {
        whereConditions.push(eq(notifications.recipientId, agentId));
        whereConditions.push(eq(notifications.recipientType, 'agent'));
      }

      whereConditions.push(eq(notifications.isRead, false));

      const result = await db.update(notifications)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(and(...whereConditions));

      return { success: true, count: result.rowCount || 0 };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: 'Failed to mark all notifications as read' };
    }
  }

  async getUnreadCount(userId?: number, agentId?: number) {
    try {
      let whereConditions = [
        eq(notifications.isRead, false),
        eq(notifications.status, 'sent')
      ];

      if (userId) {
        whereConditions.push(eq(notifications.recipientId, userId));
        whereConditions.push(eq(notifications.recipientType, 'user'));
      } else if (agentId) {
        whereConditions.push(eq(notifications.recipientId, agentId));
        whereConditions.push(eq(notifications.recipientType, 'agent'));
      }

      const [result] = await db.select({
        count: sql<number>`COUNT(*)`
      })
      .from(notifications)
      .where(and(...whereConditions));

      return { success: true, count: result?.count || 0 };
    } catch (error) {
      console.error('Error getting unread count:', error);
      return { success: false, error: 'Failed to get unread count' };
    }
  }
}

export const notificationService = new NotificationService();