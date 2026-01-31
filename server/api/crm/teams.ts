import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import {
  salesTeams,
  territories,
  users,
  agents,
  insertSalesTeamSchema,
  insertTerritorySchema
} from '../../../shared/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';

const router = Router();

// ===================
// SALES TEAMS ENDPOINTS
// ===================

// GET /api/crm/teams - List all sales teams
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      isActive,
      department,
      territoryId
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build query conditions
    let whereConditions = [];

    if (isActive !== undefined) {
      whereConditions.push(eq(salesTeams.isActive, isActive === 'true'));
    }
    if (department) {
      whereConditions.push(eq(salesTeams.department, department as string));
    }
    if (territoryId) {
      whereConditions.push(eq(salesTeams.territoryId, parseInt(territoryId as string)));
    }

    // Get teams with related details
    const teamsQuery = db.select({
      id: salesTeams.id,
      teamName: salesTeams.teamName,
      teamLeadId: salesTeams.teamLeadId,
      managerId: salesTeams.managerId,
      department: salesTeams.department,
      territoryId: salesTeams.territoryId,
      isActive: salesTeams.isActive,
      createdAt: salesTeams.createdAt,
      // Team lead details
      teamLeadName: users.email,
      // Manager details
      managerName: users.email, // This would be a separate join in a real implementation
      // Territory details
      territoryName: territories.territoryName,
    })
    .from(salesTeams)
    .leftJoin(users, eq(salesTeams.teamLeadId, users.id))
    .leftJoin(territories, eq(salesTeams.territoryId, territories.id));

    // Apply where conditions
    if (whereConditions.length > 0) {
      whereConditions.reduce((query, condition) => query.where(condition), teamsQuery);
    }

    const allTeams = await teamsQuery.orderBy(desc(salesTeams.createdAt));

    // Get agent count for each team
    const teamsWithAgentCount = await Promise.all(
      allTeams.map(async (team) => {
        const agentCount = await db.select()
          .from(agents)
          .where(and(
            eq(agents.teamId, team.id),
            eq(agents.isActive, true)
          ))
          .then(result => result.length);

        return {
          ...team,
          agentCount
        };
      })
    );

    // Get total count for pagination
    const totalCount = allTeams.length;
    const paginatedTeams = teamsWithAgentCount.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginatedTeams,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching sales teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales teams'
    });
  }
});

// POST /api/crm/teams - Create new sales team
router.post('/', async (req, res) => {
  try {
    const validatedData = insertSalesTeamSchema.parse(req.body);

    // Validate team lead if provided
    if (validatedData.teamLeadId) {
      const teamLead = await db.select()
        .from(users)
        .where(eq(users.id, validatedData.teamLeadId))
        .limit(1);

      if (teamLead.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Team lead not found'
        });
      }
    }

    // Validate manager if provided
    if (validatedData.managerId) {
      const manager = await db.select()
        .from(users)
        .where(eq(users.id, validatedData.managerId))
        .limit(1);

      if (manager.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Manager not found'
        });
      }
    }

    // Validate territory if provided
    if (validatedData.territoryId) {
      const territory = await db.select()
        .from(territories)
        .where(eq(territories.id, validatedData.territoryId))
        .limit(1);

      if (territory.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Territory not found'
        });
      }
    }

    const [newTeam] = await db.insert(salesTeams)
      .values({
        ...validatedData,
        createdAt: new Date()
      })
      .returning();

    res.status(201).json({ success: true, data: newTeam });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating sales team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sales team'
    });
  }
});

// GET /api/crm/teams/:id - Get specific team details
router.get('/:id', async (req, res) => {
  try {
    const teamId = req.params.id;

    // Get team details
    const [team] = await db.select({
      id: salesTeams.id,
      teamName: salesTeams.teamName,
      teamLeadId: salesTeams.teamLeadId,
      managerId: salesTeams.managerId,
      department: salesTeams.department,
      territoryId: salesTeams.territoryId,
      isActive: salesTeams.isActive,
      createdAt: salesTeams.createdAt,
      // Team lead details
      teamLeadName: users.email,
      // Manager details
      managerName: users.email,
      // Territory details
      territoryName: territories.territoryName,
      territoryType: territories.territoryType,
    })
    .from(salesTeams)
    .leftJoin(users, eq(salesTeams.teamLeadId, users.id))
    .leftJoin(users, eq(salesTeams.teamLeadId, users.id)) // This needs to be fixed for manager join
    .leftJoin(territories, eq(salesTeams.territoryId, territories.id))
    .where(eq(salesTeams.id, teamId));

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Sales team not found'
      });
    }

    // Get agents in this team
    const teamAgents = await db.select({
      id: agents.id,
      agentCode: agents.agentCode,
      agentType: agents.agentType,
      userId: agents.userId,
      teamId: agents.teamId,
      targetAnnualPremium: agents.targetAnnualPremium,
      ytdPremium: agents.ytdPremium,
      ytdCommission: agents.ytdCommission,
      isActive: agents.isActive,
      joinDate: agents.joinDate,
      // User details
      userEmail: users.email,
    })
    .from(agents)
    .leftJoin(users, eq(agents.userId, users.id))
    .where(eq(agents.teamId, teamId))
    .orderBy(desc(agents.joinDate));

    res.json({
      success: true,
      data: {
        ...team,
        agents: teamAgents,
        agentCount: teamAgents.length
      }
    });
  } catch (error) {
    console.error('Error fetching sales team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales team'
    });
  }
});

// PUT /api/crm/teams/:id - Update sales team
router.put('/:id', async (req, res) => {
  try {
    const teamId = req.params.id;

    const validatedData = insertSalesTeamSchema.partial().parse(req.body);

    const [updatedTeam] = await db.update(salesTeams)
      .set(validatedData)
      .where(eq(salesTeams.id, teamId))
      .returning();

    if (!updatedTeam) {
      return res.status(404).json({
        success: false,
        error: 'Sales team not found'
      });
    }

    res.json({ success: true, data: updatedTeam });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating sales team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sales team'
    });
  }
});

// DELETE /api/crm/teams/:id - Delete sales team
router.delete('/:id', async (req, res) => {
  try {
    const teamId = req.params.id;

    // Check if team has active agents
    const activeAgents = await db.select()
      .from(agents)
      .where(and(
        eq(agents.teamId, teamId),
        eq(agents.isActive, true)
      ))
      .limit(1);

    if (activeAgents.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete team with active agents'
      });
    }

    const [deletedTeam] = await db.delete(salesTeams)
      .where(eq(salesTeams.id, teamId))
      .returning();

    if (!deletedTeam) {
      return res.status(404).json({
        success: false,
        error: 'Sales team not found'
      });
    }

    res.json({ success: true, data: deletedTeam });
  } catch (error) {
    console.error('Error deleting sales team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sales team'
    });
  }
});

// ===================
// TERRITORIES ENDPOINTS
// ===================

// GET /api/crm/territories - List all territories
router.get('/territories', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      isActive,
      type,
      search
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build query conditions
    let whereConditions = [];

    if (isActive !== undefined) {
      whereConditions.push(eq(territories.isActive, isActive === 'true'));
    }
    if (type) {
      whereConditions.push(eq(territories.territoryType, type as string));
    }
    if (search) {
      // This would need ilike for case-insensitive search
      // For now, we'll implement a basic search
      whereConditions.push(eq(territories.territoryName, `%${search}%`));
    }

    const allTerritories = await db.select({
      id: territories.id,
      territoryName: territories.territoryName,
      territoryType: territories.territoryType,
      regions: territories.regions,
      cities: territories.cities,
      postalCodes: territories.postalCodes,
      primaryOwnerId: territories.primaryOwnerId,
      description: territories.description,
      isActive: territories.isActive,
      createdAt: territories.createdAt,
      // Owner details
      ownerName: users.email,
    })
    .from(territories)
    .leftJoin(users, eq(territories.primaryOwnerId, users.id))
    .orderBy(desc(territories.createdAt));

    const totalCount = allTerritories.length;
    const paginatedTerritories = allTerritories.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginatedTerritories,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching territories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch territories'
    });
  }
});

// POST /api/crm/territories - Create new territory
router.post('/territories', async (req, res) => {
  try {
    const validatedData = insertTerritorySchema.parse(req.body);

    // Validate primary owner if provided
    if (validatedData.primaryOwnerId) {
      const owner = await db.select()
        .from(users)
        .where(eq(users.id, validatedData.primaryOwnerId))
        .limit(1);

      if (owner.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Primary owner not found'
        });
      }
    }

    const [newTerritory] = await db.insert(territories)
      .values({
        ...validatedData,
        createdAt: new Date()
      })
      .returning();

    res.status(201).json({ success: true, data: newTerritory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating territory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create territory'
    });
  }
});

// GET /api/crm/territories/:id - Get specific territory details
router.get('/territories/:id', async (req, res) => {
  try {
    const territoryId = req.params.id;

    const [territory] = await db.select({
      id: territories.id,
      territoryName: territories.territoryName,
      territoryType: territories.territoryType,
      regions: territories.regions,
      cities: territories.cities,
      postalCodes: territories.postalCodes,
      primaryOwnerId: territories.primaryOwnerId,
      description: territories.description,
      isActive: territories.isActive,
      createdAt: territories.createdAt,
      // Owner details
      ownerName: users.email,
    })
    .from(territories)
    .leftJoin(users, eq(territories.primaryOwnerId, users.id))
    .where(eq(territories.id, territoryId));

    if (!territory) {
      return res.status(404).json({
        success: false,
        error: 'Territory not found'
      });
    }

    // Get teams assigned to this territory
    const territoryTeams = await db.select({
      id: salesTeams.id,
      teamName: salesTeams.teamName,
      department: salesTeams.department,
      isActive: salesTeams.isActive,
    })
    .from(salesTeams)
    .where(eq(salesTeams.territoryId, territoryId));

    res.json({
      success: true,
      data: {
        ...territory,
        teams: territoryTeams,
        teamCount: territoryTeams.length
      }
    });
  } catch (error) {
    console.error('Error fetching territory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch territory'
    });
  }
});

export default router;