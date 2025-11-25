import { db } from '../db';
import {
  providerPerformanceMetrics,
  providerQualityScores,
  providerFinancialPerformance,
  medicalInstitutions,
  providerPerformanceTierEnum
} from '../shared/schema';
import { eq, and, gte, lte, avg, sum, count, desc, asc, sql } from 'drizzle-orm';

export class ProviderPerformanceService {
  /**
   * Calculate performance tier based on metric value and threshold
   */
  calculatePerformanceTier(metricValue: number, threshold: number): string {
    const percentage = (metricValue / threshold) * 100;

    if (percentage >= 120) return 'excellent';
    if (percentage >= 100) return 'good';
    if (percentage >= 80) return 'average';
    if (percentage >= 60) return 'below_average';
    return 'poor';
  }

  /**
   * Calculate quality tier based on overall score
   */
  calculateQualityTier(overallScore: number): string {
    if (overallScore >= 90) return 'excellent';
    if (overallScore >= 80) return 'good';
    if (overallScore >= 70) return 'average';
    if (overallScore >= 60) return 'below_average';
    return 'poor';
  }

  /**
   * Get comprehensive performance dashboard for a specific institution
   */
  async getPerformanceDashboard(institutionId: number, period: string = 'quarterly'): Promise<any> {
    try {
      // Get latest quality score
      const [latestQualityScore] = await db.select()
        .from(providerQualityScores)
        .where(
          and(
            eq(providerQualityScores.institutionId, institutionId),
            eq(providerQualityScores.assessmentPeriod, period)
          )
        )
        .orderBy(desc(providerQualityScores.assessmentDate))
        .limit(1);

      // Get latest financial performance
      const [latestFinancialPerformance] = await db.select()
        .from(providerFinancialPerformance)
        .where(
          and(
            eq(providerFinancialPerformance.institutionId, institutionId),
            eq(providerFinancialPerformance.reportingPeriod, period)
          )
        )
        .orderBy(desc(providerFinancialPerformance.createdAt))
        .limit(1);

      // Get recent performance metrics
      const recentMetrics = await db.select()
        .from(providerPerformanceMetrics)
        .where(
          and(
            eq(providerPerformanceMetrics.institutionId, institutionId),
            eq(providerPerformanceMetrics.measurementPeriod, period)
          )
        )
        .orderBy(desc(providerPerformanceMetrics.measurementDate))
        .limit(20);

      // Calculate performance summary by category
      const metricsByCategory = recentMetrics.reduce((acc, metric) => {
        if (!acc[metric.metricCategory]) {
          acc[metric.metricCategory] = {
            metrics: [],
            averageScore: 0,
            tier: 'average'
          };
        }
        acc[metric.metricCategory].metrics.push(metric);
        return acc;
      }, {} as Record<string, any>);

      // Calculate averages and tiers for each category
      for (const category in metricsByCategory) {
        const categoryMetrics = metricsByCategory[category].metrics;
        const avgScore = categoryMetrics.reduce((sum, metric) => sum + metric.metricValue, 0) / categoryMetrics.length;
        const avgThreshold = categoryMetrics.reduce((sum, metric) => sum + metric.performanceThreshold, 0) / categoryMetrics.length;

        metricsByCategory[category].averageScore = avgScore;
        metricsByCategory[category].tier = this.calculatePerformanceTier(avgScore, avgThreshold);
      }

      // Get performance trends
      const trends = await this.getPerformanceTrends(institutionId, null, 6);

      // Get peer comparison
      const peerComparison = await this.getPeerComparison(institutionId, period);

      return {
        institutionId,
        period,
        qualityScore: latestQualityScore,
        financialPerformance: latestFinancialPerformance,
        metricsByCategory,
        trends,
        peerComparison,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching performance dashboard:', error);
      throw error;
    }
  }

  /**
   * Get performance analytics across all providers
   */
  async getPerformanceAnalytics(
    period: string = 'quarterly',
    category?: string,
    tier?: string
  ): Promise<any> {
    try {
      let query = db.select()
        .from(providerPerformanceMetrics);

      if (category) {
        query = query.where(eq(providerPerformanceMetrics.metricCategory, category));
      }
      if (tier) {
        query = query.where(eq(providerPerformanceMetrics.performanceTier, tier));
      }

      const metrics = await query
        .where(eq(providerPerformanceMetrics.measurementPeriod, period));

      // Calculate statistics
      const totalMetrics = metrics.length;
      const metricsByTier = metrics.reduce((acc, metric) => {
        acc[metric.performanceTier] = (acc[metric.performanceTier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const metricsByCategory = metrics.reduce((acc, metric) => {
        acc[metric.metricCategory] = (acc[metric.metricCategory] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Average scores by category
      const avgScoresByCategory = await db.select({
        category: providerPerformanceMetrics.metricCategory,
        avgScore: avg(providerPerformanceMetrics.metricValue),
        avgThreshold: avg(providerPerformanceMetrics.performanceThreshold),
        count: count()
      })
      .from(providerPerformanceMetrics)
      .where(eq(providerPerformanceMetrics.measurementPeriod, period))
      .groupBy(providerPerformanceMetrics.metricCategory);

      return {
        summary: {
          totalMetrics,
          distributionByTier: metricsByTier,
          distributionByCategory: metricsByCategory
        },
        categoryAverages: avgScoresByCategory,
        period
      };
    } catch (error) {
      console.error('Error fetching performance analytics:', error);
      throw error;
    }
  }

  /**
   * Get benchmarking data
   */
  async getBenchmarkingData(category?: string, tier?: string): Promise<any> {
    try {
      let query = db.select({
        metricName: providerPerformanceMetrics.metricName,
        category: providerPerformanceMetrics.metricCategory,
        avgValue: avg(providerPerformanceMetrics.metricValue),
        percentile25: sql<number>`PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${providerPerformanceMetrics.metricValue})`,
        percentile50: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${providerPerformanceMetrics.metricValue})`,
        percentile75: sql<number>`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${providerPerformanceMetrics.metricValue})`,
        percentile90: sql<number>`PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY ${providerPerformanceMetrics.metricValue})`,
        count: count()
      })
      .from(providerPerformanceMetrics);

      if (category) {
        query = query.where(eq(providerPerformanceMetrics.metricCategory, category));
      }

      const benchmarkData = await query
        .groupBy(providerPerformanceMetrics.metricName, providerPerformanceMetrics.metricCategory);

      return {
        benchmarks: benchmarkData,
        category: category || 'all',
        tier: tier || 'all',
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching benchmarking data:', error);
      throw error;
    }
  }

  /**
   * Get performance trends for an institution
   */
  async getPerformanceTrends(
    institutionId: number,
    metricCategory?: string,
    months: number = 12
  ): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      let query = db.select()
        .from(providerPerformanceMetrics)
        .where(
          and(
            eq(providerPerformanceMetrics.institutionId, institutionId),
            gte(providerPerformanceMetrics.measurementDate, startDate)
          )
        );

      if (metricCategory) {
        query = query.where(eq(providerPerformanceMetrics.metricCategory, metricCategory));
      }

      const metrics = await query
        .orderBy(providerPerformanceMetrics.measurementDate, providerPerformanceMetrics.metricName);

      // Group metrics by date and calculate trends
      const trendsData = metrics.reduce((acc, metric) => {
        const dateKey = metric.measurementDate.toISOString().split('T')[0];

        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            metrics: [],
            totalValue: 0,
            averageThreshold: 0,
            trendDirection: 'stable'
          };
        }

        acc[dateKey].metrics.push(metric);
        acc[dateKey].totalValue += metric.metricValue;

        return acc;
      }, {} as Record<string, any>);

      // Calculate averages and trends
      const sortedDates = Object.keys(trendsData).sort();
      const trends = sortedDates.map((date, index) => {
        const dayData = trendsData[date];
        const averageScore = dayData.totalValue / dayData.metrics.length;

        // Calculate trend direction
        if (index > 0) {
          const previousDate = sortedDates[index - 1];
          const previousScore = trendsData[previousDate].totalValue / trendsData[previousDate].metrics.length;

          if (averageScore > previousScore * 1.05) {
            dayData.trendDirection = 'improving';
          } else if (averageScore < previousScore * 0.95) {
            dayData.trendDirection = 'declining';
          } else {
            dayData.trendDirection = 'stable';
          }
        }

        return {
          date: date,
          averageScore: Math.round(averageScore * 100) / 100,
          metricCount: dayData.metrics.length,
          trendDirection: dayData.trendDirection
        };
      });

      return {
        institutionId,
        metricCategory,
        period: `${months} months`,
        trends,
        trendSummary: this.calculateTrendSummary(trends)
      };
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      throw error;
    }
  }

  /**
   * Get comparative analysis between multiple providers
   */
  async getComparativeAnalysis(institutionIds: number[], metricCategory?: string, period?: string): Promise<any> {
    try {
      const comparisons = [];

      for (const institutionId of institutionIds) {
        const institution = await db.select()
          .from(medicalInstitutions)
          .where(eq(medicalInstitutions.id, institutionId))
          .limit(1);

        if (institution[0]) {
          let query = db.select({
            avgScore: avg(providerPerformanceMetrics.metricValue),
            avgThreshold: avg(providerPerformanceMetrics.performanceThreshold),
            metricCount: count()
          })
          .from(providerPerformanceMetrics)
          .where(eq(providerPerformanceMetrics.institutionId, institutionId));

          if (period) {
            query = query.where(eq(providerPerformanceMetrics.measurementPeriod, period));
          }
          if (metricCategory) {
            query = query.where(eq(providerPerformanceMetrics.metricCategory, metricCategory));
          }

          const [performance] = await query;

          comparisons.push({
            institutionId,
            institutionName: institution[0].name,
            institutionType: institution[0].type,
            averageScore: performance?.avgScore || 0,
            averageThreshold: performance?.avgThreshold || 0,
            metricCount: performance?.metricCount || 0,
            performancePercentage: performance?.avgThreshold
              ? Math.round((performance.avgScore / performance.avgThreshold) * 100)
              : 0
          });
        }
      }

      // Sort by performance percentage
      comparisons.sort((a, b) => b.performancePercentage - a.performancePercentage);

      return {
        institutions: comparisons,
        metricCategory,
        period,
        ranking: comparisons.map((comp, index) => ({
          institutionId: comp.institutionId,
          rank: index + 1
        })),
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error performing comparative analysis:', error);
      throw error;
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(institutionId?: number, severity?: string): Promise<any[]> {
    try {
      let query = db.select({
        metric: providerPerformanceMetrics,
        institution: medicalInstitutions
      })
      .from(providerPerformanceMetrics)
      .leftJoin(medicalInstitutions, eq(providerPerformanceMetrics.institutionId, medicalInstitutions.id));

      // Filter for metrics below threshold (alerts)
      query = query.where(sql`${providerPerformanceMetrics.metricValue} < ${providerPerformanceMetrics.performanceThreshold}`);

      if (institutionId) {
        query = query.where(eq(providerPerformanceMetrics.institutionId, institutionId));
      }

      const alerts = await query;

      // Classify severity and enrich alert data
      const enrichedAlerts = alerts.map(alert => {
        const deficitPercentage = ((alert.metric.performanceThreshold - alert.metric.metricValue) / alert.metric.performanceThreshold) * 100;

        let alertSeverity = 'low';
        if (deficitPercentage >= 50) alertSeverity = 'critical';
        else if (deficitPercentage >= 30) alertSeverity = 'high';
        else if (deficitPercentage >= 15) alertSeverity = 'medium';

        return {
          id: alert.metric.id,
          institutionId: alert.metric.institutionId,
          institutionName: alert.institution?.name,
          metricName: alert.metric.metricName,
          metricCategory: alert.metric.metricCategory,
          currentValue: alert.metric.metricValue,
          targetValue: alert.metric.performanceThreshold,
          deficitPercentage: Math.round(deficitPercentage * 100) / 100,
          severity: alertSeverity,
          measurementDate: alert.metric.measurementDate,
          recommendations: this.getRecommendations(alert.metric)
        };
      });

      // Filter by severity if specified
      const filteredAlerts = severity
        ? enrichedAlerts.filter(alert => alert.severity === severity)
        : enrichedAlerts;

      // Sort by severity and deficit percentage
      return filteredAlerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.deficitPercentage - a.deficitPercentage;
      });
    } catch (error) {
      console.error('Error fetching performance alerts:', error);
      throw error;
    }
  }

  /**
   * Generate improvement plan based on performance data
   */
  async generateImprovementPlan(institutionId: number, assessmentPeriod: string): Promise<any> {
    try {
      const [qualityScore] = await db.select()
        .from(providerQualityScores)
        .where(
          and(
            eq(providerQualityScores.institutionId, institutionId),
            eq(providerQualityScores.assessmentPeriod, assessmentPeriod)
          )
        )
        .orderBy(desc(providerQualityScores.assessmentDate))
        .limit(1);

      const alerts = await this.getPerformanceAlerts(institutionId);
      const trends = await this.getPerformanceTrends(institutionId, null, 6);

      // Generate improvement recommendations
      const improvementAreas = [];
      const actionItems = [];
      const timeline = [];

      if (qualityScore) {
        // Quality-based recommendations
        if (qualityScore.clinicalQualityScore < 80) {
          improvementAreas.push({
            area: 'Clinical Quality',
            currentScore: qualityScore.clinicalQualityScore,
            targetScore: 85,
            priority: 'high'
          });

          actionItems.push({
            title: 'Implement Clinical Quality Improvement Program',
            description: 'Establish regular clinical audit and peer review processes',
            estimatedCost: 50000,
            timeframe: '3 months',
            responsibleParty: 'Clinical Director'
          });
        }

        if (qualityScore.patientExperienceScore < 75) {
          improvementAreas.push({
            area: 'Patient Experience',
            currentScore: qualityScore.patientExperienceScore,
            targetScore: 80,
            priority: 'medium'
          });

          actionItems.push({
            title: 'Patient Satisfaction Enhancement Initiative',
            description: 'Implement patient feedback system and service recovery protocols',
            estimatedCost: 25000,
            timeframe: '2 months',
            responsibleParty: 'Patient Services Manager'
          });
        }

        if (qualityScore.efficiencyScore < 70) {
          improvementAreas.push({
            area: 'Operational Efficiency',
            currentScore: qualityScore.efficiencyScore,
            targetScore: 80,
            priority: 'high'
          });

          actionItems.push({
            title: 'Process Optimization Project',
            description: 'Review and optimize patient flow and administrative processes',
            estimatedCost: 75000,
            timeframe: '6 months',
            responsibleParty: 'Operations Manager'
          });
        }
      }

      // Alert-based recommendations
      alerts.slice(0, 5).forEach(alert => {
        actionItems.push({
          title: `Address ${alert.metricName} Deficiency`,
          description: `Current value (${alert.currentValue}) is below target (${alert.targetValue})`,
          estimatedCost: this.estimateImprovementCost(alert),
          timeframe: this.estimateImprovementTimeframe(alert),
          responsibleParty: this.getResponsibleParty(alert.metricCategory),
          priority: alert.severity
        });
      });

      // Create timeline
      const currentDate = new Date();
      actionItems.forEach((item, index) => {
        timeline.push({
          item: item.title,
          startDate: new Date(currentDate.getTime() + (index * 30) * 24 * 60 * 60 * 1000),
          endDate: new Date(currentDate.getTime() + ((index + parseInt(item.timeframe.split(' ')[0])) * 30) * 24 * 60 * 60 * 1000),
          status: 'planned'
        });
      });

      // Calculate total estimated cost and expected ROI
      const totalCost = actionItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
      const expectedROI = totalCost * 2.5; // Estimated 250% ROI over 2 years

      return {
        institutionId,
        assessmentPeriod,
        currentPerformance: qualityScore,
        improvementAreas,
        actionItems,
        timeline,
        financials: {
          totalEstimatedCost: totalCost,
          expectedROI: expectedROI,
          paybackPeriod: totalCost > 0 ? Math.round((totalCost / (totalCost * 2.5 / 24)) * 10) / 10 : 0 // months
        },
        generatedAt: new Date(),
        nextReviewDate: new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000) // 3 months
      };
    } catch (error) {
      console.error('Error generating improvement plan:', error);
      throw error;
    }
  }

  /**
   * Get peer comparison data
   */
  private async getPeerComparison(institutionId: number, period: string): Promise<any> {
    try {
      // Get institution type for peer comparison
      const [institution] = await db.select()
        .from(medicalInstitutions)
        .where(eq(medicalInstitutions.id, institutionId))
        .limit(1);

      if (!institution) return null;

      // Get peer institutions (same type)
      const [institutionPerformance] = await db.select({
        avgScore: avg(providerPerformanceMetrics.metricValue),
        avgThreshold: avg(providerPerformanceMetrics.performanceThreshold),
        count: count()
      })
      .from(providerPerformanceMetrics)
      .where(
        and(
          eq(providerPerformanceMetrics.institutionId, institutionId),
          eq(providerPerformanceMetrics.measurementPeriod, period)
        )
      );

      const [peerPerformance] = await db.select({
        avgScore: avg(providerPerformanceMetrics.metricValue),
        avgThreshold: avg(providerPerformanceMetrics.performanceThreshold),
        count: count()
      })
      .from(providerPerformanceMetrics)
      .innerJoin(medicalInstitutions, eq(providerPerformanceMetrics.institutionId, medicalInstitutions.id))
      .where(
        and(
          eq(medicalInstitutions.type, institution.type),
          eq(providerPerformanceMetrics.measurementPeriod, period),
          sql`${providerPerformanceMetrics.institutionId} != ${institutionId}`
        )
      );

      return {
        institutionScore: institutionPerformance?.avgScore || 0,
        institutionThreshold: institutionPerformance?.avgThreshold || 0,
        peerAverageScore: peerPerformance?.avgScore || 0,
        peerAverageThreshold: peerPerformance?.avgThreshold || 0,
        percentileRank: this.calculatePercentileRank(
          institutionPerformance?.avgScore || 0,
          peerPerformance?.avgScore || 0,
          peerPerformance?.avgThreshold || 0
        )
      };
    } catch (error) {
      console.error('Error getting peer comparison:', error);
      return null;
    }
  }

  /**
   * Calculate trend summary
   */
  private calculateTrendSummary(trends: any[]): any {
    if (trends.length < 2) {
      return { direction: 'stable', change: 0, changePercentage: 0 };
    }

    const first = trends[0];
    const last = trends[trends.length - 1];
    const change = last.averageScore - first.averageScore;
    const changePercentage = first.averageScore !== 0 ? (change / first.averageScore) * 100 : 0;

    let direction = 'stable';
    if (changePercentage > 5) direction = 'improving';
    else if (changePercentage < -5) direction = 'declining';

    return { direction, change: Math.round(change * 100) / 100, changePercentage: Math.round(changePercentage * 100) / 100 };
  }

  /**
   * Get recommendations based on metric
   */
  private getRecommendations(metric: any): string[] {
    const recommendations = [];

    if (metric.metricCategory === 'quality') {
      recommendations.push('Review quality control processes');
      recommendations.push('Implement staff training programs');
      recommendations.push('Establish regular quality audits');
    } else if (metric.metricCategory === 'efficiency') {
      recommendations.push('Optimize workflow processes');
      recommendations.push('Implement lean management principles');
      recommendations.push 'Review resource utilization';
    } else if (metric.metricCategory === 'patient_satisfaction') {
      recommendations.push('Improve communication with patients');
      recommendations.push('Enhance service delivery processes');
      recommendations.push('Implement patient feedback system');
    } else if (metric.metricCategory === 'financial') {
      recommendations.push('Review cost structure');
      recommendations.push('Optimize revenue cycle management');
      recommendations.push('Implement financial controls');
    }

    return recommendations;
  }

  /**
   * Estimate improvement cost
   */
  private estimateImprovementCost(alert: any): number {
    const baseCosts = {
      quality: 50000,
      efficiency: 75000,
      patient_satisfaction: 25000,
      financial: 40000,
      compliance: 60000
    };

    const baseCost = baseCosts[alert.metricCategory] || 30000;
    const severityMultiplier = {
      critical: 2,
      high: 1.5,
      medium: 1,
      low: 0.7
    };

    return Math.round(baseCost * (severityMultiplier[alert.severity] || 1));
  }

  /**
   * Estimate improvement timeframe
   */
  private estimateImprovementTimeframe(alert: any): string {
    const baseTimeframes = {
      quality: '6 months',
      efficiency: '3 months',
      patient_satisfaction: '2 months',
      financial: '4 months',
      compliance: '3 months'
    };

    return baseTimeframes[alert.metricCategory] || '3 months';
  }

  /**
   * Get responsible party for metric category
   */
  private getResponsibleParty(category: string): string {
    const responsibleParties = {
      quality: 'Quality Assurance Manager',
      efficiency: 'Operations Manager',
      patient_satisfaction: 'Patient Services Manager',
      financial: 'Financial Controller',
      compliance: 'Compliance Officer'
    };

    return responsibleParties[category] || 'Department Head';
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentileRank(institutionScore: number, peerAvg: number, peerThreshold: number): number {
    if (peerThreshold === 0) return 50;

    const institutionPerformance = (institutionScore / peerThreshold) * 100;
    const peerPerformance = (peerAvg / peerThreshold) * 100;

    return Math.max(0, Math.min(100, Math.round(((institutionPerformance - peerPerformance) / peerPerformance) * 50 + 50)));
  }
}

export const providerPerformanceService = new ProviderPerformanceService();