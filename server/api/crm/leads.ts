import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import {
  leads,
  salesOpportunities,
  salesActivities,
  users,
  members,
  insertLeadSchema,
  insertSalesActivitySchema
} from '../../../shared/schema.js';
import { eq, and, desc, asc, ilike, or } from 'drizzle-orm';

const router = Router();

// GET /api/crm/leads - List leads with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      priority,
      assignedAgent,
      source,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build query conditions
    let whereConditions = [];

    if (status) {
      whereConditions.push(eq(leads.leadStatus, status as string));
    }
    if (priority) {
      whereConditions.push(eq(leads.priority, priority as string));
    }
    if (assignedAgent) {
      whereConditions.push(eq(leads.assignedAgentId, parseInt(assignedAgent as string)));
    }
    if (source) {
      whereConditions.push(eq(leads.leadSource, source as string));
    }
    if (search) {
      whereConditions.push(
        or(
          ilike(leads.firstName, `%${search}%`),
          ilike(leads.lastName, `%${search}%`),
          ilike(leads.email, `%${search}%`),
          ilike(leads.companyName, `%${search}%`)
        )
      );
    }

    // Build order by
    let orderBy;
    const sortField = leads[sortBy as keyof typeof leads];
    if (sortField) {
      orderBy = sortOrder === 'desc' ? desc(sortField) : asc(sortField);
    } else {
      orderBy = desc(leads.createdAt);
    }

    // Get leads with agent details
    const leadsQuery = db.select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      phone: leads.phone,
      companyName: leads.companyName,
      leadSource: leads.leadSource,
      leadStatus: leads.leadStatus,
      priority: leads.priority,
      leadScore: leads.leadScore,
      memberType: leads.memberType,
      schemeInterest: leads.schemeInterest,
      estimatedCoverage: leads.estimatedCoverage,
      estimatedPremium: leads.estimatedPremium,
      assignedAgentId: leads.assignedAgentId,
      firstContactDate: leads.firstContactDate,
      lastContactDate: leads.lastContactDate,
      nextFollowUpDate: leads.nextFollowUpDate,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      // Agent details
      agentName: users.email, // Could be enhanced with user profile fields
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedAgentId, users.id));

    // Apply where conditions
    if (whereConditions.length > 0) {
      whereConditions.reduce((query, condition) => query.where(condition), leadsQuery);
    }

    const allLeads = await leadsQuery.orderBy(orderBy);

    // Get total count for pagination
    const totalCount = allLeads.length;
    const paginatedLeads = allLeads.slice(offset, offset + limitNum);

    // Get opportunities count for each lead
    const leadsWithOpportunities = await Promise.all(
      paginatedLeads.map(async (lead) => {
        const opportunityCount = await db.select()
          .from(salesOpportunities)
          .where(eq(salesOpportunities.leadId, lead.id))
          .then(result => result.length);

        const activitiesCount = await db.select()
          .from(salesActivities)
          .where(eq(salesActivities.leadId, lead.id))
          .then(result => result.length);

        return {
          ...lead,
          opportunitiesCount: opportunityCount,
          activitiesCount: activitiesCount
        };
      })
    );

    res.json({
      success: true,
      data: leadsWithOpportunities,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads'
    });
  }
});

// POST /api/crm/leads - Create new lead
router.post('/', async (req, res) => {
  try {
    const validatedData = insertLeadSchema.parse(req.body);

    // Check if email already exists
    const existingLead = await db.select()
      .from(leads)
      .where(eq(leads.email, validatedData.email))
      .limit(1);

    if (existingLead.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Lead with this email already exists'
      });
    }

    // Validate assigned agent if provided
    if (validatedData.assignedAgentId) {
      const agent = await db.select()
        .from(users)
        .where(eq(users.id, validatedData.assignedAgentId))
        .limit(1);

      if (agent.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Assigned agent not found'
        });
      }
    }

    const [newLead] = await db.insert(leads)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json({ success: true, data: newLead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lead'
    });
  }
});

// GET /api/crm/leads/:id - Get lead details with full history
router.get('/:id', async (req, res) => {
  try {
    const leadId = req.params.id;

    // Get lead details
    const [lead] = await db.select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      phone: leads.phone,
      companyName: leads.companyName,
      leadSource: leads.leadSource,
      leadStatus: leads.leadStatus,
      priority: leads.priority,
      leadScore: leads.leadScore,
      memberType: leads.memberType,
      schemeInterest: leads.schemeInterest,
      estimatedCoverage: leads.estimatedCoverage,
      estimatedPremium: leads.estimatedPremium,
      assignedAgentId: leads.assignedAgentId,
      firstContactDate: leads.firstContactDate,
      lastContactDate: leads.lastContactDate,
      nextFollowUpDate: leads.nextFollowUpDate,
      conversionDate: leads.conversionDate,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      createdBy: leads.createdBy,
      // Agent details
      agentName: users.email,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedAgentId, users.id))
    .where(eq(leads.id, leadId));

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Get opportunities for this lead
    const opportunities = await db.select()
      .from(salesOpportunities)
      .where(eq(salesOpportunities.leadId, leadId))
      .orderBy(desc(salesOpportunities.createdAt));

    // Get activities for this lead
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

    // Check if lead has been converted to member
    let convertedMember = null;
    if (lead.leadStatus === 'converted' && lead.conversionDate) {
      const [member] = await db.select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
        membershipStatus: members.membershipStatus,
        enrollmentDate: members.enrollmentDate,
      })
      .from(members)
      .where(eq(members.email, lead.email))
      .limit(1);

      convertedMember = member;
    }

    res.json({
      success: true,
      data: {
        ...lead,
        opportunities,
        activities,
        convertedMember
      }
    });
  } catch (error) {
    console.error('Error fetching lead details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead details'
    });
  }
});

// PUT /api/crm/leads/:id - Update lead details
router.put('/:id', async (req, res) => {
  try {
    const leadId = req.params.id;

    const validatedData = insertLeadSchema.partial().parse(req.body);
    validatedData.updatedAt = new Date();

    // Validate assigned agent if provided
    if (validatedData.assignedAgentId) {
      const agent = await db.select()
        .from(users)
        .where(eq(users.id, validatedData.assignedAgentId))
        .limit(1);

      if (agent.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Assigned agent not found'
        });
      }
    }

    // Check if email is being changed and if it already exists
    if (validatedData.email) {
      const existingLead = await db.select()
        .from(leads)
        .where(and(
          eq(leads.email, validatedData.email),
          // Don't check against current lead
        ))
        .limit(1);

      if (existingLead.length > 0 && existingLead[0].id !== leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead with this email already exists'
        });
      }
    }

    const [updatedLead] = await db.update(leads)
      .set(validatedData)
      .where(eq(leads.id, leadId))
      .returning();

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead'
    });
  }
});

// DELETE /api/crm/leads/:id - Soft delete lead (mark as deleted)
router.delete('/:id', async (req, res) => {
  try {
    const leadId = req.params.id;

    const [deletedLead] = await db.update(leads)
      .set({
        leadStatus: 'lost',
        updatedAt: new Date()
      })
      .where(eq(leads.id, leadId))
      .returning();

    if (!deletedLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({ success: true, data: deletedLead });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead'
    });
  }
});

// POST /api/crm/leads/:id/assign - Assign lead to agent
router.post('/:id/assign', async (req, res) => {
  try {
    const leadId = req.params.id;
    const { agentId, teamId } = req.body;

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

    // Validate agent exists
    const agent = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(agentId)))
      .limit(1);

    if (agent.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Agent not found'
      });
    }

    const [updatedLead] = await db.update(leads)
      .set({
        assignedAgentId: parseInt(agentId),
        assignedTeamId: teamId ? parseInt(teamId) : null,
        updatedAt: new Date()
      })
      .where(eq(leads.id, leadId))
      .returning();

    // Log assignment activity
    await db.insert(salesActivities)
      .values({
        leadId,
        agentId: parseInt(agentId),
        activityType: 'note',
        subject: 'Lead Assigned',
        description: `Lead assigned to agent ${agent[0].email}`,
        createdAt: new Date()
      });

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign lead'
    });
  }
});

// POST /api/crm/leads/:id/convert - Convert lead to member
router.post('/:id/convert', async (req, res) => {
  try {
    const leadId = req.params.id;
    const { memberData } = req.body;

    // Get lead details
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

    if (lead.leadStatus === 'converted') {
      return res.status(400).json({
        success: false,
        error: 'Lead is already converted'
      });
    }

    // This is a simplified conversion - in a real implementation,
    // you would integrate with the existing member creation API
    const conversionData = {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      dateOfBirth: memberData.dateOfBirth,
      employeeId: memberData.employeeId,
      companyId: memberData.companyId,
      memberType: lead.memberType || 'principal',
      membershipStatus: 'pending',
      enrollmentDate: new Date().toISOString().split('T')[0],
      // Additional member data would be mapped here
    };

    // Update lead status
    const [updatedLead] = await db.update(leads)
      .set({
        leadStatus: 'converted',
        conversionDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(leads.id, leadId))
      .returning();

    // Log conversion activity
    await db.insert(salesActivities)
      .values({
        leadId,
        agentId: lead.assignedAgentId,
        activityType: 'note',
        subject: 'Lead Converted',
        description: `Lead converted to member - ${lead.firstName} ${lead.lastName}`,
        createdAt: new Date()
      });

    res.json({
      success: true,
      data: {
        lead: updatedLead,
        memberData: conversionData,
        message: 'Lead converted successfully. Member enrollment data prepared.'
      }
    });
  } catch (error) {
    console.error('Error converting lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert lead'
    });
  }
});

export default router;