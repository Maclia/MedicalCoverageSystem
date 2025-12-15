import { db } from '../db';
import {
  agents,
  commissionTiers,
  commissionTransactions,
  members,
  salesOpportunities,
  agentPerformance,
  users
} from '../../shared/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { format, startOfMonth, endOfMonth, subMonths, getMonth, getYear } from 'date-fns';

export interface CommissionCalculationRequest {
  agentId: string;
  memberId: number;
  policyId?: number; // Would reference policies table when implemented
  premiumAmount: number;
  policyType: 'individual' | 'corporate' | 'family';
  isNewBusiness: boolean;
  transactionDate: Date;
  transactionType: 'new_business' | 'renewal' | 'bonus' | 'override' | 'adjustment' | 'clawback';
}

export interface CommissionCalculationResult {
  baseCommission: number;
  bonusCommission: number;
  overrideCommission: number;
  totalCommission: number;
  commissionRate: number;
  paymentDate: Date;
  commissionPeriod: string;
  calculationBreakdown: {
    baseRate: number;
    baseAmount: number;
    bonusRate?: number;
    bonusAmount?: number;
    overrideRate?: number;
    overrideAmount?: number;
    tierBonus?: number;
    clawbackAmount?: number;
  };
}

export interface AgentPerformanceMetrics {
  agentId: string;
  period: string;
  ytdPremium: number;
  ytdCommission: number;
  leadConversionRate: number;
  averageDealSize: number;
  commissionRate: number;
  tierBonusEligible: boolean;
  nextTierTarget: number;
  nextTierBonus?: number;
}

export class CommissionService {

  /**
   * Calculate commission for a transaction
   */
  async calculateCommission(request: CommissionCalculationRequest): Promise<CommissionCalculationResult> {
    try {
      // Get agent details with commission tier
      const agent = await db.select({
        id: agents.id,
        agentCode: agents.agentCode,
        agentType: agents.agentType,
        baseCommissionRate: agents.baseCommissionRate,
        overrideRate: agents.overrideRate,
        supervisorId: agents.supervisorId,
        teamId: agents.teamId,
        targetAnnualPremium: agents.targetAnnualPremium,
        ytdPremium: agents.ytdPremium,
        ytdCommission: agents.ytdCommission,
        // Commission tier details
        tierBaseRate: commissionTiers.baseRate,
        tierBonusThreshold: commissionTiers.bonusThreshold,
        tierBonusRate: commissionTiers.bonusRate,
        individualRate: commissionTiers.individualRate,
        corporateRate: commissionTiers.corporateRate,
        familyRate: commissionTiers.familyRate,
        isActive: commissionTiers.isActive
      })
      .from(agents)
      .leftJoin(commissionTiers, eq(agents.commissionTierId, commissionTiers.id))
      .where(and(
        eq(agents.id, request.agentId),
        eq(agents.isActive, true)
      ))
      .limit(1);

      if (!agent[0]) {
        throw new Error('Agent not found or inactive');
      }

      const agentData = agent[0];

      // Determine commission rate based on policy type
      let commissionRate = agentData.baseCommissionRate || agentData.tierBaseRate || 0;

      if (agentData.individualRate && request.policyType === 'individual') {
        commissionRate = agentData.individualRate;
      } else if (agentData.corporateRate && request.policyType === 'corporate') {
        commissionRate = agentData.corporateRate;
      } else if (agentData.familyRate && request.policyType === 'family') {
        commissionRate = agentData.familyRate;
      }

      // Apply renewal vs new business rates
      if (!request.isNewBusiness && request.transactionType === 'renewal') {
        commissionRate = commissionRate * 0.5; // Renewals typically pay 50% of new business rate
      }

      // Calculate base commission
      const baseAmount = request.premiumAmount * (commissionRate / 100);
      let baseCommission = Math.round(baseAmount);

      // Calculate bonus commission
      let bonusCommission = 0;
      let bonusRate = 0;
      let tierBonusAmount = 0;

      // Check for tier bonus eligibility
      if (agentData.tierBonusThreshold && agentData.tierBonusRate) {
        const ytdPremium = agentData.ytdPremium || 0;
        if (ytdPremium >= agentData.tierBonusThreshold) {
          bonusRate = agentData.tierBonusRate;
          tierBonusAmount = Math.round(request.premiumAmount * (bonusRate / 100));
        }
      }

      bonusCommission = tierBonusAmount;

      // Calculate override commission (for managers)
      let overrideCommission = 0;
      let overrideAmount = 0;

      if (request.transactionType === 'override' && agentData.supervisorId) {
        const overrideRatePercent = agentData.overrideRate || 5; // Default 5% override
        overrideAmount = baseCommission * (overrideRatePercent / 100);
        overrideCommission = Math.round(overrideAmount);
      }

      // Handle clawbacks
      let clawbackAmount = 0;
      if (request.transactionType === 'clawback') {
        // Calculate clawback based on previous commission
        clawbackAmount = -Math.abs(request.premiumAmount * (commissionRate / 100));
        baseCommission = 0;
        bonusCommission = 0;
        overrideCommission = 0;
      }

      const totalCommission = baseCommission + bonusCommission + overrideCommission;

      // Generate commission period (YYYY-MM)
      const commissionPeriod = `${getYear(request.transactionDate)}-${String(getMonth(request.transactionDate) + 1).padStart(2, '0')}`;

      // Calculate payment date (typically 30 days after transaction)
      const paymentDate = new Date(request.transactionDate);
      paymentDate.setDate(paymentDate.getDate() + 30);

      return {
        baseCommission,
        bonusCommission,
        overrideCommission,
        totalCommission,
        commissionRate,
        paymentDate,
        commissionPeriod,
        calculationBreakdown: {
          baseRate: commissionRate,
          baseAmount: baseAmount,
          bonusRate: bonusRate || undefined,
          bonusAmount: bonusCommission || undefined,
          overrideRate: request.transactionType === 'override' ? (agentData.overrideRate || 5) : undefined,
          overrideAmount: overrideCommission || undefined,
          tierBonus: tierBonusAmount || undefined,
          clawbackAmount: clawbackAmount || undefined
        }
      };

    } catch (error) {
      console.error('Error calculating commission:', error);
      throw new Error(`Commission calculation failed: ${error.message}`);
    }
  }

  /**
   * Process commission and create transaction record
   */
  async processCommission(request: CommissionCalculationRequest): Promise<string> {
    const calculation = await this.calculateCommission(request);

    // Create commission transaction record
    const [transaction] = await db.insert(commissionTransactions)
      .values({
        agentId: request.agentId,
        memberId: request.memberId,
        policyId: request.policyId,
        transactionType: request.transactionType,
        amount: calculation.totalCommission,
        rate: calculation.commissionRate,
        premiumAmount: request.premiumAmount,
        baseCommission: calculation.baseCommission,
        bonusCommission: calculation.bonusCommission,
        overrideCommission: calculation.overrideCommission,
        totalCommission: calculation.totalCommission,
        paymentDate: calculation.paymentDate,
        commissionPeriod: calculation.commissionPeriod,
        createdAt: new Date()
      })
      .returning();

    // Update agent YTD totals
    await this.updateAgentPerformance(request.agentId, calculation.commissionPeriod);

    return transaction.id;
  }

  /**
   * Update agent performance metrics
   */
  private async updateAgentPerformance(agentId: string, commissionPeriod: string): Promise<void> {
    // Calculate YTD totals for the agent
    const yearStart = new Date(`${commissionPeriod.split('-')[0]}-01-01`);
    const yearEnd = new Date(`${commissionPeriod.split('-')[0]}-12-31`);

    const performanceData = await db.select({
      totalPremium: sql<number>`SUM(${commissionTransactions.premiumAmount})`,
      totalCommission: sql<number>`SUM(${commissionTransactions.totalCommission})`,
      transactionCount: sql<number>`COUNT(*)`
    })
    .from(commissionTransactions)
    .where(and(
      eq(commissionTransactions.agentId, agentId),
      gte(commissionTransactions.createdAt, yearStart),
      lte(commissionTransactions.createdAt, yearEnd),
      sql`${commissionTransactions.paymentStatus} != 'rejected'`
    ));

    const { totalPremium, totalCommission } = performanceData[0] || { totalPremium: 0, totalCommission: 0 };

    // Update agents table
    await db.update(agents)
      .set({
        ytdPremium: totalPremium,
        ytdCommission: totalCommission,
        updatedAt: new Date()
      })
      .where(eq(agents.id, agentId));

    // Update agent performance record
    const existingPerformance = await db.select()
      .from(agentPerformance)
      .where(and(
        eq(agentPerformance.agentId, agentId),
        eq(agentPerformance.period, commissionPeriod)
      ))
      .limit(1);

    if (existingPerformance.length === 0) {
      // Create new performance record
      await db.insert(agentPerformance)
        .values({
          agentId,
          period: commissionPeriod,
          totalPremium,
          totalCommission,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    } else {
      // Update existing performance record
      await db.update(agentPerformance)
        .set({
          totalPremium,
          totalCommission,
          updatedAt: new Date()
        })
        .where(and(
          eq(agentPerformance.agentId, agentId),
          eq(agentPerformance.period, commissionPeriod)
        ));
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(agentId: string, period?: string): Promise<AgentPerformanceMetrics> {
    const currentPeriod = period || format(new Date(), 'yyyy-MM');

    // Get agent details with tier information
    const agent = await db.select({
      id: agents.id,
      targetAnnualPremium: agents.targetAnnualPremium,
      ytdPremium: agents.ytdPremium,
      ytdCommission: agents.ytdCommission,
      tierBonusThreshold: commissionTiers.bonusThreshold,
      tierBonusRate: commissionTiers.bonusRate,
      nextTierThreshold: commissionTiers.bonusThreshold
    })
    .from(agents)
    .leftJoin(commissionTiers, eq(agents.commissionTierId, commissionTiers.id))
    .where(eq(agents.id, agentId))
    .limit(1);

    if (!agent[0]) {
      throw new Error('Agent not found');
    }

    const agentData = agent[0];

    // Calculate current period performance
    const periodPerformance = await db.select({
      periodPremium: sql<number>`SUM(${commissionTransactions.premiumAmount})`,
      periodCommission: sql<number>`SUM(${commissionTransactions.totalCommission})`,
      transactionCount: sql<number>`COUNT(*)`
    })
    .from(commissionTransactions)
    .where(and(
      eq(commissionTransactions.agentId, agentId),
      eq(commissionTransactions.commissionPeriod, currentPeriod)
    ));

    const periodData = periodPerformance[0] || { periodPremium: 0, periodCommission: 0 };

    // Calculate conversion rate and average deal size
    const conversionStats = await db.select({
      totalLeads: sql<number>`COUNT(*)`,
      convertedLeads: sql<number>`SUM(CASE WHEN ${leads.leadStatus} = 'converted' THEN 1 ELSE 0 END)`,
      totalValue: sql<number>`SUM(${salesOpportunities.actualValue})`
    })
    .from(leads)
    .leftJoin(salesOpportunities, eq(leads.id, salesOpportunities.leadId))
    .where(and(
      eq(leads.assignedAgentId, parseInt(agentId)),
      gte(leads.createdAt, new Date(`${currentPeriod.split('-')[0]}-01-01`)),
      lte(leads.createdAt, new Date(`${currentPeriod.split('-')[0]}-12-31`))
    ));

    const stats = conversionStats[0] || { totalLeads: 0, convertedLeads: 0, totalValue: 0 };

    const leadConversionRate = stats.totalLeads > 0 ? (stats.convertedLeads / stats.totalLeads) * 100 : 0;
    const averageDealSize = stats.convertedLeads > 0 ? stats.totalValue / stats.convertedLeads : 0;
    const commissionRate = agentData.ytdPremium > 0 ? (agentData.ytdCommission / agentData.ytdPremium) * 100 : 0;

    const tierBonusEligible = agentData.tierBonusThreshold ?
      agentData.ytdPremium >= agentData.tierBonusThreshold : false;

    return {
      agentId,
      period: currentPeriod,
      ytdPremium: agentData.ytdPremium || 0,
      ytdCommission: agentData.ytdCommission || 0,
      leadConversionRate,
      averageDealSize,
      commissionRate,
      tierBonusEligible,
      nextTierTarget: agentData.tierBonusThreshold || 0,
      nextTierBonus: tierBonusEligible ? agentData.tierBonusRate || 0 : undefined
    };
  }

  /**
   * Get commission payment schedule
   */
  async getCommissionPaymentSchedule(agentId?: string, period?: string): Promise<any[]> {
    let query = db.select({
      id: commissionTransactions.id,
      agentId: commissionTransactions.agentId,
      memberId: commissionTransactions.memberId,
      amount: commissionTransactions.totalCommission,
      paymentDate: commissionTransactions.paymentDate,
      paymentStatus: commissionTransactions.paymentStatus,
      paymentReference: commissionTransactions.paymentReference,
      commissionPeriod: commissionTransactions.commissionPeriod,
      transactionType: commissionTransactions.transactionType,
      createdAt: commissionTransactions.createdAt
    })
    .from(commissionTransactions);

    if (agentId) {
      query = query.where(eq(commissionTransactions.agentId, agentId));
    }

    if (period) {
      query = query.where(eq(commissionTransactions.commissionPeriod, period));
    }

    return await query.orderBy(desc(commissionTransactions.paymentDate));
  }

  /**
   * Process commission payments
   */
  async processCommissionPayments(period: string): Promise<{ processed: number; totalAmount: number }> {
    // Get all pending commissions for the period
    const pendingCommissions = await db.select()
      .from(commissionTransactions)
      .where(and(
        eq(commissionTransactions.commissionPeriod, period),
        eq(commissionTransactions.paymentStatus, 'pending')
      ));

    let processed = 0;
    let totalAmount = 0;

    for (const commission of pendingCommissions) {
      // In a real implementation, this would integrate with payment processing
      // For now, we'll mark as approved
      await db.update(commissionTransactions)
        .set({
          paymentStatus: 'approved',
          paymentDate: new Date(),
          paymentReference: `PAY-${Date.now()}`
        })
        .where(eq(commissionTransactions.id, commission.id));

      processed++;
      totalAmount += commission.totalCommission;
    }

    return { processed, totalAmount };
  }

  /**
   * Calculate commission clawback for cancelled policies
   */
  async calculateClawback(agentId: string, memberId: number, cancelDate: Date): Promise<number> {
    // Find all commissions for this agent-member combination in the last 12 months
    const twelveMonthsAgo = subMonths(cancelDate, 12);

    const commissions = await db.select({
      id: commissionTransactions.id,
      totalCommission: commissionTransactions.totalCommission,
      commissionPeriod: commissionTransactions.commissionPeriod
    })
    .from(commissionTransactions)
    .where(and(
      eq(commissionTransactions.agentId, agentId),
      eq(commissionTransactions.memberId, memberId),
      gte(commissionTransactions.createdAt, twelveMonthsAgo),
      eq(commissionTransactions.paymentStatus, 'approved')
    ))
    .orderBy(desc(commissionTransactions.createdAt));

    if (commissions.length === 0) {
      return 0;
    }

    // Calculate clawback amount (typically 100% of commission for cancellations within 12 months)
    const totalClawback = commissions.reduce((sum, commission) => sum + commission.totalCommission, 0);

    // Create clawback transaction
    await db.insert(commissionTransactions)
      .values({
        agentId,
        memberId,
        transactionType: 'clawback',
        amount: -totalClawback, // Negative amount for clawback
        rate: 0, // No rate for clawback
        premiumAmount: 0, // No premium for clawback
        baseCommission: 0,
        bonusCommission: 0,
        overrideCommission: 0,
        totalCommission: -totalClawback,
        paymentStatus: 'approved',
        paymentDate: new Date(),
        paymentReference: `CLAWBACK-${Date.now()}`,
        commissionPeriod: format(cancelDate, 'yyyy-MM'),
        createdAt: new Date()
      });

    return totalClawback;
  }

  /**
   * Generate commission report for agents
   */
  async generateCommissionReport(period: string, teamId?: string): Promise<any[]> {
    let query = db.select({
      agentId: agents.id,
      agentCode: agents.agentCode,
      agentName: users.email,
      agentType: agents.agentType,
      targetAnnualPremium: agents.targetAnnualPremium,
      ytdPremium: agents.ytdPremium,
      ytdCommission: agents.ytdCommission,
      teamId: agents.teamId,
      // Period specific metrics
      periodPremium: agentPerformance.totalPremium,
      periodCommission: agentPerformance.totalCommission,
      periodTransactions: sql<number>`COUNT(${commissionTransactions.id})`
    })
    .from(agents)
    .leftJoin(users, eq(agents.userId, users.id))
    .leftJoin(agentPerformance, and(
      eq(agentPerformance.agentId, agents.id),
      eq(agentPerformance.period, period)
    ))
    .leftJoin(commissionTransactions, and(
      eq(commissionTransactions.agentId, agents.id),
      eq(commissionTransactions.commissionPeriod, period)
    ))
    .where(eq(agents.isActive, true));

    if (teamId) {
      query = query.where(eq(agents.teamId, teamId));
    }

    const agentsWithPerformance = await query.groupBy(agents.id);

    return agentsWithPerformance.map(agent => ({
      ...agent,
      targetAchievement: agent.targetAnnualPremium > 0 ?
        ((agent.ytdPremium || 0) / agent.targetAnnualPremium) * 100 : 0,
      averageCommission: (agent.periodTransactions || 0) > 0 ?
        (agent.periodCommission || 0) / (agent.periodTransactions || 0) : 0,
      commissionRate: agent.ytdPremium > 0 ?
        ((agent.ytdCommission || 0) / agent.ytdPremium) * 100 : 0
    }));
  }
}

export const commissionService = new CommissionService();