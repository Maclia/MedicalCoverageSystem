import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { commissionService } from '../../services/commissionService';
import {
  agents,
  commissionTiers,
  commissionTransactions,
  agentPerformance,
  users,
  salesTeams,
  members,
  companies,
  leads,
  insertAgentSchema,
  insertCommissionTierSchema
} from '../../../shared/schema.js';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const router = Router();

// GET /api/crm/agents - List all agents
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      isActive,
      agentType,
      teamId,
      search
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build query conditions
    let whereConditions = [eq(agents.isActive, true)];

    if (isActive !== undefined) {
      whereConditions = [eq(agents.isActive, isActive === 'true')];
    }

    if (agentType) {
      whereConditions.push(eq(agents.agentType, agentType as string));
    }

    if (teamId) {
      whereConditions.push(eq(agents.teamId, teamId as string));
    }

    if (search) {
      // Search by agent code, agent type, or user email
      whereConditions.push(
        sql`(${agents.agentCode} ILIKE ${'%' + search + '%'} OR
            ${agents.agentType} ILIKE ${'%' + search + '%'} OR
            ${users.email} ILIKE ${'%' + search + '%'})`
      );
    }

    const allAgents = await db.select({
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
      terminationDate: agents.terminationDate,
      baseCommissionRate: agents.baseCommissionRate,
      // User details
      userEmail: users.email,
      userFirstName: users.email, // Would be extended to include user profile fields
      // Team details
      teamName: salesTeams.teamName,
      // Commission tier details
      tierName: commissionTiers.tierName,
      tierBaseRate: commissionTiers.baseRate,
      tierBonusThreshold: commissionTiers.bonusThreshold,
      tierBonusRate: commissionTiers.bonusRate
    })
    .from(agents)
    .leftJoin(users, eq(agents.userId, users.id))
    .leftJoin(salesTeams, eq(agents.teamId, salesTeams.id))
    .leftJoin(commissionTiers, eq(agents.commissionTierId, commissionTiers.id))
    .where(and(...whereConditions))
    .orderBy(desc(agents.ytdPremium));

    // Get performance metrics for each agent
    const agentsWithMetrics = await Promise.all(
      allAgents.map(async (agent) => {
        const performance = await commissionService.getAgentPerformance(agent.id);
        return {
          ...agent,
          ...performance
        };
      })
    );

    const totalCount = allAgents.length;
    const paginatedAgents = agentsWithMetrics.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginatedAgents,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents'
    });
  }
});

// POST /api/crm/agents - Register new agent
router.post('/', async (req, res) => {
  try {
    const validatedData = insertAgentSchema.parse(req.body);

    // Validate user exists
    const user = await db.select()
      .from(users)
      .where(eq(users.id, validatedData.userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate commission tier if provided
    if (validatedData.commissionTierId) {
      const tier = await db.select()
        .from(commissionTiers)
        .where(eq(commissionTiers.id, validatedData.commissionTierId))
        .limit(1);

      if (tier.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Commission tier not found'
        });
      }
    }

    // Validate team if provided
    if (validatedData.teamId) {
      const team = await db.select()
        .from(salesTeams)
        .where(eq(salesTeams.id, validatedData.teamId))
        .limit(1);

      if (team.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Team not found'
        });
      }
    }

    // Generate unique agent code if not provided
    if (!validatedData.agentCode) {
      const agentTypePrefix = validatedData.agentType?.toUpperCase().slice(0, 3) || 'AGT';
      const timestamp = Date.now().toString().slice(-4);
      validatedData.agentCode = `${agentTypePrefix}${timestamp}`;
    }

    const [newAgent] = await db.insert(agents)
      .values({
        ...validatedData,
        isActive: true,
        joinDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json({ success: true, data: newAgent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent'
    });
  }
});

// GET /api/crm/agents/:id - Get specific agent details
router.get('/:id', async (req, res) => {
  try {
    const agentId = req.params.id;

    const [agent] = await db.select({
      id: agents.id,
      agentCode: agents.agentCode,
      agentType: agents.agentType,
      userId: agents.userId,
      commissionTierId: agents.commissionTierId,
      baseCommissionRate: agents.baseCommissionRate,
      overrideRate: agents.overrideRate,
      supervisorId: agents.supervisorId,
      teamId: agents.teamId,
      targetAnnualPremium: agents.targetAnnualPremium,
      ytdPremium: agents.ytdPremium,
      ytdCommission: agents.ytdCommission,
      isActive: agents.isActive,
      joinDate: agents.joinDate,
      terminationDate: agents.terminationDate,
      // User details
      userEmail: users.email,
      // Team details
      teamName: salesTeams.teamName,
      department: salesTeams.department,
      // Commission tier details
      tierName: commissionTiers.tierName,
      tierBaseRate: commissionTiers.baseRate,
      tierBonusThreshold: commissionTiers.bonusThreshold,
      tierBonusRate: commissionTiers.bonusRate,
      individualRate: commissionTiers.individualRate,
      corporateRate: commissionTiers.corporateRate,
      familyRate: commissionTiers.familyRate
    })
    .from(agents)
    .leftJoin(users, eq(agents.userId, users.id))
    .leftJoin(salesTeams, eq(agents.teamId, salesTeams.id))
    .leftJoin(commissionTiers, eq(agents.commissionTierId, commissionTiers.id))
    .where(eq(agents.id, agentId));

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Get current performance metrics
    const performance = await commissionService.getAgentPerformance(agent.id);

    // Get recent commission transactions
    const recentTransactions = await commissionService.getCommissionPaymentSchedule(agent.id);

    // Get client portfolio (members converted by this agent)
    const clientPortfolio = await db.select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      email: members.email,
      membershipStatus: members.membershipStatus,
      enrollmentDate: members.enrollmentDate,
      companyName: sql<string>`COALESCE(${companies.name}, 'Individual')`
    })
    .from(members)
    .leftJoin(companies, eq(members.companyId, companies.id))
    .where(sql`EXISTS (
      SELECT 1 FROM ${leads}
      WHERE ${leads.email} = ${members.email}
      AND ${leads.assignedAgentId} = ${agent.userId}
    )`)
    .orderBy(desc(members.enrollmentDate))
    .limit(20);

    res.json({
      success: true,
      data: {
        ...agent,
        performance,
        recentTransactions: recentTransactions.slice(0, 10),
        clientPortfolio
      }
    });
  } catch (error) {
    console.error('Error fetching agent details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent details'
    });
  }
});

// PUT /api/crm/agents/:id - Update agent details
router.put('/:id', async (req, res) => {
  try {
    const agentId = req.params.id;

    const validatedData = insertAgentSchema.partial().parse(req.body);
    validatedData.updatedAt = new Date();

    // Validate user if provided
    if (validatedData.userId) {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, validatedData.userId))
        .limit(1);

      if (user.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    const [updatedAgent] = await db.update(agents)
      .set(validatedData)
      .where(eq(agents.id, agentId))
      .returning();

    if (!updatedAgent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({ success: true, data: updatedAgent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent'
    });
  }
});

// GET /api/crm/agents/:id/commission - Get agent commission details
router.get('/:id/commission', async (req, res) => {
  try {
    const agentId = req.params.id;
    const { period } = req.query;

    const performance = await commissionService.getAgentPerformance(agentId, period as string);
    const transactions = await commissionService.getCommissionPaymentSchedule(agentId, period as string);

    res.json({
      success: true,
      data: {
        performance,
        transactions,
        summary: {
          totalPending: transactions.filter(t => t.paymentStatus === 'pending').length,
          totalApproved: transactions.filter(t => t.paymentStatus === 'approved').length,
          totalPaid: transactions.filter(t => t.paymentStatus === 'paid').length,
          pendingAmount: transactions
            .filter(t => t.paymentStatus === 'pending')
            .reduce((sum, t) => sum + t.amount, 0),
          approvedAmount: transactions
            .filter(t => t.paymentStatus === 'approved')
            .reduce((sum, t) => sum + t.amount, 0),
          paidAmount: transactions
            .filter(t => t.paymentStatus === 'paid')
            .reduce((sum, t) => sum + t.amount, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching agent commission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent commission'
    });
  }
});

// POST /api/crm/agents/:id/commission/calculate - Calculate commission for transaction
router.post('/:id/commission/calculate', async (req, res) => {
  try {
    const agentId = req.params.id;
    const {
      memberId,
      policyId,
      premiumAmount,
      policyType,
      isNewBusiness = true,
      transactionDate = new Date(),
      transactionType = 'new_business'
    } = req.body;

    if (!memberId || !premiumAmount || !policyType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: memberId, premiumAmount, policyType'
      });
    }

    const calculation = await commissionService.calculateCommission({
      agentId,
      memberId: parseInt(memberId),
      policyId,
      premiumAmount: parseFloat(premiumAmount),
      policyType,
      isNewBusiness,
      transactionDate: new Date(transactionDate),
      transactionType
    });

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Error calculating commission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate commission'
    });
  }
});

// POST /api/crm/agents/:id/commission/process - Process commission payment
router.post('/:id/commission/process', async (req, res) => {
  try {
    const agentId = req.params.id;
    const {
      memberId,
      policyId,
      premiumAmount,
      policyType,
      isNewBusiness = true,
      transactionDate = new Date(),
      transactionType = 'new_business'
    } = req.body;

    if (!memberId || !premiumAmount || !policyType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: memberId, premiumAmount, policyType'
      });
    }

    const transactionId = await commissionService.processCommission({
      agentId,
      memberId: parseInt(memberId),
      policyId,
      premiumAmount: parseFloat(premiumAmount),
      policyType,
      isNewBusiness,
      transactionDate: new Date(transactionDate),
      transactionType
    });

    res.status(201).json({
      success: true,
      data: { transactionId },
      message: 'Commission processed successfully'
    });
  } catch (error) {
    console.error('Error processing commission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process commission'
    });
  }
});

// GET /api/crm/agents/:id/performance - Get agent performance analytics
router.get('/:id/performance', async (req, res) => {
  try {
    const agentId = req.params.id;
    const { period, months = 12 } = req.query;

    const performance = await commissionService.getAgentPerformance(agentId, period as string);

    // Get historical performance data
    const monthsToFetch = parseInt(months as string);
    const historicalPerformance = [];

    for (let i = 0; i < monthsToFetch; i++) {
      const targetDate = subMonths(new Date(), i);
      const targetPeriod = format(targetDate, 'yyyy-MM');

      const monthPerformance = await db.select()
        .from(agentPerformance)
        .where(and(
          eq(agentPerformance.agentId, agentId),
          eq(agentPerformance.period, targetPeriod)
        ))
        .limit(1);

      if (monthPerformance[0]) {
        historicalPerformance.push({
          period: targetPeriod,
          premium: monthPerformance[0].totalPremium,
          commission: monthPerformance[0].totalCommission,
          conversionRate: monthPerformance[0].conversionRate,
          policiesSold: monthPerformance[0].policiesSold
        });
      }
    }

    res.json({
      success: true,
      data: {
        currentPerformance: performance,
        historicalPerformance: historicalPerformance.reverse(),
        trends: {
          premiumGrowth: calculateGrowthRate(historicalPerformance.map(p => p.premium)),
          commissionGrowth: calculateGrowthRate(historicalPerformance.map(p => p.commission)),
          conversionTrend: calculateGrowthRate(historicalPerformance.map(p => p.conversionRate))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent performance'
    });
  }
});

// GET /api/crm/agents/:id/portfolio - Get agent client portfolio
router.get('/:id/portfolio', async (req, res) => {
  try {
    const agentId = req.params.id;
    const { page = '1', limit = '20', status } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Get agent details
    const [agent] = await db.select({
      userId: agents.userId,
      agentCode: agents.agentCode
    })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Get members converted by this agent
    let query = db.select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      email: members.email,
      phone: members.phone,
      membershipStatus: members.membershipStatus,
      enrollmentDate: members.enrollmentDate,
      renewalDate: members.renewalDate,
      companyName: companies.name,
      // Policy details would be added when policy table is implemented
    })
    .from(members)
    .leftJoin(companies, eq(members.companyId, companies.id))
    .where(sql`EXISTS (
      SELECT 1 FROM ${leads}
      WHERE ${leads.email} = ${members.email}
      AND ${leads.assignedAgentId} = ${agent.userId}
    )`);

    if (status && status !== 'all') {
      query = query.where(eq(members.membershipStatus, status as string));
    }

    const allMembers = await query.orderBy(desc(members.enrollmentDate));

    // Get total count
    const totalCount = allMembers.length;
    const paginatedMembers = allMembers.slice(offset, offset + limitNum);

    // Calculate portfolio metrics
    const portfolioMetrics = {
      totalClients: totalCount,
      activeClients: allMembers.filter(m => m.membershipStatus === 'active').length,
      corporateClients: allMembers.filter(m => m.companyName).length,
      recentEnrollments: allMembers.filter(m => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(m.enrollmentDate) >= thirtyDaysAgo;
      }).length,
      upcomingRenewals: allMembers.filter(m => {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const renewalDate = new Date(m.renewalDate);
        return renewalDate <= thirtyDaysFromNow && renewalDate >= new Date();
      }).length
    };

    res.json({
      success: true,
      data: {
        clients: paginatedMembers,
        pagination: {
          page: parseInt(page as string),
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        },
        metrics: portfolioMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching agent portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent portfolio'
    });
  }
});

// Helper function to calculate growth rate
function calculateGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;

  const recent = values.slice(-3); // Last 3 periods
  const previous = values.slice(-6, -3); // Previous 3 periods

  if (previous.length === 0 || recent.length === 0) return 0;

  const recentAvg = recent.reduce((sum, val) => sum + (val || 0), 0) / recent.length;
  const previousAvg = previous.reduce((sum, val) => sum + (val || 0), 0) / previous.length;

  if (previousAvg === 0) return 0;

  return ((recentAvg - previousAvg) / previousAvg) * 100;
}

export default router;