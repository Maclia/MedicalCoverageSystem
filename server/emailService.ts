import { emailTemplateSystem, getTemplatesForTrigger } from './emailTemplates';
import { storage } from './storage';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  priority?: 'high' | 'medium' | 'low';
}

interface ScheduledEmail {
  id: string;
  memberId: number;
  templateId: string;
  scheduledFor: Date;
  trigger: string;
  data: any;
  sent: boolean;
}

class EmailService {
  private scheduledEmails: Map<string, ScheduledEmail> = new Map();
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Send an email immediately
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.isProduction) {
        // In production, integrate with actual email service (SendGrid, AWS SES, etc.)
        return await this.sendProductionEmail(options);
      } else {
        // In development, log the email for debugging
        return this.logEmailForDevelopment(options);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send an email using a template
   */
  async sendTemplatedEmail(
    templateId: string,
    memberId: number,
    additionalData?: any
  ): Promise<boolean> {
    try {
      // Get member data
      const member = await storage.getMember(memberId);
      if (!member) {
        throw new Error(`Member ${memberId} not found`);
      }

      // Get company data
      const company = await storage.getCompany(member.companyId);
      const companyName = company?.name || 'Your Health Coverage';

      // Get onboarding session if available
      const onboardingSession = await storage.getOnboardingSessionByMember(memberId);

      // Prepare template data
      const templateData = {
        member: {
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          companyName,
          currentDay: onboardingSession?.currentDay,
          totalPoints: onboardingSession?.totalPointsEarned,
          streakDays: onboardingSession?.streakDays,
          activationLink: this.generateActivationLink(memberId)
        },
        additionalData
      };

      // Render template
      const rendered = emailTemplateSystem.renderTemplate(templateId, templateData);

      // Send email
      return await this.sendEmail({
        to: member.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text
      });
    } catch (error) {
      console.error('Failed to send templated email:', error);
      return false;
    }
  }

  /**
   * Send emails based on triggers
   */
  async sendTriggeredEmails(trigger: string, memberId: number, additionalData?: any): Promise<void> {
    const templates = getTemplatesForTrigger(trigger);

    for (const template of templates) {
      try {
        await this.sendTemplatedEmail(template.id, memberId, additionalData);
      } catch (error) {
        console.error(`Failed to send email for trigger ${trigger}:`, error);
      }
    }
  }

  /**
   * Schedule an email to be sent later
   */
  scheduleEmail(
    templateId: string,
    memberId: number,
    scheduledFor: Date,
    trigger: string,
    additionalData?: any
  ): string {
    const id = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const scheduledEmail: ScheduledEmail = {
      id,
      memberId,
      templateId,
      scheduledFor,
      trigger,
      data: additionalData,
      sent: false
    };

    this.scheduledEmails.set(id, scheduledEmail);
    return id;
  }

  /**
   * Process scheduled emails that are ready to be sent
   */
  async processScheduledEmails(): Promise<void> {
    const now = new Date();

    for (const [id, email] of this.scheduledEmails.entries()) {
      if (!email.sent && email.scheduledFor <= now) {
        try {
          await this.sendTemplatedEmail(email.templateId, email.memberId, email.data);
          email.sent = true;
        } catch (error) {
          console.error(`Failed to send scheduled email ${id}:`, error);
        }
      }
    }

    // Clean up sent emails older than 24 hours
    this.cleanupOldScheduledEmails();
  }

  /**
   * Send welcome series emails to new members
   */
  async sendWelcomeSeries(memberId: number): Promise<void> {
    const day1Email = this.scheduleEmail('welcome_email', memberId, new Date(), 'member_activated');
    const day1Reminder = this.scheduleEmail('day1_reminder', memberId, new Date(Date.now() + 24 * 60 * 60 * 1000), 'day1_incomplete');
    const documentReminder = this.scheduleEmail('document_reminder', memberId, new Date(Date.now() + 48 * 60 * 60 * 1000), 'documents_incomplete');
  }

  /**
   * Send onboarding progress emails
   */
  async sendOnboardingProgressEmail(memberId: number, dayNumber: number): Promise<void> {
    const templateId = `day${dayNumber}_progress`;
    await this.sendTemplatedEmail(templateId, memberId);
  }

  /**
   * Send milestone achievement emails
   */
  async sendMilestoneEmail(memberId: number, milestone: 'halfway' | 'completion'): Promise<void> {
    const templateId = milestone === 'halfway' ? 'milestone_halfway' : 'milestone_completion';
    await this.sendTemplatedEmail(templateId, memberId);
  }

  /**
   * Send achievement unlock emails
   */
  async sendAchievementEmail(memberId: number, achievementTitle: string, achievementDescription: string, pointsEarned: number): Promise<void> {
    await this.sendTemplatedEmail('achievement_unlocked', memberId, {
      achievementTitle,
      achievementDescription,
      pointsEarned: pointsEarned.toString()
    });
  }

  /**
   * Send engagement reminder emails
   */
  async sendEngagementReminder(memberId: number, lastActivity: Date): Promise<void> {
    const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceActivity >= 7) {
      await this.sendTemplatedEmail('engagement_reminder', memberId, {
        lastActivity: lastActivity.toLocaleDateString(),
        dashboardLink: `${process.env.CLIENT_URL}/member/dashboard/${memberId}`
      });
    }
  }

  /**
   * Send wellness program invitation
   */
  async sendWellnessInvitation(memberId: number): Promise<void> {
    await this.sendTemplatedEmail('wellness_invitation', memberId, {
      wellnessLink: `${process.env.CLIENT_URL}/member/wellness/${memberId}`,
      availableRewards: '• Health challenges\n• Fitness tracking\n• Nutritional guidance\n• Mental health resources'
    });
  }

  /**
   * Generate secure activation link
   */
  private generateActivationLink(memberId: number): string {
    const token = Buffer.from(`${memberId}:${Date.now()}`).toString('base64');
    return `${process.env.CLIENT_URL}/activate/${token}`;
  }

  /**
   * Send email in production (integrate with your email service)
   */
  private async sendProductionEmail(options: EmailOptions): Promise<boolean> {
    // This is where you'd integrate with an actual email service
    // Examples: SendGrid, AWS SES, Mailgun, etc.

    console.log('=== PRODUCTION EMAIL ===');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Priority: ${options.priority || 'normal'}`);
    console.log(`HTML Length: ${options.html.length} characters`);
    console.log(`Text Length: ${options.text.length} characters`);

    // Example SendGrid integration:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: options.to,
      from: process.env.FROM_EMAIL,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await sgMail.send(msg);
    */

    // For now, return true to simulate successful sending
    return true;
  }

  /**
   * Log email in development for debugging
   */
  private logEmailForDevelopment(options: EmailOptions): boolean {
    console.log('\n=== DEVELOPMENT EMAIL ===');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Priority: ${options.priority || 'normal'}`);
    console.log('\n--- HTML Content ---');
    console.log(options.html);
    console.log('\n--- Text Content ---');
    console.log(options.text);
    console.log('=== END EMAIL ===\n');

    return true;
  }

  /**
   * Clean up old scheduled emails
   */
  private cleanupOldScheduledEmails(): void {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const [id, email] of this.scheduledEmails.entries()) {
      if (email.sent && email.scheduledFor < twentyFourHoursAgo) {
        this.scheduledEmails.delete(id);
      }
    }
  }

  /**
   * Get email delivery statistics
   */
  getDeliveryStats(): {
    totalScheduled: number;
    sent: number;
    pending: number;
  } {
    const totalScheduled = this.scheduledEmails.size;
    const sent = Array.from(this.scheduledEmails.values()).filter(email => email.sent).length;
    const pending = totalScheduled - sent;

    return { totalScheduled, sent, pending };
  }
}

// Singleton instance
export const emailService = new EmailService();

// Background job processor for scheduled emails
export async function processEmailQueue(): Promise<void> {
  try {
    await emailService.processScheduledEmails();
  } catch (error) {
    console.error('Error processing email queue:', error);
  }
}

// Export helper functions for common email workflows
export const emailWorkflows = {
  /**
   * Complete activation workflow
   */
  async activationWorkflow(memberId: number): Promise<void> {
    // Send activation email
    await emailService.sendTemplatedEmail('member_activation', memberId);

    // Schedule welcome series
    await emailService.sendWelcomeSeries(memberId);
  },

  /**
   * Daily onboarding check
   */
  async dailyOnboardingCheck(memberId: number, currentDay: number): Promise<void> {
    // Send progress email for current day
    if (currentDay > 1 && currentDay <= 7) {
      await emailService.sendOnboardingProgressEmail(memberId, currentDay);
    }

    // Check for milestones
    if (currentDay === 4) {
      await emailService.sendMilestoneEmail(memberId, 'halfway');
    }

    if (currentDay === 7) {
      await emailService.sendMilestoneEmail(memberId, 'completion');
      await emailService.sendWellnessInvitation(memberId);
    }
  },

  /**
   * Engagement monitoring
   */
  async engagementCheck(memberId: number, lastActivity: Date): Promise<void> {
    await emailService.sendEngagementReminder(memberId, lastActivity);
  }
};