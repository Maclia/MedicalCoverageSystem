import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, varchar, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for Fraud Detection Service
export const fraudRiskLevelEnum = pgEnum('fraud_risk_level', ['low', 'medium', 'high', 'critical']);
export const fraudStatusEnum = pgEnum('fraud_status', ['pending_review', 'investigating', 'confirmed_fraud', 'false_positive', 'resolved']);
export const detectionMethodEnum = pgEnum('detection_method', ['rule_based', 'statistical', 'machine_learning', 'manual_review', 'network_analysis']);
export const alertPriorityEnum = pgEnum('alert_priority', ['low', 'medium', 'high', 'urgent']);
export const investigationStatusEnum = pgEnum('investigation_status', ['open', 'in_progress', 'closed', 'escalated']);

// Fraud Alerts table
export const fraudAlerts = pgTable("fraud_alerts", {
  id: serial("id").primaryKey(),
  alertId: varchar("alert_id", { length: 50 }).notNull().unique(),
  claimId: integer("claim_id"), // Reference to claims service
  memberId: integer("member_id"), // Reference to core service
  providerId: integer("provider_id"), // Reference to providers service
  riskLevel: fraudRiskLevelEnum("risk_level").default("low"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  detectionMethod: detectionMethodEnum("detection_method").notNull(),
  alertType: text("alert_type").notNull(), // 'duplicate_claim', 'unusual_frequency', 'provider_abuse', etc.
  description: text("description"),
  indicators: jsonb("indicators"), // JSON array of fraud indicators
  status: fraudStatusEnum("status").default("pending_review"),
  priority: alertPriorityEnum("priority").default("medium"),
  assignedTo: integer("assigned_to"), // Reference to core service (user)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Fraud Rules table
export const fraudRules = pgTable("fraud_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  ruleType: text("rule_type").notNull(), // 'threshold', 'pattern', 'behavioral', 'statistical'
  description: text("description"),
  conditions: jsonb("conditions"), // JSON rule conditions
  actions: jsonb("actions"), // JSON actions to take when rule triggers
  riskWeight: decimal("risk_weight", { precision: 3, scale: 2 }).default("1.00"),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1),
  createdBy: integer("created_by").notNull(), // Reference to core service
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fraud Investigations table
export const fraudInvestigations = pgTable("fraud_investigations", {
  id: serial("id").primaryKey(),
  investigationId: varchar("investigation_id", { length: 50 }).notNull().unique(),
  alertId: integer("alert_id").references(() => fraudAlerts.id),
  title: text("title").notNull(),
  description: text("description"),
  status: investigationStatusEnum("status").default("open"),
  assignedInvestigator: integer("assigned_investigator"), // Reference to core service
  findings: jsonb("findings"), // JSON investigation findings
  evidence: jsonb("evidence"), // JSON evidence collected
  conclusion: text("conclusion"),
  estimatedLoss: decimal("estimated_loss", { precision: 12, scale: 2 }),
  actualLoss: decimal("actual_loss", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

// Fraud Patterns table
export const fraudPatterns = pgTable("fraud_patterns", {
  id: serial("id").primaryKey(),
  patternId: varchar("pattern_id", { length: 50 }).notNull().unique(),
  patternType: text("pattern_type").notNull(), // 'billing', 'provider', 'member', 'pharmacy'
  patternName: text("pattern_name").notNull(),
  description: text("description"),
  indicators: jsonb("indicators"), // JSON pattern indicators
  riskMultiplier: decimal("risk_multiplier", { precision: 3, scale: 2 }).default("1.00"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  isActive: boolean("is_active").default(true),
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
  lastSeen: timestamp("last_seen"),
});

// Risk Scores table
export const riskScores = pgTable("risk_scores", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'member', 'provider', 'claim', 'diagnosis'
  entityId: integer("entity_id").notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  riskLevel: fraudRiskLevelEnum("risk_level"),
  factors: jsonb("factors"), // JSON contributing factors
  lastCalculated: timestamp("last_calculated").defaultNow().notNull(),
  nextReview: timestamp("next_review"),
  isActive: boolean("is_active").default(true),
});

// Fraud Analytics table
export const fraudAnalytics = pgTable("fraud_analytics", {
  id: serial("id").primaryKey(),
  metricType: text("metric_type").notNull(), // 'alerts_generated', 'fraud_confirmed', 'false_positives'
  metricValue: decimal("metric_value", { precision: 10, scale: 2 }),
  timePeriod: text("time_period"), // 'daily', 'weekly', 'monthly'
  date: date("date").notNull(),
  dimensions: jsonb("dimensions"), // JSON additional dimensions
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Machine Learning Models table
export const mlModels = pgTable("ml_models", {
  id: serial("id").primaryKey(),
  modelName: text("model_name").notNull(),
  modelType: text("model_type").notNull(), // 'classification', 'regression', 'clustering'
  algorithm: text("algorithm"), // 'random_forest', 'neural_network', 'xgboost'
  version: varchar("version", { length: 20 }).notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 4 }),
  precision: decimal("precision", { precision: 5, scale: 4 }),
  recall: decimal("recall", { precision: 5, scale: 4 }),
  f1Score: decimal("f1_score", { precision: 5, scale: 4 }),
  modelData: jsonb("model_data"), // JSON model parameters/weights
  isActive: boolean("is_active").default(false),
  trainedAt: timestamp("trained_at"),
  deployedAt: timestamp("deployed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Network Analysis table
export const networkAnalysis = pgTable("network_analysis", {
  id: serial("id").primaryKey(),
  networkId: varchar("network_id", { length: 50 }).notNull().unique(),
  networkType: text("network_type").notNull(), // 'provider_ring', 'member_cluster', 'billing_network'
  entities: jsonb("entities"), // JSON list of entities in the network
  connections: jsonb("connections"), // JSON connection relationships
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  analysisDate: timestamp("analysis_date").defaultNow().notNull(),
  findings: jsonb("findings"), // JSON analysis results
  isActive: boolean("is_active").default(true),
});

// Behavioral Profiles table
export const behavioralProfiles = pgTable("behavioral_profiles", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'member', 'provider', 'diagnosis'
  entityId: integer("entity_id").notNull(),
  profileData: jsonb("profile_data"), // JSON behavioral patterns
  baselineMetrics: jsonb("baseline_metrics"), // JSON normal behavior metrics
  anomalies: jsonb("anomalies"), // JSON detected anomalies
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
});

// Fraud Prevention Rules table
export const fraudPreventionRules = pgTable("fraud_prevention_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  ruleCategory: text("rule_category").notNull(), // 'prevention', 'detection', 'response'
  conditions: jsonb("conditions"), // JSON rule conditions
  actions: jsonb("actions"), // JSON preventive actions
  effectiveness: decimal("effectiveness", { precision: 5, scale: 4 }),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertFraudAlertSchema = createInsertSchema(fraudAlerts);
export const insertFraudRuleSchema = createInsertSchema(fraudRules);
export const insertFraudInvestigationSchema = createInsertSchema(fraudInvestigations);
export const insertFraudPatternSchema = createInsertSchema(fraudPatterns);
export const insertRiskScoreSchema = createInsertSchema(riskScores);
export const insertFraudAnalyticsSchema = createInsertSchema(fraudAnalytics);
export const insertMlModelSchema = createInsertSchema(mlModels);
export const insertNetworkAnalysisSchema = createInsertSchema(networkAnalysis);
export const insertBehavioralProfileSchema = createInsertSchema(behavioralProfiles);
export const insertFraudPreventionRuleSchema = createInsertSchema(fraudPreventionRules);

// Types
export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type FraudRule = typeof fraudRules.$inferSelect;
export type FraudInvestigation = typeof fraudInvestigations.$inferSelect;
export type FraudPattern = typeof fraudPatterns.$inferSelect;
export type RiskScore = typeof riskScores.$inferSelect;
export type FraudAnalytics = typeof fraudAnalytics.$inferSelect;
export type MlModel = typeof mlModels.$inferSelect;
export type NetworkAnalysis = typeof networkAnalysis.$inferSelect;
export type BehavioralProfile = typeof behavioralProfiles.$inferSelect;
export type FraudPreventionRule = typeof fraudPreventionRules.$inferSelect;

export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;
export type InsertFraudRule = z.infer<typeof insertFraudRuleSchema>;
export type InsertFraudInvestigation = z.infer<typeof insertFraudInvestigationSchema>;
export type InsertFraudPattern = z.infer<typeof insertFraudPatternSchema>;
export type InsertRiskScore = z.infer<typeof insertRiskScoreSchema>;
export type InsertFraudAnalytics = z.infer<typeof insertFraudAnalyticsSchema>;
export type InsertMlModel = z.infer<typeof insertMlModelSchema>;
export type InsertNetworkAnalysis = z.infer<typeof insertNetworkAnalysisSchema>;
export type InsertBehavioralProfile = z.infer<typeof insertBehavioralProfileSchema>;
export type InsertFraudPreventionRule = z.infer<typeof insertFraudPreventionRuleSchema>;
