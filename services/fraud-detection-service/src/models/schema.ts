import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  jsonb,
  index,
  uuid
} from 'drizzle-orm/pg-core';

// Fraud Detection Tables
export const fraudDetectionRules = pgTable('fraud_detection_rules', {
  id: serial('id').primaryKey(),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  description: text('description'),
  ruleType: varchar('rule_type', { length: 50 }).notNull(), // claim, payment, user, provider
  ruleExpression: text('rule_expression').notNull(), // JSON expression or SQL condition
  riskScore: integer('risk_score').notNull(), // Risk score contribution
  isActive: boolean('is_active').default(true),
  isCritical: boolean('is_critical').default(false),
  priority: integer('priority').default(5), // 1-10 priority
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  ruleNameIdx: index('fraud_detection_rules_rule_name_idx').on(table.ruleName),
  ruleTypeIdx: index('fraud_detection_rules_rule_type_idx').on(table.ruleType),
  isActiveIdx: index('fraud_detection_rules_is_active_idx').on(table.isActive),
  priorityIdx: index('fraud_detection_rules_priority_idx').on(table.priority),
}));

export const fraudRiskIndicators = pgTable('fraud_risk_indicators', {
  id: serial('id').primaryKey(),
  indicatorName: varchar('indicator_name', { length: 255 }).notNull(),
  description: text('description'),
  indicatorType: varchar('indicator_type', { length: 50 }).notNull(), // claim, payment, user, provider
  riskLevel: varchar('risk_level', { length: 20 }).notNull(), // low, medium, high, critical
  riskScore: integer('risk_score').notNull(),
  threshold: decimal('threshold', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  indicatorNameIdx: index('fraud_risk_indicators_indicator_name_idx').on(table.indicatorName),
  indicatorTypeIdx: index('fraud_risk_indicators_indicator_type_idx').on(table.indicatorType),
  riskLevelIdx: index('fraud_risk_indicators_risk_level_idx').on(table.riskLevel),
  isActiveIdx: index('fraud_risk_indicators_is_active_idx').on(table.isActive),
}));

export const fraudDetectionCases = pgTable('fraud_detection_cases', {
  id: serial('id').primaryKey(),
  caseNumber: varchar('case_number', { length: 50 }).notNull().unique(),
  caseType: varchar('case_type', { length: 50 }).notNull(), // claim, payment, user, provider
  entityId: varchar('entity_id', { length: 100 }).notNull(), // ID of the entity being investigated
  entityType: varchar('entity_type', { length: 50 }).notNull(), // claim, payment, user, provider
  riskScore: integer('risk_score').notNull(),
  riskLevel: varchar('risk_level', { length: 20 }).notNull(), // low, medium, high, critical
  status: varchar('status', { length: 20 }).notNull().default('open'), // open, under_review, confirmed, rejected, closed
  assignedTo: integer('assigned_to'), // Investigator ID
  priority: varchar('priority', { length: 20 }).default('medium'), // low, medium, high, urgent
  description: text('description'),
  findings: text('findings'),
  recommendedAction: text('recommended_action'),
  decision: varchar('decision', { length: 50 }), // confirm, reject, escalate
  decisionDate: timestamp('decision_date'),
  decisionBy: integer('decision_by'),
  closureDate: timestamp('closure_date'),
  closureReason: varchar('closure_reason', { length: 100 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  caseNumberIdx: index('fraud_detection_cases_case_number_idx').on(table.caseNumber),
  caseTypeIdx: index('fraud_detection_cases_case_type_idx').on(table.caseType),
  entityIdIdx: index('fraud_detection_cases_entity_id_idx').on(table.entityId),
  entityTypeIdx: index('fraud_detection_cases_entity_type_idx').on(table.entityType),
  statusIdx: index('fraud_detection_cases_status_idx').on(table.status),
  riskScoreIdx: index('fraud_detection_cases_risk_score_idx').on(table.riskScore),
  priorityIdx: index('fraud_detection_cases_priority_idx').on(table.priority),
}));

export const fraudDetectionResults = pgTable('fraud_detection_results', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').references(() => fraudDetectionCases.id).notNull(),
  ruleId: integer('rule_id').references(() => fraudDetectionRules.id).notNull(),
  indicatorId: integer('indicator_id').references(() => fraudRiskIndicators.id),
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  riskScore: integer('risk_score').notNull(),
  riskLevel: varchar('risk_level', { length: 20 }).notNull(),
  matchedExpression: text('matched_expression'),
  matchedData: jsonb('matched_data'),
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 2 }),
  isPositive: boolean('is_positive').default(false),
  reviewed: boolean('reviewed').default(false),
  reviewedBy: integer('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  caseIdIdx: index('fraud_detection_results_case_id_idx').on(table.caseId),
  ruleIdIdx: index('fraud_detection_results_rule_id_idx').on(table.ruleId),
  indicatorIdIdx: index('fraud_detection_results_indicator_id_idx').on(table.indicatorId),
  entityIdIdx: index('fraud_detection_results_entity_id_idx').on(table.entityId),
  riskScoreIdx: index('fraud_detection_results_risk_score_idx').on(table.riskScore),
  isPositiveIdx: index('fraud_detection_results_is_positive_idx').on(table.isPositive),
  reviewedIdx: index('fraud_detection_results_reviewed_idx').on(table.reviewed),
}));

export const fraudWatchlist = pgTable('fraud_watchlist', {
  id: serial('id').primaryKey(),
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // user, provider, member
  entityName: varchar('entity_name', { length: 255 }).notNull(),
  reason: text('reason').notNull(),
  riskLevel: varchar('risk_level', { length: 20 }).notNull(), // low, medium, high, critical
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive, resolved
  addedBy: integer('added_by').notNull(),
  addedAt: timestamp('added_at').notNull().defaultNow(),
  reviewedBy: integer('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  entityIdIdx: index('fraud_watchlist_entity_id_idx').on(table.entityId),
  entityTypeIdx: index('fraud_watchlist_entity_type_idx').on(table.entityType),
  riskLevelIdx: index('fraud_watchlist_risk_level_idx').on(table.riskLevel),
  statusIdx: index('fraud_watchlist_status_idx').on(table.status),
  addedAtIdx: index('fraud_watchlist_added_at_idx').on(table.addedAt),
}));

export const fraudPatterns = pgTable('fraud_patterns', {
  id: serial('id').primaryKey(),
  patternName: varchar('pattern_name', { length: 255 }).notNull(),
  description: text('description'),
  patternType: varchar('pattern_type', { length: 50 }).notNull(), // claim, payment, user, provider
  patternExpression: text('pattern_expression').notNull(), // Pattern matching expression
  riskScore: integer('risk_score').notNull(),
  riskLevel: varchar('risk_level', { length: 20 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  patternNameIdx: index('fraud_patterns_pattern_name_idx').on(table.patternName),
  patternTypeIdx: index('fraud_patterns_pattern_type_idx').on(table.patternType),
  isActiveIdx: index('fraud_patterns_is_active_idx').on(table.isActive),
  riskScoreIdx: index('fraud_patterns_risk_score_idx').on(table.riskScore),
}));

export const fraudAnalytics = pgTable('fraud_analytics', {
  id: serial('id').primaryKey(),
  metricType: varchar('metric_type', { length: 100 }).notNull(), // fraud_rate, detection_rate, etc.
  metricValue: decimal('metric_value', { precision: 15, scale: 2 }).notNull(),
  metricUnit: varchar('metric_unit', { length: 50 }),
  period: varchar('period', { length: 50 }).notNull(), // daily, weekly, monthly, yearly
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  filters: jsonb('filters'),
  dimensions: jsonb('dimensions'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  metricTypeIdx: index('fraud_analytics_metric_type_idx').on(table.metricType),
  periodIdx: index('fraud_analytics_period_idx').on(table.period),
  startDateIdx: index('fraud_analytics_start_date_idx').on(table.startDate),
  endDateIdx: index('fraud_analytics_end_date_idx').on(table.endDate),
}));

// Export all tables
export type FraudDetectionRule = typeof fraudDetectionRules.$inferSelect;
export type NewFraudDetectionRule = typeof fraudDetectionRules.$inferInsert;
export type FraudRiskIndicator = typeof fraudRiskIndicators.$inferSelect;
export type NewFraudRiskIndicator = typeof fraudRiskIndicators.$inferInsert;
export type FraudDetectionCase = typeof fraudDetectionCases.$inferSelect;
export type NewFraudDetectionCase = typeof fraudDetectionCases.$inferInsert;
export type FraudDetectionResult = typeof fraudDetectionResults.$inferSelect;
export type NewFraudDetectionResult = typeof fraudDetectionResults.$inferInsert;
export type FraudWatchlist = typeof fraudWatchlist.$inferSelect;
export type NewFraudWatchlist = typeof fraudWatchlist.$inferInsert;
export type FraudPattern = typeof fraudPatterns.$inferSelect;
export type NewFraudPattern = typeof fraudPatterns.$inferInsert;
export type FraudAnalytics = typeof fraudAnalytics.$inferSelect;
export type NewFraudAnalytics = typeof fraudAnalytics.$inferInsert;