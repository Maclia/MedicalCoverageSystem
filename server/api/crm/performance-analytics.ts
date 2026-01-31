import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import {
  agents,
  agentPerformance,
  commissionTransactions,
  salesTeams,
  salesOpportunities,
  leads,
  members,
  users,
  commissionTiers
} from '../../../shared/schema.js';
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { format, startOfMonth, endOfMonth, subMonths, getMonth, getYear } from 'date-fns';

const router = Router();

// GET /api/crm/performance-analytics/dashboard - Main performance analytics dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { period = 'current', teamId, agentType } = req.query;

    // Calculate period dates
    let periodStart: Date;
    let periodEnd: Date;

    if (period === 'current') {
      periodStart = startOfMonth(new Date());
      periodEnd = endOfMonth(new Date());
    } else if (period === 'last') {
      const lastMonth = subMonths(new Date(), 1);
      periodStart = startOfMonth(lastMonth);
      periodEnd = endOfMonth(lastMonth);
    } else {
      // Custom period handling would go here
      periodStart = startOfMonth(new Date());
      periodEnd = endOfMonth(new Date());
    }

    const commissionPeriod = `${getYear(periodStart)}-${String(getMonth(periodStart) + 1).padStart(2, '0')}`;

    // Build query conditions
    let whereConditions = [eq(agents.isActive, true)];
    if (teamId) {
      whereConditions.push(eq(agents.teamId, teamId as string));
    }
    if (agentType) {
      whereConditions.push(eq(agents.agentType, agentType as string));
    }

    // Get comprehensive agent performance data
    const performanceData = await db.select({
      agentId: agents.id,
      agentCode: agents.agentCode,
      agentType: agents.agentType,
      userId: agents.userId,
      targetAnnualPremium: agents.targetAnnualPremium,
      ytdPremium: agents.ytdPremium,
      ytdCommission: agents.ytdCommission,
      isActive: agents.isActive,
      joinDate: agents.joinDate,
      // User details
      userEmail: users.email,
      // Team details
      teamId: salesTeams.id,
      teamName: salesTeams.teamName,
      teamLeadId: salesTeams.teamLeadId,
      department: salesTeams.department,
      // Commission tier details
      tierId: commissionTiers.id,
      tierName: commissionTiers.tierName,
      tierBaseRate: commissionTiers.baseRate,
      tierBonusThreshold: commissionTiers.bonusThreshold,
      tierBonusRate: commissionTiers.bonusRate,
      // Period performance
      periodPremium: agentPerformance.totalPremium,
      periodCommission: agentPerformance.totalCommission,
      leadsAssigned: agentPerformance.leadsAssigned,
      leadsContacted: agentPerformance.leadsContacted,
      appointmentsSet: agentPerformance.appointmentsSet,
      quotesIssued: agentPerformance.quotesIssued,
      policiesSold: agentPerformance.policiesSold,
      conversionRate: agentPerformance.conversionRate,
      averageDealSize: agentPerformance.averageDealSize,
      teamRank: agentPerformance.teamRank,
      companyRank: agentPerformance.companyRank
    })
    .from(agents)
    .leftJoin(users, eq(agents.userId, users.id))
    .leftJoin(salesTeams, eq(agents.teamId, salesTeams.id))
    .leftJoin(commissionTiers, eq(agents.commissionTierId, commissionTiers.id))
    .leftJoin(agentPerformance, and(
      eq(agentPerformance.agentId, agents.id),
      eq(agentPerformance.period, commissionPeriod)
    ))
    .where(and(...whereConditions))
    .orderBy(desc(sql`${agents.ytdPremium}`));

    // Calculate additional metrics
    const enhancedPerformance = await Promise.all(
      performanceData.map(async (agent) => {
        // Get commission summary for the period
        const commissionSummary = await db.select({
          totalTransactions: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`SUM(${commissionTransactions.totalCommission})`,
          paidAmount: sql<number>`SUM(CASE WHEN ${commissionTransactions.paymentStatus} = 'paid' THEN ${commissionTransactions.totalCommission} ELSE 0 END)`,
          approvedAmount: sql<number>`SUM(CASE WHEN ${commissionTransactions.paymentStatus} = 'approved' THEN ${commissionTransactions.totalCommission} ELSE 0 END)`,
          pendingAmount: sql<number>`SUM(CASE WHEN ${commissionTransactions.paymentStatus} = 'pending' THEN ${commissionTransactions.totalCommission} ELSE 0 END)`
        })
        .from(commissionTransactions)
        .where(and(
          eq(commissionTransactions.agentId, agent.agentId),
          eq(commissionTransactions.commissionPeriod, commissionPeriod)
        ));

        const summary = commissionSummary[0] || {
          totalTransactions: 0,
          totalAmount: 0,
          paidAmount: 0,
          approvedAmount: 0,
          pendingAmount: 0
        };

        // Get recent opportunity data
        const opportunityStats = await db.select({
          totalOpportunities: sql<number>`COUNT(*)`,
          wonOpportunities: sql<number>`SUM(CASE WHEN ${salesOpportunities.stage} = 'closed_won' THEN 1 ELSE 0 END)`,
          totalPipelineValue: sql<number>`SUM(${salesOpportunities.estimatedValue})`
        })
        .from(salesOpportunities)
        .where(eq(salesOpportunities.ownerId, agent.userId));

        const oppStats = opportunityStats[0] || {
          totalOpportunities: 0,
          wonOpportunities: 0,
          totalPipelineValue: 0
        };

        // Calculate derived metrics
        const targetAchievement = agent.targetAnnualPremium > 0
          ? (agent.ytdPremium / agent.targetAnnualPremium) * 100
          : 0;

        const commissionRate = agent.ytdPremium > 0
          ? (agent.ytdCommission / agent.ytdPremium) * 100
          : 0;

        const winRate = oppStats.totalOpportunities > 0
          ? (oppStats.wonOpportunities / oppStats.totalOpportunities) * 100
          : 0;

        const tierBonusEligible = agent.tierBonusThreshold
          ? agent.ytdPremium >= agent.tierBonusThreshold
          : false;

        return {
          ...agent,
          commission: summary,
          opportunities: oppStats,
          targetAchievement,
          commissionRate,
          winRate,
          tierBonusEligible,
          averageTransactionValue: summary.totalTransactions > 0
            ? summary.totalAmount / summary.totalTransactions
            : 0
        };
      })
    );

    // Calculate team-level aggregates
    const teamAggregates = enhancedPerformance.reduce((acc, agent) => {
      const teamKey = agent.teamId || 'unassigned';
      if (!acc[teamKey]) {
        acc[teamKey] = {
          teamId: teamKey,
          teamName: agent.teamName || 'Unassigned',
          agentCount: 0,
          totalYtdPremium: 0,
          totalYtdCommission: 0,
          totalTarget: 0,
          totalAchieved: 0,
          totalLeads: 0,
          totalPolicies: 0,
          totalPipeline: 0,
          tierBonusEligibleAgents: 0,
          averageCommissionRate: 0,
          averageWinRate: 0
        };
      }

      const team = acc[teamKey];
      team.agentCount++;
      team.totalYtdPremium += agent.ytdPremium || 0;
      team.totalYtdCommission += agent.ytdCommission || 0;
      team.totalTarget += agent.targetAnnualPremium || 0;
      team.totalAchieved += targetAchievement;
      team.totalLeads += agent.leadsAssigned || 0;
      team.totalPolicies += agent.policiesSold || 0;
      team.totalPipeline += oppStats.totalPipelineValue || 0;
      if (agent.tierBonusEligible) team.tierBonusEligibleAgents++;

      return acc;
    }, {} as Record<string, any>);

    // Calculate global metrics
    const globalMetrics = {
      totalAgents: enhancedPerformance.length,
      totalYtdPremium: enhancedPerformance.reduce((sum, agent) => sum + (agent.ytdPremium || 0), 0),
      totalYtdCommission: enhancedPerformance.reduce((sum, agent) => sum + (agent.ytdCommission || 0), 0),
      totalTarget: enhancedPerformance.reduce((sum, agent) => sum + (agent.targetAnnualPremium || 0), 0),
      averageCommissionRate: enhancedPerformance.length > 0
        ? enhancedPerformance.reduce((sum, agent) => sum + agent.commissionRate, 0) / enhancedPerformance.length
        : 0,
      topPerformers: enhancedPerformance
        .sort((a, b) => b.ytdPremium - a.ytdPremium)
        .slice(0, 10)
        .map(agent => ({
          agentId: agent.agentId,
          agentName: agent.userEmail,
          agentCode: agent.agentCode,
          teamName: agent.teamName,
          ytdPremium: agent.ytdPremium,
          ytdCommission: agent.ytdCommission,
          targetAchievement: agent.targetAchievement
        })),
      teamBreakdown: Object.values(teamAggregates).map(team => ({
        ...team,
        averageAchievement: team.agentCount > 0 ? team.totalAchieved / team.agentCount : 0,
        averageCommissionRate: team.agentCount > 0 ? team.totalYtdCommission / team.totalYtdPremium * 100 : 0
      }))
    };

    res.json({
      success: true,
      data: {
        period: commissionPeriod,
        dateRange: {
          start: periodStart,
          end: periodEnd
        },
        globalMetrics,
        teamBreakdown,
        agentPerformance: enhancedPerformance
      }
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance analytics'
    });
  }
});

// GET /api/crm/performance-analytics/trends - Performance trends over time
router.get('/trends', async (req, res) => {
  try {
    const { agentId, teamId, months = 12 } = req.query;

    const monthsToFetch = parseInt(months as string);
    const trends = [];

    // Generate historical data for the specified period
    for (let i = 0; i < monthsToFetch; i++) {
      const targetDate = subMonths(new Date(), i);
      const period = format(targetDate, 'yyyy-MM');

      let query = db.select({
        period,
        totalPremium: sql<number>`SUM(${agentPerformance.totalPremium})`,
        totalCommission: sql<number>`SUM(${agentPerformance.totalCommission})`,
        policiesSold: sql<number>`SUM(${agentPerformance.policiesSold})`,
        leadConversionRate: sql<number>`AVG(${agentPerformance.conversionRate})`,
        agentCount: sql<number>`COUNT(*)`
      })
      .from(agentPerformance)
      .where(eq(agentPerformance.period, period));

      if (agentId) {
        query = query.where(eq(agentPerformance.agentId, agentId as string));
      } else if (teamId) {
        // For team trends, we'd need to join with agents table
        query = query.where(sql`EXISTS (
          SELECT 1 FROM ${agents}
          WHERE ${agents.id} = ${agentPerformance.agentId}
          AND ${agents.teamId} = ${teamId}
        )`);
      }

      const periodData = await query;

      if (periodData[0] && periodData[0].agentCount > 0) {
        trends.push({
          period: format(targetDate, 'MMM yyyy'),
          totalPremium: periodData[0].totalPremium || 0,
          totalCommission: periodData[0].totalCommission || 0,
          policiesSold: periodData[0].policiesSold || 0,
          leadConversionRate: periodData[0].leadConversionRate || 0,
          averageCommissionPerAgent: (periodData[0].totalCommission || 0) / periodData[0].agentCount,
          averagePremiumPerAgent: (periodData[0].totalPremium || 0) / periodData[0].agentCount
        });
      }
    }

    // Calculate growth rates
    const trendsWithGrowth = trends.map((trend, index) => {
      if (index === 0) return trend;

      const previousTrend = trends[index - 1];
      const premiumGrowth = previousTrend.totalPremium > 0
        ? ((trend.totalPremium - previousTrend.totalPremium) / previousTrend.totalPremium) * 100
        : 0;

      const commissionGrowth = previousTrend.totalCommission > 0
        ? ((trend.totalCommission - previousTrend.totalCommission) / previousTrend.totalCommission) * 100
        : 0;

      return {
        ...trend,
        premiumGrowth,
        commissionGrowth
      };
    });

    res.json({
      success: true,
      data: {
        trends: trendsWithGrowth.reverse(),
        period: `${monthsToFetch} months`,
        insights: {
          averageMonthlyPremium: trendsWithGrowth.reduce((sum, t) => sum + t.totalPremium, 0) / trendsWithGrowth.length,
          averageMonthlyCommission: trendsWithGrowth.reduce((sum, t) => sum + t.totalCommission, 0) / trendsWithGrowth.length,
          totalPoliciesSold: trendsWithGrowth.reduce((sum, t) => sum + t.policiesSold, 0),
          growthRate: trendsWithGrowth.length > 1
            ? trendsWithGrowth.reduce((sum, t) => sum + t.premiumGrowth, 0) / (trendsWithGrowth.length - 1)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching performance trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance trends'
    });
  }
});

// GET /api/crm/performance-analytics/leaderboard - Performance leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'premium', period = 'current', teamId, limit = '10' } = req.query;

    // Calculate period
    let periodStart: Date;
    if (period === 'current') {
      periodStart = startOfMonth(new Date());
    } else if (period === 'ytd') {
      periodStart = new Date(`${getYear(new Date())}-01-01`);
    } else {
      periodStart = startOfMonth(new Date());
    }

    const commissionPeriod = `${getYear(periodStart)}-${String(getMonth(periodStart) + 1).padStart(2, '0')}`;

    let query = db.select({
      agentId: agents.id,
      agentCode: agents.agentCode,
      agentType: agents.agentType,
      userEmail: users.email,
      teamName: salesTeams.teamName,
      ytdPremium: agents.ytdPremium,
      ytdCommission: agents.ytdCommission,
      targetAnnualPremium: agents.targetAnnualPremium,
      // Period performance
      periodPremium: agentPerformance.totalPremium,
      periodCommission: agentPerformance.totalCommission,
      policiesSold: agentPerformance.policiesSold,
      conversionRate: agentPerformance.conversionRate,
      averageDealSize: agentPerformance.averageDealSize,
      companyRank: agentPerformance.companyRank,
      teamRank: agentPerformance.teamRank
    })
    .from(agents)
    .leftJoin(users, eq(agents.userId, users.id))
    .leftJoin(salesTeams, eq(agents.teamId, salesTeams.id))
    .leftJoin(agentPerformance, and(
      eq(agentPerformance.agentId, agents.id),
      eq(agentPerformance.period, commissionPeriod)
    ))
    .where(and(
      eq(agents.isActive, true),
      ...(teamId && [eq(agents.teamId, teamId as string)])
    ));

    // Apply sorting based on type
    switch (type) {
      case 'premium':
        query = query.orderBy(desc(agents.ytdPremium));
        break;
      case 'commission':
        query = query.orderBy(desc(agents.ytdCommission));
        break;
      case 'policies':
        query = query.orderBy(desc(agentPerformance.policiesSold));
        break;
      case 'conversion':
        query = query.orderBy(desc(agentPerformance.conversionRate));
        break;
      case 'target':
        query = query.orderBy(desc(sql`${agents.ytdPremium}::float / ${agents.targetAnnualPremium}::float`));
        break;
      default:
        query = query.orderBy(desc(agents.ytdPremium));
    }

    const leaderboard = await query.limit(parseInt(limit as string));

    // Add rankings and metrics
    const enhancedLeaderboard = leaderboard.map((agent, index) => {
      const targetAchievement = agent.targetAnnualPremium > 0
        ? (agent.ytdPremium / agent.targetAnnualPremium) * 100
        : 0;

      const commissionRate = agent.ytdPremium > 0
        ? (agent.ytdCommission / agent.ytdPremium) * 100
        : 0;

      return {
        rank: index + 1,
        agentId: agent.agentId,
        agentCode: agent.agentCode,
        agentName: agent.userEmail,
        agentType: agent.agentType,
        teamName: agent.teamName,
        metrics: {
          ytdPremium: agent.ytdPremium || 0,
          ytdCommission: agent.ytdCommission || 0,
          targetAchievement,
          commissionRate,
          periodPremium: agent.periodPremium || 0,
          periodCommission: agent.periodCommission || 0,
          policiesSold: agent.policiesSold || 0,
          conversionRate: agent.conversionRate || 0,
          averageDealSize: agent.averageDealSize || 0,
          companyRank: agent.companyRank || 0,
          teamRank: agent.teamRank || 0
        }
      };
    });

    res.json({
      success: true,
      data: {
        leaderboard: enhancedLeaderboard,
        type,
        period,
        limit: parseInt(limit as string),
        insights: {
          topPerformer: enhancedLeaderboard[0],
          averageMetrics: enhancedLeaderboard.length > 0
            ? {
              averageYtdPremium: enhancedLeaderboard.reduce((sum, a) => sum + a.metrics.ytdPremium, 0) / enhancedLeaderboard.length,
              averageYtdCommission: enhancedLeaderboard.reduce((sum, a) => sum + a.metrics.ytdCommission, 0) / enhancedLeaderboard.length,
              averageTargetAchievement: enhancedLeaderboard.reduce((sum, a) => sum + a.metrics.targetAchievement, 0) / enhancedLeaderboard.length
            }
            : null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

// GET /api/crm/performance-analytics/comparisons - Agent comparisons
router.get('/comparisons', async (req, res) => {
  try {
    const { agentIds } = req.query;

    if (!agentIds) {
      return res.status(400).json({
        success: false,
        error: 'Agent IDs are required for comparison'
      });
    }

    const agentIdArray = (agentIds as string).split(',');

    const comparisonData = await Promise.all(
      agentIdArray.map(async (agentId) => {
        // Get agent's recent performance
        const recentPerformance = await db.select({
          agentId: agents.id,
          agentCode: agents.agentCode,
          userEmail: users.email,
          teamName: salesTeams.teamName,
          ytdPremium: agents.ytdPremium,
          ytdCommission: agents.ytdCommission,
          targetAnnualPremium: agents.targetAnnualPremium,
          // Last 3 months performance
          last3MonthsPremium: sql<number>`
            COALESCE(
              SUM(CASE
                WHEN ${agentPerformance.period} >= ${format(subMonths(new Date(), 3), 'yyyy-MM')}
                AND ${agentPerformance.period} <= ${format(new Date(), 'yyyy-MM')}
                THEN ${agentPerformance.totalPremium}
                ELSE 0
              END), 0
            )`
        })
        .from(agents)
        .leftJoin(users, eq(agents.userId, users.id))
        .leftJoin(salesTeams, eq(agents.teamId, salesTeams.id))
        .leftJoin(agentPerformance, eq(agentPerformance.agentId, agents.id))
        .where(eq(agents.id, agentId))
        .groupBy(agents.id)
        .limit(1);

        const agent = recentPerformance[0];
        if (!agent) return null;

        // Get performance trends
        const trends = await db.select({
          period: agentPerformance.period,
          totalPremium: agentPerformance.totalPremium,
          totalCommission: agentPerformance.totalCommission,
          policiesSold: agentPerformance.policiesSold
        })
        .from(agentPerformance)
        .where(eq(agentPerformance.agentId, agentId))
        .orderBy(desc(agentPerformance.period))
        .limit(12);

        return {
          agentId: agent.agentId,
          agentCode: agent.agentCode,
          agentName: agent.userEmail,
          teamName: agent.teamName,
          metrics: {
            ytdPremium: agent.ytdPremium || 0,
            ytdCommission: agent.ytdCommission || 0,
            targetAnnualPremium: agent.targetAnnualPremium || 0,
            last3MonthsPremium: agent.last3MonthsPremium || 0,
            targetAchievement: agent.targetAnnualPremium > 0
              ? (agent.ytdPremium / agent.targetAnnualPremium) * 100
              : 0,
            commissionRate: agent.ytdPremium > 0
              ? (agent.ytdCommission / agent.ytdPremium) * 100
              : 0,
            trends: trends
          }
        };
      })
    );

    const validAgents = comparisonData.filter(agent => agent !== null);

    if (validAgents.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid agents found for comparison'
      });
    }

    // Calculate comparative metrics
    const comparisonInsights = {
      averageYtdPremium: validAgents.reduce((sum, a) => sum + a.metrics.ytdPremium, 0) / validAgents.length,
      averageYtdCommission: validAgents.reduce((sum, a) => sum + a.metrics.ytdCommission, 0) / validAgents.length,
      averageTargetAchievement: validAgents.reduce((sum, a) => sum + a.metrics.targetAchievement, 0) / validAgents.length,
      bestPerformer: validAgents.reduce((best, current) =>
        current.metrics.ytdPremium > best.metrics.ytdPremium ? current : best
      ),
      worstPerformer: validAgents.reduce((worst, current) =>
        current.metrics.ytdPremium < worst.metrics.ytdPremium ? current : worst
      )
    };

    res.json({
      success: true,
      data: {
        agents: validAgents,
        comparisonInsights,
        agentCount: validAgents.length
      }
    });
  } catch (error) {
    console.error('Error fetching agent comparisons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent comparisons'
    });
  }
});

// GET /api/crm/performance-analytics/funnel-analysis - Sales funnel analysis
router.get('/funnel-analysis', async (req, res) => {
  try {
    const { period = 'current', teamId, agentId } = req.query;

    const commissionPeriod = format(new Date(), 'yyyy-MM');

    // Get funnel metrics
    const funnelData = await db.select({
      // Lead metrics
      totalLeads: sql<number>`COUNT(DISTINCT ${leads.id})`,
      contactedLeads: sql<number>`COUNT(DISTINCT CASE WHEN ${leads.firstContactDate} IS NOT NULL THEN ${leads.id} END)`,
      qualifiedLeads: sql<number>`COUNT(DISTINCT CASE WHEN ${leads.leadStatus} IN ('qualified', 'nurturing', 'converted') THEN ${leads.id} END)`,

      // Opportunity metrics
      totalOpportunities: sql<number>`COUNT(${salesOpportunities.id})`,
      quotedOpportunities: sql<number>`COUNT(DISTINCT CASE WHEN ${salesOpportunities.stage} = 'quotation' THEN ${salesOpportunities.id} END)`,
      underwritingOpportunities: sql<number>`COUNT(DISTINCT CASE WHEN ${salesOpportunities.stage} = 'underwriting' THEN ${salesOpportunities.id} END)`,

      // Conversion metrics
      closedWonOpportunities: sql<number>`COUNT(DISTINCT CASE WHEN ${salesOpportunities.stage} = 'closed_won' THEN ${salesOpportunities.id} END)`,
      totalPipelineValue: sql<number>`SUM(${salesOpportunities.estimatedValue})`,
      wonValue: sql<number>`SUM(CASE WHEN ${salesOpportunities.stage} = 'closed_won' THEN ${salesOpportunities.actualValue} ELSE 0 END)`
    })
    .from(leads)
    .leftJoin(salesOpportunities, eq(leads.id, salesOpportunities.leadId))
    .where(
      and(
        ...(agentId && [eq(leads.assignedAgentId, parseInt(agentId as string))]),
        ...(teamId && [sql`EXISTS (
          SELECT 1 FROM ${agents}
          WHERE ${agents.id} = ${leads.assignedAgentId}
          AND ${agents.teamId} = ${teamId}
        )`])
      )
    );

    const funnel = funnelData[0] || {};

    // Calculate conversion rates at each stage
    const funnelAnalysis = [
      {
        stage: 'Leads',
        count: funnel.totalLeads || 0,
        conversionRate: 100,
        value: 0
      },
      {
        stage: 'Contacted',
        count: funnel.contactedLeads || 0,
        conversionRate: funnel.totalLeads > 0 ? (funnel.contactedLeads / funnel.totalLeads) * 100 : 0,
        value: 0
      },
      {
        stage: 'Qualified',
        count: funnel.qualifiedLeads || 0,
        conversionRate: funnel.contactedLeads > 0 ? (funnel.qualifiedLeads / funnel.contactedLeads) * 100 : 0,
        value: 0
      },
      {
        stage: 'Opportunities',
        count: funnel.totalOpportunities || 0,
        conversionRate: funnel.qualifiedLeads > 0 ? (funnel.totalOpportunities / funnel.qualifiedLeads) * 100 : 0,
        value: funnel.totalPipelineValue || 0
      },
      {
        stage: 'Quoted',
        count: funnel.quotedOpportunities || 0,
        conversionRate: funnel.totalOpportunities > 0 ? (funnel.quotedOpportunities / funnel.totalOpportunities) * 100 : 0,
        value: 0
      },
      {
        stage: 'Underwriting',
        count: funnel.underwritingOpportunities || 0,
        conversionRate: funnel.quotedOpportunities > 0 ? (funnel.underwritingOpportunities / funnel.quotedOpportunities) * 100 : 0,
        value: 0
      },
      {
        stage: 'Closed Won',
        count: funnel.closedWonOpportunities || 0,
        conversionRate: funnel.underwritingOpportunities > 0 ? (funnel.closedWonOpportunities / funnel.underwritingOpportunities) * 100 : 0,
        value: funnel.wonValue || 0
      }
    ];

    // Calculate average deal sizes and win rates
    const avgDealSize = funnel.closedWonOpportunities > 0
      ? (funnel.wonValue / funnel.closedWonOpportunities)
      : 0;

    const overallWinRate = funnel.totalOpportunities > 0
      ? (funnel.closedWonOpportunities / funnel.totalOpportunities) * 100
      : 0;

    const leadToOpportunityRate = funnel.totalLeads > 0
      ? (funnel.totalOpportunities / funnel.totalLeads) * 100
      : 0;

    res.json({
      success: true,
      data: {
        period: commissionPeriod,
        funnel: funnelAnalysis,
        metrics: {
          totalLeads: funnel.totalLeads,
          totalOpportunities: funnel.totalOpportunities,
          closedWon: funnel.closedWonOpportunities,
          totalPipelineValue: funnel.totalPipelineValue,
          wonValue: funnel.wonValue,
          avgDealSize,
          overallWinRate,
          leadToOpportunityRate,
          leadToWinRate: funnel.totalLeads > 0 ? (funnel.closedWonOpportunities / funnel.totalLeads) * 100 : 0
        },
        insights: {
          highestDropoff: funnelAnalysis.reduce((max, stage, index) => {
          if (index === 0) return stage;
          const dropoffRate = 100 - stage.conversionRate;
          return dropoffRate > max.dropoffRate ? stage : max;
        }),
          bottlenecks: funnelAnalysis
            .filter(stage => stage.conversionRate < 50)
            .map(stage => stage.stage)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching funnel analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch funnel analysis'
    });
  }
});

export default router;