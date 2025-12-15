/**
 * Enhanced Agent Performance Service
 * Advanced agent performance analytics and dashboard creation
 * Real-time commission tracking and performance dashboards
 * Conversion rate analysis by product line and demographic
 * Agent ranking and leaderboards with tier progression tracking
 * Commission forecasting based on sales pipeline
 */

import { storage } from '../storage';
import * as schema from '../../shared/schema.js';
import { commissionCalculationService, CommissionAccrual } from './commissionCalculationService.js';
import { commissionPaymentService, AgentCommissionPayment } from './commissionPaymentService.js';

export interface AgentPerformanceAnalytics {
  agentId: number;
  period: PerformancePeriod;
  salesMetrics: SalesMetrics;
  commissionMetrics: CommissionMetrics;
  performanceMetrics: PerformanceMetrics;
  qualityMetrics: QualityMetrics;
  trendAnalysis: TrendAnalysis;
  peerComparison: PeerComparison;
  forecasting: PerformanceForecast;
  achievementStatus: AchievementStatus;
  recommendations: PerformanceRecommendation[];
  score: PerformanceScore;
}

export interface PerformancePeriod {
  startDate: Date;
  endDate: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
}

export interface SalesMetrics {
  newPolicies: number;
  renewalPolicies: number;
  totalPolicies: number;
  premiumVolume: number;
  averagePolicySize: number;
  salesValue: number;
  conversionRate: number;
  leadConversionRate: number;
  applicationCompletionRate: number;
  policyPersistency: number;
  productMix: ProductMixMetrics;
  geographicDistribution: GeographicMetrics;
  customerDemographics: CustomerDemographics;
}

export interface ProductMixMetrics {
  individual: { count: number; volume: number; averageSize: number };
  corporate: { count: number; volume: number; averageSize: number };
  family: { count: number; volume: number; averageSize: number };
  group: { count: number; volume: number; averageSize: number };
  supplemental: { count: number; volume: number; averageSize: number };
}

export interface GeographicMetrics {
  regions: Record<string, RegionPerformance>;
  topPerformingRegions: string[];
  underPerformingRegions: string[];
  expansionOpportunities: string[];
}

export interface RegionPerformance {
  policyCount: number;
  premiumVolume: number;
  averagePolicySize: number;
  marketShare: number;
  competitionLevel: 'low' | 'medium' | 'high';
  growthRate: number;
}

export interface CustomerDemographics {
  ageDistribution: Record<string, number>;
  incomeDistribution: Record<string, number>;
  industryDistribution: Record<string, number>;
  familyCompositionDistribution: Record<string, number>;
  geographicDistribution: Record<string, number>;
}

export interface CommissionMetrics {
  totalCommission: number;
  averageCommission: number;
  commissionPerPolicy: number;
  commissionRate: number;
  tierCommission: number;
  bonusCommission: number;
  overrideCommission: number;
  clawbackAmount: number;
  netCommission: number;
  commissionGrowth: number;
  ranking: {
    currentRank: number;
    previousRank: number;
    rankChange: number;
    totalAgents: number;
  };
}

export interface PerformanceMetrics {
  salesQuota: number;
  quotaAchievement: number;
  quotaPercentage: number;
  targetRevenue: number;
  revenueAchieved: number;
  revenuePercentage: number;
  customerSatisfaction: number;
  policyLapseRate: number;
  claimRatio: number;
  retentionRate: number;
  crossSellRate: number;
  upSellRate: number;
  referralRate: number;
}

export interface QualityMetrics {
  complianceScore: number;
  auditScore: number;
  documentationQuality: number;
  accuracyRate: number;
  timelinessScore: number;
  customerComplaints: number;
  resolutionTime: number;
  policyCancellations: number;
  fraudPreventionScore: number;
  ethicalConductScore: number;
  trainingCompliance: number;
}

export interface TrendAnalysis {
  salesTrend: TrendData[];
  commissionTrend: TrendData[];
  performanceTrend: TrendData[];
  qualityTrend: TrendData[];
  seasonalPatterns: SeasonalPattern[];
  growthRate: GrowthRate;
  volatility: number;
  forecastAccuracy: number;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
  movingAverage: number;
  target: number;
  achievement: number;
}

export interface SeasonalPattern {
  season: string;
  averagePerformance: number;
  peakMonths: string[];
  lowMonths: string[];
  seasonalMultiplier: number;
}

export interface GrowthRate {
  monthly: number;
  quarterly: number;
  annual: number;
  compound: number;
  projected: number;
}

export interface PeerComparison {
  peerGroup: string;
  agentPercentile: number;
  abovePeerGroup: boolean;
  topQuartile: boolean;
  bottomQuartile: boolean;
  peerAverages: PeerAverages;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
}

export interface PeerAverages {
  averageCommission: number;
  averageSales: number;
  averageRetention: number;
  averageSatisfaction: number;
  averageQuality: number;
}

export interface PerformanceForecast {
  nextPeriod: ForecastData;
  quarterlyForecasts: ForecastData[];
  annualForecast: ForecastData;
  confidence: number;
  assumptions: ForecastAssumption[];
  scenarios: ForecastScenario[];
  riskFactors: RiskFactor[];
}

export interface ForecastData {
  period: string;
  forecastSales: number;
  forecastCommission: number;
  forecastVolume: number;
  confidence: number;
  range: { min: number; max: number };
}

export interface ForecastAssumption {
  assumption: string;
  basis: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
}

export interface ForecastScenario {
  name: string;
  description: string;
  probability: number;
  expectedOutcome: ForecastData;
  bestCase: ForecastData;
  worstCase: ForecastData;
}

export interface RiskFactor {
  factor: string;
  probability: number;
  impact: number;
  mitigation: string;
  status: 'active' | 'mitigated' | 'resolved';
}

export interface AchievementStatus {
  overallStatus: 'exceeding' | 'meeting' | 'below' | 'critical';
  achievements: Achievement[];
  milestones: Milestone[];
  bonuses: BonusEligibility[];
  tierProgression: TierProgression;
  recognition: RecognitionStatus;
}

export interface Achievement {
  achievementType: 'sales_quota' | 'quality_score' | 'customer_service' | 'leadership' | 'training';
  name: string;
  description: string;
  achieved: boolean;
  achievedDate?: Date;
  target: number;
  actual: number;
  reward: string;
}

export interface Milestone {
  milestoneType: 'commission_milestone' | 'sales_milestone' | 'anniversary' | 'leadership';
  name: string;
  description: string;
  target: number;
  current: number;
  achieved: boolean;
  achievedDate?: Date;
  reward: string;
}

export interface BonusEligibility {
  bonusType: 'performance' | 'volume' | 'persistency' | 'quality' | 'leadership';
  eligible: boolean;
  amount: number;
  criteria: string[];
  achieved: boolean;
  payoutDate?: Date;
}

export interface TierProgression {
  currentTier: string;
  nextTier: string;
  progressPercentage: number;
  requirementsMet: TierRequirement[];
  remainingRequirements: TierRequirement[];
  projectedPromotionDate?: Date;
}

export interface TierRequirement {
  requirement: string;
  current: number;
  target: number;
  met: boolean;
  dueDate?: Date;
}

export interface RecognitionStatus {
  recognitions: Recognition[];
  awards: Award[];
  certifications: Certification[];
  leaderboards: LeaderboardRanking[];
}

export interface Recognition {
  recognitionType: 'top_performer' | 'quality_excellence' | 'customer_service' | 'team_player';
  name: string;
  description: string;
  date: Date;
  level: 'local' | 'regional' | 'national' | 'international';
}

export interface Award {
  awardType: 'sales_leader' | 'quality_champion' | 'innovation' | 'leadership' | 'customer_focus';
  name: string;
  issuer: string;
  date: Date;
  level: string;
}

export interface Certification {
  certificationType: 'product' | 'sales' | 'compliance' | 'leadership' | 'specialized';
  name: string;
  issuer: string;
  issuedDate: Date;
  expiryDate?: Date;
  level: string;
}

export interface LeaderboardRanking {
  leaderboardType: 'sales' | 'commission' | 'quality' | 'growth' | 'retention';
  rank: number;
  totalParticipants: number;
  percentile: number;
  score: number;
  period: string;
}

export interface PerformanceScore {
  overall: number;
  sales: number;
  quality: number;
  compliance: number;
  growth: number;
  customer: number;
  components: ScoreComponent[];
  weights: ScoreWeight[];
  calculation: ScoreCalculation;
}

export interface ScoreComponent {
  name: string;
  value: number;
  weight: number;
  score: number;
  description: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ScoreWeight {
  category: string;
  weight: number;
  description: string;
  minScore: number;
  maxScore: number;
}

export interface ScoreCalculation {
  method: string;
  period: string;
  dataSource: string[];
  lastUpdated: Date;
  nextUpdate: Date;
}

export interface PerformanceRecommendation {
  category: 'sales' | 'quality' | 'growth' | 'efficiency' | 'development';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  timeline: string;
  resources: string[];
  estimatedEffort: number;
}

export interface AgentLeaderboard {
  period: PerformancePeriod;
  category: LeaderboardCategory;
  rankings: LeaderboardEntry[];
  summary: LeaderboardSummary;
  trends: LeaderboardTrend;
}

export type LeaderboardCategory = 'total_sales' | 'new_business' | 'renewals' | 'commission_earned' | 'growth_rate' | 'customer_satisfaction' | 'quality_score';

export interface LeaderboardEntry {
  rank: number;
  agentId: number;
  agentName: string;
  value: number;
  change: number;
  tier: string;
  region: string;
  achievements: string[];
}

export interface LeaderboardSummary {
  totalParticipants: number;
  averageValue: number;
  topPercentileValue: number;
  medianValue: number;
  bottomPercentileValue: number;
  growthRate: number;
  participantChanges: ParticipantChanges;
}

export interface ParticipantChanges {
  newEntries: number;
  droppedOut: number;
  movers: number;
  moversUp: number;
  moversDown: number;
}

export interface LeaderboardTrend {
  period: string;
  topMovers: LeaderboardMover[];
  topPerformers: LeaderboardPerformer[];
  risingStars: LeaderboardRisingStar[];
}

export interface LeaderboardMover {
  agentId: number;
  agentName: string;
  previousRank: number;
  currentRank: number;
  change: number;
  reason: string;
}

export interface LeaderboardPerformer {
  agentId: number;
  agentName: string;
  value: number;
  trend: 'consistent' | 'improving' | 'declining';
  achievements: string[];
}

export interface LeaderboardRisingStar {
  agentId: number;
  agentName: string;
  previousRank: number;
  currentRank: number;
  improvementRate: number;
  potential: string;
}

export class AgentPerformanceService {
  private analyticsEngine: PerformanceAnalyticsEngine;
  private rankingEngine: RankingEngine;
  private forecastingEngine: ForecastingEngine;
  private reportingEngine: PerformanceReportingEngine;

  constructor() {
    this.analyticsEngine = new PerformanceAnalyticsEngine();
    this.rankingEngine = new RankingEngine();
    this.forecastingEngine = new ForecastingEngine();
    this.reportingEngine = new PerformanceReportingEngine();
  }

  /**
   * Get comprehensive performance analytics for agent
   */
  async getAgentPerformanceAnalytics(
    agentId: number,
    period: PerformancePeriod,
    includeForecasting: boolean = true
  ): Promise<AgentPerformanceAnalytics> {
    try {
      console.log(`Generating performance analytics for agent ${agentId} for period ${period.type}`);

      // Get basic performance data
      const salesMetrics = await this.calculateSalesMetrics(agentId, period);
      const commissionMetrics = await this.calculateCommissionMetrics(agentId, period);
      const performanceMetrics = await this.calculatePerformanceMetrics(agentId, period);
      const qualityMetrics = await this.calculateQualityMetrics(agentId, period);

      // Get trend analysis
      const trendAnalysis = await this.analyticsEngine.calculateTrendAnalysis(agentId, period);

      // Get peer comparison
      const peerComparison = await this.analyticsEngine.calculatePeerComparison(agentId, period);

      // Get forecasting if requested
      const forecasting = includeForecasting
        ? await this.forecastingEngine.generateForecast(agentId, period)
        : { nextPeriod: this.createEmptyForecast() };

      // Get achievement status
      const achievementStatus = await this.calculateAchievementStatus(agentId, period);

      // Get recommendations
      const recommendations = await this.generatePerformanceRecommendations(
        salesMetrics,
        commissionMetrics,
        performanceMetrics,
        qualityMetrics,
        trendAnalysis,
        peerComparison
      );

      // Calculate overall performance score
      const score = await this.calculatePerformanceScore(
        salesMetrics,
        commissionMetrics,
        performanceMetrics,
        qualityMetrics
      );

      return {
        agentId,
        period,
        salesMetrics,
        commissionMetrics,
        performanceMetrics,
        qualityMetrics,
        trendAnalysis,
        peerComparison,
        forecasting,
        achievementStatus,
        recommendations,
        score
      };
    } catch (error) {
      console.error('Failed to generate agent performance analytics:', error);
      throw error;
    }
  }

  /**
   * Generate agent leaderboard
   */
  async generateLeaderboard(
    period: PerformancePeriod,
    category: LeaderboardCategory,
    limit?: number
  ): Promise<AgentLeaderboard> {
    try {
      console.log(`Generating ${category} leaderboard for period ${period.type}`);

      const rankings = await this.rankingEngine.generateRankings(period, category, limit);
      const summary = await this.rankingEngine.generateLeaderboardSummary(rankings);
      const trends = await this.rankingEngine.generateLeaderboardTrends(period, category);

      return {
        period,
        category,
        rankings,
        summary,
        trends
      };
    } catch (error) {
      console.error('Failed to generate leaderboard:', error);
      throw error;
    }
  }

  /**
   * Calculate agent tier progression
   */
  async calculateTierProgression(agentId: number): Promise<TierProgression> {
    try {
      console.log(`Calculating tier progression for agent ${agentId}`);

      const currentTier = await this.getCurrentAgentTier(agentId);
      const nextTier = await this.getNextTier(currentTier);
      const requirements = await this.getTierRequirements(nextTier);
      const currentMetrics = await this.getCurrentMetrics(agentId);

      const progressPercentage = this.calculateTierProgress(requirements, currentMetrics);
      const requirementsMet = requirements.filter(req => this.isRequirementMet(req, currentMetrics));
      const remainingRequirements = requirements.filter(req => !this.isRequirementMet(req, currentMetrics));

      return {
        currentTier: currentTier.name,
        nextTier: nextTier.name,
        progressPercentage,
        requirementsMet,
        remainingRequirements
      };
    } catch (error) {
      console.error('Failed to calculate tier progression:', error);
      throw error;
    }
  }

  /**
   * Get agent performance dashboard data
   */
  async getAgentDashboard(
    agentId: number,
    dashboardType: 'overview' | 'detailed' | 'executive' = 'overview'
  ): Promise<AgentDashboard> {
    try {
      console.log(`Generating ${dashboardType} dashboard for agent ${agentId}`);

      const currentPeriod: PerformancePeriod = {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate: new Date(),
        type: 'monthly'
      };

      const previousPeriod: PerformancePeriod = {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
        type: 'monthly'
      };

      const currentAnalytics = await this.getAgentPerformanceAnalytics(agentId, currentPeriod);
      const previousAnalytics = await this.getAgentPerformanceAnalytics(agentId, previousPeriod);

      const leaderboardData = await this.getAgentLeaderboardData(agentId);
      const recentAchievements = await this.getRecentAchievements(agentId);
      const upcomingMilestones = await this.getUpcomingMilestones(agentId);

      return {
        agentId,
        agentName: `Agent ${agentId}`, // Would get from database
        dashboardType,
        currentPeriod: currentAnalytics,
        previousPeriod: previousAnalytics,
        periodComparison: this.comparePeriods(previousAnalytics, currentAnalytics),
        leaderboardData,
        recentAchievements,
        upcomingMilestones,
        alerts: await this.getPerformanceAlerts(agentId),
        keyMetrics: this.extractKeyMetrics(currentAnalytics),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Failed to generate agent dashboard:', error);
      throw error;
    }
  }

  /**
   * Generate team performance report
   */
  async generateTeamPerformanceReport(
    teamId?: number,
    period?: PerformancePeriod,
    includeIndividualDetails: boolean = false
  ): Promise<TeamPerformanceReport> {
    try {
      console.log('Generating team performance report');

      const reportPeriod = period || {
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date(),
        type: 'annual'
      };

      const teamMembers = teamId ? await this.getTeamMembers(teamId) : await this.getAllAgents();
      const teamAnalytics = await this.getTeamAnalytics(teamMembers, reportPeriod);
      const teamComparison = await this.getTeamComparison(teamId, reportPeriod);
      const recommendations = await this.generateTeamRecommendations(teamAnalytics);

      let individualDetails: AgentPerformanceAnalytics[] = [];
      if (includeIndividualDetails) {
        individualDetails = await Promise.all(
          teamMembers.map(agentId => this.getAgentPerformanceAnalytics(agentId, reportPeriod))
        );
      }

      return {
        teamId: teamId || 0,
        teamName: teamId ? `Team ${teamId}` : 'All Agents',
        period: reportPeriod,
        summary: teamAnalytics.summary,
        individualDetails,
        teamComparison,
        recommendations,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to generate team performance report:', error);
      throw error;
    }
  }

  /**
   * Update agent performance metrics
   */
  async updateAgentPerformance(
    agentId: number,
    metricsUpdate: Partial<AgentPerformanceAnalytics>
  ): Promise<void> {
    try {
      console.log(`Updating performance metrics for agent ${agentId}`);

      // Validate metrics
      await this.validateMetricsUpdate(metricsUpdate);

      // Save updated metrics
      await this.saveAgentPerformanceMetrics(agentId, metricsUpdate);

      // Trigger recalculations if needed
      await this.recalculateDependentMetrics(agentId, metricsUpdate);

      // Update rankings if needed
      await this.updateAgentRankings(agentId);

    } catch (error) {
      console.error('Failed to update agent performance:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async calculateSalesMetrics(agentId: number, period: PerformancePeriod): Promise<SalesMetrics> {
    // This would query database and calculate sales metrics
    return {
      newPolicies: 15,
      renewalPolicies: 35,
      totalPolicies: 50,
      premiumVolume: 125000,
      averagePolicySize: 2500,
      salesValue: 150000,
      conversionRate: 0.25,
      leadConversionRate: 0.20,
      applicationCompletionRate: 0.85,
      policyPersistency: 0.92,
      productMix: {
        individual: { count: 25, volume: 30000, averageSize: 1200 },
        corporate: { count: 10, volume: 70000, averageSize: 7000 },
        family: { count: 10, volume: 20000, averageSize: 2000 },
        group: { count: 3, volume: 4000, averageSize: 1333 },
        supplemental: { count: 2, volume: 1000, averageSize: 500 }
      },
      geographicDistribution: {
        regions: {
          'North': { policyCount: 20, premiumVolume: 50000, averagePolicySize: 2500, marketShare: 0.15, competitionLevel: 'medium', growthRate: 0.10 },
          'South': { policyCount: 15, premiumVolume: 35000, averagePolicySize: 2333, marketShare: 0.12, competitionLevel: 'high', growthRate: 0.05 },
          'East': { policyCount: 10, premiumVolume: 25000, averagePolicySize: 2500, marketShare: 0.08, competitionLevel: 'low', growthRate: 0.15 },
          'West': { policyCount: 5, premiumVolume: 15000, averagePolicySize: 3000, marketShare: 0.05, competitionLevel: 'medium', growthRate: 0.12 }
        },
        topPerformingRegions: ['North', 'West'],
        underPerformingRegions: ['South'],
        expansionOpportunities: ['Central']
      },
      customerDemographics: {
        ageDistribution: {
          '18-25': 5,
          '26-35': 15,
          '36-45': 20,
          '46-55': 8,
          '56-65': 2
        },
        incomeDistribution: {
          'Low': 10,
          'Medium': 30,
          'High': 8,
          'Very High': 2
        },
        industryDistribution: {
          'Technology': 15,
          'Healthcare': 10,
          'Manufacturing': 12,
          'Services': 8,
          'Government': 5
        },
        familyCompositionDistribution: {
          'Individual': 25,
          'Couple': 10,
          'Family with Children': 12,
          'Single Parent': 3
        },
        geographicDistribution: {
          'Urban': 35,
          'Suburban': 10,
          'Rural': 5
        }
      }
    };
  }

  private async calculateCommissionMetrics(agentId: number, period: PerformancePeriod): Promise<CommissionMetrics> {
    // This would calculate commission metrics from payment and accrual data
    return {
      totalCommission: 15000,
      averageCommission: 300,
      commissionPerPolicy: 300,
      commissionRate: 10,
      tierCommission: 12000,
      bonusCommission: 2000,
      overrideCommission: 1000,
      clawbackAmount: 0,
      netCommission: 15000,
      commissionGrowth: 0.15,
      ranking: {
        currentRank: 5,
        previousRank: 7,
        rankChange: 2,
        totalAgents: 50
      }
    };
  }

  private async calculatePerformanceMetrics(agentId: number, period: PerformancePeriod): Promise<PerformanceMetrics> {
    // This would calculate performance metrics against targets
    return {
      salesQuota: 180000,
      quotaAchievement: 150000,
      quotaPercentage: 0.83,
      targetRevenue: 200000,
      revenueAchieved: 150000,
      revenuePercentage: 0.75,
      customerSatisfaction: 4.2,
      policyLapseRate: 0.08,
      claimRatio: 0.65,
      retentionRate: 0.92,
      crossSellRate: 0.25,
      upSellRate: 0.15,
      referralRate: 0.10
    };
  }

  private async calculateQualityMetrics(agentId: number, period: PerformancePeriod): Promise<QualityMetrics> {
    // This would calculate quality metrics from audits and customer feedback
    return {
      complianceScore: 85,
      auditScore: 90,
      documentationQuality: 88,
      accuracyRate: 0.95,
      timelinessScore: 92,
      customerComplaints: 2,
      resolutionTime: 24,
      policyCancellations: 4,
      fraudPreventionScore: 95,
      ethicalConductScore: 98,
      trainingCompliance: 100
    };
  }

  private async generatePerformanceRecommendations(
    sales: SalesMetrics,
    commission: CommissionMetrics,
    performance: PerformanceMetrics,
    quality: QualityMetrics,
    trends: TrendAnalysis,
    peerComparison: PeerComparison
  ): Promise<PerformanceRecommendation[]> {
    // This would generate personalized recommendations based on performance data
    return [
      {
        category: 'sales',
        priority: 'high',
        title: 'Increase Corporate Business Focus',
        description: 'Your individual policy sales are strong, but corporate representation could be improved',
        actionItems: [
          'Target medium-sized businesses in your territory',
          'Develop corporate presentation materials',
          'Attend local business networking events'
        ],
        expectedImpact: 'Potential 20% increase in premium volume',
        timeline: '3 months',
        resources: ['Corporate sales training', 'Marketing materials'],
        estimatedEffort: 8
      },
      {
        category: 'quality',
        priority: 'medium',
        title: 'Improve Customer Satisfaction',
        description: 'While your customer satisfaction is good, there\'s room for improvement',
        actionItems: [
          'Implement proactive customer follow-up process',
          'Provide additional educational resources',
          'Request customer feedback more regularly'
        ],
        expectedImpact: 'Increase satisfaction score by 0.5 points',
        timeline: '6 weeks',
        resources: ['Customer service training', 'Feedback tools'],
        estimatedEffort: 5
      }
    ];
  }

  private async calculatePerformanceScore(
    sales: SalesMetrics,
    commission: CommissionMetrics,
    performance: PerformanceMetrics,
    quality: QualityMetrics
  ): Promise<PerformanceScore> {
    // This would calculate a weighted performance score
    return {
      overall: 82,
      sales: 85,
      quality: 88,
      compliance: 85,
      growth: 78,
      customer: 83,
      components: [
        {
          name: 'Sales Achievement',
          value: 83,
          weight: 0.3,
          score: 85,
          description: 'Sales quota achievement and volume',
          trend: 'improving'
        },
        {
          name: 'Quality Score',
          value: 88,
          weight: 0.25,
          score: 88,
          description: 'Audit score and compliance',
          trend: 'stable'
        }
      ],
      weights: [
        { category: 'Sales', weight: 0.3, description: 'Sales performance', minScore: 0, maxScore: 100 },
        { category: 'Quality', weight: 0.25, description: 'Quality metrics', minScore: 0, maxScore: 100 }
      ],
      calculation: 'Weighted average of performance components',
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }

  private createEmptyForecast(): PerformanceForecast {
    return {
      nextPeriod: this.createEmptyForecastData(),
      quarterlyForecasts: [],
      annualForecast: this.createEmptyForecastData(),
      confidence: 0,
      assumptions: [],
      scenarios: [],
      riskFactors: []
    };
  }

  private createEmptyForecastData(): ForecastData {
    return {
      period: '',
      forecastSales: 0,
      forecastCommission: 0,
      forecastVolume: 0,
      confidence: 0,
      range: { min: 0, max: 0 }
    };
  }

  private async calculateAchievementStatus(agentId: number, period: PerformancePeriod): Promise<AchievementStatus> {
    // This would calculate achievement status and bonuses
    return {
      overallStatus: 'meeting',
      achievements: [],
      milestones: [],
      bonuses: [],
      tierProgression: {
        currentTier: 'Standard',
        nextTier: 'Advanced',
        progressPercentage: 0.75,
        requirementsMet: [],
        remainingRequirements: []
      },
      recognition: {
        recognitions: [],
        awards: [],
        certifications: [],
        leaderboards: []
      }
    };
  }

  // Placeholder methods for database operations
  private async getCurrentAgentTier(agentId: number): Promise<any> {
    return { name: 'Standard', level: 2 };
  }

  private async getNextTier(currentTier: any): Promise<any> {
    return { name: 'Advanced', level: 3 };
  }

  private async getTierRequirements(tier: any): Promise<TierRequirement[]> {
    return [];
  }

  private async getCurrentMetrics(agentId: number): Promise<any> {
    return {};
  }

  private calculateTierProgress(requirements: TierRequirement[], metrics: any): number {
    return 0.75; // Simplified
  }

  private isRequirementMet(requirement: TierRequirement, metrics: any): boolean {
    return false; // Simplified
  }

  private async getAgentLeaderboardData(agentId: number): Promise<any> {
    return {
      rankings: [
        { category: 'total_sales', rank: 5, percentile: 90 },
        { category: 'commission_earned', rank: 3, percentile: 94 },
        { category: 'quality_score', rank: 8, percentile: 84 }
      ]
    };
  }

  private async getRecentAchievements(agentId: number): Promise<Achievement[]> {
    return [];
  }

  private async getUpcomingMilestones(agentId: number): Promise<Milestone[]> {
    return [];
  }

  private async getPerformanceAlerts(agentId: number): Promise<any> {
    return [];
  }

  private extractKeyMetrics(analytics: AgentPerformanceAnalytics): any {
    return {
      totalPolicies: analytics.salesMetrics.totalPolicies,
      totalCommission: analytics.commissionMetrics.totalCommission,
      satisfaction: analytics.performanceMetrics.customerSatisfaction,
      quality: analytics.qualityMetrics.auditScore
    };
  }

  private comparePeriods(previous: AgentPerformanceAnalytics, current: AgentPerformanceAnalytics): any {
    return {
      commissionGrowth: ((current.commissionMetrics.totalCommission - previous.commissionMetrics.totalCommission) / previous.commissionMetrics.totalCommission) * 100,
      salesGrowth: ((current.salesMetrics.totalPolicies - previous.salesMetrics.totalPolicies) / previous.salesMetrics.totalPolicies) * 100
    };
  }

  private async getTeamMembers(teamId: number): Promise<number[]> {
    return [1, 2, 3]; // Simplified
  }

  private async getAllAgents(): Promise<number[]> {
    return [1, 2, 3, 4, 5]; // Simplified
  }

  private async getTeamAnalytics(teamMembers: number[], period: PerformancePeriod): Promise<any> {
    return {
      summary: {
        totalAgents: teamMembers.length,
        totalCommission: 75000,
        averageCommission: 15000,
        topPerformer: 1,
        bottomPerformer: 5
      }
    };
  }

  private async getTeamComparison(teamId: number, period: PerformancePeriod): Promise<any> {
    return {
      teamRanking: 3,
      teamCount: 10,
      performanceIndex: 85
    };
  }

  private async generateTeamRecommendations(teamAnalytics: any): Promise<string[]> {
    return [
      'Focus on developing underperforming team members',
      'Share best practices from top performers',
      'Implement team-wide training programs'
    ];
  }

  private async validateMetricsUpdate(update: Partial<AgentPerformanceAnalytics>): Promise<void> {
    // Validation logic
  }

  private async saveAgentPerformanceMetrics(agentId: number, update: Partial<AgentPerformanceAnalytics>): Promise<void> {
    console.log(`Saving updated metrics for agent ${agentId}`);
  }

  private async recalculateDependentMetrics(agentId: number, update: Partial<AgentPerformanceAnalytics>): Promise<void> {
    console.log(`Recalculating dependent metrics for agent ${agentId}`);
  }

  private async updateAgentRankings(agentId: number): Promise<void> {
    console.log(`Updating rankings for agent ${agentId}`);
  }
}

// Supporting classes
class PerformanceAnalyticsEngine {
  async calculateTrendAnalysis(agentId: number, period: PerformancePeriod): Promise<TrendAnalysis> {
    return {
      salesTrend: [],
      commissionTrend: [],
      performanceTrend: [],
      qualityTrend: [],
      seasonalPatterns: [],
      growthRate: {
        monthly: 0.05,
        quarterly: 0.12,
        annual: 0.15,
        compound: 0.16,
        projected: 0.18
      },
      volatility: 0.15,
      forecastAccuracy: 0.85
    };
  }

  async calculatePeerComparison(agentId: number, period: PerformancePeriod): Promise<PeerComparison> {
    return {
      peerGroup: 'Standard Tier',
      agentPercentile: 85,
      abovePeerGroup: true,
      topQuartile: true,
      bottomQuartile: false,
      peerAverages: {
        averageCommission: 12000,
        averageSales: 40,
        averageRetention: 0.90,
        averageSatisfaction: 4.0,
        averageQuality: 82
      },
      strengths: ['Sales performance', 'Customer satisfaction'],
      weaknesses: ['Geographic distribution'],
      opportunities: ['Corporate sales'],
      threats: ['Market competition']
    };
  }
}

class RankingEngine {
  async generateRankings(period: PerformancePeriod, category: LeaderboardCategory, limit?: number): Promise<LeaderboardEntry[]> {
    // Simplified mock data
    return [
      {
        rank: 1,
        agentId: 1,
        agentName: 'Agent 1',
        value: 25000,
        change: 2,
        tier: 'Advanced',
        region: 'North',
        achievements: ['Top Performer', 'Quality Champion']
      },
      {
        rank: 2,
        agentId: 2,
        agentName: 'Agent 2',
        value: 22000,
        change: -1,
        tier: 'Standard',
        region: 'South',
        achievements: ['Sales Leader']
      }
    ];
  }

  async generateLeaderboardSummary(rankings: LeaderboardEntry[]): Promise<LeaderboardSummary> {
    return {
      totalParticipants: 50,
      averageValue: 12000,
      topPercentileValue: 25000,
      medianValue: 10000,
      bottomPercentileValue: 5000,
      growthRate: 0.10,
      participantChanges: {
        newEntries: 5,
        droppedOut: 2,
        movers: 8,
        moversUp: 6,
        moversDown: 2
      }
    };
  }

  async generateLeaderboardTrends(period: PerformancePeriod, category: LeaderboardCategory): Promise<LeaderboardTrend> {
    return {
      period: period.type,
      topMovers: [],
      topPerformers: [],
      risingStars: []
    };
  }
}

class ForecastingEngine {
  async generateForecast(agentId: number, period: PerformancePeriod): Promise<PerformanceForecast> {
    return {
      nextPeriod: {
        period: 'Next Month',
        forecastSales: 15,
        forecastCommission: 16000,
        forecastVolume: 150000,
        confidence: 0.75,
        range: { min: 13000, max: 19000 }
      },
      quarterlyForecasts: [],
      annualForecast: {
        period: 'Next Year',
        forecastSales: 180,
        forecastCommission: 200000,
        forecastVolume: 1800000,
        confidence: 0.70,
        range: { min: 160000, max: 240000 }
      },
      confidence: 0.72,
      assumptions: [],
      scenarios: [],
      riskFactors: []
    };
  }
}

class PerformanceReportingEngine {
  async generateTaxReport(year: number, periodStart: Date, periodEnd: Date, reportType: string): Promise<PaymentReport> {
    return {
      reportId: `tax_report_${year}`,
      reportType: 'tax',
      reportPeriod: { start: periodStart, end: periodEnd },
      generatedDate: new Date(),
      generatedBy: 1,
      status: 'completed',
      data: {
        summary: {
          totalPayments: 0,
          totalAmount: 0,
          totalTaxWithheld: 0,
          totalNetAmount: 0,
          averagePayment: 0,
          paymentMethods: {},
          currencies: {}
        },
        agentBreakdown: [],
        taxSummary: {
          totalWithheld: 0,
          taxRates: {},
          exemptions: {},
          filingRequirements: [],
          upcomingFilings: []
        },
        complianceMetrics: {
          overallCompliance: 0,
          licensingCompliance: 0,
          paymentCompliance: 0,
          auditPassRate: 0,
          exceptionResolutionTime: 0,
          openAuditFindings: 0
        },
        trends: {
          monthlyTrends: [],
          yearOverYearGrowth: 0,
          paymentMethodTrends: {},
          agentPerformanceTrends: []
        }
      }
    };
  }
}

export interface AgentDashboard {
  agentId: number;
  agentName: string;
  dashboardType: 'overview' | 'detailed' | 'executive';
  currentPeriod: AgentPerformanceAnalytics;
  previousPeriod: AgentPerformanceAnalytics;
  periodComparison: any;
  leaderboardData: any;
  recentAchievements: Achievement[];
  upcomingMilestones: Milestone[];
  alerts: any[];
  keyMetrics: any;
  lastUpdated: Date;
}

export interface TeamPerformanceReport {
  teamId: number;
  teamName: string;
  period: PerformancePeriod;
  summary: any;
  individualDetails: AgentPerformanceAnalytics[];
  teamComparison: any;
  recommendations: string[];
  generatedAt: Date;
}

export const agentPerformanceService = new AgentPerformanceService();