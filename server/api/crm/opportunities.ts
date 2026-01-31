import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import {
  salesOpportunities,
  leads,
  users,
  insertSalesOpportunitySchema
} from '../../../shared/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';

const router = Router();

// GET /api/crm/opportunities - List opportunities with pipeline view
router.get('/', async (req, res) => {
  try {
    const {
      stage,
      owner,
      dateRange,
      value,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query conditions
    let whereConditions = [];

    if (stage) {
      whereConditions.push(eq(salesOpportunities.stage, stage as string));
    }
    if (owner) {
      whereConditions.push(eq(salesOpportunities.ownerId, parseInt(owner as string)));
    }

    // Build order by
    let orderBy;
    const sortField = salesOpportunities[sortBy as keyof typeof salesOpportunities];
    if (sortField) {
      orderBy = sortOrder === 'desc' ? desc(sortField) : asc(sortField);
    } else {
      orderBy = desc(salesOpportunities.createdAt);
    }

    // Get opportunities with lead and owner details
    const opportunitiesQuery = db.select({
      id: salesOpportunities.id,
      leadId: salesOpportunities.leadId,
      opportunityName: salesOpportunities.opportunityName,
      stage: salesOpportunities.stage,
      estimatedValue: salesOpportunities.estimatedValue,
      actualValue: salesOpportunities.actualValue,
      probability: salesOpportunities.probability,
      expectedCloseDate: salesOpportunities.expectedCloseDate,
      actualCloseDate: salesOpportunities.actualCloseDate,
      ownerId: salesOpportunities.ownerId,
      createdAt: salesOpportunities.createdAt,
      updatedAt: salesOpportunities.updatedAt,
      // Lead details
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
      leadEmail: leads.email,
      leadCompany: leads.companyName,
      leadStatus: leads.leadStatus,
      // Owner details
      ownerName: users.email,
    })
    .from(salesOpportunities)
    .leftJoin(leads, eq(salesOpportunities.leadId, leads.id))
    .leftJoin(users, eq(salesOpportunities.ownerId, users.id));

    // Apply where conditions
    if (whereConditions.length > 0) {
      whereConditions.reduce((query, condition) => query.where(condition), opportunitiesQuery);
    }

    const allOpportunities = await opportunitiesQuery.orderBy(orderBy);

    // Group by stage for pipeline view
    const pipelineData = allOpportunities.reduce((acc, opportunity) => {
      const stage = opportunity.stage;
      if (!acc[stage]) {
        acc[stage] = [];
      }
      acc[stage].push(opportunity);
      return acc;
    }, {} as Record<string, typeof allOpportunities>);

    // Calculate pipeline metrics
    const totalEstimatedValue = allOpportunities.reduce((sum, opp) =>
      sum + (opp.estimatedValue || 0), 0);

    const totalActualValue = allOpportunities.reduce((sum, opp) =>
      sum + (opp.actualValue || 0), 0);

    const averageProbability = allOpportunities.length > 0
      ? allOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / allOpportunities.length
      : 0;

    res.json({
      success: true,
      data: {
        opportunities: allOpportunities,
        pipeline: pipelineData,
        metrics: {
          totalOpportunities: allOpportunities.length,
          totalEstimatedValue,
          totalActualValue,
          averageProbability: Math.round(averageProbability),
          stages: Object.keys(pipelineData)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities'
    });
  }
});

// POST /api/crm/opportunities - Create opportunity from lead
router.post('/', async (req, res) => {
  try {
    const validatedData = insertSalesOpportunitySchema.parse(req.body);

    // Validate lead exists and is not already converted
    const [lead] = await db.select()
      .from(leads)
      .where(eq(leads.id, validatedData.leadId))
      .limit(1);

    if (!lead) {
      return res.status(400).json({
        success: false,
        error: 'Lead not found'
      });
    }

    if (lead.leadStatus === 'converted') {
      return res.status(400).json({
        success: false,
        error: 'Cannot create opportunity for converted lead'
      });
    }

    // Validate owner exists
    const [owner] = await db.select()
      .from(users)
      .where(eq(users.id, validatedData.ownerId))
      .limit(1);

    if (!owner) {
      return res.status(400).json({
        success: false,
        error: 'Owner not found'
      });
    }

    // Check if opportunity already exists for this lead
    const existingOpportunity = await db.select()
      .from(salesOpportunities)
      .where(eq(salesOpportunities.leadId, validatedData.leadId))
      .limit(1);

    if (existingOpportunity.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Opportunity already exists for this lead'
      });
    }

    const [newOpportunity] = await db.insert(salesOpportunities)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Update lead status to indicate opportunity created
    await db.update(leads)
      .set({
        leadStatus: 'qualified',
        updatedAt: new Date()
      })
      .where(eq(leads.id, validatedData.leadId));

    res.status(201).json({ success: true, data: newOpportunity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create opportunity'
    });
  }
});

// PUT /api/crm/opportunities/:id - Update opportunity
router.put('/:id', async (req, res) => {
  try {
    const opportunityId = req.params.id;

    const validatedData = insertSalesOpportunitySchema.partial().parse(req.body);
    validatedData.updatedAt = new Date();

    // Validate owner if provided
    if (validatedData.ownerId) {
      const owner = await db.select()
        .from(users)
        .where(eq(users.id, validatedData.ownerId))
        .limit(1);

      if (owner.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Owner not found'
        });
      }
    }

    const [updatedOpportunity] = await db.update(salesOpportunities)
      .set(validatedData)
      .where(eq(salesOpportunities.id, opportunityId))
      .returning();

    if (!updatedOpportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({ success: true, data: updatedOpportunity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update opportunity'
    });
  }
});

// POST /api/crm/opportunities/:id/move-stage - Move opportunity to next stage
router.post('/:id/move-stage', async (req, res) => {
  try {
    const opportunityId = req.params.id;
    const { newStage, notes } = req.body;

    // Validate stage
    const validStages = ['lead', 'qualified', 'quotation', 'underwriting', 'issuance', 'closed_won', 'closed_lost'];
    if (!validStages.includes(newStage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage'
      });
    }

    // Get current opportunity
    const [currentOpportunity] = await db.select()
      .from(salesOpportunities)
      .where(eq(salesOpportunities.id, opportunityId))
      .limit(1);

    if (!currentOpportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    // Business rules for stage progression
    let probabilityAdjustment = 0;
    let actualCloseDate = null;

    switch (newStage) {
      case 'qualified':
        probabilityAdjustment = 25;
        break;
      case 'quotation':
        probabilityAdjustment = 50;
        break;
      case 'underwriting':
        probabilityAdjustment = 75;
        break;
      case 'issuance':
        probabilityAdjustment = 90;
        break;
      case 'closed_won':
        probabilityAdjustment = 100;
        actualCloseDate = new Date();
        break;
      case 'closed_lost':
        probabilityAdjustment = 0;
        actualCloseDate = new Date();
        break;
    }

    const [updatedOpportunity] = await db.update(salesOpportunities)
      .set({
        stage: newStage,
        probability: probabilityAdjustment,
        actualCloseDate,
        updatedAt: new Date()
      })
      .where(eq(salesOpportunities.id, opportunityId))
      .returning();

    // Update lead status based on opportunity stage
    const leadStatusMap: Record<string, string> = {
      'qualified': 'qualified',
      'quotation': 'nurturing',
      'underwriting': 'nurturing',
      'issuance': 'nurturing',
      'closed_won': 'converted',
      'closed_lost': 'lost'
    };

    const newLeadStatus = leadStatusMap[newStage];
    if (newLeadStatus) {
      await db.update(leads)
        .set({
          leadStatus: newLeadStatus,
          conversionDate: newStage === 'closed_won' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(leads.id, currentOpportunity.leadId));
    }

    // Log stage change activity (would require salesActivities table)
    // This would be implemented when we create the activities API

    res.json({
      success: true,
      data: {
        opportunity: updatedOpportunity,
        stageChange: {
          fromStage: currentOpportunity.stage,
          toStage: newStage,
          probabilityAdjustment,
          notes
        }
      }
    });
  } catch (error) {
    console.error('Error moving opportunity stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to move opportunity stage'
    });
  }
});

// GET /api/crm/opportunities/:id - Get specific opportunity details
router.get('/:id', async (req, res) => {
  try {
    const opportunityId = req.params.id;

    const [opportunity] = await db.select({
      id: salesOpportunities.id,
      leadId: salesOpportunities.leadId,
      opportunityName: salesOpportunities.opportunityName,
      stage: salesOpportunities.stage,
      estimatedValue: salesOpportunities.estimatedValue,
      actualValue: salesOpportunities.actualValue,
      probability: salesOpportunities.probability,
      expectedCloseDate: salesOpportunities.expectedCloseDate,
      actualCloseDate: salesOpportunities.actualCloseDate,
      ownerId: salesOpportunities.ownerId,
      createdAt: salesOpportunities.createdAt,
      updatedAt: salesOpportunities.updatedAt,
      // Lead details
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
      leadEmail: leads.email,
      leadPhone: leads.phone,
      leadCompany: leads.companyName,
      leadStatus: leads.leadStatus,
      leadSource: leads.leadSource,
      leadScore: leads.leadScore,
      // Owner details
      ownerName: users.email,
    })
    .from(salesOpportunities)
    .leftJoin(leads, eq(salesOpportunities.leadId, leads.id))
    .leftJoin(users, eq(salesOpportunities.ownerId, users.id))
    .where(eq(salesOpportunities.id, opportunityId));

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({ success: true, data: opportunity });
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunity'
    });
  }
});

// DELETE /api/crm/opportunities/:id - Delete opportunity
router.delete('/:id', async (req, res) => {
  try {
    const opportunityId = req.params.id;

    const [deletedOpportunity] = await db.delete(salesOpportunities)
      .where(eq(salesOpportunities.id, opportunityId))
      .returning();

    if (!deletedOpportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({ success: true, data: deletedOpportunity });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete opportunity'
    });
  }
});

export default router;