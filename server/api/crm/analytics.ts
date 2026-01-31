import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import {
  leads,
  salesOpportunities,
  salesActivities,
  salesTeams,
  users,
  agents,
  agentPerformance
} from '../../../shared/schema.js';
import { eq, and, gte, lte, desc, asc, sql, count, sum, avg } from 'drizzle-orm';

const router = Router();

// GET /api/crm/analytics/dashboard - Main CRM dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { dateRange, agentId, teamId } = req.query;

    // Default to last 30 days if no date range provided
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    let endDate = new Date();

    if (dateRange) {
      const [start, end] = (dateRange as string).split(',');
      startDate = new Date(start);
      endDate = new Date(end);
    }

    // Get basic counts
    const [
      totalLeads,
      newLeads,
      convertedLeads,
      totalOpportunities,
      closedWonOpportunities,
      totalActivities,
      totalAgents
    ] = await Promise.all([
      // Total leads
      db.select({ count: count() })
        .from(leads)
        .where(gte(leads.createdAt, startDate)),

      // New leads in period
      db.select({ count: count() })
        .from(leads)
        .where(and(
          gte(leads.createdAt, startDate),
          lte(leads.createdAt, endDate)
        )),

      // Converted leads
      db.select({ count: count() })
        .from(leads)
        .where(and(
          eq(leads.leadStatus, 'converted'),
          gte(leads.conversionDate, startDate)
        )),

      // Total opportunities
      db.select({ count: count() })
        .from(salesOpportunities)
        .where(gte(salesOpportunities.createdAt, startDate)),

      // Closed won opportunities
      db.select({ count: count() })
        .from(salesOpportunities)
        .where(and(
          eq(salesOpportunities.stage, 'closed_won'),
          gte(salesOpportunities.actualCloseDate, startDate)
        )),

      // Total activities
      db.select({ count: count() })
        .from(salesActivities)
        .where(and(
          gte(salesActivities.createdAt, startDate),
          lte(salesActivities.createdAt, endDate)
        )),

      // Total active agents
      db.select({ count: count() })
        .from(agents)
        .where(eq(agents.isActive, true))
    ]);

    // Calculate conversion rate
    const conversionRate = totalLeads[0].count > 0
      ? Math.round((convertedLeads[0].count / totalLeads[0].count) * 100)
      : 0;

    // Get pipeline value
    const pipelineValue = await db.select({
      total: sum(salesOpportunities.estimatedValue).mapWith(Number)
    })
    .from(salesOpportunities)
    .where(sql`${salesOpportunities.stage} NOT IN ('closed_won', 'closed_lost')`);

    // Get lead source effectiveness
    const leadSourceData = await db.select({
      source: leads.leadSource,
      count: count(),
      converted: sql<number>`SUM(CASE WHEN ${leads.leadStatus} = 'converted' THEN 1 ELSE 0 END)`.mapWith(Number)
    })
    .from(leads)
    .where(gte(leads.createdAt, startDate))
    .groupBy(leads.leadSource);

    const leadSourceEffectiveness = leadSourceData.map(source => ({
      ...source,
      conversionRate: source.count > 0 ? Math.round((source.converted / source.count) * 100) : 0
    }));

    // Get pipeline by stage
    const pipelineByStage = await db.select({
      stage: salesOpportunities.stage,
      count: count(),
      totalValue: sum(salesOpportunities.estimatedValue).mapWith(Number),
      avgProbability: avg(salesOpportunities.probability).mapWith(Number)
    })
    .from(salesOpportunities)
    .groupBy(salesOpportunities.stage)
    .orderBy(desc(sql`COUNT(*)`));

    res.json({
      success: true,
      data: {
        kpis: {
          totalLeads: totalLeads[0].count,
          newLeads: newLeads[0].count,
          convertedLeads: convertedLeads[0].count,
          conversionRate,
          totalOpportunities: totalOpportunities[0].count,
          closedWonOpportunities: closedWonOpportunities[0].count,
          winRate: totalOpportunities[0].count > 0
            ? Math.round((closedWonOpportunities[0].count / totalOpportunities[0].count) * 100)
            : 0,
          totalActivities: totalActivities[0].count,
          totalAgents: totalAgents[0].count,
          pipelineValue: pipelineValue[0]?.total || 0
        },
        leadSourceEffectiveness,
        pipelineByStage
      }
    });
  } catch (error) {
    console.error('Error fetching CRM dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CRM dashboard'
    });
  }
});

// GET /api/crm/analytics/lead-sources - Lead source effectiveness
router.get('/lead-sources', async (req, res) => {
  try {
    const { dateRange, startDate, endDate } = req.query;

    // Default to last 90 days for lead source analysis
    let start = new Date();
    start.setDate(start.getDate() - 90);
    let end = new Date();

    if (dateRange) {
      const [rangeStart, rangeEnd] = (dateRange as string).split(',');
      start = new Date(rangeStart);
      end = new Date(rangeEnd);
    }

    const leadSourceData = await db.select({
      source: leads.leadSource,
      totalLeads: count(),
      convertedLeads: sql<number>`SUM(CASE WHEN ${leads.leadStatus} = 'converted' THEN 1 ELSE 0 END)`.mapWith(Number),
      qualifiedLeads: sql<number>`SUM(CASE WHEN ${leads.leadStatus} IN ('qualified', 'nurturing', 'converted') THEN 1 ELSE 0 END)`.mapWith(Number),
      totalValue: sum(sql<number>`CASE WHEN ${leads.estimatedCoverage} IS NOT NULL THEN ${leads.estimatedCoverage} ELSE 0 END`).mapWith(Number),
      avgLeadScore: avg(leads.leadScore).mapWith(Number)
    })
    .from(leads)
    .where(and(
      gte(leads.createdAt, start),
      lte(leads.createdAt, end)
    ))
    .groupBy(leads.leadSource)
    .orderBy(desc(sql`COUNT(*)`));

    const leadSourceAnalysis = leadSourceData.map(source => ({
      source: source.source,
      totalLeads: source.totalLeads,
      convertedLeads: source.convertedLeads,
      qualifiedLeads: source.qualifiedLeads,
      conversionRate: source.totalLeads > 0 ? Math.round((source.convertedLeads / source.totalLeads) * 100) : 0,
      qualificationRate: source.totalLeads > 0 ? Math.round((source.qualifiedLeads / source.totalLeads) * 100) : 0,
      totalValue: source.totalValue,
      avgLeadScore: Math.round(source.avgLeadScore || 0),
      avgValuePerLead: source.convertedLeads > 0 ? Math.round(source.totalValue / source.convertedLeads) : 0
    }));

    // Get trends over time (last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const weeklyTrends = await db.select({
      week: sql<string>`DATE_TRUNC('week', ${leads.createdAt})`.as('week'),
      source: leads.leadSource,
      count: count()
    })
    .from(leads)
    .where(gte(leads.createdAt, twelveWeeksAgo))
    .groupBy(sql`DATE_TRUNC('week', ${leads.createdAt})`, leads.leadSource)
    .orderBy(sql`DATE_TRUNC('week', ${leads.createdAt})`);

    // Group weekly trends by source
    const trendsBySource = weeklyTrends.reduce((acc, trend) => {
      if (!acc[trend.source]) {
        acc[trend.source] = [];
      }
      acc[trend.source].push({
        week: trend.week,
        count: trend.count
      });
      return acc;
    }, {} as Record<string, Array<{ week: string; count: number }>>);

    res.json({
      success: true,
      data: {
        leadSourceAnalysis,
        trendsBySource
      }
    });
  } catch (error) {
    console.error('Error fetching lead source analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead source analytics'
    });
  }
});

// GET /api/crm/analytics/sales-performance - Team and individual performance
router.get('/sales-performance', async (req, res) => {
  try {
    const { dateRange, agentId, teamId, period = 'current' } = req.query;

    // Calculate period dates
    let periodStart = new Date();
    let periodEnd = new Date();

    if (period === 'current') {
      // Current month
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
      periodEnd.setHours(23, 59, 59, 999);
    } else if (period === 'last') {
      // Last month
      periodStart.setMonth(periodStart.getMonth() - 1);
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setDate(0);
      periodEnd.setHours(23, 59, 59, 999);
    }

    // Get agent performance data
    let agentPerformanceQuery = db.select({
      agentId: agents.userId,
      agentCode: agents.agentCode,
      agentType: agents.agentType,
      targetAnnualPremium: agents.targetAnnualPremium,
      ytdPremium: agents.ytdPremium,
      ytdCommission: agents.ytdCommission,
      joinDate: agents.joinDate,
      // User details
      agentName: users.email,
      // Team details
      teamId: salesTeams.id,
      teamName: salesTeams.teamName,
      // Performance metrics
      leadsAssigned: count(leads.id),
      leadsContacted: sql<number>`SUM(CASE WHEN ${leads.firstContactDate} IS NOT NULL THEN 1 ELSE 0 END)`.mapWith(Number),
      convertedLeads: sql<number>`SUM(CASE WHEN ${leads.leadStatus} = 'converted' THEN 1 ELSE 0 END)`.mapWith(Number),
      opportunitiesCreated: count(salesOpportunities.id),
      closedWonDeals: sql<number>`SUM(CASE WHEN ${salesOpportunities.stage} = 'closed_won' THEN 1 ELSE 0 END)`.mapWith(Number),
      totalPipelineValue: sum(salesOpportunities.estimatedValue).mapWith(Number),
      activitiesLogged: count(salesActivities.id)
    })
    .from(agents)
    .leftJoin(users, eq(agents.userId, users.id))
    .leftJoin(salesTeams, eq(agents.teamId, salesTeams.id))
    .leftJoin(leads, eq(leads.assignedAgentId, agents.userId))
    .leftJoin(salesOpportunities, eq(salesOpportunities.ownerId, agents.userId))
    .leftJoin(salesActivities, eq(salesActivities.agentId, agents.userId))
    .where(eq(agents.isActive, true));

    if (agentId) {
      agentPerformanceQuery = agentPerformanceQuery.where(eq(agents.userId, parseInt(agentId as string)));
    }

    const agentPerformance = await agentPerformanceQuery
      .groupBy(agents.userId, users.email, agents.agentCode, agents.agentType,
               agents.targetAnnualPremium, agents.ytdPremium, agents.ytdCommission,
               agents.joinDate, salesTeams.id, salesTeams.teamName)
      .orderBy(desc(sql`SUM(CASE WHEN ${salesOpportunities.stage} = 'closed_won' THEN 1 ELSE 0 END)`));

    // Calculate additional metrics
    const enhancedPerformance = agentPerformance.map(agent => ({
      ...agent,
      conversionRate: agent.leadsAssigned > 0 ? Math.round((agent.convertedLeads / agent.leadsAssigned) * 100) : 0,
      winRate: agent.opportunitiesCreated > 0 ? Math.round((agent.closedWonDeals / agent.opportunitiesCreated) * 100) : 0,
      averageDealSize: agent.closedWonDeals > 0 ? Math.round(agent.totalPipelineValue / agent.closedWonDeals) : 0,
      contactRate: agent.leadsAssigned > 0 ? Math.round((agent.leadsContacted / agent.leadsAssigned) * 100) : 0,
      targetAchievement: agent.targetAnnualPremium > 0 ? Math.round((agent.ytdPremium / agent.targetAnnualPremium) * 100) : 0
    }));

    // Get team performance summary
    const teamPerformance = await db.select({
      teamId: salesTeams.id,
      teamName: salesTeams.teamName,
      agentCount: count(agents.id),
      totalTarget: sum(agents.targetAnnualPremium).mapWith(Number),
      totalYtdPremium: sum(agents.ytdPremium).mapWith(Number),
      totalYtdCommission: sum(agents.ytdCommission).mapWith(Number),
      avgConversionRate: avg(sql<number>`CASE WHEN ${leads.leadStatus} = 'converted' THEN 1 ELSE 0 END`).mapWith(Number)
    })
    .from(salesTeams)
    .leftJoin(agents, eq(agents.teamId, salesTeams.id))
    .leftJoin(leads, eq(leads.assignedAgentId, agents.userId))
    .where(eq(salesTeams.isActive, true))
    .groupBy(salesTeams.id, salesTeams.teamName)
    .orderBy(desc(sql`SUM(${agents.ytdPremium})`));

    // Calculate team metrics
    const enhancedTeamPerformance = teamPerformance.map(team => ({
      ...team,
      targetAchievement: team.totalTarget > 0 ? Math.round((team.totalYtdPremium / team.totalTarget) * 100) : 0,
      avgConversionRate: Math.round(team.avgConversionRate * 100)
    }));

    res.json({
      success: true,
      data: {
        agentPerformance: enhancedPerformance,
        teamPerformance: enhancedTeamPerformance,
        period: {
          start: periodStart,
          end: periodEnd,
          type: period
        }
      }
    });
  } catch (error) {
    console.error('Error fetching sales performance analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales performance analytics'
    });
  }
});

// GET /api/crm/analytics/pipeline-health - Pipeline analysis
router.get('/pipeline-health', async (req, res) => {
  try {
    const { dateRange } = req.query;

    // Get current pipeline snapshot
    const currentPipeline = await db.select({
      stage: salesOpportunities.stage,
      count: count(),
      totalValue: sum(salesOpportunities.estimatedValue).mapWith(Number),
      avgProbability: avg(salesOpportunities.probability).mapWith(Number),
      avgAge: avg(sql<number>`EXTRACT(EPOCH FROM (NOW() - ${salesOpportunities.createdAt})) / 86400`).mapWith(Number)
    })
    .from(salesOpportunities)
    .where(sql`${salesOpportunities.stage} NOT IN ('closed_won', 'closed_lost')`)
    .groupBy(salesOpportunities.stage);

    // Calculate weighted pipeline value
    const pipelineWithWeightedValue = currentPipeline.map(stage => ({
      ...stage,
      weightedValue: Math.round((stage.totalValue || 0) * (stage.avgProbability || 0) / 100)
    }));

    // Get pipeline velocity (time between stages)
    const pipelineVelocity = await db.select({
      opportunityId: salesOpportunities.id,
      opportunityName: salesOpportunities.opportunityName,
      stage: salesOpportunities.stage,
      daysInStage: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${salesOpportunities.updatedAt})) / 86400`.mapWith(Number),
      totalDays: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${salesOpportunities.createdAt})) / 86400`.mapWith(Number)
    })
    .from(salesOpportunities)
    .where(sql`${salesOpportunities.stage} NOT IN ('closed_won', 'closed_lost')`)
    .orderBy(desc(sql`EXTRACT(EPOCH FROM (NOW() - ${salesOpportunities.createdAt})) / 86400`));

    // Calculate average time in each stage
    const avgTimeByStage = pipelineVelocity.reduce((acc, opp) => {
      if (!acc[opp.stage]) {
        acc[opp.stage] = { totalDays: 0, count: 0 };
      }
      acc[opp.stage].totalDays += opp.daysInStage;
      acc[opp.stage].count += 1;
      return acc;
    }, {} as Record<string, { totalDays: number; count: number }>);

    const avgTimeInStages = Object.entries(avgTimeByStage).map(([stage, data]) => ({
      stage,
      averageDays: Math.round(data.totalDays / data.count)
    }));

    // Get conversion rates between stages (simplified)
    const stageConversionRates = await db.select({
      stage: salesOpportunities.stage,
      totalCount: count(),
      wonCount: sql<number>`SUM(CASE WHEN ${salesOpportunities.stage} = 'closed_won' THEN 1 ELSE 0 END)`.mapWith(Number)
    })
    .from(salesOpportunities)
    .groupBy(salesOpportunities.stage);

    const conversionRates = stageConversionRates.map(stage => ({
      stage: stage.stage,
      totalDeals: stage.totalCount,
      wonDeals: stage.wonCount,
      conversionRate: stage.totalCount > 0 ? Math.round((stage.wonCount / stage.totalCount) * 100) : 0
    }));

    // Get stale opportunities (no activity for > 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staleOpportunities = await db.select({
      id: salesOpportunities.id,
      opportunityName: salesOpportunities.opportunityName,
      stage: salesOpportunities.stage,
      estimatedValue: salesOpportunities.estimatedValue,
      lastActivity: salesOpportunities.updatedAt,
      daysInactive: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${salesOpportunities.updatedAt})) / 86400`.mapWith(Number)
    })
    .from(salesOpportunities)
    .where(and(
      sql`${salesOpportunities.stage} NOT IN ('closed_won', 'closed_lost')`,
      lte(salesOpportunities.updatedAt, thirtyDaysAgo)
    ))
    .orderBy(desc(sql`EXTRACT(EPOCH FROM (NOW() - ${salesOpportunities.updatedAt})) / 86400`));

    res.json({
      success: true,
      data: {
        currentPipeline: pipelineWithWeightedValue,
        avgTimeInStages,
        conversionRates,
        staleOpportunities,
        pipelineHealth: {
          totalOpportunities: currentPipeline.reduce((sum, stage) => sum + stage.count, 0),
          totalValue: currentPipeline.reduce((sum, stage) => sum + (stage.totalValue || 0), 0),
          weightedValue: pipelineWithWeightedValue.reduce((sum, stage) => sum + stage.weightedValue, 0),
          staleCount: staleOpportunities.length,
          healthScore: calculatePipelineHealthScore(pipelineWithWeightedValue, staleOpportunities.length)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pipeline health analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipeline health analytics'
    });
  }
});

// Helper function to calculate pipeline health score
function calculatePipelineHealthScore(pipeline: any[], staleCount: number): number {
  const totalValue = pipeline.reduce((sum, stage) => sum + (stage.totalValue || 0), 0);
  const weightedValue = pipeline.reduce((sum, stage) => sum + (stage.weightedValue || 0), 0);
  const totalOpportunities = pipeline.reduce((sum, stage) => sum + stage.count, 0);

  if (totalOpportunities === 0) return 100;

  // Factors: weighted value ratio (40%), stale ratio (30%), stage distribution (30%)
  const weightedValueRatio = totalValue > 0 ? (weightedValue / totalValue) * 100 : 0;
  const staleRatio = Math.max(0, 100 - (staleCount / totalOpportunities) * 100);
  const stageDistribution = 80; // Simplified - would analyze stage balance

  return Math.round((weightedValueRatio * 0.4) + (staleRatio * 0.3) + (stageDistribution * 0.3));
}

export default router;