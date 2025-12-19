import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for Analytics Service
export const metricTypeEnum = pgEnum('metric_type', ['count', 'sum', 'average', 'percentage', 'rate', 'ratio']);
export const timeGranularityEnum = pgEnum('time_granularity', ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
export const reportTypeEnum = pgEnum('report_type', ['operational', 'financial', 'clinical', 'compliance', 'performance', 'trend']);
export const dashboardTypeEnum = pgEnum('dashboard_type', ['executive', 'operational', 'clinical', 'financial', 'compliance']);
export const alertTypeEnum = pgEnum('alert_type', ['threshold', 'anomaly', 'trend', 'compliance', 'performance']);
export const alertSeverityEnum = pgEnum('alert_severity', ['low', 'medium', 'high', 'critical']);

// Analytics Metrics table
export const analyticsMetrics = pgTable("analytics_metrics", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  metricType: metricTypeEnum("metric_type").notNull(),
  description: text("description"),
  unit: text("unit"), // 'count', 'percentage', 'currency', 'days', etc.
  category: text("category"), // 'claims', 'members', 'finance', 'providers'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Metric Data table
export const metricData = pgTable("metric_data", {
  id: serial("id").primaryKey(),
  metricId: integer("metric_id").references(() => analyticsMetrics.id).notNull(),
  date: date("date").notNull(),
  timeGranularity: timeGranularityEnum("time_granularity").default("daily"),
  value: decimal("value", { precision: 15, scale: 4 }),
  count: integer("count"),
  dimension1: text("dimension1"), // e.g., 'region', 'provider_type', 'claim_type'
  dimension2: text("dimension2"),
  dimension3: text("dimension3"),
  metadata: text("metadata"), // JSON additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reports table
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reportName: text("report_name").notNull(),
  reportType: reportTypeEnum("report_type").notNull(),
  description: text("description"),
  queryDefinition: text("query_definition"), // JSON query definition
  parameters: text("parameters"), // JSON parameter definitions
  schedule: text("schedule"), // cron expression or 'manual'
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(), // Reference to core service
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Report Executions table
export const reportExecutions = pgTable("report_executions", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id).notNull(),
  executionDate: timestamp("execution_date").defaultNow().notNull(),
  status: text("status"), // 'running', 'completed', 'failed'
  parameters: text("parameters"), // JSON execution parameters
  resultData: text("result_data"), // JSON result data
  executionTime: integer("execution_time"), // in milliseconds
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dashboards table
export const dashboards = pgTable("dashboards", {
  id: serial("id").primaryKey(),
  dashboardName: text("dashboard_name").notNull(),
  dashboardType: dashboardTypeEnum("dashboard_type").notNull(),
  description: text("description"),
  layout: text("layout"), // JSON layout definition
  filters: text("filters"), // JSON default filters
  isPublic: boolean("is_public").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(), // Reference to core service
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dashboard Widgets table
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").references(() => dashboards.id).notNull(),
  widgetType: text("widget_type").notNull(), // 'chart', 'table', 'metric', 'text'
  widgetName: text("widget_name").notNull(),
  position: text("position"), // JSON position data
  size: text("size"), // JSON size data
  configuration: text("configuration"), // JSON widget configuration
  metricIds: text("metric_ids"), // JSON array of metric IDs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Alerts table
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  alertName: text("alert_name").notNull(),
  alertType: alertTypeEnum("alert_type").notNull(),
  severity: alertSeverityEnum("alert_severity").default("medium"),
  description: text("description"),
  condition: text("condition"), // JSON condition definition
  metricId: integer("metric_id").references(() => analyticsMetrics.id),
  threshold: decimal("threshold", { precision: 10, scale: 2 }),
  comparison: text("comparison"), // 'gt', 'lt', 'eq', 'gte', 'lte'
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(), // Reference to core service
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Alert Instances table
export const alertInstances = pgTable("alert_instances", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => alerts.id).notNull(),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  message: text("message"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: integer("acknowledged_by"), // Reference to core service
  resolvedAt: timestamp("resolved_at"),
  status: text("status"), // 'active', 'acknowledged', 'resolved'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Data Quality Checks table
export const dataQualityChecks = pgTable("data_quality_checks", {
  id: serial("id").primaryKey(),
  checkName: text("check_name").notNull(),
  checkType: text("check_type").notNull(), // 'completeness', 'accuracy', 'consistency', 'timeliness'
  tableName: text("table_name"),
  columnName: text("column_name"),
  rule: text("rule"), // JSON rule definition
  threshold: decimal("threshold", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  lastRun: timestamp("last_run"),
  lastResult: text("last_result"), // JSON result data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Predictive Models table
export const predictiveModels = pgTable("predictive_models", {
  id: serial("id").primaryKey(),
  modelName: text("model_name").notNull(),
  modelType: text("model_type").notNull(), // 'regression', 'classification', 'clustering', 'forecasting'
  description: text("description"),
  algorithm: text("algorithm"),
  features: text("features"), // JSON feature definitions
  target: text("target"),
  accuracy: decimal("accuracy", { precision: 5, scale: 4 }),
  isActive: boolean("is_active").default(true),
  trainedAt: timestamp("trained_at"),
  createdBy: integer("created_by").notNull(), // Reference to core service
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics);
export const insertMetricDataSchema = createInsertSchema(metricData);
export const insertReportSchema = createInsertSchema(reports);
export const insertReportExecutionSchema = createInsertSchema(reportExecutions);
export const insertDashboardSchema = createInsertSchema(dashboards);
export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets);
export const insertAlertSchema = createInsertSchema(alerts);
export const insertAlertInstanceSchema = createInsertSchema(alertInstances);
export const insertDataQualityCheckSchema = createInsertSchema(dataQualityChecks);
export const insertPredictiveModelSchema = createInsertSchema(predictiveModels);

// Types
export type AnalyticsMetric = typeof analyticsMetrics.;
export type MetricData = typeof metricData.;
export type Report = typeof reports.;
export type ReportExecution = typeof reportExecutions.;
export type Dashboard = typeof dashboards.;
export type DashboardWidget = typeof dashboardWidgets.;
export type Alert = typeof alerts.;
export type AlertInstance = typeof alertInstances.;
export type DataQualityCheck = typeof dataQualityChecks.;
export type PredictiveModel = typeof predictiveModels.;

export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;
export type InsertMetricData = z.infer<typeof insertMetricDataSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type InsertReportExecution = z.infer<typeof insertReportExecutionSchema>;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;
export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type InsertAlertInstance = z.infer<typeof insertAlertInstanceSchema>;
export type InsertDataQualityCheck = z.infer<typeof insertDataQualityCheckSchema>;
export type InsertPredictiveModel = z.infer<typeof insertPredictiveModelSchema>;
