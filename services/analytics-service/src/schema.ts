import { pgTable, serial, varchar, integer, decimal, timestamp, json, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================================================
// ANALYTICS SERVICE SCHEMA
// ============================================================================

// Metric event types
export const metricEventTypeEnum = pgEnum('metric_event_type', [
  'claim_created',
  'claim_approved',
  'claim_rejected',
  'payment_processed',
  'payment_failed',
  'saga_started',
  'saga_completed',
  'saga_failed',
  'recovery_initiated',
  'recovery_success',
  'recovery_failed',
]);

// Service health status
export const serviceHealthStatusEnum = pgEnum('service_health_status', [
  'healthy',
  'degraded',
  'unhealthy',
  'unknown',
]);

// ============================================================================
// EVENTS TABLE - Real-time event tracking
// ============================================================================

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  eventType: metricEventTypeEnum('event_type').notNull(),
  correlationId: varchar('correlation_id', { length: 36 }),
  sagaId: varchar('saga_id', { length: 36 }),
  claimId: varchar('claim_id', { length: 36 }),
  memberId: varchar('member_id', { length: 36 }),
  providerId: varchar('provider_id', { length: 36 }),
  companyId: varchar('company_id', { length: 36 }),
  status: varchar('status', { length: 50 }), // SUCCESS, FAILURE, PENDING
  statusCode: integer('status_code'),
  duration: integer('duration'), // milliseconds
  metadata: json('metadata'), // Additional event-specific data
  errorMessage: varchar('error_message', { length: 500 }),
  errorStack: json('error_stack'),
  source: varchar('source', { length: 100 }), // Service that emitted event
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table: any) => ({
  eventTypeIdx: index('events_type_idx').on(table.eventType),
  correlationIdx: index('events_correlation_idx').on(table.correlationId),
  sagaIdx: index('events_saga_idx').on(table.sagaId),
  claimIdx: index('events_claim_idx').on(table.claimId),
  timestampIdx: index('events_timestamp_idx').on(table.timestamp),
  statusIdx: index('events_status_idx').on(table.status),
}));

// ============================================================================
// HOURLY AGGREGATES - Pre-computed hourly metrics
// ============================================================================

export const hourlyAggregates = pgTable('hourly_aggregates', {
  id: serial('id').primaryKey(),
  hour: timestamp('hour').notNull(), // Start of hour (YYYY-MM-DD HH:00:00)
  metricType: varchar('metric_type', { length: 50 }).notNull(), // 'claims', 'payments', 'sagas', etc.
  totalCount: integer('total_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  averageDuration: decimal('average_duration', { precision: 10, scale: 2 }),
  minDuration: integer('min_duration'),
  maxDuration: integer('max_duration'),
  totalValue: decimal('total_value', { precision: 15, scale: 2 }),
  metadata: json('metadata'),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table: any) => ({
  hourMetricIdx: uniqueIndex('hourly_aggregates_hour_metric_idx').on(table.hour, table.metricType),
  hourIdx: index('hourly_aggregates_hour_idx').on(table.hour),
  metricIdx: index('hourly_aggregates_metric_idx').on(table.metricType),
}));

// ============================================================================
// DAILY AGGREGATES - Pre-computed daily metrics
// ============================================================================

export const dailyAggregates = pgTable('daily_aggregates', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD format
  metricType: varchar('metric_type', { length: 50 }).notNull(),
  totalCount: integer('total_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  averageDuration: decimal('average_duration', { precision: 10, scale: 2 }),
  minDuration: integer('min_duration'),
  maxDuration: integer('max_duration'),
  totalValue: decimal('total_value', { precision: 15, scale: 2 }),
  peakHour: integer('peak_hour'), // Hour with most events (0-23)
  successRate: decimal('success_rate', { precision: 5, scale: 2 }), // Percentage
  p50Duration: integer('p50_duration'), // Median duration
  p95Duration: integer('p95_duration'),
  p99Duration: integer('p99_duration'),
  metadata: json('metadata'),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table: any) => ({
  dateMetricIdx: uniqueIndex('daily_aggregates_date_metric_idx').on(table.date, table.metricType),
  dateIdx: index('daily_aggregates_date_idx').on(table.date),
  metricIdx: index('daily_aggregates_metric_idx').on(table.metricType),
}));

// ============================================================================
// SERVICE HEALTH - Service status and availability
// ============================================================================

export const serviceHealth = pgTable('service_health', {
  id: serial('id').primaryKey(),
  serviceName: varchar('service_name', { length: 100 }).notNull(), // 'claims-service', 'payment-service', etc.
  status: serviceHealthStatusEnum('status').notNull(),
  availabilityPercent: decimal('availability_percent', { precision: 5, scale: 2 }),
  avgResponseTime: decimal('avg_response_time', { precision: 10, scale: 2 }), // milliseconds
  errorRate: decimal('error_rate', { precision: 5, scale: 2 }), // Percentage
  uptime: integer('uptime'), // seconds
  downtime: integer('downtime'), // seconds
  lastHealthCheck: timestamp('last_health_check'),
  lastErrorTime: timestamp('last_error_time'),
  lastErrorMessage: varchar('last_error_message', { length: 500 }),
  metadata: json('metadata'),
  checkInterval: integer('check_interval'), // seconds between checks
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table: any) => ({
  serviceIdx: uniqueIndex('service_health_service_idx').on(table.serviceName),
  statusIdx: index('service_health_status_idx').on(table.status),
}));

// ============================================================================
// SERVICE METRICS - Real-time service performance
// ============================================================================

export const serviceMetrics = pgTable('service_metrics', {
  id: serial('id').primaryKey(),
  serviceName: varchar('service_name', { length: 100 }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  cpuPercent: decimal('cpu_percent', { precision: 5, scale: 2 }),
  memoryPercent: decimal('memory_percent', { precision: 5, scale: 2 }),
  memoryMb: decimal('memory_mb', { precision: 10, scale: 2 }),
  activeConnections: integer('active_connections'),
  requestsPerSecond: decimal('requests_per_second', { precision: 10, scale: 2 }),
  avgResponseTime: decimal('avg_response_time', { precision: 10, scale: 2 }),
  p95ResponseTime: decimal('p95_response_time', { precision: 10, scale: 2 }),
  p99ResponseTime: decimal('p99_response_time', { precision: 10, scale: 2 }),
  errorRate: decimal('error_rate', { precision: 5, scale: 2 }),
  queueDepth: integer('queue_depth'),
  databaseConnections: integer('database_connections'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table: any) => ({
  serviceTimestampIdx: index('service_metrics_service_timestamp_idx').on(table.serviceName, table.timestamp),
  serviceIdx: index('service_metrics_service_idx').on(table.serviceName),
  timestampIdx: index('service_metrics_timestamp_idx').on(table.timestamp),
}));

// ============================================================================
// BUSINESS METRICS - KPIs and business indicators
// ============================================================================

export const businessMetrics = pgTable('business_metrics', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  claimsCreated: integer('claims_created').notNull().default(0),
  claimsApproved: integer('claims_approved').notNull().default(0),
  claimsRejected: integer('claims_rejected').notNull().default(0),
  claimsApprovalRate: decimal('claims_approval_rate', { precision: 5, scale: 2 }),
  paymentsProcessed: integer('payments_processed').notNull().default(0),
  paymentsFailed: integer('payments_failed').notNull().default(0),
  paymentSuccessRate: decimal('payment_success_rate', { precision: 5, scale: 2 }),
  totalClaimValue: decimal('total_claim_value', { precision: 15, scale: 2 }),
  totalPaymentValue: decimal('total_payment_value', { precision: 15, scale: 2 }),
  averageClaimValue: decimal('average_claim_value', { precision: 15, scale: 2 }),
  averagePaymentValue: decimal('average_payment_value', { precision: 15, scale: 2 }),
  membersActive: integer('members_active'),
  newMembersAdded: integer('new_members_added'),
  providersActive: integer('providers_active'),
  avgClaimProcessingTime: decimal('avg_claim_processing_time', { precision: 10, scale: 2 }), // hours
  avgPaymentProcessingTime: decimal('avg_payment_processing_time', { precision: 10, scale: 2 }), // hours
  fraudDetectionRate: decimal('fraud_detection_rate', { precision: 5, scale: 2 }),
  recoveryAttempts: integer('recovery_attempts').notNull().default(0),
  recoverySuccessRate: decimal('recovery_success_rate', { precision: 5, scale: 2 }),
  metadata: json('metadata'),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table: any) => ({
  dateIdx: uniqueIndex('business_metrics_date_idx').on(table.date),
}));

// ============================================================================
// ANOMALY DETECTION - Detected anomalies and outliers
// ============================================================================

export const anomalies = pgTable('anomalies', {
  id: serial('id').primaryKey(),
  anomalyType: varchar('anomaly_type', { length: 50 }).notNull(), // 'spike', 'drop', 'error_rate', 'fraud', etc.
  severity: varchar('severity', { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  serviceName: varchar('service_name', { length: 100 }),
  metricName: varchar('metric_name', { length: 100 }),
  expectedValue: decimal('expected_value', { precision: 15, scale: 2 }),
  actualValue: decimal('actual_value', { precision: 15, scale: 2 }),
  deviationPercent: decimal('deviation_percent', { precision: 10, scale: 2 }),
  description: varchar('description', { length: 500 }),
  affectedCount: integer('affected_count'), // Number of records affected
  recommendedAction: varchar('recommended_action', { length: 500 }),
  acknowledged: boolean('acknowledged').default(false),
  resolvedAt: timestamp('resolved_at'),
  detectedAt: timestamp('detected_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table: any) => ({
  anomalyTypeIdx: index('anomalies_type_idx').on(table.anomalyType),
  severityIdx: index('anomalies_severity_idx').on(table.severity),
  serviceIdx: index('anomalies_service_idx').on(table.serviceName),
  detectedAtIdx: index('anomalies_detected_idx').on(table.detectedAt),
  acknowledgedIdx: index('anomalies_acknowledged_idx').on(table.acknowledged),
}));

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertHourlyAggregateSchema = createInsertSchema(hourlyAggregates).omit({
  id: true,
  calculatedAt: true,
  updatedAt: true,
});

export const insertDailyAggregateSchema = createInsertSchema(dailyAggregates).omit({
  id: true,
  calculatedAt: true,
  updatedAt: true,
});

export const insertServiceHealthSchema = createInsertSchema(serviceHealth).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceMetricsSchema = createInsertSchema(serviceMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessMetricsSchema = createInsertSchema(businessMetrics).omit({
  id: true,
  calculatedAt: true,
  updatedAt: true,
});

export const insertAnomalySchema = createInsertSchema(anomalies).omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// Type Exports
// ============================================================================

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type HourlyAggregate = typeof hourlyAggregates.$inferSelect;
export type InsertHourlyAggregate = z.infer<typeof insertHourlyAggregateSchema>;

export type DailyAggregate = typeof dailyAggregates.$inferSelect;
export type InsertDailyAggregate = z.infer<typeof insertDailyAggregateSchema>;

export type ServiceHealth = typeof serviceHealth.$inferSelect;
export type InsertServiceHealth = z.infer<typeof insertServiceHealthSchema>;

export type ServiceMetrics = typeof serviceMetrics.$inferSelect;
export type InsertServiceMetrics = z.infer<typeof insertServiceMetricsSchema>;

export type BusinessMetrics = typeof businessMetrics.$inferSelect;
export type InsertBusinessMetrics = z.infer<typeof insertBusinessMetricsSchema>;

export type Anomaly = typeof anomalies.$inferSelect;
export type InsertAnomaly = z.infer<typeof insertAnomalySchema>;
