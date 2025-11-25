import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import {
  tasks,
  activities,
  agents,
  users,
  leads,
  opportunities,
  insertTaskSchema
} from '../../../shared/schema.js';
import { eq, and, desc, sql, lt, gte, isNull } from 'drizzle-orm';
import { taskAutomationService } from '../../services/taskAutomationService.js';

const router = Router();

// Validation schemas
const createTaskFromTemplateSchema = z.object({
  templateId: z.string(),
  entityData: z.object({
    leadId: z.number().optional(),
    opportunityId: z.number().optional(),
    memberId: z.number().optional(),
    assignedTo: z.number().optional(),
    assignedToType: z.enum(['user', 'agent']).optional(),
    customDueDate: z.string().datetime().optional(),
    customData: z.record(z.any()).optional()
  })
});

const updateTaskStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']),
  completedBy: z.number().optional(),
  notes: z.string().optional()
});

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  assignedTo: z.number().optional(),
  assignedToType: z.enum(['user', 'agent']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0.1).max(40).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
  notes: z.string().optional(),
  checklist: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

const createTaskTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['follow_up', 'documentation', 'meeting', 'call', 'email', 'review', 'custom']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  estimatedDuration: z.number().min(5).max(480), // 5 minutes to 8 hours
  checklist: z.array(z.string()),
  autoAssignTo: z.enum(['lead_owner', 'opportunity_owner', 'team_lead', 'specific_role']),
  dueDateOffset: z.object({
    value: z.number().min(0),
    unit: z.enum(['hours', 'days', 'weeks']),
    from: z.enum(['created', 'updated', 'stage_change', 'custom_date'])
  }),
  dependencies: z.array(z.string()).optional(),
  recurringPattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
    interval: z.number().min(1),
    endDate: z.string().datetime().optional()
  }).optional()
});

const createAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  triggerType: z.enum(['event', 'schedule', 'condition']),
  triggerConditions: z.record(z.any()),
  actionType: z.enum(['create_task', 'update_task', 'assign_task', 'escalate_task']),
  taskTemplateId: z.string().optional(),
  isActive: z.boolean().default(true),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any()
  })),
  actions: z.array(z.object({
    type: z.string(),
    parameters: z.record(z.any())
  }))
});

// GET /api/crm/task-automation/tasks - List tasks with filters
router.get('/tasks', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      assignedTo,
      status,
      category,
      priority,
      overdue = 'false',
      escalated = 'false',
      search,
      dateRange
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build where conditions
    let whereConditions: any[] = [];

    if (assignedTo) {
      whereConditions.push(eq(tasks.assignedTo, parseInt(assignedTo as string)));
    }

    if (status) {
      whereConditions.push(eq(tasks.status, status));
    }

    if (category) {
      whereConditions.push(eq(tasks.category, category));
    }

    if (priority) {
      whereConditions.push(eq(tasks.priority, priority));
    }

    if (overdue === 'true') {
      whereConditions.push(
        and(
          lt(tasks.dueDate, new Date()),
          sql`${tasks.status} != 'completed'`
        )
      );
    }

    if (escalated === 'true') {
      whereConditions.push(sql`${tasks.escalatedAt} IS NOT NULL`);
    }

    if (search) {
      whereConditions.push(
        sql`(LOWER(${tasks.title}) LIKE LOWER(${'%' + search + '%'}) OR
             LOWER(${tasks.description}) LIKE LOWER(${'%' + search + '%'}))`
      );
    }

    if (dateRange) {
      const { start, end } = JSON.parse(dateRange as string);
      whereConditions.push(
        gte(tasks.createdAt, new Date(start)),
        lt(tasks.createdAt, new Date(end))
      );
    }

    // Get tasks with assignee information
    const tasksList = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      leadId: tasks.leadId,
      opportunityId: tasks.opportunityId,
      memberId: tasks.memberId,
      assignedTo: tasks.assignedTo,
      assignedToType: tasks.assignedToType,
      category: tasks.category,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      escalatedAt: tasks.escalatedAt,
      estimatedHours: tasks.estimatedHours,
      checklist: tasks.checklist,
      tags: tasks.tags,
      // Join assignee information
      assigneeName: sql`CASE
        WHEN ${tasks.assignedToType} = 'agent' THEN
          COALESCE(${agents.firstName} || ' ' || ${agents.lastName}, ${users.firstName} || ' ' || ${users.lastName})
        ELSE
          COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Unknown')
      END`,
      assigneeEmail: sql`CASE
        WHEN ${tasks.assignedToType} = 'agent' THEN ${agents.email}
        ELSE ${users.email}
      END`,
      // Lead and opportunity info
      leadName: sql`${leads.firstName} || ' ' || ${leads.lastName}`,
      opportunityName: opportunities.name
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .leftJoin(agents, and(
      eq(tasks.assignedTo, agents.id),
      eq(tasks.assignedToType, 'agent')
    ))
    .leftJoin(leads, eq(tasks.leadId, leads.id))
    .leftJoin(opportunities, eq(tasks.opportunityId, opportunities.id))
    .where(and(...whereConditions))
    .orderBy(desc(tasks.createdAt))
    .limit(limitNum)
    .offset(offset);

    // Get total count for pagination
    const totalCount = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(tasks)
    .where(and(...whereConditions));

    res.json({
      success: true,
      data: tasksList,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total: totalCount[0].count,
        pages: Math.ceil(totalCount[0].count / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
});

// GET /api/crm/task-automation/tasks/:id - Get specific task details
router.get('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;

    const [task] = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      leadId: tasks.leadId,
      opportunityId: tasks.opportunityId,
      memberId: tasks.memberId,
      assignedTo: tasks.assignedTo,
      assignedToType: tasks.assignedToType,
      category: tasks.category,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      completedBy: tasks.completedBy,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      escalatedAt: tasks.escalatedAt,
      escalatedTo: tasks.escalatedTo,
      escalationReason: tasks.escalationReason,
      estimatedHours: tasks.estimatedHours,
      checklist: tasks.checklist,
      tags: tasks.tags,
      notes: tasks.notes,
      templateId: tasks.templateId
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Parse JSON fields
    const parsedTask = {
      ...task,
      checklist: task.checklist ? JSON.parse(task.checklist as string) : [],
      tags: task.tags ? JSON.parse(task.tags as string) : []
    };

    res.json({
      success: true,
      data: parsedTask
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
});

// POST /api/crm/task-automation/tasks/from-template - Create task from template
router.post('/tasks/from-template', async (req, res) => {
  try {
    const validatedData = createTaskFromTemplateSchema.parse(req.body);

    // Convert customDueDate string to Date if provided
    if (validatedData.entityData.customDueDate) {
      validatedData.entityData.customDueDate = new Date(validatedData.entityData.customDueDate);
    }

    const result = await taskAutomationService.createTaskFromTemplate(
      validatedData.templateId,
      validatedData.entityData
    );

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.task
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

    console.error('Error creating task from template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task from template'
    });
  }
});

// PUT /api/crm/task-automation/tasks/:id - Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const validatedData = updateTaskSchema.parse(req.body);

    // Convert dueDate string to Date if provided
    const updateData: any = { ...validatedData };
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    // Convert array fields to JSON strings
    if (validatedData.checklist) {
      updateData.checklist = JSON.stringify(validatedData.checklist);
    }
    if (validatedData.tags) {
      updateData.tags = JSON.stringify(validatedData.tags);
    }

    updateData.updatedAt = new Date();

    const [updatedTask] = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
});

// POST /api/crm/task-automation/tasks/:id/status - Update task status
router.post('/tasks/:id/status', async (req, res) => {
  try {
    const taskId = req.params.id;
    const validatedData = updateTaskStatusSchema.parse(req.body);

    const result = await taskAutomationService.updateTaskStatus(
      taskId,
      validatedData.status,
      validatedData.completedBy,
      validatedData.notes
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.task
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

    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task status'
    });
  }
});

// POST /api/crm/task-automation/tasks/:id/escalate - Escalate task
router.post('/tasks/:id/escalate', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Escalation reason is required'
      });
    }

    const result = await taskAutomationService.escalateTask(taskId, reason);

    if (result.success) {
      res.json({
        success: true,
        message: 'Task escalated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error escalating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to escalate task'
    });
  }
});

// DELETE /api/crm/task-automation/tasks/:id - Delete task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;

    const [deletedTask] = await db.delete(tasks)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: deletedTask
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
});

// GET /api/crm/task-automation/statistics - Get task statistics
router.get('/statistics', async (req, res) => {
  try {
    const {
      assignedTo,
      status,
      category,
      dateRange
    } = req.query;

    let filters: any = {};

    if (assignedTo) {
      filters.assignedTo = parseInt(assignedTo as string);
    }

    if (status) {
      filters.status = status as string;
    }

    if (category) {
      filters.category = category as string;
    }

    if (dateRange) {
      const { start, end } = JSON.parse(dateRange as string);
      filters.dateRange = {
        start: new Date(start),
        end: new Date(end)
      };
    }

    const result = await taskAutomationService.getTaskStatistics(filters);

    if (result.success) {
      res.json({
        success: true,
        data: result.statistics
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting task statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get task statistics'
    });
  }
});

// GET /api/crm/task-automation/templates - Get task templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await taskAutomationService.getTaskTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error getting task templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get task templates'
    });
  }
});

// POST /api/crm/task-automation/templates - Create task template
router.post('/templates', async (req, res) => {
  try {
    const validatedData = createTaskTemplateSchema.parse(req.body);

    const result = await taskAutomationService.createTaskTemplate(validatedData);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.template
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

    console.error('Error creating task template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task template'
    });
  }
});

// GET /api/crm/task-automation/rules - Get automation rules
router.get('/rules', async (req, res) => {
  try {
    const rules = await taskAutomationService.getAutomationRules();

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error getting automation rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get automation rules'
    });
  }
});

// POST /api/crm/task-automation/rules - Create automation rule
router.post('/rules', async (req, res) => {
  try {
    const validatedData = createAutomationRuleSchema.parse(req.body);

    const result = await taskAutomationService.createAutomationRule(validatedData);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.rule
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

    console.error('Error creating automation rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create automation rule'
    });
  }
});

// GET /api/crm/task-automation/dashboard - Get dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { assignedTo } = req.query;

    let filters: any = {};
    if (assignedTo) {
      filters.assignedTo = parseInt(assignedTo as string);
    }

    // Get general statistics
    const statsResult = await taskAutomationService.getTaskStatistics(filters);

    // Get upcoming tasks (due in next 7 days)
    const upcomingTasks = await db.select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      assignedTo: tasks.assignedTo
    })
    .from(tasks)
    .where(and(
      gte(tasks.dueDate, new Date()),
      lt(tasks.dueDate, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      eq(tasks.status, 'pending'),
      ...(assignedTo ? [eq(tasks.assignedTo, parseInt(assignedTo as string))] : [])
    ))
    .orderBy(tasks.dueDate)
    .limit(10);

    // Get overdue tasks
    const overdueTasks = await db.select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      daysOverdue: sql`EXTRACT(DAYS FROM NOW() - ${tasks.dueDate})`
    })
    .from(tasks)
    .where(and(
      lt(tasks.dueDate, new Date()),
      eq(tasks.status, 'pending'),
      ...(assignedTo ? [eq(tasks.assignedTo, parseInt(assignedTo as string))] : [])
    ))
    .orderBy(tasks.dueDate)
    .limit(10);

    // Get recently completed tasks
    const recentCompleted = await db.select({
      id: tasks.id,
      title: tasks.title,
      completedAt: tasks.completedAt,
      completedBy: tasks.completedBy
    })
    .from(tasks)
    .where(and(
      eq(tasks.status, 'completed'),
      gte(tasks.completedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      ...(assignedTo ? [eq(tasks.assignedTo, parseInt(assignedTo as string))] : [])
    ))
    .orderBy(desc(tasks.completedAt))
    .limit(10);

    // Get tasks by category
    const tasksByCategory = await db.select({
      category: tasks.category,
      count: sql<number>`COUNT(*)`
    })
    .from(tasks)
    .where(and(
      eq(tasks.status, 'pending'),
      ...(assignedTo ? [eq(tasks.assignedTo, parseInt(assignedTo as string))] : [])
    ))
    .groupBy(tasks.category);

    // Get tasks by priority
    const tasksByPriority = await db.select({
      priority: tasks.priority,
      count: sql<number>`COUNT(*)`
    })
    .from(tasks)
    .where(and(
      eq(tasks.status, 'pending'),
      ...(assignedTo ? [eq(tasks.assignedTo, parseInt(assignedTo as string))] : [])
    ))
    .groupBy(tasks.priority);

    res.json({
      success: true,
      data: {
        statistics: statsResult.statistics,
        upcomingTasks,
        overdueTasks,
        recentCompleted,
        tasksByCategory,
        tasksByPriority
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data'
    });
  }
});

export default router;