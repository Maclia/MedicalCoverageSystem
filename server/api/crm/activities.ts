import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import {
  salesActivities,
  leads,
  salesOpportunities,
  members,
  users,
  insertSalesActivitySchema
} from '../../../shared/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';

const router = Router();

// GET /api/crm/activities - List activities with filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
      agentId,
      dateRange,
      leadId,
      opportunityId,
      memberId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build query conditions
    let whereConditions = [];

    if (type) {
      whereConditions.push(eq(salesActivities.activityType, type as string));
    }
    if (agentId) {
      whereConditions.push(eq(salesActivities.agentId, parseInt(agentId as string)));
    }
    if (leadId) {
      whereConditions.push(eq(salesActivities.leadId, leadId as string));
    }
    if (opportunityId) {
      whereConditions.push(eq(salesActivities.opportunityId, opportunityId as string));
    }
    if (memberId) {
      whereConditions.push(eq(salesActivities.memberId, parseInt(memberId as string)));
    }

    // Date range filtering
    if (dateRange) {
      const [startDate, endDate] = (dateRange as string).split(',');
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereConditions.push(
        and(
          salesActivities.createdAt.gte(start),
          salesActivities.createdAt.lte(end)
        )
      );
    }

    // Build order by
    let orderBy;
    const sortField = salesActivities[sortBy as keyof typeof salesActivities];
    if (sortField) {
      orderBy = sortOrder === 'desc' ? desc(sortField) : asc(sortField);
    } else {
      orderBy = desc(salesActivities.createdAt);
    }

    // Get activities with related entities and agent details
    const activitiesQuery = db.select({
      id: salesActivities.id,
      leadId: salesActivities.leadId,
      opportunityId: salesActivities.opportunityId,
      memberId: salesActivities.memberId,
      agentId: salesActivities.agentId,
      activityType: salesActivities.activityType,
      subject: salesActivities.subject,
      description: salesActivities.description,
      outcome: salesActivities.outcome,
      nextStep: salesActivities.nextStep,
      nextFollowUpDate: salesActivities.nextFollowUpDate,
      createdAt: salesActivities.createdAt,
      // Lead details
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
      leadEmail: leads.email,
      leadCompany: leads.companyName,
      // Opportunity details
      opportunityName: salesOpportunities.opportunityName,
      opportunityStage: salesOpportunities.stage,
      // Member details
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      // Agent details
      agentName: users.email,
    })
    .from(salesActivities)
    .leftJoin(leads, eq(salesActivities.leadId, leads.id))
    .leftJoin(salesOpportunities, eq(salesActivities.opportunityId, salesOpportunities.id))
    .leftJoin(members, eq(salesActivities.memberId, members.id))
    .leftJoin(users, eq(salesActivities.agentId, users.id));

    // Apply where conditions
    if (whereConditions.length > 0) {
      whereConditions.reduce((query, condition) => query.where(condition), activitiesQuery);
    }

    const allActivities = await activitiesQuery.orderBy(orderBy);

    // Get total count for pagination
    const totalCount = allActivities.length;
    const paginatedActivities = allActivities.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginatedActivities,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities'
    });
  }
});

// POST /api/crm/activities - Log new activity
router.post('/', async (req, res) => {
  try {
    const validatedData = insertSalesActivitySchema.parse(req.body);

    // Validate agent exists
    const agent = await db.select()
      .from(users)
      .where(eq(users.id, validatedData.agentId))
      .limit(1);

    if (agent.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Validate at least one related entity exists
    let relatedEntityFound = false;
    let errorMessage = '';

    if (validatedData.leadId) {
      const lead = await db.select()
        .from(leads)
        .where(eq(leads.id, validatedData.leadId))
        .limit(1);
      if (lead.length > 0) {
        relatedEntityFound = true;
      } else {
        errorMessage = 'Lead not found';
      }
    }

    if (validatedData.opportunityId) {
      const opportunity = await db.select()
        .from(salesOpportunities)
        .where(eq(salesOpportunities.id, validatedData.opportunityId))
        .limit(1);
      if (opportunity.length > 0) {
        relatedEntityFound = true;
      } else {
        errorMessage = errorMessage ? 'Lead and Opportunity not found' : 'Opportunity not found';
      }
    }

    if (validatedData.memberId) {
      const member = await db.select()
        .from(members)
        .where(eq(members.id, validatedData.memberId))
        .limit(1);
      if (member.length > 0) {
        relatedEntityFound = true;
      } else {
        errorMessage = errorMessage ? 'Related entities not found' : 'Member not found';
      }
    }

    if (!relatedEntityFound) {
      return res.status(400).json({
        success: false,
        error: errorMessage || 'No valid related entity provided'
      });
    }

    const [newActivity] = await db.insert(salesActivities)
      .values({
        ...validatedData,
        createdAt: new Date()
      })
      .returning();

    // Update lead last contact date if this is a lead activity
    if (validatedData.leadId) {
      await db.update(leads)
        .set({
          lastContactDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(leads.id, validatedData.leadId));
    }

    res.status(201).json({ success: true, data: newActivity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create activity'
    });
  }
});

// GET /api/crm/activities/timeline/:leadId - Get lead timeline
router.get('/timeline/:leadId', async (req, res) => {
  try {
    const leadId = req.params.id;

    // Validate lead exists
    const [lead] = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Get all activities for this lead in chronological order
    const activities = await db.select({
      id: salesActivities.id,
      activityType: salesActivities.activityType,
      subject: salesActivities.subject,
      description: salesActivities.description,
      outcome: salesActivities.outcome,
      nextStep: salesActivities.nextStep,
      nextFollowUpDate: salesActivities.nextFollowUpDate,
      createdAt: salesActivities.createdAt,
      // Agent details
      agentName: users.email,
    })
    .from(salesActivities)
    .leftJoin(users, eq(salesActivities.agentId, users.id))
    .where(eq(salesActivities.leadId, leadId))
    .orderBy(desc(salesActivities.createdAt));

    // Get opportunities for this lead
    const opportunities = await db.select()
      .from(salesOpportunities)
      .where(eq(salesOpportunities.leadId, leadId))
      .orderBy(desc(salesOpportunities.createdAt));

    // Combine activities and opportunity changes into a timeline
    const timeline = [];

    // Add activities
    activities.forEach(activity => {
      timeline.push({
        type: 'activity',
        timestamp: activity.createdAt,
        data: {
          activityType: activity.activityType,
          subject: activity.subject,
          description: activity.description,
          outcome: activity.outcome,
          nextStep: activity.nextStep,
          nextFollowUpDate: activity.nextFollowUpDate,
          agentName: activity.agentName
        }
      });
    });

    // Add opportunity stage changes
    opportunities.forEach(opportunity => {
      timeline.push({
        type: 'opportunity_created',
        timestamp: opportunity.createdAt,
        data: {
          opportunityName: opportunity.opportunityName,
          stage: opportunity.stage,
          estimatedValue: opportunity.estimatedValue,
          probability: opportunity.probability
        }
      });

      if (opportunity.actualCloseDate) {
        timeline.push({
          type: 'opportunity_closed',
          timestamp: opportunity.actualCloseDate,
          data: {
            opportunityName: opportunity.opportunityName,
            stage: opportunity.stage,
            actualValue: opportunity.actualValue
          }
        });
      }
    });

    // Add lead status changes
    if (lead.conversionDate) {
      timeline.push({
        type: 'lead_converted',
        timestamp: lead.conversionDate,
        data: {
          leadStatus: lead.leadStatus
        }
      });
    }

    // Sort timeline by timestamp (most recent first)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          companyName: lead.companyName,
          leadStatus: lead.leadStatus,
          createdAt: lead.createdAt
        },
        timeline,
        opportunities
      }
    });
  } catch (error) {
    console.error('Error fetching lead timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead timeline'
    });
  }
});

// PUT /api/crm/activities/:id - Update activity
router.put('/:id', async (req, res) => {
  try {
    const activityId = req.params.id;

    const validatedData = insertSalesActivitySchema.partial().parse(req.body);

    const [updatedActivity] = await db.update(salesActivities)
      .set(validatedData)
      .where(eq(salesActivities.id, activityId))
      .returning();

    if (!updatedActivity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.json({ success: true, data: updatedActivity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update activity'
    });
  }
});

// DELETE /api/crm/activities/:id - Delete activity
router.delete('/:id', async (req, res) => {
  try {
    const activityId = req.params.id;

    const [deletedActivity] = await db.delete(salesActivities)
      .where(eq(salesActivities.id, activityId))
      .returning();

    if (!deletedActivity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.json({ success: true, data: deletedActivity });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete activity'
    });
  }
});

// GET /api/crm/activities/dashboard - Get activity dashboard metrics
router.get('/dashboard/metrics', async (req, res) => {
  try {
    const { agentId, dateRange } = req.query;

    // Base query conditions
    let whereConditions = [];
    if (agentId) {
      whereConditions.push(eq(salesActivities.agentId, parseInt(agentId as string)));
    }

    // Date range filtering
    if (dateRange) {
      const [startDate, endDate] = (dateRange as string).split(',');
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereConditions.push(
        and(
          salesActivities.createdAt.gte(start),
          salesActivities.createdAt.lte(end)
        )
      );
    }

    const activitiesQuery = db.select()
      .from(salesActivities)
      .where(and(...whereConditions));

    const activities = await activitiesQuery;

    // Calculate metrics
    const totalActivities = activities.length;

    const activitiesByType = activities.reduce((acc, activity) => {
      acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activitiesWithFollowUp = activities.filter(activity =>
      activity.nextFollowUpDate !== null
    ).length;

    const recentActivities = activities.filter(activity => {
      const activityDate = new Date(activity.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return activityDate >= weekAgo;
    }).length;

    // Activities per day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activitiesPerDay = activities
      .filter(activity => new Date(activity.createdAt) >= thirtyDaysAgo)
      .reduce((acc, activity) => {
        const date = activity.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        totalActivities,
        activitiesByType,
        activitiesWithFollowUp,
        recentActivities,
        activitiesPerDay
      }
    });
  } catch (error) {
    console.error('Error fetching activity dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity dashboard metrics'
    });
  }
});

export default router;