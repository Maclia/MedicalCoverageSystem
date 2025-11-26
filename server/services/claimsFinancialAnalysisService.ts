import { Injectable, Inject } from '@nestjs/common';
import { DrizzlePool } from '../database/types';
import * as schema from '../shared/schema';
import { eq, and, desc, sql, lt, gte, between } from 'drizzle-orm';
import {
  Claim,
  ClaimStatus,
  ClaimPayment,
  ClaimReserve,
  ClaimFinancialTransaction,
  ClaimApprovalWorkflow,
  ClaimReserveTransaction,
  FinancialTransactionType,
  ClaimAnalytics,
  ClaimFinancialMetrics,
  ClaimCostBreakdown,
  ClaimLossRatioAnalysis,
  ClaimPaymentPatterns,
  ClaimReserveAnalysis
} from '../shared/schema';

@Injectable()
export class ClaimsFinancialAnalysisService {
  constructor(@Inject('DATABASE') private db: DrizzlePool) {}

  /**
   * Generate comprehensive claim financial analysis
   */
  async generateClaimFinancialAnalysis(claimId: string): Promise<{
    claim: any;
    financialMetrics: ClaimFinancialMetrics;
    costBreakdown: ClaimCostBreakdown;
    paymentPatterns: ClaimPaymentPatterns;
    reserveAnalysis: ClaimReserveAnalysis;
    lossRatio: ClaimLossRatioAnalysis;
    trends: any[];
    recommendations: string[];
  }> {
    // Get claim details
    const [claim, payments, reserves, transactions] = await Promise.all([
      this.db.select({
        id: schema.claims.id,
        claimNumber: schema.claims.claimNumber,
        status: schema.claims.status,
        incidentDate: schema.claims.incidentDate,
        reportedDate: schema.claims.reportedDate,
        settledDate: schema.claims.settledDate,
        amount: schema.claims.amount,
        currency: schema.claims.currency,
        policyNumber: schema.policies.policyNumber,
        clientName: schema.clients.name,
        memberName: schema.members.name,
        premium: schema.policies.premium,
        coverageType: schema.policies.coverageType
      })
        .from(schema.claims)
        .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
        .leftJoin(schema.clients, eq(schema.clients.id, schema.policies.clientId))
        .leftJoin(schema.members, eq(schema.members.id, schema.claims.memberId))
        .where(eq(schema.claims.id, claimId))
        .limit(1),

      this.db.select()
        .from(schema.claimPayments)
        .where(eq(schema.claimPayments.claimId, claimId)),

      this.db.select()
        .from(schema.claimReserves)
        .where(eq(schema.claimReserves.claimId, claimId)),

      this.db.select()
        .from(schema.claimFinancialTransactions)
        .where(eq(schema.claimFinancialTransactions.claimId, claimId))
    ]);

    if (!claim[0]) {
      throw new Error('Claim not found');
    }

    const claimData = claim[0];

    // Calculate financial metrics
    const totalPaid = payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalReserved = reserves
      .filter(r => r.status === 'ACTIVE')
      .reduce((sum, r) => sum + r.amount, 0);

    const financialMetrics: ClaimFinancialMetrics = {
      totalIncurred: totalPaid + totalReserved,
      totalPaid: Number(totalPaid),
      totalReserved: Number(totalReserved),
      outstandingReserve: Number(totalReserved),
      averagePaymentTime: this.calculateAveragePaymentTime(payments),
      settlementRatio: claimData.amount > 0 ? totalPaid / claimData.amount : 0,
      reserveUtilization: totalReserved > 0 ? totalPaid / (totalPaid + totalReserved) : 0
    };

    // Cost breakdown analysis
    const costBreakdown: ClaimCostBreakdown = {
      indemnityPayments: payments
        .filter(p => p.paymentType === 'INDEMNITY')
        .reduce((sum, p) => sum + p.amount, 0),
      expensePayments: payments
        .filter(p => p.paymentType === 'EXPENSE')
        .reduce((sum, p) => sum + p.amount, 0),
      legalExpenses: payments
        .filter(p => p.paymentType === 'LEGAL')
        .reduce((sum, p) => sum + p.amount, 0),
      administrativeCosts: reserves
        .filter(r => r.reserveType === 'EXPENSE')
        .reduce((sum, r) => sum + r.amount, 0)
    };

    // Payment patterns
    const paymentPatterns: ClaimPaymentPatterns = {
      paymentFrequency: this.calculatePaymentFrequency(payments),
      averagePaymentAmount: payments.length > 0 ? totalPaid / payments.length : 0,
      paymentTiming: this.analyzePaymentTiming(claimData, payments),
        seasonalPatterns: this.detectSeasonalPatterns(payments)
    };

    // Reserve analysis
    const reserveAnalysis: ClaimReserveAnalysis = {
      initialReserve: reserves.find(r => r.reserveType === 'INCURRED_LOSS')?.amount || 0,
      finalReserve: Number(totalReserved),
      reserveChanges: reserves.length - 1,
      adequacyRatio: this.calculateReserveAdequacyRatio(totalPaid, totalReserved),
      reserveAccuracy: this.calculateReserveAccuracy(reserves, payments)
    };

    // Loss ratio analysis
    const lossRatio: ClaimLossRatioAnalysis = {
      incurredLoss: Number(totalPaid),
      earnedPremium: Number(claimData.premium) || 0,
      lossRatio: claimData.premium > 0 ? totalPaid / claimData.premium : 0,
      expenseRatio: Number(costBreakdown.expensePayments) / (claimData.premium || 1),
      combinedRatio: claimData.premium > 0 ?
        (totalPaid + Number(costBreakdown.expensePayments)) / claimData.premium : 0
    };

    // Generate trends
    const trends = await this.generateClaimTrends(claimId);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      claim: claimData,
      metrics: financialMetrics,
      breakdown: costBreakdown,
      patterns: paymentPatterns,
      reserves: reserveAnalysis,
      lossRatio
    });

    return {
      claim: claimData,
      financialMetrics,
      costBreakdown,
      paymentPatterns,
      reserveAnalysis,
      lossRatio,
      trends,
      recommendations
    };
  }

  /**
   * Generate portfolio-level claims analysis
   */
  async generatePortfolioAnalysis(criteria: {
    dateFrom?: Date;
    dateTo?: Date;
    coverageType?: string;
    minAmount?: number;
    status?: ClaimStatus;
  }): Promise<{
    summary: any;
    lossRatios: any;
    paymentPatterns: any;
    reserveAnalysis: any;
    topClaims: any[];
    trends: any[];
    benchmarks: any;
  }> {
    let whereConditions: any[] = [];

    if (criteria.dateFrom && criteria.dateTo) {
      whereConditions.push(
        between(schema.claims.incidentDate, criteria.dateFrom, criteria.dateTo)
      );
    }

    if (criteria.coverageType) {
      whereConditions.push(eq(schema.policies.coverageType, criteria.coverageType));
    }

    if (criteria.minAmount) {
      whereConditions.push(gte(schema.claims.amount, criteria.minAmount));
    }

    if (criteria.status) {
      whereConditions.push(eq(schema.claims.status, criteria.status));
    }

    const [summary, lossRatios, paymentPatterns, reserveAnalysis] = await Promise.all([
      this.calculatePortfolioSummary(whereConditions),
      this.calculatePortfolioLossRatios(whereConditions),
      this.analyzePortfolioPaymentPatterns(whereConditions),
      this.analyzePortfolioReserves(whereConditions)
    ]);

    // Get top claims by amount
    const topClaims = await this.db.select({
      claimNumber: schema.claims.claimNumber,
      amount: schema.claims.amount,
      status: schema.claims.status,
      clientName: schema.clients.name,
      incidentDate: schema.claims.incidentDate,
      totalPaid: sql<number>`COALESCE(SUM(${schema.claimPayments.amount}), 0)`.as('totalPaid')
    })
      .from(schema.claims)
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .leftJoin(schema.clients, eq(schema.clients.id, schema.policies.clientId))
      .leftJoin(schema.claimPayments, eq(schema.claimPayments.claimId, schema.claims.id))
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined)
      .groupBy(schema.claims.id, schema.claims.claimNumber, schema.claims.amount,
               schema.claims.status, schema.clients.name, schema.claims.incidentDate)
      .orderBy(desc(schema.claims.amount))
      .limit(20);

    // Generate trends
    const trends = await this.generatePortfolioTrends(whereConditions);

    // Calculate benchmarks
    const benchmarks = await this.calculateBenchmarks();

    return {
      summary,
      lossRatios,
      paymentPatterns,
      reserveAnalysis,
      topClaims,
      trends,
      benchmarks
    };
  }

  /**
   * Predict future claim costs
   */
  async predictClaimCosts(claimId: string): Promise<{
    predictedTotalCost: number;
    confidence: number;
    factors: any[];
    methodology: string;
  }> {
    // Get historical data for similar claims
    const claim = await this.db.select({
      coverageType: schema.policies.coverageType,
      amount: schema.claims.amount,
      incidentType: schema.claims.incidentType
    })
      .from(schema.claims)
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .where(eq(schema.claims.id, claimId))
      .limit(1);

    if (!claim[0]) {
      throw new Error('Claim not found');
    }

    // Find similar historical claims
    const similarClaims = await this.db.select({
      totalCost: sql<number>`COALESCE(SUM(${schema.claimPayments.amount}), 0)`.as('totalCost'),
      initialReserve: schema.claimReserves.amount,
      settlementTime: sql<number>`EXTRACT(DAY FROM ${schema.claims.settledDate} - ${schema.claims.incidentDate})`.as('settlementTime')
    })
      .from(schema.claims)
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .leftJoin(schema.claimPayments, eq(schema.claimPayments.claimId, schema.claims.id))
      .leftJoin(schema.claimReserves, eq(schema.claimReserves.claimId, schema.claims.id))
      .where(
        and(
          eq(schema.policies.coverageType, claim[0].coverageType),
          eq(schema.claims.status, ClaimStatus.SETTLED),
          gte(schema.claims.incidentDate, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
        )
      )
      .groupBy(schema.claims.id, schema.claimReserves.amount)
      .limit(50);

    // Calculate prediction factors
    const avgSimilarCost = similarClaims.length > 0 ?
      similarClaims.reduce((sum, c) => sum + c.totalCost, 0) / similarClaims.length : 0;

    const costVariance = similarClaims.length > 1 ?
      Math.sqrt(similarClaims.reduce((sum, c) => sum + Math.pow(c.totalCost - avgSimilarCost, 2), 0) / similarClaims.length) : 0;

    const factors = [
      {
        factor: 'Historical Average',
        value: avgSimilarCost,
        weight: 0.4
      },
      {
        factor: 'Initial Reserve',
        value: similarClaims[0]?.initialReserve || claim[0].amount,
        weight: 0.3
      },
      {
        factor: 'Claim Amount',
        value: claim[0].amount,
        weight: 0.2
      },
      {
        factor: 'Severity Adjustment',
        value: this.calculateSeverityAdjustment(claim[0].incidentType),
        weight: 0.1
      }
    ];

    const predictedTotalCost = factors.reduce((sum, f) => sum + (f.value * f.weight), 0);
    const confidence = Math.max(0.5, Math.min(0.95, 1 - (costVariance / avgSimilarCost)));

    return {
      predictedTotalCost,
      confidence,
      factors,
      methodology: 'Weighted average of historical similar claims with confidence based on variance'
    };
  }

  /**
   * Detect anomalies in claim payments
   */
  async detectPaymentAnomalies(criteria?: {
    dateFrom?: Date;
    dateTo?: Date;
    threshold?: number;
  }): Promise<{
    anomalies: any[];
    summary: {
      totalPayments: number;
      anomalyCount: number;
      anomalyRate: number;
    };
  }> {
    const dateFrom = criteria?.dateFrom || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const dateTo = criteria?.dateTo || new Date();
    const threshold = criteria?.threshold || 2;

    // Get all payments in the period
    const payments = await this.db.select({
      id: schema.claimPayments.id,
      claimId: schema.claimPayments.claimId,
      amount: schema.claimPayments.amount,
      paymentType: schema.claimPayments.paymentType,
      claimNumber: schema.claims.claimNumber,
      coverageType: schema.policies.coverageType,
      createdAt: schema.claimPayments.createdAt
    })
      .from(schema.claimPayments)
      .leftJoin(schema.claims, eq(schema.claims.id, schema.claimPayments.claimId))
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .where(
        between(schema.claimPayments.createdAt, dateFrom, dateTo)
      );

    // Calculate statistical measures
    const amounts = payments.map(p => p.amount);
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length);

    // Detect anomalies
    const anomalies = payments.filter(payment => {
      const zScore = Math.abs((payment.amount - mean) / stdDev);
      return zScore > threshold;
    }).map(payment => ({
      ...payment,
      anomalyScore: Math.abs((payment.amount - mean) / stdDev),
      anomalyType: payment.amount > mean ? 'HIGH_VALUE' : 'LOW_VALUE',
      expectedRange: {
        min: mean - (threshold * stdDev),
        max: mean + (threshold * stdDev)
      }
    }));

    return {
      anomalies,
      summary: {
        totalPayments: payments.length,
        anomalyCount: anomalies.length,
        anomalyRate: anomalies.length / payments.length
      }
    };
  }

  /**
   * Calculate average payment time
   */
  private calculateAveragePaymentTime(payments: ClaimPayment[]): number {
    const completedPayments = payments.filter(p => p.status === 'COMPLETED' && p.approvedAt && p.completedAt);

    if (completedPayments.length === 0) return 0;

    const totalTime = completedPayments.reduce((sum, payment) => {
      const approvalTime = payment.approvedAt!.getTime() - payment.createdAt.getTime();
      const processingTime = payment.completedAt!.getTime() - payment.approvedAt!.getTime();
      return sum + approvalTime + processingTime;
    }, 0);

    return totalTime / completedPayments.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  /**
   * Calculate payment frequency
   */
  private calculatePaymentFrequency(payments: ClaimPayment[]): number {
    if (payments.length < 2) return 0;

    const sortedDates = payments
      .map(p => p.createdAt)
      .sort((a, b) => a.getTime() - b.getTime());

    const intervals = [];
    for (let i = 1; i < sortedDates.length; i++) {
      intervals.push(sortedDates[i].getTime() - sortedDates[i - 1].getTime());
    }

    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length / (1000 * 60 * 60 * 24);
  }

  /**
   * Analyze payment timing
   */
  private analyzePaymentTiming(claim: any, payments: ClaimPayment[]): any {
    if (payments.length === 0) return null;

    const firstPayment = payments.reduce((earliest, payment) =>
      payment.createdAt < earliest.createdAt ? payment : earliest
    );

    const daysFromReport = Math.floor(
      (firstPayment.createdAt.getTime() - claim.reportedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      firstPaymentDays: daysFromReport,
      totalPayments: payments.length,
      paymentSpan: Math.floor(
        (Math.max(...payments.map(p => p.createdAt.getTime())) -
         Math.min(...payments.map(p => p.createdAt.getTime()))) / (1000 * 60 * 60 * 24)
      )
    };
  }

  /**
   * Detect seasonal patterns
   */
  private detectSeasonalPatterns(payments: ClaimPayment[]): any {
    if (payments.length < 12) return null;

    const monthlyPayments = new Array(12).fill(0);

    payments.forEach(payment => {
      const month = payment.createdAt.getMonth();
      monthlyPayments[month] += payment.amount;
    });

    const avgMonthly = monthlyPayments.reduce((sum, amount) => sum + amount, 0) / 12;

    return {
      monthlyAverages: monthlyPayments,
      peakMonths: monthlyPayments
        .map((amount, index) => ({ month: index, amount, ratio: amount / avgMonthly }))
        .filter(item => item.ratio > 1.2)
        .sort((a, b) => b.ratio - a.ratio)
    };
  }

  /**
   * Calculate reserve adequacy ratio
   */
  private calculateReserveAdequacyRatio(totalPaid: number, totalReserved: number): number {
    if (totalReserved === 0) return 1;
    return totalPaid / totalReserved;
  }

  /**
   * Calculate reserve accuracy
   */
  private calculateReserveAccuracy(reserves: ClaimReserve[], payments: ClaimPayment[]): number {
    const initialReserve = reserves.find(r => r.reserveType === 'INCURRED_LOSS')?.amount || 0;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    if (initialReserve === 0) return 0;
    return 1 - Math.abs(totalPaid - initialReserve) / initialReserve;
  }

  /**
   * Generate claim trends
   */
  private async generateClaimTrends(claimId: string): Promise<any[]> {
    return await this.db.select({
      month: sql<string>`TO_CHAR(${schema.claimFinancialTransactions.createdAt}, 'YYYY-MM')`.as('month'),
      transactionType: schema.claimFinancialTransactions.transactionType,
      totalAmount: sql<number>`SUM(${schema.claimFinancialTransactions.amount})`.as('totalAmount'),
      transactionCount: sql<number>`COUNT(*)`.as('transactionCount')
    })
      .from(schema.claimFinancialTransactions)
      .where(eq(schema.claimFinancialTransactions.claimId, claimId))
      .groupBy(
        sql`TO_CHAR(${schema.claimFinancialTransactions.createdAt}, 'YYYY-MM')`,
        schema.claimFinancialTransactions.transactionType
      )
      .orderBy(sql`month`);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(data: any): string[] {
    const recommendations: string[] = [];

    // Reserve adequacy recommendations
    if (data.reserves.adequacyRatio < 0.8) {
      recommendations.push('Consider increasing reserves - adequacy ratio below 80%');
    } else if (data.reserves.adequacyRatio > 1.2) {
      recommendations.push('Reserves may be excessive - consider reduction opportunities');
    }

    // Payment timing recommendations
    if (data.metrics.averagePaymentTime > 30) {
      recommendations.push('Payment processing time exceeds 30 days - review workflow efficiency');
    }

    // Cost management recommendations
    if (data.breakdown.legalExpenses > data.metrics.totalPaid * 0.2) {
      recommendations.push('Legal expenses exceed 20% of total - consider early settlement strategies');
    }

    // Loss ratio recommendations
    if (data.lossRatio.lossRatio > 0.8) {
      recommendations.push('High loss ratio detected - review underwriting guidelines');
    }

    return recommendations;
  }

  /**
   * Additional helper methods
   */
  private async calculatePortfolioSummary(whereConditions: any[]): Promise<any> {
    return await this.db.select({
      totalClaims: sql<number>`COUNT(*)`.as('totalClaims'),
      totalIncurred: sql<number>`SUM(${schema.claims.amount})`.as('totalIncurred'),
      totalPaid: sql<number>`COALESCE(SUM(${schema.claimPayments.amount}), 0)`.as('totalPaid'),
      averageClaimSize: sql<number>`AVG(${schema.claims.amount})`.as('averageClaimSize'),
      settlementRate: sql<number>`(COUNT(CASE WHEN ${schema.claims.status} = 'SETTLED' THEN 1 END) * 100.0 / COUNT(*))`.as('settlementRate')
    })
      .from(schema.claims)
      .leftJoin(schema.claimPayments, eq(schema.claimPayments.claimId, schema.claims.id))
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined);
  }

  private async calculatePortfolioLossRatios(whereConditions: any[]): Promise<any> {
    return await this.db.select({
      coverageType: schema.policies.coverageType,
      lossRatio: sql<number>`COALESCE(SUM(${schema.claimPayments.amount}), 0) / NULLIF(SUM(${schema.policies.premium}), 0)`.as('lossRatio'),
      claimsCount: sql<number>`COUNT(${schema.claims.id})`.as('claimsCount')
    })
      .from(schema.claims)
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .leftJoin(schema.claimPayments, eq(schema.claimPayments.claimId, schema.claims.id))
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined)
      .groupBy(schema.policies.coverageType);
  }

  private async analyzePortfolioPaymentPatterns(whereConditions: any[]): Promise<any> {
    return await this.db.select({
      paymentType: schema.claimPayments.paymentType,
      totalAmount: sql<number>`SUM(${schema.claimPayments.amount})`.as('totalAmount'),
      averageAmount: sql<number>`AVG(${schema.claimPayments.amount})`.as('averageAmount'),
      paymentCount: sql<number>`COUNT(*)`.as('paymentCount')
    })
      .from(schema.claimPayments)
      .leftJoin(schema.claims, eq(schema.claims.id, schema.claimPayments.claimId))
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined)
      .groupBy(schema.claimPayments.paymentType);
  }

  private async analyzePortfolioReserves(whereConditions: any[]): Promise<any> {
    return await this.db.select({
      reserveType: schema.claimReserves.reserveType,
      totalReserved: sql<number>`SUM(${schema.claimReserves.amount})`.as('totalReserved'),
      averageReserve: sql<number>`AVG(${schema.claimReserves.amount})`.as('averageReserve'),
      reserveCount: sql<number>`COUNT(*)`.as('reserveCount')
    })
      .from(schema.claimReserves)
      .leftJoin(schema.claims, eq(schema.claims.id, schema.claimReserves.claimId))
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined)
      .groupBy(schema.claimReserves.reserveType);
  }

  private async generatePortfolioTrends(whereConditions: any[]): Promise<any[]> {
    return await this.db.select({
      month: sql<string>`TO_CHAR(${schema.claims.incidentDate}, 'YYYY-MM')`.as('month'),
      claimsCount: sql<number>`COUNT(*)`.as('claimsCount'),
      totalIncurred: sql<number>`SUM(${schema.claims.amount})`.as('totalIncurred'),
      averageClaimSize: sql<number>`AVG(${schema.claims.amount})`.as('averageClaimSize')
    })
      .from(schema.claims)
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined)
      .groupBy(sql`TO_CHAR(${schema.claims.incidentDate}, 'YYYY-MM')`)
      .orderBy(sql`month`)
      .limit(24);
  }

  private async calculateBenchmarks(): Promise<any> {
    return await this.db.select({
      metric: sql<string>`
        CASE
          WHEN COUNT(*) > 0 THEN 'Average Claim Size'
          WHEN COALESCE(SUM(claim_payments.amount), 0) > 0 THEN 'Average Payment'
          ELSE 'Settlement Rate'
        END
      `.as('metric'),
      value: sql<number>`
        CASE
          WHEN COUNT(*) > 0 THEN AVG(claims.amount)
          WHEN COALESCE(SUM(claim_payments.amount), 0) > 0 THEN AVG(claim_payments.amount)
          ELSE (COUNT(CASE WHEN claims.status = 'SETTLED' THEN 1 END) * 100.0 / COUNT(*))
        END
      `.as('value')
    })
      .from(schema.claims)
      .leftJoin(schema.claimPayments, eq(schema.claimPayments.claimId, schema.claims.id))
      .where(eq(schema.claims.status, ClaimStatus.SETTLED));
  }

  private calculateSeverityAdjustment(incidentType: string): number {
    // Simple severity adjustment based on incident type
    const severityMap: { [key: string]: number } = {
      'MINOR': 0.8,
      'MODERATE': 1.0,
      'MAJOR': 1.5,
      'SEVERE': 2.0,
      'CATASTROPHIC': 3.0
    };

    return severityMap[incidentType.toUpperCase()] || 1.0;
  }
}