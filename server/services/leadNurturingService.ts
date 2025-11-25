import { db } from '../db.js';
import { eq, and, desc, sql, lt, gte, isNull } from 'drizzle-orm';
import {
  users,
  agents,
  leads,
  salesOpportunities,
  activities,
  notificationService,
  workflowAutomationService
} from '../../shared/schema.js';

export interface NurturingCampaign {
  id: string;
  name: string;
  description: string;
  targetAudience: {
    scoreTier?: string[];
    leadSource?: string[];
    industry?: string[];
    companySize?: {
      min?: number;
      max?: number;
    };
    customCriteria?: Record<string, any>;
  };
  triggers: {
    type: 'score_change' | 'time_based' | 'activity_based' | 'manual';
    conditions: Record<string, any>;
  }[];
  workflow: {
    steps: NurturingStep[];
    schedule: {
      type: 'immediate' | 'delayed' | 'conditional';
      settings: Record<string, any>;
    };
  };
  isActive: boolean;
  priority: number; // 1-10
  startDate?: Date;
  endDate?: Date;
  createdDate: Date;
  lastModified?: Date;
}

export interface NurturingStep {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'task' | 'delay' | 'condition' | 'webhook' | 'content_delivery';
  config: {
    content?: {
      subject?: string;
      body?: string;
      template?: string;
      personalization?: Record<string, any>;
    };
    delay?: {
      value: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks';
    };
    condition?: {
      field: string;
      operator: string;
      value: any;
      trueStep?: string;
      falseStep?: string;
    };
    task?: {
      title: string;
      description: string;
      assignedTo: string;
      priority: string;
    };
    webhook?: {
      url: string;
      method: string;
      payload: Record<string, any>;
    };
  };
  nextStep?: string;
  branching?: {
    conditions: Array<{
      condition: Record<string, any>;
      nextStep: string;
    }>;
    defaultNextStep: string;
  };
}

export interface NurturingExecution {
  id: string;
  campaignId: string;
  leadId: number;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  stepHistory: Array<{
    stepId: string;
    stepName: string;
    executedAt: Date;
    status: 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
  }>;
  variables: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt?: Date;
  pauseReason?: string;
  metadata: Record<string, any>;
}

export interface NurturingTemplate {
  id: string;
  name: string;
  category: 'welcome' | 'education' | 'engagement' | 're_engagement' | 'conversion' | 'retention';
  description: string;
  targetAudience: string;
  estimatedDuration: string;
  steps: NurturingStep[];
  tags: string[];
  isActive: boolean;
  industry?: string[];
  leadScoreMin?: number;
  leadScoreMax?: number;
}

export class LeadNurturingService {
  private campaigns: Map<string, NurturingCampaign> = new Map();
  private executions: Map<string, NurturingExecution> = new Map();
  private templates: Map<string, NurturingTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.startNurturingEngine();
  }

  private initializeDefaultTemplates() {
    // Welcome Series Template
    const welcomeSeriesTemplate: NurturingTemplate = {
      id: 'welcome_series',
      name: 'Insurance Welcome Series',
      category: 'welcome',
      description: 'Multi-touch welcome series for new leads introducing company and services',
      targetAudience: 'New leads within first 30 days',
      estimatedDuration: '2 weeks',
      tags: ['welcome', 'introduction', 'education'],
      isActive: true,
      leadScoreMin: 0,
      leadScoreMax: 40,
      steps: [
        {
          id: 'welcome_email_1',
          name: 'Immediate Welcome',
          type: 'email',
          config: {
            content: {
              subject: 'Welcome to {{company}} - Your Insurance Journey Starts Here',
              body: `Hi {{firstName}},

Thank you for your interest in our insurance solutions!

I'm {{agentName}}, your dedicated insurance specialist. I noticed you're exploring {{schemeInterest}} options, and I'm excited to help you find the perfect coverage for your needs.

Here's what makes us different:
✨ Personalized service from experienced agents
🛡️ Comprehensive coverage options
💰 Competitive pricing
📞 24/7 customer support

Next steps:
1. Review our getting started guide
2. Schedule a quick 15-minute consultation
3. Get personalized recommendations

Best regards,
{{agentName}}
{{agentTitle}}
{{company}}`,
              personalization: {
                agentName: 'assigned_agent.firstName',
                agentTitle: 'Agent',
                company: 'company_name'
              }
            }
          },
          nextStep: 'educational_content_1'
        },
        {
          id: 'delay_1',
          name: 'Wait 2 Days',
          type: 'delay',
          config: {
            delay: { value: 2, unit: 'days' }
          },
          nextStep: 'educational_content_1'
        },
        {
          id: 'educational_content_1',
          name: 'Educational Content - Insurance Basics',
          type: 'email',
          config: {
            content: {
              subject: 'Understanding Your Insurance Options - {{company}}',
              body: `Hi {{firstName},

Following up on our welcome, I wanted to share some valuable information about insurance options that might benefit you:

Key Considerations for {{memberType}} Coverage:
• Coverage limits and what they mean
• Deductibles vs. premiums
• Network providers and accessibility
• Additional benefits and riders
• Family vs. individual coverage options

Quick Question: What's your biggest concern when it comes to insurance - cost, coverage, or complexity?

Resources for You:
• Insurance 101 Guide
• Coverage Calculator
• FAQ Section
• Customer Testimonials

Let me know if any specific questions come up as you review this information. I'm here to help make insurance simple and clear for you!

Best,
{{agentName}}`
            }
          },
          nextStep: 'engagement_check_1'
        },
        {
          id: 'delay_2',
          name: 'Wait 3 Days',
          type: 'delay',
          config: {
            delay: { value: 3, unit: 'days' }
          },
          nextStep: 'engagement_check_1'
        },
        {
          id: 'engagement_check_1',
          name: 'Engagement Check',
          type: 'condition',
          config: {
            condition: {
              field: 'activities.email_opens',
              operator: 'greater_than',
              value: 0
            },
            trueStep: 'personalized_followup',
            falseStep: 're_engagement_1'
          },
          branching: {
            conditions: [
              {
                condition: { field: 'activities.email_clicks', operator: 'greater_than', value: 2 },
                nextStep: 'personalized_followup'
              },
              {
                condition: { field: 'activities.website_visits', operator: 'greater_than', value: 1 },
                nextStep: 'personalized_followup'
              }
            ],
            defaultNextStep: 're_engagement_1'
          }
        },
        {
          id: 're_engagement_1',
          name: 'Re-engagement Email',
          type: 'email',
          config: {
            content: {
              subject: 'Still exploring insurance options? {{company}}',
              body: `Hi {{firstName},

I noticed you haven't had a chance to review our insurance information yet. No worries - life gets busy!

I wanted to make sure you have everything you need to make an informed decision about your coverage. Sometimes a quick conversation can save hours of research.

Quick ways I can help:
• 15-minute call to discuss your specific needs
• Personalized quote based on your situation
• Comparison of different coverage options
• Answers to any insurance questions you have

Would you be open to a brief chat this week? I promise to make it as painless as possible!

Here's that getting started guide again if you prefer to review on your own:
[Link to Getting Started Guide]

Best,
{{agentName}}`
            }
          },
          nextStep: 'task_creation_1'
        },
        {
          id: 'personalized_followup',
          name: 'Personalized Follow-up',
          type: 'task',
          config: {
            task: {
              title: 'Personalized follow-up with {{firstName}} {{lastName}}',
              description: 'Lead has shown engagement. Prepare personalized recommendations based on their {{schemeInterest}} interest and {{company}}.',
              assignedTo: 'lead_owner',
              priority: 'medium'
            }
          },
          nextStep: 'final_step'
        },
        {
          id: 'task_creation_1',
          name: 'Create Follow-up Task',
          type: 'task',
          config: {
            task: {
              title: 'Follow up with {{firstName}} {{lastName}} - Re-engagement',
              description: 'Lead needs re-engagement. Try different approach or channel.',
              assignedTo: 'lead_owner',
              priority: 'low'
            }
          },
          nextStep: 'final_step'
        },
        {
          id: 'final_step',
          name: 'Campaign Complete',
          type: 'delay',
          config: {
            delay: { value: 0, unit: 'minutes' }
          }
        }
      ]
    };

    // Hot Lead Acceleration Template
    const hotLeadTemplate: NurturingTemplate = {
      id: 'hot_lead_acceleration',
      name: 'Hot Lead Acceleration',
      category: 'conversion',
      description: 'Accelerated nurturing for high-scoring leads to drive quick conversion',
      targetAudience: 'Hot leads (score 80+) showing high engagement',
      estimatedDuration: '1 week',
      tags: ['hot', 'acceleration', 'conversion', 'priority'],
      isActive: true,
      leadScoreMin: 80,
      leadScoreMax: 100,
      steps: [
        {
          id: 'hot_notification',
          name: 'Hot Lead Alert',
          type: 'task',
          config: {
            task: {
              title: '🔥 HOT LEAD: {{firstName}} {{lastName}} - {{company}}',
              description: 'Lead scored {{leadScore}} points! Immediate follow-up recommended. Has shown strong buying signals: {{buyingSignals}}',
              assignedTo: 'lead_owner',
              priority: 'high'
            }
          },
          nextStep: 'priority_email'
        },
        {
          id: 'priority_email',
          name: 'Priority Outreach Email',
          type: 'email',
          config: {
            content: {
              subject: 'URGENT: Custom Insurance Quote for {{company}}',
              body: `Hi {{firstName},

I hope this email finds you well. Based on your recent activities and requirements, I've prepared a priority insurance quote for {{company}}.

Quick Summary:
• Coverage: {{estimatedCoverage}} currency units
• Premium Range: {{estimatedPremium}} per annum
• Special Considerations: {{specialNotes}}
• Available Discounts: {{availableDiscounts}}

I have availability today and tomorrow to discuss this quote in detail. Given your timeline, I recommend we connect as soon as possible.

Time slots available:
• Today: 2:00 PM, 3:30 PM, 5:00 PM
• Tomorrow: 10:00 AM, 11:30 AM, 2:00 PM

Which time works best for you?

Best regards,
{{agentName}}
Priority Client Manager`
            }
          },
          nextStep: 'sms_followup'
        },
        {
          id: 'sms_followup',
          name: 'SMS Follow-up',
          type: 'delay',
          config: {
            delay: { value: 2, unit: 'hours' }
          },
          nextStep: 'send_sms'
        },
        {
          id: 'send_sms',
          name: 'Send SMS',
          type: 'sms',
          config: {
            content: {
              body: 'Hi {{firstName}} from {{company}}. I\'ve sent your priority insurance quote. When can we connect? {{agentPhone}}'
            }
          },
          nextStep: 'conversion_task'
        },
        {
          id: 'conversion_task',
          name: 'Conversion Task',
          type: 'task',
          config: {
            task: {
              title: 'Complete conversion for {{firstName}} {{lastName}}',
              description: 'Hot lead follow-up complete. Focus on closing the deal within 48 hours.',
              assignedTo: 'lead_owner',
              priority: 'high'
            }
          },
          nextStep: 'final_step'
        },
        {
          id: 'final_step',
          name: 'Campaign Complete',
          type: 'delay',
          config: {
            delay: { value: 0, unit: 'minutes' }
          }
        }
      ]
    };

    this.templates.set(welcomeSeriesTemplate.id, welcomeSeriesTemplate);
    this.templates.set(hotLeadTemplate.id, hotLeadTemplate);
  }

  private startNurturingEngine() {
    // Process active nurturing executions every 30 minutes
    setInterval(async () => {
      await this.processActiveNurturing();
    }, 30 * 60 * 1000);

    // Check for new leads that should start nurturing every hour
    setInterval(async () => {
      await this.checkForNewLeads();
    }, 60 * 60 * 1000);

    // Cleanup old completed executions daily
    setInterval(async () => {
      await this.cleanupOldExecutions();
    }, 24 * 60 * 60 * 1000);

    console.log('Lead nurturing service started');
  }

  async createCampaign(campaign: Omit<NurturingCampaign, 'id' | 'createdDate'>): Promise<{ success: boolean; campaign?: NurturingCampaign; error?: string }> {
    try {
      const newCampaign: NurturingCampaign = {
        ...campaign,
        id: `campaign_${Date.now()}`,
        createdDate: new Date()
      };

      this.campaigns.set(newCampaign.id, newCampaign);

      // Check if any existing leads match this campaign
      await this.checkCampaignMatches(newCampaign);

      return { success: true, campaign: newCampaign };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async startNurturing(campaignId: string, leadId: number, initialVariables: Record<string, any> = {}): Promise<{ success: boolean; execution?: NurturingExecution; error?: string }> {
    try {
      const campaign = this.campaigns.get(campaignId);
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      // Check if lead is already in an active campaign
      const existingExecution = Array.from(this.executions.values())
        .find(exec => exec.leadId === leadId && exec.status === 'active');

      if (existingExecution) {
        return { success: false, error: 'Lead already in active nurturing campaign' };
      }

      const execution: NurturingExecution = {
        id: `execution_${Date.now()}_${leadId}`,
        campaignId,
        leadId,
        status: 'active',
        currentStep: 0,
        stepHistory: [],
        variables: initialVariables,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        metadata: {
          campaignName: campaign.name,
          campaignPriority: campaign.priority
        }
      };

      this.executions.set(execution.id, execution);

      // Start the first step immediately
      await this.executeNextStep(execution);

      return { success: true, execution };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async executeNextStep(execution: NurturingExecution) {
    try {
      const campaign = this.campaigns.get(execution.campaignId);
      if (!campaign) {
        await this.failExecution(execution.id, 'Campaign not found');
        return;
      }

      if (execution.currentStep >= campaign.workflow.steps.length) {
        await this.completeExecution(execution.id);
        return;
      }

      const step = campaign.workflow.steps[execution.currentStep];
      const leadData = await this.getLeadData(execution.leadId);
      if (!leadData) {
        await this.failExecution(execution.id, 'Lead not found');
        return;
      }

      // Merge execution variables with lead data
      const variables = { ...execution.variables, ...leadData };

      const result = await this.executeStep(step, execution, variables);

      // Record step execution
      execution.stepHistory.push({
        stepId: step.id,
        stepName: step.name,
        executedAt: new Date(),
        status: result.success ? 'completed' : 'failed',
        result: result.data,
        error: result.error
      });

      execution.lastActivityAt = new Date();

      if (result.success) {
        // Determine next step
        let nextStepIndex = execution.currentStep + 1;

        if (step.type === 'condition' && result.data?.nextStep) {
          // Find the index of the next step by ID
          const nextStepIndexById = campaign.workflow.steps.findIndex(s => s.id === result.data.nextStep);
          if (nextStepIndexById !== -1) {
            nextStepIndex = nextStepIndexById;
          }
        } else if (step.nextStep) {
          // Find the index of the specified next step
          const nextStepIndexById = campaign.workflow.steps.findIndex(s => s.id === step.nextStep);
          if (nextStepIndexById !== -1) {
            nextStepIndex = nextStepIndexById;
          }
        }

        execution.currentStep = nextStepIndex;

        // Check if campaign is complete
        if (execution.currentStep >= campaign.workflow.steps.length) {
          await this.completeExecution(execution.id);
        } else {
          // Schedule next step based on delay settings
          await this.scheduleNextStep(execution, campaign.workflow.steps[execution.currentStep]);
        }
      } else {
        await this.failExecution(execution.id, result.error || 'Step execution failed');
      }

    } catch (error) {
      console.error('Error executing next step:', error);
      await this.failExecution(execution.id, error.message);
    }
  }

  private async executeStep(step: NurturingStep, execution: NurturingExecution, variables: Record<string, any>) {
    try {
      switch (step.type) {
        case 'email':
          return await this.executeEmailStep(step, execution, variables);
        case 'sms':
          return await this.executeSmsStep(step, execution, variables);
        case 'task':
          return await this.executeTaskStep(step, execution, variables);
        case 'delay':
          return await this.executeDelayStep(step, execution, variables);
        case 'condition':
          return await this.executeConditionStep(step, execution, variables);
        case 'webhook':
          return await this.executeWebhookStep(step, execution, variables);
        case 'content_delivery':
          return await this.executeContentStep(step, execution, variables);
        default:
          return { success: false, error: `Unknown step type: ${step.type}` };
      }
    } catch (error) {
      console.error('Error executing step:', error);
      return { success: false, error: error.message };
    }
  }

  private async executeEmailStep(step: NurturingStep, execution: NurturingExecution, variables: Record<string, any>) {
    try {
      const { content } = step.config;
      if (!content?.subject && !content?.template) {
        return { success: false, error: 'Email content or template required' };
      }

      // Personalize the content
      const subject = this.personalizeContent(content.subject || '', variables);
      const body = this.personalizeContent(content.body || '', variables);

      // Get lead's email
      const [lead] = await db.select({ email: leads.email })
        .from(leads)
        .where(eq(leads.id, execution.leadId));

      if (!lead?.email) {
        return { success: false, error: 'Lead email not found' };
      }

      // Send notification (in production, this would use the email service)
      await notificationService.sendNotification({
        recipientId: execution.leadId,
        recipientType: 'lead',
        type: 'email',
        channel: 'email',
        subject,
        message: body,
        priority: 'medium',
        data: {
          campaignId: execution.campaignId,
          executionId: execution.id,
          stepId: step.id,
          variables
        }
      });

      return { success: true, data: { sent: true, recipient: lead.email } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async executeSmsStep(step: NurturingStep, execution: NurturingExecution, variables: Record<string, any>) {
    try {
      const { content } = step.config;
      if (!content?.body) {
        return { success: false, error: 'SMS content required' };
      }

      const message = this.personalizeContent(content.body, variables);

      // Get lead's phone
      const [lead] = await db.select({ phone: leads.phone })
        .from(leads)
        .where(eq(leads.id, execution.leadId));

      if (!lead?.phone) {
        return { success: false, error: 'Lead phone not found' };
      }

      await notificationService.sendNotification({
        recipientId: execution.leadId,
        recipientType: 'lead',
        type: 'sms',
        channel: 'sms',
        message,
        priority: 'medium',
        data: {
          campaignId: execution.campaignId,
          executionId: execution.id,
          stepId: step.id,
          variables
        }
      });

      return { success: true, data: { sent: true, recipient: lead.phone } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async executeTaskStep(step: NurturingStep, execution: NurturingExecution, variables: Record<string, any>) {
    try {
      const { task } = step.config;
      if (!task) {
        return { success: false, error: 'Task configuration required' };
      }

      const title = this.personalizeContent(task.title, variables);
      const description = this.personalizeContent(task.description, variables);

      // Create the task using task automation service
      const taskResult = await workflowAutomationService.triggerWorkflow(
        'task_creation_workflow', // This would be a predefined workflow
        1, // System user
        undefined,
        undefined,
        {
          taskTitle: title,
          taskDescription: description,
          assignedTo: task.assignedTo,
          priority: task.priority,
          leadId: execution.leadId,
          campaignId: execution.campaignId
        }
      );

      return { success: true, data: { taskCreated: true, taskId: taskResult.execution?.id } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async executeDelayStep(step: NurturingStep, execution: NurturingExecution, variables: Record<string, any>) {
    try {
      const { delay } = step.config;
      if (!delay) {
        return { success: true, data: { noDelay: true } };
      }

      // Delay is handled at the scheduling level
      return { success: true, data: { delayed: true, duration: delay } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async executeConditionStep(step: NurturingStep, execution: NurturingExecution, variables: Record<string, any>) {
    try {
      const { condition } = step.config;
      if (!condition) {
        return { success: false, error: 'Condition configuration required' };
      }

      const result = this.evaluateCondition(condition, variables);
      const nextStep = result ? condition.trueStep : condition.falseStep;

      return { success: true, data: { conditionMet: result, nextStep } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async executeWebhookStep(step: NurturingStep, execution: NurturingExecution, variables: Record<string, any>) {
    try {
      const { webhook } = step.config;
      if (!webhook?.url) {
        return { success: false, error: 'Webhook URL required' };
      }

      const payload = {
        ...webhook.payload,
        ...variables,
        executionId: execution.id,
        campaignId: execution.campaignId,
        leadId: execution.leadId
      };

      const response = await fetch(webhook.url, {
        method: webhook.method || 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const success = response.ok;
      const data = await response.text();

      return { success, data: { webhookCalled: true, response: data, status: response.status } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async executeContentStep(step: NurturingStep, execution: NurturingExecution, variables: Record<string, any>) {
    try {
      const { content } = step.config;
      if (!content) {
        return { success: false, error: 'Content configuration required' };
      }

      // This would deliver content (PDFs, guides, etc.) to the lead
      return { success: true, data: { contentDelivered: true, content } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private personalizeContent(template: string, variables: Record<string, any>): string {
    if (!template) return '';

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], variables);
      return value !== undefined ? String(value) : match;
    });
  }

  private evaluateCondition(condition: any, variables: Record<string, any>): boolean {
    try {
      const fieldValue = condition.field.split('.').reduce((obj, key) => obj?.[key], variables);
      const value = condition.value;

      switch (condition.operator) {
        case 'equals':
          return fieldValue === value;
        case 'not_equals':
          return fieldValue !== value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
        case 'greater_than':
          return Number(fieldValue) > Number(value);
        case 'less_than':
          return Number(fieldValue) < Number(value);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  private async getLeadData(leadId: number) {
    try {
      const [lead] = await db.select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        company: leads.company,
        jobTitle: leads.jobTitle,
        score: leads.score,
        scoreTier: leads.scoreTier,
        schemeInterest: leads.schemeInterest,
        estimatedCoverage: leads.estimatedCoverage,
        estimatedPremium: leads.estimatedPremium,
        status: leads.status,
        assignedAgentId: leads.assignedAgentId,
        createdAt: leads.createdAt,
        lastScored: leads.lastScored,
        // Get agent info
        agentFirstName: agents.firstName,
        agentLastName: agents.lastName,
        agentTitle: sql`'Agent'`,
        agentPhone: agents.phoneNumber
      })
      .from(leads)
      .leftJoin(agents, eq(leads.assignedAgentId, agents.id))
      .where(eq(leads.id, leadId));

      if (!lead) return null;

      // Get activity counts
      const [activityCounts] = await db.select({
        emailOpens: sql<number>`SUM(CASE WHEN ${activities.activityType} = 'email' THEN 1 ELSE 0 END)`,
        emailClicks: sql<number>`SUM(CASE WHEN ${activities.subject} ILIKE '%click%' THEN 1 ELSE 0 END)`,
        websiteVisits: sql<number>`SUM(CASE WHEN ${activities.activityType} = 'website' THEN 1 ELSE 0 END)`,
        calls: sql<number>`SUM(CASE WHEN ${activities.activityType} = 'call' THEN 1 ELSE 0 END)`,
        meetings: sql<number>`SUM(CASE WHEN ${activities.activityType} = 'meeting' THEN 1 ELSE 0 END)`
      })
      .from(activities)
      .where(eq(activities.leadId, leadId))
      .groupBy(activities.leadId);

      // Calculate buying signals
      const buyingSignals = [];
      if (lead.score >= 80) buyingSignals.push('High lead score');
      if (activityCounts?.websiteVisits > 2) buyingSignals.push('Multiple website visits');
      if (activityCounts?.meetings > 0) buyingSignals.push('Meeting scheduled');
      if (lead.estimatedCoverage > 0) buyingSignals.push('Coverage amount specified');
      if (lead.timeline?.includes('immediate')) buyingSignals.push('Urgent timeline');

      return {
        ...lead,
        agentName: lead.agentFirstName ? `${lead.agentFirstName} ${lead.agentLastName}` : 'Your Account Manager',
        activities: activityCounts || {},
        buyingSignals: buyingSignals.join(', '),
        lastActivity: Math.max(
          activityCounts?.emailOpens || 0,
          activityCounts?.websiteVisits || 0,
          activityCounts?.calls || 0,
          activityCounts?.meetings || 0
        ) > 0
      };
    } catch (error) {
      console.error('Error getting lead data:', error);
      return null;
    }
  }

  private async scheduleNextStep(execution: NurturingExecution, nextStep: NurturingStep) {
    try {
      if (nextStep.type === 'delay') {
        const delayMs = this.parseDelay(nextStep.config.delay);
        setTimeout(async () => {
          execution.currentStep++;
          await this.executeNextStep(execution);
        }, delayMs);
      } else {
        // Execute immediately
        execution.currentStep++;
        await this.executeNextStep(execution);
      }
    } catch (error) {
      console.error('Error scheduling next step:', error);
      await this.failExecution(execution.id, error.message);
    }
  }

  private parseDelay(delay: { value: number; unit: string }): number {
    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000
    };
    return delay.value * (multipliers[delay.unit as keyof typeof multipliers] || 0);
  }

  private async completeExecution(executionId: string) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'completed';
    execution.completedAt = new Date();

    // Trigger completion workflow
    await this.triggerCompletionWorkflow(execution);

    console.log(`Nurturing execution ${executionId} completed for lead ${execution.leadId}`);
  }

  private async failExecution(executionId: string, error: string) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.lastActivityAt = new Date();
    // Store error in metadata
    execution.metadata.lastError = error;

    console.error(`Nurturing execution ${executionId} failed: ${error}`);
  }

  private async triggerCompletionWorkflow(execution: NurturingExecution) {
    try {
      const campaign = this.campaigns.get(execution.campaignId);
      if (!campaign) return;

      // Trigger workflow automation for campaign completion
      await workflowAutomationService.triggerWorkflow(
        'nurturing_completion_workflow',
        1, // System user
        execution.id,
        'nurturing_execution',
        {
          campaignId: execution.campaignId,
          campaignName: campaign.name,
          leadId: execution.leadId,
          totalSteps: execution.stepHistory.length,
          completedAt: execution.completedAt,
          variables: execution.variables
        }
      );
    } catch (error) {
      console.error('Error triggering completion workflow:', error);
    }
  }

  private async processActiveNurturing() {
    try {
      const activeExecutions = Array.from(this.executions.values())
        .filter(exec => exec.status === 'active');

      for (const execution of activeExecutions) {
        // Check if execution has been inactive too long (24 hours)
        const hoursSinceLastActivity = (Date.now() - execution.lastActivityAt!.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastActivity > 24) {
          execution.status = 'paused';
          execution.pauseReason = 'Inactivity timeout';
        }
      }
    } catch (error) {
      console.error('Error processing active nurturing:', error);
    }
  }

  private async checkForNewLeads() {
    try {
      // Get new leads from the last hour
      const newLeads = await db.select()
        .from(leads)
        .where(sql`${leads.createdAt} >= NOW() - INTERVAL '1 hour' AND ${leads.score} IS NOT NULL`);

      for (const lead of newLeads) {
        // Check if lead matches any active campaigns
        await this.checkLeadCampaignMatches(lead);
      }
    } catch (error) {
      console.error('Error checking for new leads:', error);
    }
  }

  private async checkLeadCampaignMatches(lead: any) {
    try {
      const activeCampaigns = Array.from(this.campaigns.values())
        .filter(campaign => campaign.isActive);

      for (const campaign of activeCampaigns) {
        if (this.leadMatchesCampaign(lead, campaign)) {
          await this.startNurturing(campaign.id, lead.id, {
            leadSource: lead.leadSource,
            score: lead.score,
            scoreTier: lead.scoreTier,
            company: lead.company
          });
          break; // Only start one campaign per lead
        }
      }
    } catch (error) {
      console.error('Error checking lead campaign matches:', error);
    }
  }

  private leadMatchesCampaign(lead: any, campaign: NurturingCampaign): boolean {
    const { targetAudience } = campaign;

    // Check score tier
    if (targetAudience.scoreTier && targetAudience.scoreTier.length > 0) {
      if (!targetAudience.scoreTier.includes(lead.scoreTier)) {
        return false;
      }
    }

    // Check lead source
    if (targetAudience.leadSource && targetAudience.leadSource.length > 0) {
      if (!targetAudience.leadSource.includes(lead.leadSource)) {
        return false;
      }
    }

    // Check lead score range
    if (targetAudience.scoreRange) {
      const { min, max } = targetAudience.scoreRange;
      if (min !== undefined && lead.score < min) return false;
      if (max !== undefined && lead.score > max) return false;
    }

    return true;
  }

  private async checkCampaignMatches(campaign: NurturingCampaign) {
    try {
      // Get leads that match the campaign criteria
      const leads = await db.select()
        .from(leads)
        .where(sql`${leads.score} IS NOT NULL AND ${leads.status} = 'active'`);

      for (const lead of leads) {
        if (this.leadMatchesCampaign(lead, campaign)) {
          // Check if lead is already in an active campaign
          const existingExecution = Array.from(this.executions.values())
            .find(exec => exec.leadId === lead.id && exec.status === 'active');

          if (!existingExecution) {
            await this.startNurturing(campaign.id, lead.id, {
              leadSource: lead.leadSource,
              score: lead.score,
              scoreTier: lead.scoreTier,
              company: lead.company
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking campaign matches:', error);
    }
  }

  private async cleanupOldExecutions() {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      const executionsToDelete = Array.from(this.executions.entries())
        .filter(([id, exec]) =>
          exec.status === 'completed' &&
          exec.completedAt &&
          exec.completedAt < cutoffDate
        );

      for (const [id] of executionsToDelete) {
        this.executions.delete(id);
      }

      console.log(`Cleaned up ${executionsToDelete.length} old nurturing executions`);
    } catch (error) {
      console.error('Error cleaning up old executions:', error);
    }
  }

  // Public API methods
  async pauseExecution(executionId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const execution = this.executions.get(executionId);
      if (!execution) {
        return { success: false, error: 'Execution not found' };
      }

      execution.status = 'paused';
      execution.pauseReason = reason;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resumeExecution(executionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const execution = this.executions.get(executionId);
      if (!execution) {
        return { success: false, error: 'Execution not found' };
      }

      if (execution.status !== 'paused') {
        return { success: false, error: 'Execution is not paused' };
      }

      execution.status = 'active';
      execution.pauseReason = undefined;
      execution.lastActivityAt = new Date();

      // Continue from current step
      await this.executeNextStep(execution);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cancelExecution(executionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const execution = this.executions.get(executionId);
      if (!execution) {
        return { success: false, error: 'Execution not found' };
      }

      execution.status = 'cancelled';
      execution.lastActivityAt = new Date();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getExecutions(filters: {
    campaignId?: string;
    leadId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      let executions = Array.from(this.executions.values());

      if (filters.campaignId) {
        executions = executions.filter(exec => exec.campaignId === filters.campaignId);
      }

      if (filters.leadId) {
        executions = executions.filter(exec => exec.leadId === filters.leadId);
      }

      if (filters.status) {
        executions = executions.filter(exec => exec.status === filters.status);
      }

      // Sort by last activity (most recent first)
      executions.sort((a, b) => b.lastActivityAt!.getTime() - a.lastActivityAt!.getTime());

      // Apply pagination
      if (filters.offset) {
        executions = executions.slice(filters.offset);
      }
      if (filters.limit) {
        executions = executions.slice(0, filters.limit);
      }

      return { success: true, data: executions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCampaigns(): Promise<NurturingCampaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getCampaign(id: string): Promise<NurturingCampaign | null> {
    return this.campaigns.get(id) || null;
  }

  async getTemplates(): Promise<NurturingTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<NurturingTemplate | null> {
    return this.templates.get(id) || null;
  }

  async getNurturingAnalytics() {
    try {
      const executions = Array.from(this.executions.values());
      const campaigns = Array.from(this.campaigns.values());

      const activeExecutions = executions.filter(exec => exec.status === 'active').length;
      const completedExecutions = executions.filter(exec => exec.status === 'completed').length;
      const failedExecutions = executions.filter(exec => exec.status === 'failed').length;
      const pausedExecutions = executions.filter(exec => exec.status === 'paused').length;

      // Campaign performance
      const campaignPerformance = campaigns.map(campaign => {
        const campaignExecutions = executions.filter(exec => exec.campaignId === campaign.id);
        const completed = campaignExecutions.filter(exec => exec.status === 'completed').length;
        const active = campaignExecutions.filter(exec => exec.status === 'active').length;

        return {
          id: campaign.id,
          name: campaign.name,
          totalExecutions: campaignExecutions.length,
          completed,
          active,
          conversionRate: campaignExecutions.length > 0 ? (completed / campaignExecutions.length) * 100 : 0
        };
      });

      // Recent activity
      const recentActivity = executions
        .filter(exec => exec.lastActivityAt && exec.lastActivityAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .sort((a, b) => b.lastActivityAt!.getTime() - a.lastActivityAt!.getTime())
        .slice(0, 10);

      return {
        success: true,
        data: {
          summary: {
            totalCampaigns: campaigns.length,
            totalExecutions: executions.length,
            activeExecutions,
            completedExecutions,
            failedExecutions,
            pausedExecutions
          },
          campaignPerformance,
          recentActivity
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const leadNurturingService = new LeadNurturingService();