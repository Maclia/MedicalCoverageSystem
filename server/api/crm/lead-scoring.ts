import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { leads, salesOpportunities, agents } from '../../../shared/schema.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { leadScoringService } from '../../services/leadScoringService.js';

const router = Router();

// Validation schemas
const scoreLeadSchema = z.object({
  leadId: z.number(),
  modelId: z.string().optional().default('default_model_v1')
});

const createScoringModelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  version: z.string().min(1).max(20),
  criteria: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['demographic', 'behavioral', 'firmographic', 'engagement', 'custom']),
    weight: z.number().min(0).max(100),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'contains', 'greater_than', 'less_than', 'in_range', 'not_equals']),
      value: z.any(),
      score: z.number().min(0)
    })),
    isActive: z.boolean().default(true),
    description: z.string().optional()
  })),
  thresholds: z.object({
    hot: z.number().min(0),
    warm: z.number().min(0),
    cool: z.number().min(0),
    cold: z.number().min(0)
  }),
  isActive: z.boolean().default(true)
});

const updateScoringModelSchema = createScoringModelSchema.partial();

const getLeadScoresSchema = z.object({
  scoreTier: z.enum(['hot', 'warm', 'cool', 'cold']).optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),
  assignedAgentId: z.number().optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => parseInt(val) || 20).optional()
});

// POST /api/crm/lead-scoring/score - Calculate score for a specific lead
router.post('/score', async (req, res) => {
  try {
    const validatedData = scoreLeadSchema.parse(req.body);

    const score = await leadScoringService.calculateLeadScore(
      validatedData.leadId,
      validatedData.modelId
    );

    res.json({
      success: true,
      data: score
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error scoring lead:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to score lead'
    });
  }
});

// POST /api/crm/lead-scoring/score-batch - Score multiple leads
router.post('/score-batch', async (req, res) => {
  try {
    const { leadIds, modelId = 'default_model_v1' } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'leadIds must be a non-empty array'
      });
    }

    const results = [];
    const errors = [];

    for (const leadId of leadIds) {
      try {
        const score = await leadScoringService.calculateLeadScore(leadId, modelId);
        results.push({ leadId, score, success: true });
      } catch (error) {
        errors.push({ leadId, error: error.message, success: false });
      }
    }

    res.json({
      success: true,
      data: {
        processed: leadIds.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    console.error('Error batch scoring leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch score leads'
    });
  }
});

// GET /api/crm/lead-scoring/scores - Get scored leads with filters
router.get('/scores', async (req, res) => {
  try {
    const validatedFilters = getLeadScoresSchema.parse(req.query);

    const result = await leadScoringService.getLeadScores({
      ...validatedFilters,
      offset: ((validatedFilters.page || 1) - 1) * (validatedFilters.limit || 20)
    });

    // Get total count for pagination
    let totalCount = result.data.length;
    if (validatedFilters.limit && result.data.length === validatedFilters.limit) {
      // Fetch total count separately if we hit the limit
      const whereConditions = [sql`${leads.score} IS NOT NULL`];

      if (validatedFilters.scoreTier) {
        whereConditions.push(eq(leads.scoreTier, validatedFilters.scoreTier));
      }
      if (validatedFilters.minScore) {
        whereConditions.push(gte(leads.score, validatedFilters.minScore));
      }
      if (validatedFilters.maxScore) {
        whereConditions.push(sql`${leads.score} <= ${validatedFilters.maxScore}`);
      }
      if (validatedFilters.assignedAgentId) {
        whereConditions.push(eq(leads.assignedAgentId, validatedFilters.assignedAgentId));
      }

      const [countResult] = await db.select({
        count: sql<number>`COUNT(*)`
      })
      .from(leads)
      .where(and(...whereConditions));

      totalCount = countResult.count;
    }

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: validatedFilters.page || 1,
        limit: validatedFilters.limit || 20,
        total: totalCount,
        pages: Math.ceil(totalCount / (validatedFilters.limit || 20))
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

    console.error('Error getting lead scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lead scores'
    });
  }
});

// GET /api/crm/lead-scoring/scores/:id - Get score details for a specific lead
router.get('/scores/:id', async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);

    if (isNaN(leadId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lead ID'
      });
    }

    const score = await leadScoringService.calculateLeadScore(leadId);

    // Get lead details
    const [lead] = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId));

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          company: lead.company,
          status: lead.status,
          assignedAgentId: lead.assignedAgentId
        },
        score
      }
    });
  } catch (error) {
    console.error('Error getting lead score details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get lead score details'
    });
  }
});

// GET /api/crm/lead-scoring/dashboard - Get scoring dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const result = await leadScoringService.getScoringInsights();

    // Get additional dashboard metrics
    const [recentScores] = await db.select({
      todayCount: sql<number>`COUNT(*) FILTER (WHERE ${leads.lastScored} >= CURRENT_DATE)`,
      weekCount: sql<number>`COUNT(*) FILTER (WHERE ${leads.lastScored} >= CURRENT_DATE - INTERVAL '7 days')`,
      monthCount: sql<number>`COUNT(*) FILTER (WHERE ${leads.lastScored} >= CURRENT_DATE - INTERVAL '30 days')`,
      avgScore: sql<number>`AVG(${leads.score})`
    })
    .from(leads)
    .where(sql`${leads.score} IS NOT NULL`);

    // Get top scoring leads by agent
    const topLeadsByAgent = await db.select({
      agentId: leads.assignedAgentId,
      agentName: sql`COALESCE(
        (SELECT ${agents.firstName} || ' ' || ${agents.lastName} FROM agents WHERE ${agents.id} = ${leads.assignedAgentId}),
        'Unassigned'
      )`,
      totalLeads: sql<number>`COUNT(*)`,
      avgScore: sql<number>`AVG(${leads.score})`,
      hotLeads: sql<number>`SUM(CASE WHEN ${leads.scoreTier} = 'hot' THEN 1 ELSE 0 END)`
    })
    .from(leads)
    .where(and(
      sql`${leads.score} IS NOT NULL`,
      sql`${leads.assignedAgentId} IS NOT NULL`
    ))
    .groupBy(leads.assignedAgentId)
    .orderBy(sql`AVG(${leads.score}) DESC`)
    .limit(10);

    // Get recent scoring activity
    const recentActivity = await db.select({
      leadId: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      company: leads.company,
      score: leads.score,
      scoreTier: leads.scoreTier,
      lastScored: leads.lastScored,
      previousScore: sql`(SELECT score FROM lead_score_history WHERE lead_id = ${leads.id} ORDER BY created_at DESC LIMIT 1 OFFSET 1)`,
      scoreChange: sql`${leads.score} - COALESCE((SELECT score FROM lead_score_history WHERE lead_id = ${leads.id} ORDER BY created_at DESC LIMIT 1 OFFSET 1), ${leads.score})`
    })
    .from(leads)
    .where(and(
      sql`${leads.lastScored} IS NOT NULL`,
      sql`${leads.lastScored} >= CURRENT_DATE - INTERVAL '7 days'`
    ))
    .orderBy(desc(leads.lastScored))
    .limit(20);

    res.json({
      success: true,
      data: {
        ...result.data,
        recentScores,
        topLeadsByAgent,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error getting scoring dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scoring dashboard data'
    });
  }
});

// POST /api/crm/lead-scoring/models - Create new scoring model
router.post('/models', async (req, res) => {
  try {
    const validatedData = createScoringModelSchema.parse(req.body);

    const result = await leadScoringService.createScoringModel(validatedData);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.model
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

    console.error('Error creating scoring model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create scoring model'
    });
  }
});

// GET /api/crm/lead-scoring/models - Get all scoring models
router.get('/models', async (req, res) => {
  try {
    const models = await leadScoringService.getScoringModels();

    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error('Error getting scoring models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scoring models'
    });
  }
});

// GET /api/crm/lead-scoring/models/:id - Get specific scoring model
router.get('/models/:id', async (req, res) => {
  try {
    const modelId = req.params.id;
    const model = await leadScoringService.getScoringModel(modelId);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Scoring model not found'
      });
    }

    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('Error getting scoring model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scoring model'
    });
  }
});

// PUT /api/crm/lead-scoring/models/:id - Update scoring model
router.put('/models/:id', async (req, res) => {
  try {
    const modelId = req.params.id;
    const validatedData = updateScoringModelSchema.parse(req.body);

    const result = await leadScoringService.updateScoringModel(modelId, validatedData);

    if (result.success) {
      res.json({
        success: true,
        data: result.model
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

    console.error('Error updating scoring model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scoring model'
    });
  }
});

// POST /api/crm/lead-scoring/recalculate - Recalculate all leads
router.post('/recalculate', async (req, res) => {
  try {
    const { modelId = 'default_model_v1', limit = 100 } = req.body;

    // Get leads to recalculate (excluding those scored in last hour)
    const leadsToScore = await db.select({ id: leads.id })
      .from(leads)
      .where(and(
        eq(leads.status, 'active'),
        sql`${leads.lastScored} IS NULL OR ${leads.lastScored} < NOW() - INTERVAL '1 hour'`
      ))
      .limit(limit);

    const results = [];
    const errors = [];

    for (const lead of leadsToScore) {
      try {
        const score = await leadScoringService.calculateLeadScore(lead.id, modelId);
        results.push({ leadId: lead.id, score: score.totalScore, success: true });
      } catch (error) {
        errors.push({ leadId: lead.id, error: error.message, success: false });
      }
    }

    res.json({
      success: true,
      data: {
        message: `Recalculated ${results.length} lead scores`,
        processed: leadsToScore.length,
        successful: results.length,
        failed: errors.length,
        results: results.slice(0, 10), // Return first 10 for preview
        errors: errors.slice(0, 5) // Return first 5 errors
      }
    });
  } catch (error) {
    console.error('Error recalculating lead scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate lead scores'
    });
  }
});

// GET /api/crm/lead-scoring/analytics - Get detailed analytics
router.get('/analytics', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    // Calculate date range based on timeframe
    let dateCondition;
    switch (timeframe) {
      case '7d':
        dateCondition = sql`${leads.lastScored} >= CURRENT_DATE - INTERVAL '7 days'`;
        break;
      case '30d':
        dateCondition = sql`${leads.lastScored} >= CURRENT_DATE - INTERVAL '30 days'`;
        break;
      case '90d':
        dateCondition = sql`${leads.lastScored} >= CURRENT_DATE - INTERVAL '90 days'`;
        break;
      default:
        dateCondition = sql`${leads.lastScored} >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    // Score trends over time
    const scoreTrends = await db.select({
      date: sql`DATE(${leads.lastScored})`,
      avgScore: sql<number>`AVG(${leads.score})`,
      totalScored: sql<number>`COUNT(*)`,
      hotLeads: sql<number>`SUM(CASE WHEN ${leads.scoreTier} = 'hot' THEN 1 ELSE 0 END)`
    })
    .from(leads)
    .where(and(
      dateCondition,
      sql`${leads.score} IS NOT NULL`
    ))
    .groupBy(sql`DATE(${leads.lastScored})`)
    .orderBy(sql`DATE(${leads.lastScored})`);

    // Category performance analysis
    const categoryPerformance = await db.select({
      scoreTier: leads.scoreTier,
      count: sql<number>`COUNT(*)`,
      avgScore: sql<number>`AVG(${leads.score})`,
      conversionRate: sql<number>`(SUM(CASE WHEN EXISTS (
        SELECT 1 FROM ${salesOpportunities} WHERE ${salesOpportunities.leadId} = ${leads.id} AND ${salesOpportunities.stage} = 'closed_won'
      ) THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`
    })
    .from(leads)
    .where(and(
      dateCondition,
      sql`${leads.score} IS NOT NULL`,
      sql`${leads.scoreTier} IS NOT NULL`
    ))
    .groupBy(leads.scoreTier);

    // Top performing score ranges
    const scoreRanges = [
      { min: 90, max: 100, label: '90-100' },
      { min: 80, max: 89, label: '80-89' },
      { min: 70, max: 79, label: '70-79' },
      { min: 60, max: 69, label: '60-69' },
      { min: 50, max: 59, label: '50-59' },
      { min: 0, max: 49, label: '0-49' }
    ];

    const scoreRangeAnalysis = await Promise.all(
      scoreRanges.map(async (range) => {
        const [result] = await db.select({
          count: sql<number>`COUNT(*)`,
          avgScore: sql<number>`AVG(${leads.score})`,
          conversionRate: sql<number>`(SUM(CASE WHEN EXISTS (
            SELECT 1 FROM ${salesOpportunities} WHERE ${salesOpportunities.leadId} = ${leads.id} AND ${salesOpportunities.stage} = 'closed_won'
          ) THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`
        })
        .from(leads)
        .where(and(
          dateCondition,
          gte(leads.score, range.min),
          lte(leads.score, range.max)
        ));

        return {
          range: range.label,
          ...result
        };
      })
    );

    res.json({
      success: true,
      data: {
        timeframe,
        scoreTrends,
        categoryPerformance,
        scoreRangeAnalysis
      }
    });
  } catch (error) {
    console.error('Error getting lead scoring analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lead scoring analytics'
    });
  }
});

export default router;