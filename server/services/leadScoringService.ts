import { db } from '../db.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import {
  users,
  agents,
  leads,
  salesOpportunities,
  activities,
  companies,
  members,
  notificationService
} from '../../shared/schema.js';

export interface ScoringCriteria {
  id: string;
  name: string;
  category: 'demographic' | 'behavioral' | 'firmographic' | 'engagement' | 'custom';
  weight: number; // 0-100, relative importance
  conditions: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range' | 'not_equals';
    value: any;
    score: number; // Points awarded if condition is met
  }[];
  isActive: boolean;
  description?: string;
}

export interface LeadScore {
  leadId: number;
  totalScore: number;
  categoryScores: Record<string, number>;
  criteriaBreakdown: {
    criteriaId: string;
    criteriaName: string;
    score: number;
    metConditions: string[];
  }[];
  scoreTier: 'hot' | 'warm' | 'cool' | 'cold';
  lastCalculated: Date;
  trendScore?: number; // Previous score for trend analysis
  trending: 'up' | 'down' | 'stable';
}

export interface ScoringModel {
  id: string;
  name: string;
  description: string;
  version: string;
  criteria: ScoringCriteria[];
  thresholds: {
    hot: number;
    warm: number;
    cool: number;
    cold: number;
  };
  isActive: boolean;
  createdDate: Date;
  lastUsed?: Date;
}

export class LeadScoringService {
  private scoringModels: Map<string, ScoringModel> = new Map();
  private defaultCriteria: ScoringCriteria[] = [];

  constructor() {
    this.initializeDefaultScoringModel();
    this.startAutomaticScoring();
  }

  private initializeDefaultScoringModel() {
    // Initialize default scoring criteria
    this.defaultCriteria = [
      {
        id: 'company_size',
        name: 'Company Size',
        category: 'firmographic',
        weight: 25,
        conditions: [
          { field: 'company.employeeCount', operator: 'greater_than', value: 500, score: 30 },
          { field: 'company.employeeCount', operator: 'greater_than', value: 100, score: 20 },
          { field: 'company.employeeCount', operator: 'greater_than', value: 50, score: 15 },
          { field: 'company.employeeCount', operator: 'greater_than', value: 10, score: 10 },
          { field: 'company.employeeCount', operator: 'greater_than', value: 1, score: 5 }
        ],
        isActive: true,
        description: 'Points based on company employee count'
      },
      {
        id: 'industry_relevance',
        name: 'Industry Relevance',
        category: 'firmographic',
        weight: 20,
        conditions: [
          { field: 'company.industry', operator: 'equals', value: 'technology', score: 25 },
          { field: 'company.industry', operator: 'equals', value: 'healthcare', score: 20 },
          { field: 'company.industry', operator: 'equals', value: 'finance', score: 20 },
          { field: 'company.industry', operator: 'equals', value: 'manufacturing', score: 15 },
          { field: 'company.industry', operator: 'equals', value: 'consulting', score: 15 },
          { field: 'company.industry', operator: 'equals', value: 'professional_services', score: 15 },
          { field: 'company.industry', operator: 'equals', value: 'retail', score: 10 },
          { field: 'company.industry', operator: 'equals', value: 'other', score: 5 }
        ],
        isActive: true,
        description: 'Points based on industry alignment with insurance needs'
      },
      {
        id: 'revenue_potential',
        name: 'Revenue Potential',
        category: 'firmographic',
        weight: 30,
        conditions: [
          { field: 'company.annualRevenue', operator: 'greater_than', value: 10000000, score: 35 },
          { field: 'company.annualRevenue', operator: 'greater_than', value: 5000000, score: 30 },
          { field: 'company.annualRevenue', operator: 'greater_than', value: 1000000, score: 25 },
          { field: 'company.annualRevenue', operator: 'greater_than', value: 500000, score: 20 },
          { field: 'company.annualRevenue', operator: 'greater_than', value: 100000, score: 15 },
          { field: 'company.annualRevenue', operator: 'greater_than', value: 0, score: 10 }
        ],
        isActive: true,
        description: 'Points based on company revenue and premium potential'
      },
      {
        id: 'contact_level',
        name: 'Contact Level',
        category: 'demographic',
        weight: 15,
        conditions: [
          { field: 'lead.jobTitle', operator: 'contains', value: 'CEO', score: 25 },
          { field: 'lead.jobTitle', operator: 'contains', value: 'Founder', score: 25 },
          { field: 'lead.jobTitle', operator: 'contains', value: 'President', score: 20 },
          { field: 'lead.jobTitle', operator: 'contains', value: 'Director', score: 18 },
          { field: 'lead.jobTitle', operator: 'contains', value: 'Manager', score: 15 },
          { field: 'lead.jobTitle', operator: 'contains', value: 'HR', score: 20 },
          { field: 'lead.jobTitle', operator: 'contains', value: 'Benefits', score: 22 },
          { field: 'lead.jobTitle', operator: 'contains', value: 'Coordinator', score: 10 },
          { field: 'lead.jobTitle', operator: 'contains', value: 'Assistant', score: 8 }
        ],
        isActive: true,
        description: 'Points based on contact seniority and decision-making authority'
      },
      {
        id: 'engagement_level',
        name: 'Engagement Level',
        category: 'engagement',
        weight: 25,
        conditions: [
          { field: 'activities.email_clicks', operator: 'greater_than', value: 5, score: 20 },
          { field: 'activities.email_opens', operator: 'greater_than', value: 10, score: 15 },
          { field: 'activities.website_visits', operator: 'greater_than', value: 3, score: 15 },
          { field: 'activities.form_submissions', operator: 'greater_than', value: 1, score: 25 },
          { field: 'activities.call_backs', operator: 'greater_than', value: 1, score: 20 },
          { field: 'activities.meetings_scheduled', operator: 'greater_than', value: 0, score: 30 },
          { field: 'activities.resource_downloads', operator: 'greater_than', value: 2, score: 18 },
          { field: 'activities.social_engagement', operator: 'greater_than', value: 5, score: 12 }
        ],
        isActive: true,
        description: 'Points based on lead engagement activities'
      },
      {
        id: 'response_speed',
        name: 'Response Speed',
        category: 'behavioral',
        weight: 15,
        conditions: [
          { field: 'lead.time_to_first_response', operator: 'less_than', value: 3600, score: 20 }, // < 1 hour
          { field: 'lead.time_to_first_response', operator: 'less_than', value: 14400, score: 15 }, // < 4 hours
          { field: 'lead.time_to_first_response', operator: 'less_than', value: 86400, score: 10 }, // < 1 day
          { field: 'lead.time_to_first_response', operator: 'less_than', value: 259200, score: 5 } // < 3 days
        ],
        isActive: true,
        description: 'Points based on how quickly lead responds to outreach'
      },
      {
        id: 'budget_indicators',
        name: 'Budget Indicators',
        category: 'behavioral',
        weight: 20,
        conditions: [
          { field: 'lead.budget_confirmed', operator: 'equals', value: true, score: 30 },
          { field: 'lead.budget_range', operator: 'contains', value: '100k+', score: 25 },
          { field: 'lead.budget_range', operator: 'contains', value: '50k-100k', score: 20 },
          { field: 'lead.budget_range', operator: 'contains', value: '25k-50k', score: 15 },
          { field: 'lead.pricing_discussion', operator: 'equals', value: true, score: 15 },
          { field: 'lead.financial_questions', operator: 'greater_than', value: 2, score: 20 }
        ],
        isActive: true,
        description: 'Points based on budget readiness and financial indicators'
      },
      {
        id: 'timeline_urgency',
        name: 'Timeline Urgency',
        category: 'behavioral',
        weight: 15,
        conditions: [
          { field: 'lead.immediate_need', operator: 'equals', value: true, score: 25 },
          { field: 'lead.timeline', operator: 'contains', value: 'immediate', score: 25 },
          { field: 'lead.timeline', operator: 'contains', value: '1-2 months', score: 20 },
          { field: 'lead.timeline', operator: 'contains', value: '3-6 months', score: 15 },
          { field: 'lead.timeline', operator: 'contains', value: '6+ months', score: 8 },
          { field: 'lead.competitor_review', operator: 'equals', value: true, score: 20 }
        ],
        isActive: true,
        description: 'Points based on implementation timeline urgency'
      }
    ];

    // Create default scoring model
    const defaultModel: ScoringModel = {
      id: 'default_model_v1',
      name: 'Default Lead Scoring Model',
      description: 'Standard lead scoring model for insurance industry',
      version: '1.0',
      criteria: this.defaultCriteria,
      thresholds: {
        hot: 80,
        warm: 60,
        cool: 40,
        cold: 0
      },
      isActive: true,
      createdDate: new Date()
    };

    this.scoringModels.set(defaultModel.id, defaultModel);
  }

  private startAutomaticScoring() {
    // Score new leads every hour
    setInterval(async () => {
      await this.scoreUnscoredLeads();
    }, 60 * 60 * 1000);

    // Update scores every 6 hours for recent activity
    setInterval(async () => {
      await this.updateRecentScores();
    }, 6 * 60 * 60 * 1000);

    console.log('Lead scoring service started');
  }

  async calculateLeadScore(leadId: number, modelId: string = 'default_model_v1'): Promise<LeadScore> {
    try {
      const model = this.scoringModels.get(modelId);
      if (!model) {
        throw new Error(`Scoring model ${modelId} not found`);
      }

      // Get lead data with related information
      const leadData = await this.getLeadData(leadId);
      if (!leadData) {
        throw new Error(`Lead ${leadId} not found`);
      }

      // Calculate scores for each category
      const categoryScores: Record<string, number> = {};
      const criteriaBreakdown = [];
      let totalScore = 0;

      for (const criteria of model.criteria) {
        if (!criteria.isActive) continue;

        let criteriaScore = 0;
        const metConditions = [];

        for (const condition of criteria.conditions) {
          if (this.evaluateCondition(condition, leadData)) {
            criteriaScore += condition.score;
            metConditions.push(`${condition.field} ${condition.operator} ${condition.value}`);
          }
        }

        // Apply weight
        const weightedScore = Math.round((criteriaScore * criteria.weight) / 100);
        totalScore += weightedScore;

        // Track category scores
        if (!categoryScores[criteria.category]) {
          categoryScores[criteria.category] = 0;
        }
        categoryScores[criteria.category] += weightedScore;

        criteriaBreakdown.push({
          criteriaId: criteria.id,
          criteriaName: criteria.name,
          score: weightedScore,
          metConditions
        });
      }

      // Determine score tier
      const scoreTier = this.determineScoreTier(totalScore, model.thresholds);

      // Get previous score for trend analysis
      const previousScore = await this.getPreviousScore(leadId);
      const trendScore = previousScore?.totalScore || 0;
      const trending = this.calculateTrend(trendScore, totalScore);

      const leadScore: LeadScore = {
        leadId,
        totalScore,
        categoryScores,
        criteriaBreakdown,
        scoreTier,
        lastCalculated: new Date(),
        trendScore,
        trending
      };

      // Save the score
      await this.saveLeadScore(leadScore);

      // Trigger notifications for score changes
      await this.handleScoreNotifications(leadScore, previousScore);

      return leadScore;
    } catch (error) {
      console.error('Error calculating lead score:', error);
      throw error;
    }
  }

  private async getLeadData(leadId: number) {
    try {
      // Get lead with company and activity data
      const [lead] = await db.select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        jobTitle: leads.jobTitle,
        company: leads.company,
        source: leads.source,
        status: leads.status,
        budgetRange: leads.budgetRange,
        timeline: leads.timeline,
        immediateNeed: leads.immediateNeed,
        notes: leads.notes,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        // Company data
        companyData: {
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
          employeeCount: companies.employeeCount,
          annualRevenue: companies.annualRevenue,
          website: companies.website
        },
        // Activity counts
        activities: sql`(
          SELECT json_build_object(
            'email_opens', COUNT(*) FILTER (WHERE ${activities.activityType} = 'email'),
            'email_clicks', COUNT(*) FILTER (WHERE ${activities.activityType} = 'email' AND ${activities.subject} ILIKE '%click%'),
            'website_visits', COUNT(*) FILTER (WHERE ${activities.activityType} = 'website'),
            'form_submissions', COUNT(*) FILTER (WHERE ${activities.activityType} = 'form'),
            'call_backs', COUNT(*) FILTER (WHERE ${activities.activityType} = 'call' AND ${activities.subject} ILIKE '%callback%'),
            'meetings_scheduled', COUNT(*) FILTER (WHERE ${activities.activityType} = 'meeting'),
            'resource_downloads', COUNT(*) FILTER (WHERE ${activities.activityType} = 'download'),
            'social_engagement', COUNT(*) FILTER (WHERE ${activities.activityType} = 'social')
          )
          FROM ${activities}
          WHERE ${activities.leadId} = ${leadId}
        )`
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .leftJoin(activities, eq(leads.id, activities.leadId))
      .where(eq(leads.id, leadId))
      .groupBy(leads.id, companies.id)
      .limit(1);

      if (!lead) return null;

      // Add calculated fields
      const timeToFirstResponse = await this.calculateTimeToFirstResponse(leadId);

      return {
        ...lead,
        activities: lead.activities || {},
        time_to_first_response: timeToFirstResponse,
        budget_confirmed: lead.budgetRange !== null && lead.budgetRange !== '',
        pricing_discussion: lead.notes?.toLowerCase().includes('price') || lead.notes?.toLowerCase().includes('cost') || false,
        financial_questions: (lead.notes?.match(/budget|price|cost|investment|roi/gi) || []).length,
        competitor_review: lead.notes?.toLowerCase().includes('competitor') || lead.notes?.toLowerCase().includes('alternative') || false
      };
    } catch (error) {
      console.error('Error getting lead data:', error);
      return null;
    }
  }

  private evaluateCondition(condition: any, leadData: any): boolean {
    try {
      const fieldValue = this.getFieldValue(condition.field, leadData);
      const value = condition.value;

      switch (condition.operator) {
        case 'equals':
          return fieldValue === value;
        case 'not_equals':
          return fieldValue !== value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
        case 'greater_than':
          return Number(fieldValue) > Number(value);
        case 'less_than':
          return Number(fieldValue) < Number(value);
        case 'in_range':
          const [min, max] = value;
          return Number(fieldValue) >= Number(min) && Number(fieldValue) <= Number(max);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  private getFieldValue(field: string, data: any): any {
    // Support nested field access
    return field.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private determineScoreTier(score: number, thresholds: ScoringModel['thresholds']): LeadScore['scoreTier'] {
    if (score >= thresholds.hot) return 'hot';
    if (score >= thresholds.warm) return 'warm';
    if (score >= thresholds.cool) return 'cool';
    return 'cold';
  }

  private async getPreviousScore(leadId: number): Promise<LeadScore | null> {
    try {
      // This would query a lead_scores table in a real implementation
      // For now, return null
      return null;
    } catch (error) {
      console.error('Error getting previous score:', error);
      return null;
    }
  }

  private calculateTrend(previousScore: number, currentScore: number): LeadScore['trending'] {
    if (currentScore > previousScore + 5) return 'up';
    if (currentScore < previousScore - 5) return 'down';
    return 'stable';
  }

  private async saveLeadScore(leadScore: LeadScore) {
    try {
      // In a real implementation, this would save to a lead_scores table
      // For now, we'll update the lead record with score information
      await db.update(leads)
        .set({
          score: leadScore.totalScore,
          scoreTier: leadScore.scoreTier,
          lastScored: leadScore.lastCalculated,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadScore.leadId));

      console.log(`Score saved for lead ${leadScore.leadId}: ${leadScore.totalScore} (${leadScore.scoreTier})`);
    } catch (error) {
      console.error('Error saving lead score:', error);
    }
  }

  private async handleScoreNotifications(currentScore: LeadScore, previousScore: LeadScore | null) {
    try {
      // Notify on significant score changes
      if (previousScore && Math.abs(currentScore.totalScore - previousScore.totalScore) >= 20) {
        const lead = await db.select().from(leads).where(eq(leads.id, currentScore.leadId)).limit(1);
        if (lead.length > 0 && lead[0].assignedAgentId) {
          await notificationService.sendNotification({
            recipientId: lead[0].assignedAgentId,
            recipientType: 'agent',
            type: 'in_app',
            channel: 'mobile_app',
            subject: `Lead Score Changed: ${lead[0].firstName} ${lead[0].lastName}`,
            message: `Lead score changed from ${previousScore.totalScore} to ${currentScore.totalScore} (${currentScore.scoreTier})`,
            priority: 'medium',
            data: {
              leadId: currentScore.leadId,
              previousScore: previousScore.totalScore,
              newScore: currentScore.totalScore,
              trending: currentScore.trending
            }
          });
        }
      }

      // Notify on hot leads
      if (currentScore.scoreTier === 'hot' && (!previousScore || previousScore.scoreTier !== 'hot')) {
        const [lead] = await db.select().from(leads).where(eq(leads.id, currentScore.leadId)).limit(1);
        if (lead && lead.assignedAgentId) {
          await notificationService.sendNotification({
            recipientId: lead.assignedAgentId,
            recipientType: 'agent',
            type: 'in_app',
            channel: 'mobile_app',
            subject: `🔥 Hot Lead: ${lead.firstName} ${lead.lastName}`,
            message: `Lead has scored ${currentScore.totalScore} points and is now classified as HOT`,
            priority: 'high',
            data: {
              leadId: currentScore.leadId,
              score: currentScore.totalScore,
              categoryScores: currentScore.categoryScores
            }
          });
        }
      }
    } catch (error) {
      console.error('Error handling score notifications:', error);
    }
  }

  private async calculateTimeToFirstResponse(leadId: number): number {
    try {
      const [lead] = await db.select({ createdAt: leads.createdAt })
        .from(leads)
        .where(eq(leads.id, leadId));

      if (!lead) return 0;

      const [firstActivity] = await db.select({ activityDate: activities.activityDate })
        .from(activities)
        .where(and(
          eq(activities.leadId, leadId),
          gte(activities.activityDate, lead.createdAt)
        ))
        .orderBy(activities.activityDate)
        .limit(1);

      if (!firstActivity) return 0;

      return Math.floor((firstActivity.activityDate.getTime() - lead.createdAt.getTime()) / 1000);
    } catch (error) {
      console.error('Error calculating time to first response:', error);
      return 0;
    }
  }

  async scoreUnscoredLeads() {
    try {
      // Get leads that haven't been scored in the last 24 hours
      const unscoredLeads = await db.select()
        .from(leads)
        .where(and(
          sql`${leads.lastScored} IS NULL OR ${leads.lastScored} < NOW() - INTERVAL '24 hours'`,
          eq(leads.status, 'active')
        ))
        .limit(50);

      console.log(`Scoring ${unscoredLeads.length} unscored leads`);

      for (const lead of unscoredLeads) {
        try {
          await this.calculateLeadScore(lead.id);
        } catch (error) {
          console.error(`Error scoring lead ${lead.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error scoring unscored leads:', error);
    }
  }

  async updateRecentScores() {
    try {
      // Get leads with recent activity (last 6 hours)
      const recentLeads = await db.select({ id: leads.id })
        .from(leads)
        .where(and(
          sql`${leads.updatedAt} > NOW() - INTERVAL '6 hours'`,
          eq(leads.status, 'active')
        ))
        .limit(100);

      console.log(`Updating scores for ${recentLeads.length} recent leads`);

      for (const lead of recentLeads) {
        try {
          await this.calculateLeadScore(lead.id);
        } catch (error) {
          console.error(`Error updating score for lead ${lead.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error updating recent scores:', error);
    }
  }

  async getLeadScores(filters: {
    scoreTier?: string;
    minScore?: number;
    maxScore?: number;
    assignedAgentId?: number;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      let whereConditions = [
        sql`${leads.score} IS NOT NULL`
      ];

      if (filters.scoreTier) {
        whereConditions.push(eq(leads.scoreTier, filters.scoreTier));
      }

      if (filters.minScore) {
        whereConditions.push(gte(leads.score, filters.minScore));
      }

      if (filters.maxScore) {
        whereConditions.push(sql`${leads.score} <= ${filters.maxScore}`);
      }

      if (filters.assignedAgentId) {
        whereConditions.push(eq(leads.assignedAgentId, filters.assignedAgentId));
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const leadScores = await db.select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        company: leads.company,
        score: leads.score,
        scoreTier: leads.scoreTier,
        lastScored: leads.lastScored,
        assignedAgentId: leads.assignedAgentId,
        status: leads.status,
        createdAt: leads.createdAt
      })
      .from(leads)
      .where(and(...whereConditions))
      .orderBy(desc(leads.score))
      .limit(limit)
      .offset(offset);

      return { success: true, data: leadScores };
    } catch (error) {
      console.error('Error getting lead scores:', error);
      return { success: false, error: 'Failed to get lead scores' };
    }
  }

  async getScoringInsights() {
    try {
      // Get score distribution
      const [scoreDistribution] = await db.select({
        totalLeads: sql<number>`COUNT(*)`,
        avgScore: sql<number>`AVG(${leads.score})`,
        hotLeads: sql<number>`SUM(CASE WHEN ${leads.scoreTier} = 'hot' THEN 1 ELSE 0 END)`,
        warmLeads: sql<number>`SUM(CASE WHEN ${leads.scoreTier} = 'warm' THEN 1 ELSE 0 END)`,
        coolLeads: sql<number>`SUM(CASE WHEN ${leads.scoreTier} = 'cool' THEN 1 ELSE 0 END)`,
        coldLeads: sql<number>`SUM(CASE WHEN ${leads.scoreTier} = 'cold' THEN 1 ELSE 0 END)`
      })
      .from(leads)
      .where(sql`${leads.score} IS NOT NULL`);

      // Get conversion rates by score tier
      const conversionByTier = await db.select({
        scoreTier: leads.scoreTier,
        totalLeads: sql<number>`COUNT(*)`,
        convertedLeads: sql<number>`SUM(CASE WHEN EXISTS (
          SELECT 1 FROM ${salesOpportunities} WHERE ${salesOpportunities.leadId} = ${leads.id} AND ${salesOpportunities.stage} = 'closed_won'
        ) THEN 1 ELSE 0 END)`,
        conversionRate: sql<number>`(SUM(CASE WHEN EXISTS (
          SELECT 1 FROM ${salesOpportunities} WHERE ${salesOpportunities.leadId} = ${leads.id} AND ${salesOpportunities.stage} = 'closed_won'
        ) THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`
      })
      .from(leads)
      .where(and(
        sql`${leads.score} IS NOT NULL`,
        sql`${leads.scoreTier} IS NOT NULL`
      ))
      .groupBy(leads.scoreTier);

      // Get top performing criteria
      const model = this.scoringModels.get('default_model_v1');
      const topCriteria = model?.criteria
        .filter(c => c.isActive)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5) || [];

      return {
        success: true,
        data: {
          scoreDistribution,
          conversionByTier,
          topCriteria,
          totalActiveModels: this.scoringModels.size
        }
      };
    } catch (error) {
      console.error('Error getting scoring insights:', error);
      return { success: false, error: 'Failed to get scoring insights' };
    }
  }

  // Public methods for managing scoring models
  async createScoringModel(model: Omit<ScoringModel, 'id' | 'createdDate'>): Promise<{ success: boolean; model?: ScoringModel; error?: string }> {
    try {
      const newModel: ScoringModel = {
        ...model,
        id: `model_${Date.now()}`,
        createdDate: new Date()
      };

      this.scoringModels.set(newModel.id, newModel);

      return { success: true, model: newModel };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateScoringModel(modelId: string, updates: Partial<ScoringModel>): Promise<{ success: boolean; model?: ScoringModel; error?: string }> {
    try {
      const existingModel = this.scoringModels.get(modelId);
      if (!existingModel) {
        return { success: false, error: 'Model not found' };
      }

      const updatedModel: ScoringModel = {
        ...existingModel,
        ...updates,
        lastUsed: new Date()
      };

      this.scoringModels.set(modelId, updatedModel);

      return { success: true, model: updatedModel };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getScoringModels(): Promise<ScoringModel[]> {
    return Array.from(this.scoringModels.values());
  }

  async getScoringModel(modelId: string): Promise<ScoringModel | null> {
    return this.scoringModels.get(modelId) || null;
  }
}

export const leadScoringService = new LeadScoringService();