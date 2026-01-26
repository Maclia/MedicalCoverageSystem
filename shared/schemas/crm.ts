import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, varchar, decimal, sql } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for CRM Service
export const agentTypeEnum = pgEnum('agent_type', ['individual', 'corporate', 'broker', 'tied_agent']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing']);
export const opportunityStageEnum = pgEnum('opportunity_stage', ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']);
export const activityTypeEnum = pgEnum('activity_type', ['call', 'email', 'meeting', 'demo', 'proposal', 'follow_up', 'training']);
export const teamTypeEnum = pgEnum('team_type', ['sales', 'support', 'management', 'regional']);
export const territoryTypeEnum = pgEnum('territory_type', ['geographic', 'industry', 'account_size', 'product']);
export const commissionTypeEnum = pgEnum('commission_type', ['percentage', 'fixed', 'tiered', 'residual']);
export const performancePeriodEnum = pgEnum('performance_period', ['monthly', 'quarterly', 'annual']);

// Leads table
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  leadCode: varchar('lead_code', { length: 20 }).notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  company: text('company'),
  jobTitle: text('job_title'),
  leadSource: text('lead_source').notNull(),
  leadStatus: leadStatusEnum('lead_status').default('new'),
  leadScore: integer('lead_score').default(0),
  assignedAgentId: integer('assigned_agent_id'),
  assignedDate: timestamp('assigned_date'),
  firstContactDate: timestamp('first_contact_date'),
  lastContactDate: timestamp('last_contact_date'),
  nextFollowUpDate: date('next_follow_up_date'),
  estimatedValue: decimal('estimated_value', { precision: 15, scale: 2 }),
  conversionProbability: real('conversion_probability'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sales Opportunities table
export const salesOpportunities = pgTable('sales_opportunities', {
  id: serial('id').primaryKey(),
  opportunityCode: varchar('opportunity_code', { length: 20 }).notNull().unique(),
  title: text('title').notNull(),
  leadId: integer('lead_id').references(() => leads.id),
  ownerId: integer('owner_id').notNull(),
  stage: opportunityStageEnum('stage').default('prospecting'),
  estimatedValue: decimal('estimated_value', { precision: 15, scale: 2 }),
  probability: real('probability'),
  expectedCloseDate: date('expected_close_date'),
  actualCloseDate: date('actual_close_date'),
  lostReason: text('lost_reason'),
  competitor: text('competitor'),
  nextStep: text('next_step'),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sales Activities table
export const salesActivities = pgTable('sales_activities', {
  id: serial('id').primaryKey(),
  opportunityId: integer('opportunity_id').references(() => salesOpportunities.id),
  leadId: integer('lead_id').references(() => leads.id),
  agentId: integer('agent_id').notNull(),
  activityType: activityTypeEnum('activity_type').notNull(),
  subject: text('subject').notNull(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  duration: integer('duration'), // in minutes
  outcome: text('outcome'),
  nextAction: text('next_action'),
  nextActionDate: date('next_action_date'),
  isCompleted: boolean('is_completed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Sales Teams table
export const salesTeams = pgTable('sales_teams', {
  id: serial('id').primaryKey(),
  teamName: text('team_name').notNull(),
  teamType: teamTypeEnum('team_type').default('sales'),
  description: text('description'),
  managerId: integer('manager_id'),
  department: text('department'),
  targetRevenue: decimal('target_revenue', { precision: 15, scale: 2 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Territories table
export const territories = pgTable('territories', {
  id: serial('id').primaryKey(),
  territoryName: text('territory_name').notNull(),
  territoryType: territoryTypeEnum('territory_type').default('geographic'),
  description: text('description'),
  geographicRegion: text('geographic_region'),
  industryFocus: text('industry_focus'),
  assignedAgentId: integer('assigned_agent_id'),
  targetRevenue: decimal('target_revenue', { precision: 15, scale: 2 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Agents table
export const agents = pgTable('agents', {
  id: serial('id').primaryKey(),
  agentCode: varchar('agent_code', { length: 20 }).notNull().unique(),
  userId: integer('user_id').notNull(),
  agentType: agentTypeEnum('agent_type').default('individual'),
  teamId: integer('team_id').references(() => salesTeams.id),
  territoryId: integer('territory_id').references(() => territories.id),
  supervisorId: integer('supervisor_id').references(() => agents.id),
  commissionTierId: integer('commission_tier_id'),
  baseCommissionRate: real('base_commission_rate').default(0),
  overrideRate: real('override_rate'),
  targetAnnualPremium: decimal('target_annual_premium', { precision: 15, scale: 2 }),
  ytdPremium: decimal('ytd_premium', { precision: 15, scale: 2 }).default('0'),
  ytdCommission: decimal('ytd_commission', { precision: 15, scale: 2 }).default('0'),
  joinDate: date('join_date').notNull(),
  terminationDate: date('termination_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Commission Tiers table
export const commissionTiers = pgTable('commission_tiers', {
  id: serial('id').primaryKey(),
  tierName: text('tier_name').notNull(),
  tierLevel: integer('tier_level').notNull(),
  baseRate: real('base_rate').notNull(),
  bonusThreshold: decimal('bonus_threshold', { precision: 15, scale: 2 }),
  bonusRate: real('bonus_rate'),
  individualRate: real('individual_rate'),
  corporateRate: real('corporate_rate'),
  familyRate: real('family_rate'),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Commission Transactions table
export const commissionTransactions = pgTable('commission_transactions', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => agents.id).notNull(),
  transactionType: text('transaction_type').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  commissionRate: real('commission_rate').notNull(),
  premiumAmount: decimal('premium_amount', { precision: 15, scale: 2 }),
  paymentDate: date('payment_date'),
  paymentReference: text('payment_reference'),
  commissionPeriod: varchar('commission_period', { length: 7 }), // YYYY-MM format
  status: text('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Agent Performance table
export const agentPerformance = pgTable('agent_performance', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => agents.id).notNull(),
  period: varchar('period', { length: 7 }).notNull(), // YYYY-MM format
  totalPremium: decimal('total_premium', { precision: 15, scale: 2 }).default('0'),
  totalCommission: decimal('total_commission', { precision: 15, scale: 2 }).default('0'),
  policiesSold: integer('policies_sold').default(0),
  conversionRate: real('conversion_rate'),
  averageDealSize: decimal('average_deal_size', { precision: 15, scale: 2 }),
  companyRank: integer('company_rank'),
  teamRank: integer('team_rank'),
  targetAchievement: real('target_achievement'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Agent Performance Metrics table
export const agentPerformanceMetrics = pgTable('agent_performance_metrics', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => agents.id).notNull(),
  metricName: text('metric_name').notNull(),
  metricValue: decimal('metric_value', { precision: 15, scale: 2 }),
  metricPeriod: performancePeriodEnum('metric_period').default('monthly'),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  targetValue: decimal('target_value', { precision: 15, scale: 2 }),
  achievement: real('achievement'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Agent Leaderboards table
export const agentLeaderboards = pgTable('agent_leaderboards', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => agents.id).notNull(),
  leaderboardType: text('leaderboard_type').notNull(), // 'premium', 'commission', 'policies'
  period: varchar('period', { length: 7 }).notNull(),
  rank: integer('rank').notNull(),
  value: decimal('value', { precision: 15, scale: 2 }).notNull(),
  totalParticipants: integer('total_participants').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Commission Reports table
export const commissionReports = pgTable('commission_reports', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => agents.id).notNull(),
  reportPeriod: varchar('report_period', { length: 7 }).notNull(),
  totalCommission: decimal('total_commission', { precision: 15, scale: 2 }).default('0'),
  baseCommission: decimal('base_commission', { precision: 15, scale: 2 }).default('0'),
  bonusCommission: decimal('bonus_commission', { precision: 15, scale: 2 }).default('0'),
  adjustments: decimal('adjustments', { precision: 15, scale: 2 }).default('0'),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).default('0'),
  pendingAmount: decimal('pending_amount', { precision: 15, scale: 2 }).default('0'),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});

// Insert Schemas
export const insertLeadSchema = createInsertSchema(leads);
export const insertSalesOpportunitySchema = createInsertSchema(salesOpportunities);
export const insertSalesActivitySchema = createInsertSchema(salesActivities);
export const insertSalesTeamSchema = createInsertSchema(salesTeams);
export const insertTerritorySchema = createInsertSchema(territories);
export const insertAgentSchema = createInsertSchema(agents);
export const insertCommissionTierSchema = createInsertSchema(commissionTiers);
export const insertCommissionTransactionSchema = createInsertSchema(commissionTransactions);
export const insertAgentPerformanceSchema = createInsertSchema(agentPerformance);
export const insertAgentPerformanceMetricSchema = createInsertSchema(agentPerformanceMetrics);
export const insertAgentLeaderboardSchema = createInsertSchema(agentLeaderboards);
export const insertCommissionReportSchema = createInsertSchema(commissionReports);

// Types
export type Lead = typeof leads.$inferSelect;
export type SalesOpportunity = typeof salesOpportunities.$inferSelect;
export type SalesActivity = typeof salesActivities.$inferSelect;
export type SalesTeam = typeof salesTeams.$inferSelect;
export type Territory = typeof territories.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type CommissionTier = typeof commissionTiers.$inferSelect;
export type CommissionTransaction = typeof commissionTransactions.$inferSelect;
export type AgentPerformance = typeof agentPerformance.$inferSelect;
export type AgentPerformanceMetric = typeof agentPerformanceMetrics.$inferSelect;
export type AgentLeaderboard = typeof agentLeaderboards.$inferSelect;
export type CommissionReport = typeof commissionReports.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertSalesOpportunity = z.infer<typeof insertSalesOpportunitySchema>;
export type InsertSalesActivity = z.infer<typeof insertSalesActivitySchema>;
export type InsertSalesTeam = z.infer<typeof insertSalesTeamSchema>;
export type InsertTerritory = z.infer<typeof insertTerritorySchema>;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InsertCommissionTier = z.infer<typeof insertCommissionTierSchema>;
export type InsertCommissionTransaction = z.infer<typeof insertCommissionTransactionSchema>;
export type InsertAgentPerformance = z.infer<typeof insertAgentPerformanceSchema>;
export type InsertAgentPerformanceMetric = z.infer<typeof insertAgentPerformanceMetricSchema>;
export type InsertAgentLeaderboard = z.infer<typeof insertAgentLeaderboardSchema>;
export type InsertCommissionReport = z.infer<typeof insertCommissionReportSchema>;