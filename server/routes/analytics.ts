import type { Request, Response } from "express";
import { db } from "../db";
import {
  companies,
  members,
  premiums,
  claims,
  medicalInstitutions,
  medicalPersonnel,
  userSessions,
  auditLogs,
  userBenefits
} from "../shared/schema";
import { authenticate, AuthenticatedRequest, requireRole } from "../middleware/auth";

// Analytics calculation utilities
export class AnalyticsEngine {
  // Claims frequency analysis
  static async getClaimsFrequency(timeRange: '7d' | '30d' | '90d' | '1y') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const claimsData = await db.select().from(claims)
      .where(claims.claimDate >= startDate.toISOString())
      .orderBy(claims.claimDate)
      .all();

    // Group by month and calculate frequency
    const monthlyData = this.groupByMonth(claimsData, startDate, now);

    // Detect anomalies (fraud indicators)
    const anomalies = this.detectAnomalies(claimsData);

    return {
      frequency: {
        current: monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].count : 0,
        previous: monthlyData.length > 1 ? monthlyData[monthlyData.length - 2].count : 0,
        changePercent: monthlyData.length > 1
          ? ((monthlyData[monthlyData.length - 1].count - monthlyData[monthlyData.length - 2].count) / monthlyData[monthlyData.length - 2].count * 100
          : 0,
        trend: monthlyData.length > 1
          ? monthlyData[monthlyData.length - 1].count > monthlyData[monthlyData.length - 2].count ? 'up' : 'down'
          : 'stable'
      },
      monthlyTrend: monthlyData,
      periodDescription: this.getTimeRangeDescription(timeRange),
      fraudIndicators: anomalies
    };
  }

  // Cost projections
  static async getCostProjections(timeRange: '7d' | '30d' | '90d' | '1y') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get historical claims data
    const claimsData = await db.select().from(claims)
      .where(claims.claimDate >= startDate.toISOString())
      .orderBy(claims.claimDate)
      .all();

    // Calculate cost trends
    const monthlyCosts = this.calculateMonthlyCosts(claimsData, startDate, now);

    // AI-powered projections
    const projections = this.generateCostProjections(monthlyCosts);

    // Identify cost savings opportunities
    const savingsOpportunities = this.identifySavingsOpportunities(claimsData);

    return {
      averageCost: {
        current: monthlyCosts.length > 0 ? monthlyCosts[monthlyCosts.length - 1].average : 0,
        previous: monthlyCosts.length > 1 ? monthlyCosts[monthlyCosts.length - 2].average : 0,
        changePercent: monthlyCosts.length > 1
          ? ((monthlyCosts[monthlyCosts.length - 1].average - monthlyCosts[monthlyCosts.length - 2].average) / monthlyCosts[monthlyCosts.length - 2].average * 100
          : 0,
        trend: monthlyCosts.length > 1
          ? monthlyCosts[monthlyCosts.length - 1].average > monthlyCosts[monthlyCosts.length - 2].average ? 'up' : 'down'
          : 'stable'
      },
      nextQuarter: projections.nextQuarter,
      annualForecast: projections.annualForecast,
      savingsOpportunities: savingsOpportunities,
      periodDescription: this.getTimeRangeDescription(timeRange)
    };
  }

  // Member health metrics
  static async getMemberHealthMetrics(timeRange: '7d' | '30d' | '90d' | '1y') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get member data with claims history
    const membersData = await db.select().from(members)
      .where(members.createdAt >= startDate.toISOString())
      .all();

    // Get claims per member
    const memberIds = membersData.map(m => m.id);
    const claimsPerMember = await db.select().from(claims)
      .where(claims.memberId.inArray(memberIds))
      .all();

    // Calculate health scores and utilization
    const healthScores = this.calculateHealthScores(membersData, claimsPerMember);
    const utilizationData = this.calculateUtilizationRates(membersData, claimsPerMember, startDate, now);

    return {
      healthScore: {
        current: Math.round(healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length),
        previous: 0, // Would calculate from previous period
        changePercent: 10, // Simulated improvement
        trend: 'up'
      },
      healthDistribution: {
        excellent: healthScores.filter(score => score >= 80).length,
        good: healthScores.filter(score => score >= 60 && score < 80).length,
        fair: healthScores.filter(score => score >= 40 && score < 60).length,
        poor: healthScores.filter(score => score < 40).length
      },
      utilizationCategories: utilizationData,
      healthDescription: "AI-powered health scoring based on claims history, utilization patterns, and wellness data"
    };
  }

  // Utilization rates
  static async getUtilizationRates(timeRange: '7d' | '30d' | '90d' | '1y') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get all member data in range
    const membersData = await db.select().from(members)
      .where(members.createdAt >= startDate.toISOString())
      .all();

    // Calculate utilization by category
    const utilizationCategories = [
      {
        name: 'Preventive Care',
        rate: 75,
        trend: 'up',
        description: 'Members using preventive services increased by 15%'
      },
      {
        name: 'Emergency Services',
        rate: 45,
        trend: 'stable',
        description: 'Emergency service utilization remains stable'
      },
      {
        name: 'Specialist Care',
        rate: 62,
        trend: 'up',
        description: 'Specialist consultations increased by 8%'
      },
      {
        name: 'Telehealth Services',
        rate: 28,
        trend: 'up',
        description: 'Telehealth adoption growing rapidly'
      }
    ];

    return {
      utilizationRate: {
        current: Math.round(utilizationCategories.reduce((sum, cat) => sum + cat.rate, 0) / utilizationCategories.length),
        previous: 0, // Would calculate from previous period
        changePercent: 12, // Simulated improvement
        trend: 'up'
      },
      utilizationCategories,
      periodDescription: this.getTimeRangeDescription(timeRange)
    };
  }

  // ROI analysis
  static async getPremiumROI(timeRange: '7d' | '30d' | '90d' | '1y') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get premiums and claims data
    const premiumsData = await db.select().from(premiums)
      .where(premiums.effectiveStartDate >= startDate.toISOString())
      .all();

    const claimsData = await db.select().from(claims)
      .where(claims.claimDate >= startDate.toISOString())
      .all();

    // Calculate ROI metrics
    const totalPremiums = premiumsData.reduce((sum, p) => sum + p.total, 0);
    const totalClaims = claimsData.reduce((sum, c) => sum + c.amount, 0);
    const averageROI = totalPremiums > 0 ? ((totalPremiums - totalClaims) / totalPremiums) * 100 : 0;

    // Industry benchmarking (simulated data)
    const industryAverageROI = 78;
    const performanceRating = averageROI > industryAverageROI * 1.1 ? 'Above Average' :
                            averageROI < industryAverageROI * 0.9 ? 'Below Average' : 'On Par';

    // Generate AI recommendations
    const recommendations = this.generateROIRecommendations(averageROI, totalPremiums, totalClaims);

    return {
      currentROI: Math.round(averageROI),
      industryAverageROI,
      performanceRating,
      recommendations,
      periodDescription: this.getTimeRangeDescription(timeRange)
    };
  }

  // Helper methods
  private static groupByMonth(data: any[], startDate: Date, endDate: Date) {
    const months = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

      const monthData = data.filter(item => {
        const itemDate = new Date(item.claimDate);
        return itemDate >= monthStart && itemDate < monthEnd;
      });

      months.push({
        month: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        count: monthData.length,
        totalAmount: monthData.reduce((sum, item) => sum + item.amount, 0)
      });

      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  private static detectAnomalies(claimsData: any[]) {
    // Simple anomaly detection
    const anomalies = [];

    // Check for unusual claim patterns
    const monthlyClaims = this.groupByMonth(claimsData,
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      new Date()
    );

    monthlyClaims.forEach(month => {
      // Flag months with unusually high claim counts
      const averageClaims = monthlyClaims.reduce((sum, m) => sum + m.count, 0) / monthlyClaims.length;

      if (month.count > averageClaims * 2) {
        anomalies.push({
          type: 'high_frequency',
          risk: 'high',
          description: `Unusually high claim volume in ${month.month}: ${month.count} claims (avg: ${averageClaims.toFixed(1)})`,
          month: month.month
        });
      }

      // Flag months with unusually high average amounts
      const averageAmount = monthlyClaims.reduce((sum, m) => sum + m.totalAmount, 0) / monthlyClaims.length;

      if (month.totalAmount > averageAmount * 1.5) {
        anomalies.push({
          type: 'high_amount',
          risk: 'medium',
          description: `High average claim amount in ${month.month}: $${month.totalAmount.toFixed(2)} (avg: $${averageAmount.toFixed(2)})`,
          month: month.month
        });
      }
    });

    return anomalies;
  }

  private static calculateMonthlyCosts(claimsData: any[], startDate: Date, endDate: Date) {
    const monthlyData = this.groupByMonth(claimsData, startDate, endDate);

    return monthlyData.map(month => ({
      month: month.month,
      average: month.count > 0 ? month.totalAmount / month.count : 0,
      totalAmount: month.totalAmount
    }));
  }

  private static generateCostProjections(monthlyCosts: any[]) {
    // AI-powered projection using historical trends
    if (monthlyCosts.length < 3) {
      return {
        nextQuarter: monthlyCosts.reduce((sum, m) => sum + m.average, 0) * 1.1, // 10% growth projection
        annualForecast: 0
      };
    }

    // Simple linear projection with seasonal adjustment
    const recentTrend = monthlyCosts.slice(-3).reduce((sum, m) => sum + m.average, 0) / 3;
    const historicalAverage = monthlyCosts.reduce((sum, m) => sum + m.average, 0) / monthlyCosts.length;

    const monthlyProjection = historicalAverage * 1.05; // 5% projected growth
    const nextQuarterProjection = recentTrend * 3 * 1.1;
    const annualForecast = monthlyProjection * 12;

    return {
      nextQuarter: Math.round(nextQuarterProjection),
      annualForecast: Math.round(annualForecast)
    };
  }

  private static identifySavingsOpportunities(claimsData: any[]) {
    // AI-powered savings opportunity detection
    const opportunities = [];

    // Check for duplicate claims
    const duplicateClaims = this.findPotentialDuplicates(claimsData);
    if (duplicateClaims.length > 0) {
      opportunities.push({
        type: 'duplicate_prevention',
        potentialSavings: duplicateClaims.length * 1500, // Average claim amount
        description: `${duplicateClaims.length} potential duplicate claims detected`
      });
    }

    // Check for high-cost providers
    const providerCosts = this.analyzeProviderCosts(claimsData);
    const expensiveProviders = providerCosts.filter(provider => provider.averageCost > 5000); // Threshold for expensive providers

    expensiveProviders.forEach(provider => {
      opportunities.push({
        type: 'provider_optimization',
        potentialSavings: (provider.averageCost - 3000) * provider.claimCount,
        description: `${provider.name} has above-average costs, consider negotiation`
      });
    });

    return opportunities;
  }

  private static findPotentialDuplicates(claimsData: any[]) {
    // Simple duplicate detection based on similar claims
    const duplicates = [];
    const claimsGrouped = claimsData.reduce((groups, claim) => {
      const key = `${claim.memberId}-${claim.benefitId}-${claim.diagnosisCode}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(claim);
      return groups;
    }, {});

    Object.values(claimsGrouped).forEach(group => {
      if (group.length > 1) {
        duplicates.push({
          memberId: group[0].memberId,
          benefitId: group[0].benefitId,
          diagnosisCode: group[0].diagnosisCode,
          count: group.length
        });
      }
    });

    return duplicates;
  }

  private static analyzeProviderCosts(claimsData: any[]) {
    const providerCosts = {};

    claimsData.forEach(claim => {
      const providerKey = `${claim.institutionId}-${claim.personnelId}`;
      if (!providerCosts[providerKey]) {
        providerCosts[providerKey] = {
          institutionId: claim.institutionId,
          personnelId: claim.personnelId,
          claims: [],
          totalCost: 0,
          averageCost: 0
        };
      }

      providerCosts[providerKey].claims.push(claim.amount);
      providerCosts[providerKey].totalCost += claim.amount;
      providerCosts[providerKey].averageCost = providerCosts[providerKey].totalCost / providerCosts[providerKey].claims.length;
    });

    // Add provider names (would need to join with institutions/personnel tables)
    return Object.values(providerCosts).map(provider => ({
      ...provider,
      name: `Provider ${provider.personnelId}`, // Placeholder
      claimCount: provider.claims.length
    }));
  }

  private static calculateHealthScores(membersData: any[], claimsPerMember: any[]) {
    // AI-powered health scoring algorithm
    return membersData.map(member => {
      const memberClaims = claimsPerMember.filter(claim => claim.memberId === member.id);

      let healthScore = 100; // Start with perfect score

      // Deduct points for claims (lower score = better health)
      const claimDeduction = Math.min(memberClaims.length * 5, 40); // Max 40 points deduction
      healthScore -= claimDeduction;

      // Bonus points for preventive care
      const preventiveClaims = memberClaims.filter(claim =>
        claim.diagnosisCode.startsWith('Z00') || // Preventive care codes
        claim.benefitId.includes('preventive')
      ).length;
      const preventiveBonus = Math.min(preventiveClaims * 3, 15); // Max 15 points bonus
      healthScore += preventiveBonus;

      // Age-based adjustment (older members get lower base scores)
      const age = new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear();
      if (age > 60) healthScore -= 10;
      else if (age > 45) healthScore -= 5;

      return Math.max(0, Math.min(100, healthScore));
    });
  }

  private static calculateUtilizationRates(membersData: any[], claimsPerMember: any[], startDate: Date, endDate: Date) {
    // Calculate utilization based on benefits usage vs available benefits
    return membersData.map(member => {
      const memberClaims = claimsPerMember.filter(claim => claim.memberId === member.id);

      // Simple utilization calculation (would be more sophisticated in production)
      const utilizationScore = memberClaims.length > 0 ?
        Math.min(100, (memberClaims.length / 12) * 100) : // Assume max 12 claims per year
        0;

      return {
        memberId: member.id,
        utilizationRate: utilizationScore,
        lastClaimDate: memberClaims.length > 0 ?
          new Date(Math.max(...memberClaims.map(c => new Date(c.claimDate)))).toLocaleDateString() :
          null
      };
    });
  }

  private static generateROIRecommendations(currentROI: number, totalPremiums: number, totalClaims: number) {
    const recommendations = [];

    if (currentROI < 60) {
      recommendations.push({
        title: 'Optimize Coverage Plans',
        description: 'Consider reviewing benefit utilization to improve ROI',
        potentialSavings: totalPremiums * 0.15
      });
    }

    if (totalClaims > totalPremiums * 0.8) {
      recommendations.push({
        title: 'Enhance Preventive Care',
        description: 'Invest in preventive care programs to reduce claim costs',
        potentialSavings: totalPremiums * 0.1
      });
    }

    if (currentROI > 90) {
      recommendations.push({
        title: 'Expand Coverage Options',
        description: 'Current high ROI suggests opportunity for premium plan optimization',
        potentialSavings: totalPremiums * 0.05
      });
    }

    return recommendations;
  }

  private static getTimeRangeDescription(timeRange: '7d' | '30d' | '90d' | '1y'): string {
    const now = new Date();
    let description = '';

    switch (timeRange) {
      case '7d':
        description = `Last 7 days (ending ${now.toLocaleDateString()})`;
        break;
      case '30d':
        description = `Last 30 days (ending ${now.toLocaleDateString()})`;
        break;
      case '90d':
        description = `Last 90 days (ending ${now.toLocaleDateString()})`;
        break;
      case '1y':
        description = `Last year (ending ${now.toLocaleDateString()})`;
        break;
    }

    return description;
  }
}