import { db } from '../db.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  workflowDefinitions,
  workflowExecutions,
  users,
  leads,
  insertWorkflowDefinitionSchema,
  insertWorkflowExecutionSchema
} from '../../shared/schema.js';

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual';
  eventType?: string;
  conditions?: Record<string, any>;
  schedule?: string; // Cron expression
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'delay' | 'notification' | 'task' | 'webhook';
  config: Record<string, any>;
  nextStep?: string;
  conditions?: Record<string, any>;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  entityId?: string;
  entityType?: string;
  triggeredBy: number;
  variables: Record<string, any>;
  currentStep: number;
}

export interface WorkflowResult {
  success: boolean;
  nextStep?: number;
  error?: string;
  actions: WorkflowAction[];
}

export interface WorkflowAction {
  type: 'notification' | 'task' | 'field_update' | 'webhook' | 'email';
  target: string;
  data: Record<string, any>;
  status: 'pending' | 'completed' | 'failed';
}

export class WorkflowAutomationService {
  private runningWorkflows: Map<string, boolean> = new Map();

  async createWorkflow(workflowData: typeof insertWorkflowDefinitionSchema._type) {
    try {
      const [workflow] = await db.insert(workflowDefinitions)
        .values({
          ...workflowData,
          isActive: true,
          createdAt: new Date()
        })
        .returning();

      return { success: true, workflow };
    } catch (error) {
      console.error('Error creating workflow:', error);
      return { success: false, error: 'Failed to create workflow' };
    }
  }

  async updateWorkflow(id: string, updateData: Partial<typeof insertWorkflowDefinitionSchema._type>) {
    try {
      const [updatedWorkflow] = await db.update(workflowDefinitions)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(workflowDefinitions.id, id))
        .returning();

      if (!updatedWorkflow) {
        return { success: false, error: 'Workflow not found' };
      }

      return { success: true, workflow: updatedWorkflow };
    } catch (error) {
      console.error('Error updating workflow:', error);
      return { success: false, error: 'Failed to update workflow' };
    }
  }

  async deleteWorkflow(id: string) {
    try {
      // Check if workflow is currently running
      const runningExecutions = await db.select()
        .from(workflowExecutions)
        .where(and(
          eq(workflowExecutions.workflowId, id),
          eq(workflowExecutions.status, 'running')
        ));

      if (runningExecutions.length > 0) {
        return { success: false, error: 'Cannot delete workflow with active executions' };
      }

      // Soft delete by deactivating
      const [deletedWorkflow] = await db.update(workflowDefinitions)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(workflowDefinitions.id, id))
        .returning();

      return { success: true, workflow: deletedWorkflow };
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return { success: false, error: 'Failed to delete workflow' };
    }
  }

  async triggerWorkflow(workflowId: string, triggeredBy: number, entityId?: string, entityType?: string, variables: Record<string, any> = {}) {
    try {
      // Get workflow definition
      const [workflow] = await db.select()
        .from(workflowDefinitions)
        .where(and(
          eq(workflowDefinitions.id, workflowId),
          eq(workflowDefinitions.isActive, true)
        ));

      if (!workflow) {
        return { success: false, error: 'Workflow not found or inactive' };
      }

      // Check if workflow is already running for this entity
      if (entityId && entityType) {
        const existingExecution = await db.select()
          .from(workflowExecutions)
          .where(and(
            eq(workflowExecutions.workflowId, workflowId),
            eq(workflowExecutions.entityId, entityId),
            eq(workflowExecutions.entityType, entityType),
            eq(workflowExecutions.status, 'running')
          ))
          .limit(1);

        if (existingExecution.length > 0) {
          return { success: false, error: 'Workflow already running for this entity' };
        }
      }

      // Create workflow execution
      const [execution] = await db.insert(workflowExecutions)
        .values({
          workflowId,
          triggeredBy,
          entityId,
          entityType,
          status: 'running',
          currentStep: 0,
          startedAt: new Date(),
          variables: JSON.stringify(variables)
        })
        .returning();

      // Start workflow execution
      this.executeWorkflow(execution.id, workflow);

      return { success: true, execution };
    } catch (error) {
      console.error('Error triggering workflow:', error);
      return { success: false, error: 'Failed to trigger workflow' };
    }
  }

  async executeWorkflow(executionId: string, workflow?: any) {
    try {
      // Get execution and workflow details
      const execution = workflow ? { id: executionId } : await this.getExecution(executionId);
      if (!workflow) {
        [workflow] = await db.select()
          .from(workflowDefinitions)
          .where(eq(workflowDefinitions.id, execution.workflowId));
      }

      if (!workflow || !execution) {
        return { success: false, error: 'Execution or workflow not found' };
      }

      // Mark workflow as running
      this.runningWorkflows.set(executionId, true);

      const steps = JSON.parse(workflow.steps);
      let currentStepIndex = execution.currentStep || 0;

      // Execute steps
      while (currentStepIndex < steps.length && this.runningWorkflows.get(executionId)) {
        const step = steps[currentStepIndex];

        try {
          const result = await this.executeStep(step, execution, workflow);

          if (!result.success) {
            await this.updateExecution(executionId, {
              status: 'failed',
              completedAt: new Date(),
              error: result.error
            });
            this.runningWorkflows.delete(executionId);
            return result;
          }

          // Check if we should move to next step
          if (result.nextStep !== undefined) {
            currentStepIndex = result.nextStep;
          } else {
            currentStepIndex++;
          }

          await this.updateExecution(executionId, { currentStep: currentStepIndex });

        } catch (stepError) {
          console.error(`Step execution failed: ${stepError}`);
          await this.updateExecution(executionId, {
            status: 'failed',
            completedAt: new Date(),
            error: `Step ${currentStepIndex} failed: ${stepError.message}`
          });
          this.runningWorkflows.delete(executionId);
          return { success: false, error: `Step execution failed` };
        }
      }

      // Mark execution as completed
      await this.updateExecution(executionId, {
        status: 'completed',
        completedAt: new Date(),
        currentStep: steps.length
      });

      this.runningWorkflows.delete(executionId);
      return { success: true, actions: [] };

    } catch (error) {
      console.error('Workflow execution failed:', error);
      await this.updateExecution(executionId, {
        status: 'failed',
        completedAt: new Date(),
        error: error.message
      });
      this.runningWorkflows.delete(executionId);
      return { success: false, error: 'Workflow execution failed' };
    }
  }

  private async executeStep(step: WorkflowStep, execution: any, workflow: any): Promise<WorkflowResult> {
    const actions: WorkflowAction[] = [];
    const context = await this.buildExecutionContext(execution, workflow);

    try {
      switch (step.type) {
        case 'action':
          return await this.executeActionStep(step, context);

        case 'condition':
          return await this.executeConditionStep(step, context);

        case 'delay':
          return await this.executeDelayStep(step, context);

        case 'notification':
          return await this.executeNotificationStep(step, context);

        case 'task':
          return await this.executeTaskStep(step, context);

        case 'webhook':
          return await this.executeWebhookStep(step, context);

        default:
          return { success: false, error: `Unknown step type: ${step.type}` };
      }
    } catch (error) {
      console.error(`Step execution error: ${error}`);
      return { success: false, error: error.message, actions };
    }
  }

  private async executeActionStep(step: WorkflowStep, context: ExecutionContext): Promise<WorkflowResult> {
    try {
      const action = step.config.action;
      const target = step.config.target;
      const data = step.config.data || {};

      switch (action) {
        case 'update_lead_status':
          if (context.entityType === 'lead' && context.entityId) {
            await db.update(leads)
              .set({ status: data.status, updatedAt: new Date() })
              .where(eq(leads.id, parseInt(context.entityId)));
          }
          break;

        case 'update_opportunity_stage':
          if (context.entityType === 'opportunity' && context.entityId) {
            await db.update(opportunities)
              .set({ stage: data.stage, updatedAt: new Date() })
              .where(eq(opportunities.id, parseInt(context.entityId)));
          }
          break;

        case 'create_activity':
          await db.insert(activities)
            .values({
              leadId: context.entityType === 'lead' ? parseInt(context.entityId) : null,
              opportunityId: context.entityType === 'opportunity' ? parseInt(context.entityId) : null,
              agentId: context.triggeredBy,
              activityType: step.config.activityType || 'task',
              subject: data.subject || `Automated action from workflow`,
              description: data.description,
              activityDate: new Date(),
              createdAt: new Date()
            });
          break;

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }

      return { success: true, actions: [] };
    } catch (error) {
      return { success: false, error: error.message, actions: [] };
    }
  }

  private async executeConditionStep(step: WorkflowStep, context: ExecutionContext): Promise<WorkflowResult> {
    try {
      const condition = step.config.condition;
      const result = await this.evaluateCondition(condition, context);

      if (result) {
        return { success: true, nextStep: step.config.trueStep ? parseInt(step.config.trueStep) : undefined };
      } else {
        return { success: true, nextStep: step.config.falseStep ? parseInt(step.config.falseStep) : undefined };
      }
    } catch (error) {
      return { success: false, error: error.message, actions: [] };
    }
  }

  private async executeDelayStep(step: WorkflowStep, context: ExecutionContext): Promise<WorkflowResult> {
    try {
      const delayMs = step.config.duration ? this.parseDuration(step.config.duration) : 60000; // Default 1 minute

      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      return { success: true, actions: [] };
    } catch (error) {
      return { success: false, error: error.message, actions: [] };
    }
  }

  private async executeNotificationStep(step: WorkflowStep, context: ExecutionContext): Promise<WorkflowResult> {
    try {
      const notification = {
        type: step.config.notificationType,
        target: step.config.target,
        message: this.replaceVariables(step.config.message, context.variables),
        data: step.config.data || {}
      };

      // Here you would integrate with your notification service
      console.log('Sending notification:', notification);

      const action: WorkflowAction = {
        type: 'notification',
        target: step.config.target,
        data: notification,
        status: 'completed'
      };

      return { success: true, actions: [action] };
    } catch (error) {
      return { success: false, error: error.message, actions: [] };
    }
  }

  private async executeTaskStep(step: WorkflowStep, context: ExecutionContext): Promise<WorkflowResult> {
    try {
      const task = {
        title: this.replaceVariables(step.config.title, context.variables),
        description: this.replaceVariables(step.config.description, context.variables),
        assignedTo: step.config.assignedTo,
        priority: step.config.priority || 'medium',
        dueDate: step.config.dueDate ? new Date(step.config.dueDate) : null
      };

      // Create task activity
      await db.insert(activities)
        .values({
          leadId: context.entityType === 'lead' ? parseInt(context.entityId) : null,
          opportunityId: context.entityType === 'opportunity' ? parseInt(context.entityId) : null,
          agentId: context.triggeredBy,
          activityType: 'task',
          subject: task.title,
          description: task.description,
          activityDate: new Date(),
          createdAt: new Date()
        });

      const action: WorkflowAction = {
        type: 'task',
        target: task.assignedTo,
        data: task,
        status: 'completed'
      };

      return { success: true, actions: [action] };
    } catch (error) {
      return { success: false, error: error.message, actions: [] };
    }
  }

  private async executeWebhookStep(step: WorkflowStep, context: ExecutionContext): Promise<WorkflowResult> {
    try {
      const webhookUrl = this.replaceVariables(step.config.url, context.variables);
      const webhookData = {
        ...step.config.data,
        ...context.variables,
        executionId: context.executionId,
        entityId: context.entityId,
        entityType: context.entityType
      };

      const response = await fetch(webhookUrl, {
        method: step.config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...step.config.headers
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      const action: WorkflowAction = {
        type: 'webhook',
        target: webhookUrl,
        data: webhookData,
        status: 'completed'
      };

      return { success: true, actions: [action] };
    } catch (error) {
      return { success: false, error: error.message, actions: [] };
    }
  }

  private async evaluateCondition(condition: any, context: ExecutionContext): Promise<boolean> {
    try {
      // Build evaluation context
      const evaluationContext = {
        ...context.variables,
        entityId: context.entityId,
        entityType: context.entityType
      };

      // Get entity data if needed
      if (context.entityId && context.entityType) {
        switch (context.entityType) {
          case 'lead':
            const [lead] = await db.select()
              .from(leads)
              .where(eq(leads.id, parseInt(context.entityId)));
            evaluationContext.lead = lead;
            break;

          case 'opportunity':
            const [opportunity] = await db.select()
              .from(opportunities)
              .where(eq(opportunities.id, parseInt(context.entityId)));
            evaluationContext.opportunity = opportunity;
            break;
        }
      }

      // Simple condition evaluation (in production, use a more robust expression evaluator)
      return this.evaluateSimpleCondition(condition, evaluationContext);
    } catch (error) {
      console.error('Condition evaluation failed:', error);
      return false;
    }
  }

  private evaluateSimpleCondition(condition: any, context: any): boolean {
    // This is a simplified condition evaluator
    // In production, use a library like 'jsonata' or 'lodash.template'

    const { field, operator, value } = condition;
    const fieldValue = this.getFieldValue(field, context);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: any): any {
    // Support dot notation for nested fields
    return field.split('.').reduce((obj, key) => obj?.[key], context);
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    if (!template) return '';

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], variables);
      return value !== undefined ? String(value) : match;
    });
  }

  private parseDuration(duration: string): number {
    const durationMap: Record<string, number> = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (match) {
      const [, value, unit] = match;
      return parseInt(value) * durationMap[unit];
    }

    return 0;
  }

  private async buildExecutionContext(execution: any, workflow: any): Promise<ExecutionContext> {
    const variables = execution.variables ? JSON.parse(execution.variables) : {};

    // Add entity-specific data
    if (execution.entityId && execution.entityType) {
      switch (execution.entityType) {
        case 'lead':
          const [lead] = await db.select()
            .from(leads)
            .where(eq(leads.id, parseInt(execution.entityId)));
          variables.lead = lead;
          break;

        case 'opportunity':
          const [opportunity] = await db.select()
            .from(opportunities)
            .where(eq(opportunities.id, parseInt(execution.entityId)));
          variables.opportunity = opportunity;
          break;
      }
    }

    return {
      workflowId: execution.workflowId,
      executionId: execution.id,
      entityId: execution.entityId,
      entityType: execution.entityType,
      triggeredBy: execution.triggeredBy,
      variables,
      currentStep: execution.currentStep || 0
    };
  }

  private async updateExecution(executionId: string, updateData: any) {
    await db.update(workflowExecutions)
      .set({
        ...updateData,
        ...(updateData.variables && { variables: JSON.stringify(updateData.variables) }),
        updatedAt: new Date()
      })
      .where(eq(workflowExecutions.id, executionId));
  }

  private async getExecution(executionId: string) {
    const [execution] = await db.select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId));

    return execution;
  }

  async pauseWorkflow(executionId: string) {
    try {
      await this.updateExecution(executionId, { status: 'paused' });
      this.runningWorkflows.delete(executionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to pause workflow' };
    }
  }

  async resumeWorkflow(executionId: string) {
    try {
      await this.updateExecution(executionId, { status: 'running' });

      const execution = await this.getExecution(executionId);
      if (execution) {
        // Resume execution
        this.executeWorkflow(executionId);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to resume workflow' };
    }
  }

  async cancelWorkflow(executionId: string) {
    try {
      await this.updateExecution(executionId, {
        status: 'cancelled',
        completedAt: new Date()
      });
      this.runningWorkflows.delete(executionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to cancel workflow' };
    }
  }

  async getWorkflows(page = 1, limit = 20, isActive?: boolean) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];

      if (isActive !== undefined) {
        whereConditions.push(eq(workflowDefinitions.isActive, isActive));
      }

      const workflows = await db.select()
        .from(workflowDefinitions)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(workflowDefinitions.createdAt));

      return { success: true, workflows };
    } catch (error) {
      return { success: false, error: 'Failed to fetch workflows' };
    }
  }

  async getWorkflowExecutions(workflowId?: string, status?: string, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];

      if (workflowId) {
        whereConditions.push(eq(workflowExecutions.workflowId, workflowId));
      }

      if (status) {
        whereConditions.push(eq(workflowExecutions.status, status));
      }

      const executions = await db.select({
        id: workflowExecutions.id,
        workflowId: workflowExecutions.workflowId,
        workflowName: workflowDefinitions.workflowName,
        triggeredBy: workflowExecutions.triggeredBy,
        entityId: workflowExecutions.entityId,
        entityType: workflowExecutions.entityType,
        status: workflowExecutions.status,
        currentStep: workflowExecutions.currentStep,
        startedAt: workflowExecutions.startedAt,
        completedAt: workflowExecutions.completedAt,
        variables: workflowExecutions.variables
      })
      .from(workflowExecutions)
      .leftJoin(workflowDefinitions, eq(workflowExecutions.workflowId, workflowDefinitions.id))
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(workflowExecutions.startedAt));

      return { success: true, executions };
    } catch (error) {
      return { success: false, error: 'Failed to fetch executions' };
    }
  }
}

export const workflowAutomationService = new WorkflowAutomationService();