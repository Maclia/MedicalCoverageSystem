import { Router } from 'express';
import { z } from 'zod';
import { leadNurturingService } from '../../services/leadNurturingService.js';
import { leads } from '../../../shared/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../../db.js';

const router = Router();

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  targetAudience: z.object({
    scoreTier: z.array(z.string()).optional(),
    leadSource: z.array(z.string()).optional(),
    industry: z.array(z.string()).optional(),
    companySize: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }).optional(),
    customCriteria: z.record(z.any()).optional()
  }),
  triggers: z.array(z.object({
    type: z.enum(['score_change', 'time_based', 'activity_based', 'manual']),
    conditions: z.record(z.any())
  })),
  workflow: z.object({
    steps: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['email', 'sms', 'task', 'delay', 'condition', 'webhook', 'content_delivery']),
      config: z.record(z.any()),
      nextStep: z.string().optional(),
      branching: z.object({
        conditions: z.array(z.object({
          condition: z.record(z.any()),
          nextStep: z.string()
        })).optional(),
        defaultNextStep: z.string().optional()
      }).optional()
    })),
    schedule: z.object({
      type: z.enum(['immediate', 'delayed', 'conditional']),
      settings: z.record(z.any())
    })
  }),
  isActive: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const startNurturingSchema = z.object({
  campaignId: z.string(),
  leadId: z.number(),
  initialVariables: z.record(z.any()).optional()
});

const getExecutionsSchema = z.object({
  campaignId: z.string().optional(),
  leadId: z.number().optional(),
  status: z.enum(['active', 'paused', 'completed', 'failed', 'cancelled']).optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => parseInt(val) || 20).optional()
});

// POST /api/crm/lead-nurturing/campaigns - Create new nurturing campaign
router.post('/campaigns', async (req, res) => {
  try {
    const validatedData = createCampaignSchema.parse(req.body);

    const result = await leadNurturingService.createCampaign(validatedData);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.campaign
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

    console.error('Error creating nurturing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create nurturing campaign'
    });
  }
});

// GET /api/crm/lead-nurturing/campaigns - Get all nurturing campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await leadNurturingService.getCampaigns();

    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Error getting nurturing campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nurturing campaigns'
    });
  }
});

// GET /api/crm/lead-nurturing/campaigns/:id - Get specific campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const campaign = await leadNurturingService.getCampaign(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error getting nurturing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nurturing campaign'
    });
  }
});

// GET /api/crm/lead-nurturing/templates - Get nurturing templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await leadNurturingService.getTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error getting nurturing templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nurturing templates'
    });
  }
});

// GET /api/crm/lead-nurturing/templates/:id - Get specific template
router.get('/templates/:id', async (req, res) => {
  try {
    const templateId = req.params.id;
    const template = await leadNurturingService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error getting nurturing template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nurturing template'
    });
  }
});

// POST /api/crm/lead-nurturing/start - Start nurturing for a lead
router.post('/start', async (req, res) => {
  try {
    const validatedData = startNurturingSchema.parse(req.body);

    const result = await leadNurturingService.startNurturing(
      validatedData.campaignId,
      validatedData.leadId,
      validatedData.initialVariables
    );

    if (result.success) {
      res.status(201).json({
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

    console.error('Error starting nurturing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start nurturing'
    });
  }
});

// POST /api/crm/lead-nurturing/start-batch - Start nurturing for multiple leads
router.post('/start-batch', async (req, res) => {
  try {
    const { campaignId, leadIds, initialVariables = {} } = req.body;

    if (!campaignId || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'campaignId and leadIds array are required'
      });
    }

    const results = [];
    const errors = [];

    for (const leadId of leadIds) {
      try {
        const result = await leadNurturingService.startNurturing(campaignId, leadId, initialVariables);
        results.push({ leadId, executionId: result.execution?.id, success: true });
      } catch (error) {
        errors.push({ leadId, error: error.message, success: false });
      }
    }

    res.json({
      success: true,
      data: {
        message: `Started nurturing for ${results.length} leads`,
        processed: leadIds.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    console.error('Error batch starting nurturing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch start nurturing'
    });
  }
});

// GET /api/crm/lead-nurturing/executions - Get nurturing executions
router.get('/executions', async (req, res) => {
  try {
    const validatedFilters = getExecutionsSchema.parse(req.query);

    const result = await leadNurturingService.getExecutions({
      ...validatedFilters,
      offset: ((validatedFilters.page || 1) - 1) * (validatedFilters.limit || 20)
    });

    // Get lead information for executions
    const executionsWithLeadData = await Promise.all(
      result.data.map(async (execution) => {
        const [lead] = await db.select({
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          email: leads.email,
          company: leads.company,
          score: leads.score,
          scoreTier: leads.scoreTier,
          assignedAgentId: leads.assignedAgentId
        })
        .from(leads)
        .where(eq(leads.id, execution.leadId));

        return {
          ...execution,
          lead: lead[0] || null
        };
      })
    );

    res.json({
      success: true,
      data: executionsWithLeadData,
      pagination: {
        page: validatedFilters.page || 1,
        limit: validatedFilters.limit || 20,
        total: result.data.length // This is simplified; in production, get total count separately
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error getting nurturing executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nurturing executions'
    });
  }
});

// GET /api/crm/lead-nurturing/executions/:id - Get specific execution details
router.get('/executions/:id', async (req, res) => {
  try {
    const executionId = req.params.id;
    const executions = await leadNurturingService.getExecutions({ executionId });

    if (executions.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }

    const execution = executions.data[0];

    // Get lead information
    const [lead] = await db.select()
      .from(leads)
      .where(eq(leads.id, execution.leadId));

    // Get campaign information
    const campaign = await leadNurturingService.getCampaign(execution.campaignId);

    res.json({
      success: true,
      data: {
        execution,
        lead: lead || null,
        campaign: campaign || null
      }
    });
  } catch (error) {
    console.error('Error getting nurturing execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nurturing execution'
    });
  }
});

// POST /api/crm/lead-nurturing/executions/:id/pause - Pause execution
router.post('/executions/:id/pause', async (req, res) => {
  try {
    const executionId = req.params.id;
    const { reason } = req.body;

    const result = await leadNurturingService.pauseExecution(executionId, reason);

    if (result.success) {
      res.json({
        success: true,
        message: 'Execution paused successfully'
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

// POST /api/crm/lead-nurturing/executions/:id/resume - Resume execution
router.post('/executions/:id/resume', async (req, res) => {
  try {
    const executionId = req.params.id;

    const result = await leadNurturingService.resumeExecution(executionId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Execution resumed successfully'
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

// POST /api/crm/lead-nurturing/executions/:id/cancel - Cancel execution
router.post('/executions/:id/cancel', async (req, res) => {
  try {
    const executionId = req.params.id;

    const result = await leadNurturingService.cancelExecution(executionId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Execution cancelled successfully'
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

// GET /api/crm/lead-nurturing/leads/:id/executions - Get executions for a specific lead
router.get('/leads/:id/executions', async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);

    if (isNaN(leadId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lead ID'
      });
    }

    const result = await leadNurturingService.getExecutions({ leadId });

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error getting lead executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lead executions'
    });
  }
});

// GET /api/crm/lead-nurturing/campaigns/:id/executions - Get executions for a specific campaign
router.get('/campaigns/:id/executions', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { status, page = 1, limit = 20 } = req.query;

    const result = await leadNurturingService.getExecutions({
      campaignId,
      status: status as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error getting campaign executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign executions'
    });
  }
});

// GET /api/crm/lead-nurturing/dashboard - Get nurturing dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const result = await leadNurturingService.getNurturingAnalytics();

    // Get additional dashboard metrics
    const [leadStats] = await db.select({
      totalLeads: sql<number>`COUNT(*)`,
      activeLeads: sql<number>`SUM(CASE WHEN ${leads.status} = 'active' THEN 1 ELSE 0 END)`,
      scoredLeads: sql<number>`SUM(CASE WHEN ${leads.score} IS NOT NULL THEN 1 ELSE 0 END)`,
      avgScore: sql<number>`AVG(${leads.score})`
    })
    .from(leads);

    // Get leads by score tier
    const scoreTierStats = await db.select({
      scoreTier: leads.scoreTier,
      count: sql<number>`COUNT(*)`
    })
    .from(leads)
    .where(sql`${leads.score} IS NOT NULL AND ${leads.scoreTier} IS NOT NULL`)
    .groupBy(leads.scoreTier);

    // Get recent leads with potential for nurturing
    const recentLeads = await db.select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      company: leads.company,
      score: leads.score,
      scoreTier: leads.scoreTier,
      leadSource: leads.leadSource,
      createdAt: leads.createdAt,
      lastScored: leads.lastScored
    })
    .from(leads)
    .where(and(
      sql`${leads.score} IS NOT NULL`,
      sql`${leads.createdAt} >= CURRENT_DATE - INTERVAL '7 days'`
    ))
    .orderBy(desc(leads.score))
    .limit(10);

    res.json({
      success: true,
      data: {
        ...result.data,
        leadStats,
        scoreTierStats,
        recentLeads
      }
    });
  } catch (error) {
    console.error('Error getting nurturing dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nurturing dashboard data'
    });
  }
});

// GET /api/crm/lead-nurturing/recommendations - Get nurturing recommendations for leads
router.get('/recommendations', async (req, res) => {
  try {
    const { leadId, scoreTier, limit = 10 } = req.query;

    let whereConditions = [
      sql`${leads.score} IS NOT NULL`,
      sql`${leads.status} = 'active'`
    ];

    if (leadId) {
      whereConditions.push(eq(leads.id, parseInt(leadId as string)));
    } else if (scoreTier) {
      whereConditions.push(eq(leads.scoreTier, scoreTier as string));
    }

    // Get leads that might benefit from nurturing
    const recommendedLeads = await db.select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      company: leads.company,
      score: leads.score,
      scoreTier: leads.scoreTier,
      leadSource: leads.leadSource,
      lastScored: leads.lastScored,
      assignedAgentId: leads.assignedAgentId,
      // Get activity count
      activities: sql`(
        SELECT COUNT(*) FROM activities WHERE activities.lead_id = leads.id AND activities.activity_date >= CURRENT_DATE - INTERVAL '7 days'
      )`
    })
    .from(leads)
    .where(and(...whereConditions))
    .orderBy(desc(leads.score))
    .limit(parseInt(limit as string));

    // Get available campaigns
    const campaigns = await leadNurturingService.getCampaigns();
    const activeCampaigns = campaigns.filter(c => c.isActive);

    // Get templates for suggestions
    const templates = await leadNurturingService.getTemplates();

    const recommendations = recommendedLeads.map(lead => {
      // Suggest campaigns based on lead score tier
      const suggestedCampaigns = activeCampaigns
        .filter(campaign => {
          const targetAudience = campaign.targetAudience;
          return !targetAudience.scoreTier ||
                 targetAudience.scoreTier.length === 0 ||
                 targetAudience.scoreTier.includes(lead.scoreTier || '');
        })
        .slice(0, 3)
        .map(c => ({ id: c.id, name: c.name, priority: c.priority }));

      // Suggest templates based on score tier
      const suggestedTemplates = templates
        .filter(template => {
          return (!template.leadScoreMin || lead.score >= template.leadScoreMin) &&
                 (!template.leadScoreMax || lead.score <= template.leadScoreMax);
        })
        .slice(0, 3)
        .map(t => ({ id: t.id, name: t.name, category: t.category, duration: t.estimatedDuration }));

      return {
        ...lead,
        suggestedCampaigns,
        suggestedTemplates,
        nurturingPriority: this.calculateNurturingPriority(lead)
      };
    });

    res.json({
      success: true,
      data: {
        recommendations,
        availableCampaigns: activeCampaigns.length,
        availableTemplates: templates.length
      }
    });
  } catch (error) {
    console.error('Error getting nurturing recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nurturing recommendations'
    });
  }
});

// Helper function to calculate nurturing priority
function calculateNurturingPriority(lead: any): 'high' | 'medium' | 'low' {
  const score = lead.score || 0;
  const activities = lead.activities || 0;

  if (score >= 80 || (score >= 60 && activities === 0)) {
    return 'high';
  } else if (score >= 50 || (score >= 30 && activities <= 2)) {
    return 'medium';
  } else {
    return 'low';
  }
}

export default router;