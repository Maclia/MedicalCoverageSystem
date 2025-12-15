import { db } from '../db.js';
import { eq, and, desc, sql, lt, gte, isNull } from 'drizzle-orm';
import {
  users,
  agents,
  leads,
  salesOpportunities,
  tasks,
  insertTaskSchema
} from '../../shared/schema.js';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'follow_up' | 'documentation' | 'meeting' | 'call' | 'email' | 'review' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: number; // in minutes
  checklist: string[];
  autoAssignTo: 'lead_owner' | 'opportunity_owner' | 'team_lead' | 'specific_role';
  dueDateOffset: {
    value: number;
    unit: 'hours' | 'days' | 'weeks';
    from: 'created' | 'updated' | 'stage_change' | 'custom_date';
  };
  dependencies: string[]; // Other task templates that must be completed first
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    interval: number;
    endDate?: Date;
  };
}

export interface TaskAutomationRule {
  id: string;
  name: string;
  description: string;
  triggerType: 'event' | 'schedule' | 'condition';
  triggerConditions: Record<string, any>;
  actionType: 'create_task' | 'update_task' | 'assign_task' | 'escalate_task';
  taskTemplateId: string;
  isActive: boolean;
  conditions: {
    field: string;
    operator: string;
    value: any;
  }[];
  actions: {
    type: string;
    parameters: Record<string, any>;
  }[];
}

export interface TaskAssignment {
  taskId: string;
  assignedTo: number;
  assignedToType: 'user' | 'agent';
  assignedBy: number;
  assignedAt: Date;
  priority: string;
  dueDate?: Date;
  estimatedHours?: number;
  notes?: string;
}

export interface TaskEscalation {
  taskId: string;
  escalationLevel: number;
  escalatedTo: number;
  escalatedToType: 'user' | 'agent';
  escalatedAt: Date;
  reason: string;
  previousAssignee?: number;
}

export class TaskAutomationService {
  private taskTemplates: Map<string, TaskTemplate> = new Map();
  private automationRules: Map<string, TaskAutomationRule> = new Map();

  constructor() {
    this.initializeTaskTemplates();
    this.initializeAutomationRules();
    this.startAutomationEngine();
  }

  private initializeTaskTemplates() {
    // Initialize default task templates
    const defaultTemplates: TaskTemplate[] = [
      {
        id: 'lead_initial_followup',
        name: 'Initial Lead Follow-up',
        description: 'Make first contact with new lead',
        category: 'follow_up',
        priority: 'high',
        estimatedDuration: 15,
        checklist: [
          'Review lead information and source',
          'Research company and contact person',
          'Prepare personalized talking points',
          'Make initial call or send email',
          'Log communication and next steps'
        ],
        autoAssignTo: 'lead_owner',
        dueDateOffset: {
          value: 1,
          unit: 'hours',
          from: 'created'
        }
      },
      {
        id: 'opportunity_qualification',
        name: 'Opportunity Qualification',
        description: 'Qualify opportunity and assess fit',
        category: 'review',
        priority: 'high',
        estimatedDuration: 30,
        checklist: [
          'Review opportunity details and requirements',
          'Check budget and timeline',
          'Assess decision-making process',
          'Verify technical requirements',
          'Determine next steps in sales process'
        ],
        autoAssignTo: 'opportunity_owner',
        dueDateOffset: {
          value: 2,
          unit: 'hours',
          from: 'stage_change'
        }
      },
      {
        id: 'proposal_followup',
        name: 'Proposal Follow-up',
        description: 'Follow up on sent proposal',
        category: 'follow_up',
        priority: 'medium',
        estimatedDuration: 10,
        checklist: [
          'Confirm proposal receipt',
          'Address any questions or concerns',
          'Discuss timeline and next steps',
          'Schedule decision review meeting',
          'Update opportunity status'
        ],
        autoAssignTo: 'opportunity_owner',
        dueDateOffset: {
          value: 2,
          unit: 'days',
          from: 'updated'
        }
      },
      {
        id: 'renewal_prep_60_days',
        name: '60-Day Renewal Preparation',
        description: 'Begin preparation for policy renewal',
        category: 'review',
        priority: 'medium',
        estimatedDuration: 45,
        checklist: [
          'Review current policy and coverage',
          'Analyze usage and claims history',
          'Identify changes in client needs',
          'Prepare renewal quotes and options',
          'Schedule renewal discussion'
        ],
        autoAssignTo: 'lead_owner',
        dueDateOffset: {
          value: 60,
          unit: 'days',
          from: 'custom_date'
        }
      },
      {
        id: 'weekly_pipeline_review',
        name: 'Weekly Pipeline Review',
        description: 'Review and update sales pipeline',
        category: 'review',
        priority: 'medium',
        estimatedDuration: 60,
        checklist: [
          'Review all open salesOpportunities',
          'Update opportunity stages and values',
          'Identify stuck deals and blockers',
          'Plan follow-up activities for the week',
          'Update sales forecast'
        ],
        autoAssignTo: 'team_lead',
        dueDateOffset: {
          value: 1,
          unit: 'weeks',
          from: 'created'
        },
        recurringPattern: {
          frequency: 'weekly',
          interval: 1
        }
      }
    ];

    defaultTemplates.forEach(template => {
      this.taskTemplates.set(template.id, template);
    });
  }

  private initializeAutomationRules() {
    // Initialize default automation rules
    const defaultRules: TaskAutomationRule[] = [
      {
        id: 'new_lead_assignment',
        name: 'New Lead Task Assignment',
        description: 'Automatically assign follow-up tasks to new leads',
        triggerType: 'event',
        triggerConditions: {
          eventType: 'lead_created',
          conditions: []
        },
        actionType: 'create_task',
        taskTemplateId: 'lead_initial_followup',
        isActive: true,
        conditions: [],
        actions: [
          {
            type: 'assign_to_owner',
            parameters: {}
          },
          {
            type: 'set_due_date',
            parameters: {
              offset: 1,
              unit: 'hours'
            }
          }
        ]
      },
      {
        id: 'opportunity_stage_change',
        name: 'Opportunity Stage Change Tasks',
        description: 'Create tasks when opportunity stage changes',
        triggerType: 'event',
        triggerConditions: {
          eventType: 'opportunity_stage_changed',
          conditions: []
        },
        actionType: 'create_task',
        taskTemplateId: 'opportunity_qualification',
        isActive: true,
        conditions: [],
        actions: [
          {
            type: 'assign_to_owner',
            parameters: {}
          }
        ]
      },
      {
        id: 'task_escalation',
        name: 'Overdue Task Escalation',
        description: 'Escalate overdue tasks to team lead',
        triggerType: 'condition',
        triggerConditions: {
          checkType: 'daily',
          conditions: [
            { field: 'due_date', operator: 'less_than', value: 'now' },
            { field: 'status', operator: 'not_in', value: ['completed', 'cancelled'] }
          ]
        },
        actionType: 'escalate_task',
        taskTemplateId: '',
        isActive: true,
        conditions: [
          { field: 'is_overdue', operator: 'equals', value: true },
          { field: 'overdue_hours', operator: 'greater_than', value: 24 }
        ],
        actions: [
          {
            type: 'escalate_to_team_lead',
            parameters: {
              reason: 'Task overdue by more than 24 hours'
            }
          },
          {
            type: 'notify_assignee',
            parameters: {
              message: 'Your task has been escalated due to being overdue'
            }
          }
        ]
      }
    ];

    defaultRules.forEach(rule => {
      this.automationRules.set(rule.id, rule);
    });
  }

  private startAutomationEngine() {
    // Run automation checks every hour
    setInterval(async () => {
      await this.processScheduledAutomations();
    }, 60 * 60 * 1000);

    // Run overdue task checks every 6 hours
    setInterval(async () => {
      await this.processOverdueTaskEscalations();
    }, 6 * 60 * 60 * 1000);

    console.log('Task automation engine started');
  }

  async createTaskFromTemplate(templateId: string, entityData: {
    leadId?: number;
    opportunityId?: number;
    memberId?: number;
    assignedTo?: number;
    assignedToType?: 'user' | 'agent';
    customDueDate?: Date;
    customData?: Record<string, any>;
  }) {
    try {
      const template = this.taskTemplates.get(templateId);
      if (!template) {
        return { success: false, error: 'Task template not found' };
      }

      // Calculate due date
      let dueDate: Date | undefined;
      if (entityData.customDueDate) {
        dueDate = entityData.customDueDate;
      } else {
        dueDate = await this.calculateDueDate(template.dueDateOffset, entityData);
      }

      // Determine assignee
      let assignedTo = entityData.assignedTo;
      let assignedToType = entityData.assignedToType;

      if (!assignedTo) {
        const assignment = await this.determineAssignee(template.autoAssignTo, entityData);
        assignedTo = assignment.userId;
        assignedToType = assignment.userType;
      }

      // Create the task
      const [task] = await db.insert(tasks)
        .values({
          leadId: entityData.leadId || null,
          opportunityId: entityData.opportunityId || null,
          memberId: entityData.memberId || null,
          assignedTo,
          assignedToType: assignedToType || 'user',
          title: template.name,
          description: template.description,
          category: template.category,
          priority: template.priority,
          status: 'pending',
          dueDate,
          estimatedHours: Math.ceil(template.estimatedDuration / 60 * 10) / 10, // Convert to hours with 1 decimal
          checklist: JSON.stringify(template.checklist),
          tags: JSON.stringify([template.category, 'auto_generated']),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Send notification to assignee
      if (assignedTo) {
        await notificationService.sendNotification({
          recipientId: assignedTo,
          recipientType: assignedToType || 'user',
          type: 'in_app',
          channel: 'mobile_app',
          subject: `New Task Assigned: ${template.name}`,
          message: `You have been assigned a new task: ${template.description}`,
          priority: template.priority,
          data: {
            taskId: task.id,
            entityType: entityData.leadId ? 'lead' : entityData.opportunityId ? 'opportunity' : 'general',
            entityId: entityData.leadId || entityData.opportunityId,
            dueDate: dueDate?.toISOString()
          }
        });
      }

      // Trigger workflow if applicable
      await this.triggerTaskWorkflow(task, entityData);

      return { success: true, task };
    } catch (error) {
      console.error('Error creating task from template:', error);
      return { success: false, error: error.message };
    }
  }

  private async calculateDueDate(offset: TaskTemplate['dueDateOffset'], entityData: any): Promise<Date> {
    const now = new Date();
    let fromDate = now;

    switch (offset.from) {
      case 'created':
        fromDate = now;
        break;
      case 'updated':
        // Get entity updated date
        if (entityData.leadId) {
          const [lead] = await db.select({ updatedAt: leads.updatedAt })
            .from(leads)
            .where(eq(leads.id, entityData.leadId));
          if (lead) fromDate = lead.updatedAt;
        }
        break;
      case 'stage_change':
        // For salesOpportunities, get stage change date
        if (entityData.opportunityId) {
          const [opportunity] = await db.select({ updatedAt: salesOpportunities.updatedAt })
            .from(salesOpportunities)
            .where(eq(salesOpportunities.id, entityData.opportunityId));
          if (opportunity) fromDate = opportunity.updatedAt;
        }
        break;
    }

    const dueDate = new Date(fromDate);

    switch (offset.unit) {
      case 'hours':
        dueDate.setHours(dueDate.getHours() + offset.value);
        break;
      case 'days':
        dueDate.setDate(dueDate.getDate() + offset.value);
        break;
      case 'weeks':
        dueDate.setDate(dueDate.getDate() + (offset.value * 7));
        break;
    }

    return dueDate;
  }

  private async determineAssignee(autoAssignTo: TaskTemplate['autoAssignTo'], entityData: any): Promise<{
    userId: number;
    userType: 'user' | 'agent';
  }> {
    switch (autoAssignTo) {
      case 'lead_owner':
        if (entityData.leadId) {
          const [lead] = await db.select({
            assignedAgentId: leads.assignedAgentId,
            assignedTo: leads.assignedTo
          })
          .from(leads)
          .where(eq(leads.id, entityData.leadId));

          if (lead) {
            return {
              userId: lead.assignedAgentId || lead.assignedTo || 0,
              userType: lead.assignedAgentId ? 'agent' : 'user'
            };
          }
        }
        break;

      case 'opportunity_owner':
        if (entityData.opportunityId) {
          const [opportunity] = await db.select({
            agentId: salesOpportunities.agentId,
            assignedTo: salesOpportunities.assignedTo
          })
          .from(salesOpportunities)
          .where(eq(salesOpportunities.id, entityData.opportunityId));

          if (opportunity) {
            return {
              userId: opportunity.agentId || opportunity.assignedTo || 0,
              userType: opportunity.agentId ? 'agent' : 'user'
            };
          }
        }
        break;

      case 'team_lead':
        // Get team lead based on entity assignment
        const assigneeId = entityData.leadId || entityData.opportunityId;
        if (assigneeId) {
          const lead = await this.getTeamLead(assigneeId);
          if (lead) {
            return { userId: lead.userId, userType: lead.userType };
          }
        }
        break;
    }

    // Default to system user or return 0 if no assignment possible
    return { userId: 1, userType: 'user' }; // Assuming user ID 1 is system/default
  }

  private async getTeamLead(entityId: number): Promise<{ userId: number; userType: 'user' | 'agent' } | null> {
    // Implementation to find team lead based on entity assignment
    // This would typically involve querying team relationships
    return null;
  }

  private async triggerTaskWorkflow(task: any, entityData: any) {
    try {
      // Trigger a workflow specifically for task creation if needed
      await workflowAutomationService.triggerWorkflow(
        'task_creation_workflow', // This would be a predefined workflow ID
        1, // System user ID
        task.id.toString(),
        'task',
        {
          taskTitle: task.title,
          taskDescription: task.description,
          assignee: task.assignedTo,
          dueDate: task.dueDate,
          ...entityData
        }
      );
    } catch (error) {
      console.error('Error triggering task workflow:', error);
    }
  }

  async processScheduledAutomations() {
    try {
      // Process all active automation rules
      for (const [ruleId, rule] of this.automationRules.entries()) {
        if (!rule.isActive) continue;

        await this.processAutomationRule(rule);
      }
    } catch (error) {
      console.error('Error processing scheduled automations:', error);
    }
  }

  private async processAutomationRule(rule: TaskAutomationRule) {
    try {
      switch (rule.triggerType) {
        case 'schedule':
          await this.processScheduledRule(rule);
          break;
        case 'condition':
          await this.processConditionRule(rule);
          break;
      }
    } catch (error) {
      console.error(`Error processing automation rule ${ruleId}:`, error);
    }
  }

  private async processScheduledRule(rule: TaskAutomationRule) {
    // Process recurring tasks like weekly reviews
    if (rule.taskTemplateId) {
      const template = this.taskTemplates.get(rule.taskTemplateId);
      if (template?.recurringPattern) {
        await this.processRecurringTask(template, rule);
      }
    }
  }

  private async processRecurringTask(template: TaskTemplate, rule: TaskAutomationRule) {
    // Check if task should be created based on recurring pattern
    const lastCreated = await this.getLastCreatedTask(template.id);
    const nextDue = this.calculateNextRecurringDate(template.recurringPattern!, lastCreated);

    if (nextDue <= new Date()) {
      await this.createTaskFromTemplate(template.id, {
        assignedTo: await this.getRecurringTaskAssignee(template),
        customDueDate: nextDue
      });
    }
  }

  private async getLastCreatedTask(templateId: string): Promise<Date | null> {
    const [task] = await db.select({ createdAt: tasks.createdAt })
      .from(tasks)
      .where(and(
        eq(tasks.templateId, templateId),
        eq(tasks.status, 'completed')
      ))
      .orderBy(desc(tasks.createdAt))
      .limit(1);

    return task?.createdAt || null;
  }

  private calculateNextRecurringDate(pattern: TaskTemplate['recurringPattern'], lastCreated: Date | null): Date {
    const now = new Date();
    const baseDate = lastCreated || now;

    switch (pattern.frequency) {
      case 'daily':
        const nextDaily = new Date(baseDate);
        nextDaily.setDate(nextDaily.getDate() + pattern.interval);
        return nextDaily;

      case 'weekly':
        const nextWeekly = new Date(baseDate);
        nextWeekly.setDate(nextWeekly.getDate() + (pattern.interval * 7));
        return nextWeekly;

      case 'monthly':
        const nextMonthly = new Date(baseDate);
        nextMonthly.setMonth(nextMonthly.getMonth() + pattern.interval);
        return nextMonthly;

      case 'quarterly':
        const nextQuarterly = new Date(baseDate);
        nextQuarterly.setMonth(nextQuarterly.getMonth() + (pattern.interval * 3));
        return nextQuarterly;

      default:
        return now;
    }
  }

  private async getRecurringTaskAssignee(template: TaskTemplate): Promise<number | undefined> {
    // Implementation to determine who should get recurring tasks
    // This could be team lead, sales manager, etc.
    return undefined;
  }

  private async processConditionRule(rule: TaskAutomationRule) {
    // Check conditions and trigger actions
    const conditions = rule.triggerConditions.conditions || [];

    for (const condition of conditions) {
      const entities = await this.findEntitiesMatchingCondition(condition);

      for (const entity of entities) {
        await this.executeRuleActions(rule, entity);
      }
    }
  }

  private async findEntitiesMatchingCondition(condition: any): Promise<any[]> {
    // Implementation to find entities (leads, salesOpportunities, etc.) matching conditions
    // This would query the appropriate tables based on condition criteria
    return [];
  }

  private async executeRuleActions(rule: TaskAutomationRule, entity: any) {
    for (const action of rule.actions) {
      switch (action.type) {
        case 'assign_to_owner':
          // Assign task to entity owner
          break;
        case 'set_due_date':
          // Set task due date based on parameters
          break;
        case 'escalate_to_team_lead':
          // Escalate task to team lead
          break;
        case 'notify_assignee':
          // Send notification to assignee
          break;
      }
    }
  }

  async processOverdueTaskEscalations() {
    try {
      // Find overdue tasks that haven't been escalated
      const overdueTasks = await db.select()
        .from(tasks)
        .where(and(
          lt(tasks.dueDate, new Date()),
          eq(tasks.status, 'pending'),
          isNull(tasks.escalatedAt)
        ));

      for (const task of overdueTasks) {
        const hoursOverdue = (Date.now() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60);

        if (hoursOverdue > 24) { // Escalate if overdue by more than 24 hours
          await this.escalateTask(task.id, 'Overdue by more than 24 hours');
        }
      }
    } catch (error) {
      console.error('Error processing overdue task escalations:', error);
    }
  }

  async escalateTask(taskId: string, reason: string) {
    try {
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      // Find team lead for escalation
      const teamLead = await this.getTeamLeadForTask(task);
      if (!teamLead) {
        return { success: false, error: 'No team lead found for escalation' };
      }

      // Update task with escalation information
      await db.update(tasks)
        .set({
          escalatedTo: teamLead.userId,
          escalatedAt: new Date(),
          escalationReason: reason,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, taskId));

      // Create escalation record
      await this.createEscalationRecord(taskId, task.assignedTo!, teamLead.userId, reason);

      // Send notifications
      await notificationService.sendNotification({
        recipientId: teamLead.userId,
        recipientType: teamLead.userType,
        type: 'in_app',
        channel: 'mobile_app',
        subject: `Task Escalated: ${task.title}`,
        message: `Task has been escalated: ${reason}`,
        priority: 'high',
        data: {
          taskId: taskId,
          originalAssignee: task.assignedTo,
          escalationReason: reason
        }
      });

      // Notify original assignee
      if (task.assignedTo) {
        await notificationService.sendNotification({
          recipientId: task.assignedTo,
          recipientType: task.assignedToType!,
          type: 'in_app',
          channel: 'mobile_app',
          subject: `Task Escalated: ${task.title}`,
          message: `Your task has been escalated to team lead: ${reason}`,
          priority: 'medium',
          data: {
            taskId: taskId,
            escalatedTo: teamLead.userId,
            escalationReason: reason
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error escalating task:', error);
      return { success: false, error: error.message };
    }
  }

  private async getTeamLeadForTask(task: any): Promise<{ userId: number; userType: 'user' | 'agent' } | null> {
    // Implementation to find team lead based on task assignment
    return null;
  }

  private async createEscalationRecord(taskId: string, originalAssignee: number, escalatedTo: number, reason: string) {
    // Implementation to create escalation record
    // This would typically use an escalations table
  }

  async updateTaskStatus(taskId: string, status: string, completedBy?: number, notes?: string) {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === 'completed') {
        updateData.completedAt = new Date();
        updateData.completedBy = completedBy;
      }

      if (notes) {
        updateData.notes = notes;
      }

      const [updatedTask] = await db.update(tasks)
        .set(updateData)
        .where(eq(tasks.id, taskId))
        .returning();

      // Trigger completion workflow if applicable
      if (status === 'completed') {
        await this.triggerTaskCompletionWorkflow(updatedTask);
      }

      return { success: true, task: updatedTask };
    } catch (error) {
      console.error('Error updating task status:', error);
      return { success: false, error: error.message };
    }
  }

  private async triggerTaskCompletionWorkflow(task: any) {
    try {
      // Check for dependent tasks and trigger them if needed
      const dependentTasks = await this.findDependentTasks(task.id);

      for (const dependent of dependentTasks) {
        // Check if all dependencies are completed
        const dependenciesMet = await this.checkTaskDependencies(dependent.id);

        if (dependenciesMet) {
          // Update dependent task status to ready
          await db.update(tasks)
            .set({
              status: 'ready',
              updatedAt: new Date()
            })
            .where(eq(tasks.id, dependent.id));
        }
      }
    } catch (error) {
      console.error('Error triggering task completion workflow:', error);
    }
  }

  private async findDependentTasks(completedTaskId: string): Promise<any[]> {
    // Implementation to find tasks that depend on the completed task
    return [];
  }

  private async checkTaskDependencies(taskId: string): Promise<boolean> {
    // Implementation to check if all task dependencies are met
    return true;
  }

  // Public methods for task template and rule management
  async createTaskTemplate(template: Omit<TaskTemplate, 'id'>): Promise<{ success: boolean; template?: TaskTemplate; error?: string }> {
    try {
      const newTemplate: TaskTemplate = {
        ...template,
        id: `template_${Date.now()}`
      };

      this.taskTemplates.set(newTemplate.id, newTemplate);

      return { success: true, template: newTemplate };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createAutomationRule(rule: Omit<TaskAutomationRule, 'id'>): Promise<{ success: boolean; rule?: TaskAutomationRule; error?: string }> {
    try {
      const newRule: TaskAutomationRule = {
        ...rule,
        id: `rule_${Date.now()}`
      };

      this.automationRules.set(newRule.id, newRule);

      return { success: true, rule: newRule };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getTaskTemplates(): Promise<TaskTemplate[]> {
    return Array.from(this.taskTemplates.values());
  }

  async getAutomationRules(): Promise<TaskAutomationRule[]> {
    return Array.from(this.automationRules.values());
  }

  async getTaskStatistics(filters?: {
    assignedTo?: number;
    status?: string;
    category?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  }) {
    try {
      let whereConditions: any[] = [];

      if (filters?.assignedTo) {
        whereConditions.push(eq(tasks.assignedTo, filters.assignedTo));
      }

      if (filters?.status) {
        whereConditions.push(eq(tasks.status, filters.status));
      }

      if (filters?.category) {
        whereConditions.push(eq(tasks.category, filters.category));
      }

      if (filters?.dateRange) {
        whereConditions.push(
          gte(tasks.createdAt, filters.dateRange.start),
          lt(tasks.createdAt, filters.dateRange.end)
        );
      }

      const [stats] = await db.select({
        total: sql<number>`COUNT(*)`,
        pending: sql<number>`SUM(CASE WHEN ${tasks.status} = 'pending' THEN 1 ELSE 0 END)`,
        inProgress: sql<number>`SUM(CASE WHEN ${tasks.status} = 'in_progress' THEN 1 ELSE 0 END)`,
        completed: sql<number>`SUM(CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END)`,
        overdue: sql<number>`SUM(CASE WHEN ${tasks.dueDate} < NOW() AND ${tasks.status} != 'completed' THEN 1 ELSE 0 END)`,
        escalated: sql<number>`SUM(CASE WHEN ${tasks.escalatedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.completedAt} - ${tasks.createdAt})) / 3600)`
      })
      .from(tasks)
      .where(and(...whereConditions));

      return { success: true, statistics: stats };
    } catch (error) {
      console.error('Error getting task statistics:', error);
      return { success: false, error: error.message };
    }
  }
}

export const taskAutomationService = new TaskAutomationService();