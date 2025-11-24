export interface EmailTemplate {
  id: string;
  name: string;
  type: 'activation' | 'onboarding_reminder' | 'milestone' | 'achievement' | 'engagement';
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  triggers: string[];
  schedule?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MemberData {
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  currentDay?: number;
  totalPoints?: number;
  streakDays?: number;
  activationLink?: string;
}

export interface TemplateData {
  member: MemberData;
  additionalData?: Record<string, any>;
}

export class EmailTemplateSystem {
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Activation Email
    this.addTemplate({
      id: 'member_activation',
      name: 'Member Account Activation',
      type: 'activation',
      subject: 'Welcome to {{companyName}}! Activate Your Health Coverage Account',
      htmlContent: this.getActivationEmailTemplate(),
      textContent: this.getActivationEmailTextTemplate(),
      variables: ['firstName', 'lastName', 'companyName', 'activationLink'],
      triggers: ['member_registered'],
      priority: 'high'
    });

    // Welcome Email
    this.addTemplate({
      id: 'welcome_email',
      name: 'Welcome Email',
      type: 'activation',
      subject: 'Get Started with Your {{companyName}} Health Journey!',
      htmlContent: this.getWelcomeEmailTemplate(),
      textContent: this.getWelcomeEmailTextTemplate(),
      variables: ['firstName', 'companyName', 'day1Link'],
      triggers: ['member_activated'],
      priority: 'high'
    });

    // Day 1 Onboarding Reminder
    this.addTemplate({
      id: 'day1_reminder',
      name: 'Day 1 Onboarding Reminder',
      type: 'onboarding_reminder',
      subject: 'Complete Your First Onboarding Tasks',
      htmlContent: this.getDay1ReminderTemplate(),
      textContent: this.getDay1ReminderTextTemplate(),
      variables: ['firstName', 'companyName', 'day1Link'],
      triggers: ['day1_incomplete', '24_hours_since_activation'],
      schedule: '0 9 * * *', // 9 AM daily
      priority: 'medium'
    });

    // Daily Onboarding Progress (Days 2-7)
    for (let day = 2; day <= 7; day++) {
      this.addTemplate({
        id: `day${day}_progress`,
        name: `Day ${day} Progress Email`,
        type: 'onboarding_reminder',
        subject: `Day ${day} of Your Health Journey Awaits!`,
        htmlContent: this.getDayProgressTemplate(day),
        textContent: this.getDayProgressTextTemplate(day),
        variables: ['firstName', 'currentDay', 'companyName', 'progressLink', 'dayTasks'],
        triggers: [`day${day}_available`, '24_hours_since_last_activity'],
        schedule: '0 9 * * *', // 9 AM daily
        priority: 'medium'
      });
    }

    // Milestone Achievements
    this.addTemplate({
      id: 'milestone_halfway',
      name: 'Halfway Milestone',
      type: 'milestone',
      subject: '🎉 You\'re Halfway Through Your Onboarding Journey!',
      htmlContent: this.getHalfwayMilestoneTemplate(),
      textContent: this.getHalfwayMilestoneTextTemplate(),
      variables: ['firstName', 'currentDay', 'totalPoints', 'companyName'],
      triggers: ['day4_reached'],
      priority: 'high'
    });

    this.addTemplate({
      id: 'milestone_completion',
      name: 'Onboarding Completion',
      type: 'milestone',
      subject: '🏆 Congratulations! You\'ve Completed Your Onboarding Journey!',
      htmlContent: this.getCompletionMilestoneTemplate(),
      textContent: this.getCompletionMilestoneTextTemplate(),
      variables: ['firstName', 'totalPoints', 'streakDays', 'companyName'],
      triggers: ['onboarding_completed'],
      priority: 'high'
    });

    // Achievement Unlocked
    this.addTemplate({
      id: 'achievement_unlocked',
      name: 'Achievement Unlocked',
      type: 'achievement',
      subject: '🏅 New Achievement Unlocked: {{achievementTitle}}!',
      htmlContent: this.getAchievementTemplate(),
      textContent: this.getAchievementTextTemplate(),
      variables: ['firstName', 'achievementTitle', 'achievementDescription', 'pointsEarned', 'companyName'],
      triggers: ['achievement_unlocked'],
      priority: 'medium'
    });

    // Engagement and Retention
    this.addTemplate({
      id: 'engagement_reminder',
      name: 'Engagement Reminder',
      type: 'engagement',
      subject: 'Continue Your Health Journey with {{companyName}}',
      htmlContent: this.getEngagementReminderTemplate(),
      textContent: this.getEngagementReminderTextTemplate(),
      variables: ['firstName', 'lastActivity', 'companyName', 'dashboardLink'],
      triggers: ['7_days_inactivity', '14_days_inactivity'],
      schedule: '0 10 * * 1', // Monday 10 AM
      priority: 'low'
    });

    // Wellness Program Invitation
    this.addTemplate({
      id: 'wellness_invitation',
      name: 'Wellness Program Invitation',
      type: 'engagement',
      subject: '🌿 Join Our Wellness Program and Earn Rewards!',
      htmlContent: this.getWellnessInvitationTemplate(),
      textContent: this.getWellnessInvitationTextTemplate(),
      variables: ['firstName', 'companyName', 'wellnessLink', 'availableRewards'],
      triggers: ['day5_reached'],
      priority: 'medium'
    });

    // Document Upload Reminder
    this.addTemplate({
      id: 'document_reminder',
      name: 'Document Upload Reminder',
      type: 'onboarding_reminder',
      subject: 'Complete Your Document Upload to Finish Setup',
      htmlContent: this.getDocumentReminderTemplate(),
      textContent: this.getDocumentReminderTextTemplate(),
      variables: ['firstName', 'companyName', 'documentsLink', 'missingDocuments'],
      triggers: ['documents_incomplete', '48_hours_since_activation'],
      priority: 'medium'
    });
  }

  private addTemplate(template: EmailTemplate) {
    this.templates.set(template.id, template);
  }

  public getTemplate(id: string): EmailTemplate | undefined {
    return this.templates.get(id);
  }

  public getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  public getTemplatesByType(type: string): EmailTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.type === type);
  }

  public renderTemplate(templateId: string, data: TemplateData): { html: string; text: string; subject: string } {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const variables = {
      firstName: data.member.firstName,
      lastName: data.member.lastName,
      email: data.member.email,
      companyName: data.member.companyName || 'Your Health Coverage',
      currentDay: data.member.currentDay?.toString() || '0',
      totalPoints: data.member.totalPoints?.toString() || '0',
      streakDays: data.member.streakDays?.toString() || '0',
      activationLink: data.member.activationLink || '',
      ...data.additionalData
    };

    const subject = this.replaceVariables(template.subject, variables);
    const htmlContent = this.replaceVariables(template.htmlContent, variables);
    const textContent = this.replaceVariables(template.textContent, variables);

    return { html: htmlContent, text: textContent, subject };
  }

  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  // Email Template Methods
  private getActivationEmailTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to {{companyName}}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; font-size: 28px; margin: 0;">Welcome to {{companyName}}!</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">Your health journey starts here</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hi {{firstName}},</h2>
          <p style="font-size: 16px;">We're excited to have you join our health coverage program! To get started with your personalized health journey, please activate your account using the secure link below.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{{activationLink}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
            Activate Your Account
          </a>
          <p style="color: #666; font-size: 14px; margin-top: 10px;">This link expires in 24 hours</p>
        </div>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: bold;">What happens next?</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Complete your 7-day onboarding journey</li>
            <li>Set up your profile and preferences</li>
            <li>Upload required documents</li>
            <li>Discover personalized benefits and features</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>If you didn't request this activation, please contact our support team.</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getActivationEmailTextTemplate(): string {
    return `
      Welcome to {{companyName}}!

      Hi {{firstName}},

      We're excited to have you join our health coverage program! To get started with your personalized health journey, please activate your account using the secure link below:

      {{activationLink}}

      This link expires in 24 hours.

      What happens next?
      • Complete your 7-day onboarding journey
      • Set up your profile and preferences
      • Upload required documents
      • Discover personalized benefits and features

      If you didn't request this activation, please contact our support team.

      © 2024 {{companyName}}. All rights reserved.
    `;
  }

  private getWelcomeEmailTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; font-size: 28px; margin: 0;">🎉 Account Activated!</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">Let's start your health journey</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Congratulations, {{firstName}}!</h2>
          <p style="font-size: 16px;">Your account is now active and ready to use! It's time to begin your personalized 7-day onboarding journey.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{{day1Link}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
            Start Day 1 Tasks
          </a>
        </div>

        <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: bold;">Today you'll:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Complete your personal profile</li>
            <li>Upload your government ID</li>
            <li>Set up emergency contacts</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>Need help? Our support team is here for you.</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailTextTemplate(): string {
    return `
      🎉 Account Activated!

      Congratulations, {{firstName}}!

      Your account is now active and ready to use! It's time to begin your personalized 7-day onboarding journey.

      Start Day 1 Tasks: {{day1Link}}

      Today you'll:
      • Complete your personal profile
      • Upload your government ID
      • Set up emergency contacts

      Need help? Our support team is here for you.

      © 2024 {{companyName}}. All rights reserved.
    `;
  }

  private getDay1ReminderTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; font-size: 28px; margin: 0;">⏰ Don't Miss Out!</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">Your Day 1 tasks are waiting</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hi {{firstName}},</h2>
          <p style="font-size: 16px;">We noticed you haven't completed your Day 1 onboarding tasks yet. Getting started today will help you make the most of your {{companyName}} benefits!</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{{day1Link}}" style="background: #ffc107; color: #212529; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
            Complete Day 1 Tasks
          </a>
        </div>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: bold;">Quick reminder of today's tasks:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>✓ Set up your profile (2 min)</li>
            <li>✓ Upload government ID (3 min)</li>
            <li>✓ Add emergency contacts (2 min)</li>
          </ul>
          <p style="margin-top: 10px; font-style: italic;">Total time: Less than 10 minutes</p>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>Questions? We're here to help!</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getDay1ReminderTextTemplate(): string {
    return `
      ⏰ Don't Miss Out!

      Hi {{firstName}},

      We noticed you haven't completed your Day 1 onboarding tasks yet. Getting started today will help you make the most of your {{companyName}} benefits!

      Complete Day 1 Tasks: {{day1Link}}

      Quick reminder of today's tasks:
      ✓ Set up your profile (2 min)
      ✓ Upload government ID (3 min)
      ✓ Add emergency contacts (2 min)

      Total time: Less than 10 minutes

      Questions? We're here to help!

      © 2024 {{companyName}}. All rights reserved.
    `;
  }

  private getDayProgressTemplate(day: number): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; font-size: 28px; margin: 0;">Day {{currentDay}} is Here!</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">Continue your health journey</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hi {{firstName}},</h2>
          <p style="font-size: 16px;">Welcome to Day {{currentDay}} of your onboarding journey! Today's tasks are designed to help you get the most out of your {{companyName}} coverage.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{{progressLink}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
            Start Day {{currentDay}} Tasks
          </a>
        </div>

        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: bold;">Today's focus areas:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            {{dayTasks}}
          </ul>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>Keep up the great work, {{firstName}}! 🌟</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getDayProgressTextTemplate(day: number): string {
    return `
      Day {{currentDay}} is Here!

      Hi {{firstName}},

      Welcome to Day {{currentDay}} of your onboarding journey! Today's tasks are designed to help you get the most out of your {{companyName}} coverage.

      Start Day {{currentDay}} Tasks: {{progressLink}}

      Today's focus areas:
      {{dayTasks}}

      Keep up the great work, {{firstName}}! 🌟

      © 2024 {{companyName}}. All rights reserved.
    `;
  }

  private getHalfwayMilestoneTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; font-size: 28px; margin: 0;">🎉 Halfway There!</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">You're on Day 4 of your journey</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Congratulations, {{firstName}}!</h2>
          <p style="font-size: 16px;">You've reached the halfway point of your onboarding journey! You've earned {{totalPoints}} points and are making excellent progress.</p>
        </div>

        <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: bold;">What you've accomplished so far:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>✓ Set up your complete profile</li>
            <li>✓ Uploaded important documents</li>
            <li>✓ Learned about your benefits</li>
            <li>✓ Earned {{totalPoints}} points!</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>The best is yet to come! Keep going! 💪</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getHalfwayMilestoneTextTemplate(): string {
    return `
      🎉 Halfway There!

      Congratulations, {{firstName}}!

      You've reached the halfway point of your onboarding journey! You're on Day 4 and have earned {{totalPoints}} points.

      What you've accomplished so far:
      ✓ Set up your complete profile
      ✓ Uploaded important documents
      ✓ Learned about your benefits
      ✓ Earned {{totalPoints}} points!

      The best is yet to come! Keep going! 💪

      © 2024 {{companyName}}. All rights reserved.
    `;
  }

  private getCompletionMilestoneTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; font-size: 32px; margin: 0;">🏆 Journey Complete!</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">You've finished onboarding!</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Amazing work, {{firstName}}!</h2>
          <p style="font-size: 16px;">You've successfully completed your entire onboarding journey! Here's what you accomplished:</p>
        </div>

        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: bold;">Your final stats:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>✅ Completed all 7 days of onboarding</li>
            <li>✅ Earned {{totalPoints}} total points</li>
            <li>✅ Maintained a {{streakDays}}-day streak</li>
            <li>✅ Unlocked all features and benefits</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <h3 style="color: #28a745; margin-bottom: 10px;">🎉 What's Next?</h3>
          <p style="font-size: 16px;">You now have full access to:</p>
          <ul style="text-align: left; display: inline-block; margin-top: 10px;">
            <li>Personalized recommendations</li>
            <li>Wellness programs and challenges</li>
            <li>Advanced benefits insights</li>
            <li>Priority support</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>Thank you for being an engaged member of {{companyName}}!</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getCompletionMilestoneTextTemplate(): string {
    return `
      🏆 Journey Complete!

      Amazing work, {{firstName}}!

      You've successfully completed your entire onboarding journey! Here's what you accomplished:

      Your final stats:
      ✅ Completed all 7 days of onboarding
      ✅ Earned {{totalPoints}} total points
      ✅ Maintained a {{streakDays}}-day streak
      ✅ Unlocked all features and benefits

      🎉 What's Next?
      You now have full access to:
      • Personalized recommendations
      • Wellness programs and challenges
      • Advanced benefits insights
      • Priority support

      Thank you for being an engaged member of {{companyName}}!

      © 2024 {{companyName}}. All rights reserved.
    `;
  }

  private getAchievementTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; font-size: 28px; margin: 0;">🏅 Achievement Unlocked!</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">Great job, {{firstName}}!</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
          <h2 style="color: #2c3e50; margin-top: 0;">{{achievementTitle}}</h2>
          <p style="font-size: 16px; font-style: italic;">{{achievementDescription}}</p>
          <div style="background: #28a745; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-top: 15px;">
            +{{pointsEarned}} Points Earned
          </div>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>Keep up the excellent work! More achievements await. 🌟</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getAchievementTextTemplate(): string {
    return `
      🏅 Achievement Unlocked!

      Great job, {{firstName}}!

      {{achievementTitle}}
      {{achievementDescription}}

      +{{pointsEarned}} Points Earned

      Keep up the excellent work! More achievements await. 🌟

      © 2024 {{companyName}}. All rights reserved.
    `;
  }

  private getEngagementReminderTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; font-size: 28px; margin: 0;">We Miss You! 👋</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">Your health journey continues</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hi {{firstName}},</h2>
          <p style="font-size: 16px;">It's been a little while since we've seen you. Your {{companyName}} health portal has new features and personalized insights waiting for you!</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{{dashboardLink}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
            Visit Your Dashboard
          </a>
        </div>

        <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: bold;">What you might be missing:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>New personalized recommendations</li>
            <li>Wellness challenges and programs</li>
            <li>Benefits optimization tips</li>
            <li>Health tracking and insights</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>Your health journey is important to us. Come back soon!</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getEngagementReminderTextTemplate(): string {
    return `
      We Miss You! 👋

      Hi {{firstName}},

      It's been a little while since we've seen you. Your {{companyName}} health portal has new features and personalized insights waiting for you!

      Visit Your Dashboard: {{dashboardLink}}

      What you might be missing:
      • New personalized recommendations
      • Wellness challenges and programs
      • Benefits optimization tips
      • Health tracking and insights

      Your health journey is important to us. Come back soon!

      © 2024 {{companyName}}. All rights reserved.
    `;
  }

  private getWellnessInvitationTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; font-size: 28px; margin: 0;">🌿 Wellness Awaits!</h1>
          <p style="color: rgba(44,62,80,0.9); font-size: 18px; margin: 10px 0 0 0;">Join our wellness program</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hi {{firstName}},</h2>
          <p style="font-size: 16px;">Congratulations on reaching Day 5! You've unlocked access to our exclusive wellness program designed to help you achieve your health goals.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{{wellnessLink}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
            Join Wellness Program
          </a>
        </div>

        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: bold;">Available rewards:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            {{availableRewards}}
          </ul>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>Take the next step in your health journey! 🌟</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getWellnessInvitationTextTemplate(): string {
    return `
      🌿 Wellness Awaits!

      Hi {{firstName}},

      Congratulations on reaching Day 5! You've unlocked access to our exclusive wellness program designed to help you achieve your health goals.

      Join Wellness Program: {{wellnessLink}}

      Available rewards:
      {{availableRewards}}

      Take the next step in your health journey! 🌟

      © 2024 {{companyName}}. All rights reserved.
    `;
  }

  private getDocumentReminderTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; font-size: 28px; margin: 0;">📋 Documents Needed</h1>
          <p style="color: rgba(44,62,80,0.9); font-size: 18px; margin: 10px 0 0 0;">Complete your setup</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hi {{firstName}},</h2>
          <p style="font-size: 16px;">To complete your account setup, we still need a few documents from you. This helps us provide you with the best possible service.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="{{documentsLink}}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
            Upload Documents
          </a>
        </div>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: bold;">Still needed:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            {{missingDocuments}}
          </ul>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>Need help uploading? Our support team is here for you!</p>
          <p>© 2024 {{companyName}}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getDocumentReminderTextTemplate(): string {
    return `
      📋 Documents Needed

      Hi {{firstName}},

      To complete your account setup, we still need a few documents from you. This helps us provide you with the best possible service.

      Upload Documents: {{documentsLink}}

      Still needed:
      {{missingDocuments}}

      Need help uploading? Our support team is here for you!

      © 2024 {{companyName}}. All rights reserved.
    `;
  }
}

// Singleton instance
export const emailTemplateSystem = new EmailTemplateSystem();

// Helper function to determine which emails to send based on triggers
export function getTemplatesForTrigger(trigger: string): EmailTemplate[] {
  return emailTemplateSystem.getAllTemplates().filter(template =>
    template.triggers.includes(trigger)
  );
}

// Template usage example
export const exampleUsage = {
  // Send activation email
  activationEmail: emailTemplateSystem.renderTemplate('member_activation', {
    member: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      companyName: 'Health Corp',
      activationLink: 'https://healthcorp.com/activate/abc123'
    }
  }),

  // Send achievement email
  achievementEmail: emailTemplateSystem.renderTemplate('achievement_unlocked', {
    member: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      companyName: 'Health Corp'
    },
    additionalData: {
      achievementTitle: 'Task Master',
      achievementDescription: 'Complete 10 tasks',
      pointsEarned: '40'
    }
  })
};