import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import {
  workflowDefinitions,
  workflowExecutions,
  users,
  insertWorkflowDefinitionSchema,
  insertWorkflowExecutionSchema
} from '../../../shared/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { workflowAutomationService } from '../../services/workflowAutomationService.js';

const router = Router();

// Validation schemas
const createWorkflowSchema = z.object({
  workflowName: z.string().min(1).max(100),
  description: z.string().optional(),
  triggerType: z.enum(['event', 'schedule', 'manual']),
  triggerConditions: z.string().optional(),
  steps: z.string().min(1),
  isActive: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5)
});

const updateWorkflowSchema = createWorkflowSchema.partial();

const triggerWorkflowSchema = z.object({
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  variables: z.record(z.any()).optional()
});

// GET /api/crm/workflow-automation - List all workflows
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      isActive,
      search
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build where conditions
    let whereConditions = [];

    if (isActive !== undefined) {
      whereConditions.push(eq(workflowDefinitions.isActive, isActive === 'true'));
    }

    if (search) {
      whereConditions.push(
        sql`(LOWER(${workflowDefinitions.workflowName}) LIKE LOWER(${'%' + search + '%'}) OR
             LOWER(${workflowDefinitions.description}) LIKE LOWER(${'%' + search + '%'}))`
      );
    }

    // Get workflows with execution counts
    const workflowsQuery = db.select({
      id: workflowDefinitions.id,
      workflowName: workflowDefinitions.workflowName,
      description: workflowDefinitions.description,
      triggerType: workflowDefinitions.triggerType,
      isActive: workflowDefinitions.isActive,
      priority: workflowDefinitions.priority,
      createdAt: workflowDefinitions.createdAt,
      updatedAt: workflowDefinitions.updatedAt
    })
    .from(workflowDefinitions)
    .where(and(...whereConditions));

    const allWorkflows = await workflowsQuery.orderBy(desc(workflowDefinitions.createdAt));

    // Get execution statistics for each workflow
    const workflowsWithStats = await Promise.all(
      allWorkflows.map(async (workflow) => {
        const stats = await db.select({
          totalExecutions: sql<number>`COUNT(*)`,
          runningExecutions: sql<number>`SUM(CASE WHEN ${workflowExecutions.status} = 'running' THEN 1 ELSE 0 END)`,
          completedExecutions: sql<number>`SUM(CASE WHEN ${workflowExecutions.status} = 'completed' THEN 1 ELSE 0 END)`,
          failedExecutions: sql<number>`SUM(CASE WHEN ${workflowExecutions.status} = 'failed' THEN 1 ELSE 0 END)`,
          avgExecutionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${workflowExecutions.completedAt} - ${workflowExecutions.startedAt})))`
        })
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, workflow.id));

        return {
          ...workflow,
          statistics: stats[0] || {
            totalExecutions: 0,
            runningExecutions: 0,
            completedExecutions: 0,
            failedExecutions: 0,
            avgExecutionTime: 0
          }
        };
      })
    );

    // Get total count for pagination
    const totalCount = allWorkflows.length;
    const paginatedWorkflows = workflowsWithStats.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginatedWorkflows,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows'
    });
  }
});

// GET /api/crm/workflow-automation/:id - Get specific workflow details
router.get('/:id', async (req, res) => {
  try {
    const workflowId = req.params.id;

    const [workflow] = await db.select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.id, workflowId));

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Get workflow executions
    const executions = await db.select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(50);

    // Parse workflow steps for display
    let steps = [];
    try {
      steps = JSON.parse(workflow.steps);
    } catch (e) {
      console.error('Error parsing workflow steps:', e);
    }

    res.json({
      success: true,
      data: {
        ...workflow,
        steps,
        executions
      }
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow'
    });
  }
});

// POST /api/crm/workflow-automation - Create new workflow
router.post('/', async (req, res) => {
  try {
    const validatedData = createWorkflowSchema.parse(req.body);

    // Validate workflow steps JSON
    try {
      JSON.parse(validatedData.steps);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow steps JSON format'
      });
    }

    const result = await workflowAutomationService.createWorkflow(validatedData);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.workflow
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow'
    });
  }
});

// PUT /api/crm/workflow-automation/:id - Update workflow
router.put('/:id', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const validatedData = updateWorkflowSchema.parse(req.body);

    // Validate workflow steps JSON if provided
    if (validatedData.steps) {
      try {
        JSON.parse(validatedData.steps);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid workflow steps JSON format'
        });
      }
    }

    const result = await workflowAutomationService.updateWorkflow(workflowId, validatedData);

    if (result.success) {
      res.json({
        success: true,
        data: result.workflow
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow'
    });
  }
});

// DELETE /api/crm/workflow-automation/:id - Delete workflow
router.delete('/:id', async (req, res) => {
  try {
    const workflowId = req.params.id;

    const result = await workflowAutomationService.deleteWorkflow(workflowId);

    if (result.success) {
      res.json({
        success: true,
        data: result.workflow
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workflow'
    });
  }
});

// POST /api/crm/workflow-automation/:id/trigger - Manually trigger workflow
router.post('/:id/trigger', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const userId = req.user?.id; // Assuming user is attached from auth middleware
    const { entityId, entityType, variables } = triggerWorkflowSchema.parse(req.body);

    const result = await workflowAutomationService.triggerWorkflow(
      workflowId,
      userId,
      entityId,
      entityType,
      variables
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.execution
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error triggering workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger workflow'
    });
  }
});

// GET /api/crm/workflow-automation/executions - List workflow executions
router.get('/executions', async (req, res) => {
  try {
    const {
      workflowId,
      status,
      page = '1',
      limit = '20'
    } = req.query;

    const result = await workflowAutomationService.getWorkflowExecutions(
      workflowId as string,
      status as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.executions
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch executions'
    });
  }
});

// GET /api/crm/workflow-automation/executions/:id - Get specific execution details
router.get('/executions/:id', async (req, res) => {
  try {
    const executionId = req.params.id;

    const [execution] = await db.select({
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
      variables: workflowExecutions.variables,
      error: workflowExecutions.error
    })
    .from(workflowExecutions)
    .leftJoin(workflowDefinitions, eq(workflowExecutions.workflowId, workflowDefinitions.id))
    .where(eq(workflowExecutions.id, executionId));

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }

    // Parse variables for display
    let variables = {};
    try {
      variables = execution.variables ? JSON.parse(execution.variables) : {};
    } catch (e) {
      console.error('Error parsing execution variables:', e);
    }

    // Get workflow details
    const [workflow] = await db.select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.id, execution.workflowId));

    let steps = [];
    if (workflow) {
      try {
        steps = JSON.parse(workflow.steps);
      } catch (e) {
        console.error('Error parsing workflow steps:', e);
      }
    }

    res.json({
      success: true,
      data: {
        ...execution,
        variables,
        workflowSteps: steps
      }
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch execution'
    });
  }
});

// POST /api/crm/workflow-automation/executions/:id/pause - Pause workflow execution
router.post('/executions/:id/pause', async (req, res) => {
  try {
    const executionId = req.params.id;

    const result = await workflowAutomationService.pauseWorkflow(executionId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Workflow execution paused successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error pausing execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause execution'
    });
  }
});

// POST /api/crm/workflow-automation/executions/:id/resume - Resume workflow execution
router.post('/executions/:id/resume', async (req, res) => {
  try {
    const executionId = req.params.id;

    const result = await workflowAutomationService.resumeWorkflow(executionId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Workflow execution resumed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error resuming execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume execution'
    });
  }
});

// POST /api/crm/workflow-automation/executions/:id/cancel - Cancel workflow execution
router.post('/executions/:id/cancel', async (req, res) => {
  try {
    const executionId = req.params.id;

    const result = await workflowAutomationService.cancelWorkflow(executionId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Workflow execution cancelled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error cancelling execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel execution'
    });
  }
});

// GET /api/crm/workflow-automation/templates - Get workflow templates
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'lead-followup',
        name: 'Lead Follow-up Sequence',
        description: 'Automated follow-up sequence for new leads',
        category: 'lead_management',
        triggerType: 'event',
        steps: [
          {
            id: '1',
            name: 'Send Welcome Email',
            type: 'notification',
            config: {
              notificationType: 'email',
              target: '{{lead.email}}',
              subject: 'Welcome! We\'re excited to help you',
              message: 'Thank you for your interest. Our team will be in touch shortly.'
            }
          },
          {
            id: '2',
            name: 'Wait 2 Days',
            type: 'delay',
            config: { duration: '2d' }
          },
          {
            id: '3',
            name: 'Check Lead Response',
            type: 'condition',
            config: {
              condition: { field: 'lead.status', operator: 'equals', value: 'responded' },
              trueStep: '5',
              falseStep: '4'
            }
          },
          {
            id: '4',
            name: 'Follow-up Call Task',
            type: 'task',
            config: {
              title: 'Follow up with {{lead.name}}',
              description: 'Lead hasn\'t responded to initial email',
              assignedTo: '{{lead.assignedAgentId}}',
              priority: 'medium'
            }
          },
          {
            id: '5',
            name: 'End Workflow',
            type: 'action',
            config: { action: 'complete' }
          }
        ]
      },
      {
        id: 'opportunity-stage-reminder',
        name: 'Opportunity Stage Reminder',
        description: 'Remind agents about opportunities stuck in a stage',
        category: 'sales_pipeline',
        triggerType: 'schedule',
        steps: [
          {
            id: '1',
            name: 'Check Opportunity Duration',
            type: 'condition',
            config: {
              condition: { field: 'opportunity.daysInStage', operator: 'greater_than', value: 7 },
              trueStep: '2',
              falseStep: '3'
            }
          },
          {
            id: '2',
            name: 'Send Reminder Notification',
            type: 'notification',
            config: {
              notificationType: 'notification',
              target: '{{opportunity.agentId}}',
              message: 'Opportunity {{opportunity.name}} has been in stage {{opportunity.stage}} for over 7 days'
            }
          },
          {
            id: '3',
            name: 'End Workflow',
            type: 'action',
            config: { action: 'complete' }
          }
        ]
      },
      {
        id: 'renewal-reminder',
        name: 'Policy Renewal Reminder',
        description: 'Send renewal reminders before policy expiry',
        category: 'retention',
        triggerType: 'schedule',
        steps: [
          {
            id: '1',
            name: 'Check Renewal Date',
            type: 'condition',
            config: {
              condition: { field: 'policy.daysUntilExpiry', operator: 'less_than', value: 30 },
              trueStep: '2',
              falseStep: '4'
            }
          },
          {
            id: '2',
            name: 'Send Renewal Notice',
            type: 'notification',
            config: {
              notificationType: 'email',
              target: '{{policy.member.email}}',
              subject: 'Policy Renewal Notice',
              message: 'Your policy {{policy.number}} is due for renewal in {{policy.daysUntilExpiry}} days'
            }
          },
          {
            id: '3',
            name: 'Create Follow-up Task',
            type: 'task',
            config: {
              title: 'Follow up on renewal for {{policy.member.name}}',
              description: 'Policy expires on {{policy.expiryDate}}',
              assignedTo: '{{policy.agentId}}',
              priority: 'high'
            }
          },
          {
            id: '4',
            name: 'End Workflow',
            type: 'action',
            config: { action: 'complete' }
          }
        ]
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// POST /api/crm/workflow-automation/validate - Validate workflow definition
router.post('/validate', async (req, res) => {
  try {
    const { steps } = req.body;

    if (!steps || !Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        error: 'Steps must be an array'
      });
    }

    const errors = [];
    const warnings = [];

    steps.forEach((step, index) => {
      if (!step.id) {
        errors.push(`Step ${index + 1}: Missing step ID`);
      }
      if (!step.name) {
        errors.push(`Step ${index + 1}: Missing step name`);
      }
      if (!step.type) {
        errors.push(`Step ${index + 1}: Missing step type`);
      }
      if (!step.config) {
        warnings.push(`Step ${index + 1}: Missing step configuration`);
      }

      // Validate step-specific configurations
      switch (step.type) {
        case 'notification':
          if (!step.config.notificationType) {
            errors.push(`Step ${index + 1}: Missing notification type`);
          }
          if (!step.config.target) {
            errors.push(`Step ${index + 1}: Missing notification target`);
          }
          break;

        case 'delay':
          if (!step.config.duration) {
            warnings.push(`Step ${index + 1}: Missing delay duration, using default`);
          }
          break;

        case 'webhook':
          if (!step.config.url) {
            errors.push(`Step ${index + 1}: Missing webhook URL`);
          }
          break;
      }
    });

    res.json({
      success: true,
      data: {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    });
  } catch (error) {
    console.error('Error validating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate workflow'
    });
  }
});

export default router;