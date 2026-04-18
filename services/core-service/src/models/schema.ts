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
  real
} from 'drizzle-orm/pg-core';

// Core System Tables
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  dataType: varchar('data_type', { length: 20 }).default('string'), // string, number, boolean, json
  lastModifiedBy: integer('last_modified_by'),
  lastModifiedAt: timestamp('last_modified_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  keyIdx: index('system_settings_key_idx').on(table.key),
  categoryIdx: index('system_settings_category_idx').on(table.category),
  isActiveIdx: index('system_settings_is_active_idx').on(table.isActive),
}));

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }),
  method: varchar('method', { length: 10 }).notNull(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  statusCode: integer('status_code').notNull(),
  responseStatus: varchar('response_status', { length: 20 }).notNull(),
  duration: integer('duration').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  notes: text('notes'),
  correlationId: varchar('correlation_id', { length: 100 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  resourceIdx: index('audit_logs_resource_idx').on(table.resource),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
  correlationIdIdx: index('audit_logs_correlation_id_idx').on(table.correlationId),
}));

export const systemMetrics = pgTable('system_metrics', {
  id: serial('id').primaryKey(),
  metricType: varchar('metric_type', { length: 100 }).notNull(),
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
  metricTypeIdx: index('system_metrics_metric_type_idx').on(table.metricType),
  periodIdx: index('system_metrics_period_idx').on(table.period),
  startDateIdx: index('system_metrics_start_date_idx').on(table.startDate),
  endDateIdx: index('system_metrics_end_date_idx').on(table.endDate),
}));

export const systemHealth = pgTable('system_health', {
  id: serial('id').primaryKey(),
  component: varchar('component', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // healthy, degraded, unhealthy
  message: text('message'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  componentIdx: index('system_health_component_idx').on(table.component),
  statusIdx: index('system_health_status_idx').on(table.status),
  timestampIdx: index('system_health_timestamp_idx').on(table.timestamp),
}));

export const scheduledTasks = pgTable('scheduled_tasks', {
  id: serial('id').primaryKey(),
  taskName: varchar('task_name', { length: 100 }).notNull(),
  taskType: varchar('task_type', { length: 50 }).notNull(), // cron, interval, one-time
  schedule: varchar('schedule', { length: 100 }).notNull(), // cron expression or interval
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, running, completed, failed
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at').notNull(),
  runCount: integer('run_count').default(0),
  maxRetries: integer('max_retries').default(3),
  retryCount: integer('retry_count').default(0),
  timeout: integer('timeout').default(300), // in seconds
  payload: jsonb('payload'),
  result: jsonb('result'),
  error: text('error'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  taskNameIdx: index('scheduled_tasks_task_name_idx').on(table.taskName),
  statusIdx: index('scheduled_tasks_status_idx').on(table.status),
  nextRunAtIdx: index('scheduled_tasks_next_run_at_idx').on(table.nextRunAt),
  taskTypeIdx: index('scheduled_tasks_task_type_idx').on(table.taskType),
}));

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // info, success, warning, error
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  action: varchar('action', { length: 100 }),
  actionParams: jsonb('action_params'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
  typeIdx: index('notifications_type_idx').on(table.type),
  priorityIdx: index('notifications_priority_idx').on(table.priority),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
}));

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  preferences: jsonb('preferences').notNull(), // User preference settings
  theme: varchar('theme', { length: 50 }).default('light'),
  language: varchar('language', { length: 10 }).default('en'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  notificationsEnabled: boolean('notifications_enabled').default(true),
  emailNotifications: boolean('email_notifications').default(true),
  smsNotifications: boolean('sms_notifications').default(false),
  pushNotifications: boolean('push_notifications').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_preferences_user_id_idx').on(table.userId),
  themeIdx: index('user_preferences_theme_idx').on(table.theme),
  languageIdx: index('user_preferences_language_idx').on(table.language),
}));

export const systemLogs = pgTable('system_logs', {
  id: serial('id').primaryKey(),
  level: varchar('level', { length: 20 }).notNull(), // debug, info, warn, error, fatal
  message: text('message').notNull(),
  context: jsonb('context'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  userId: integer('user_id'),
  correlationId: varchar('correlation_id', { length: 100 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  levelIdx: index('system_logs_level_idx').on(table.level),
  timestampIdx: index('system_logs_timestamp_idx').on(table.timestamp),
  userIdIdx: index('system_logs_user_id_idx').on(table.userId),
  correlationIdIdx: index('system_logs_correlation_id_idx').on(table.correlationId),
}));

// Export all tables
export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type NewSystemMetric = typeof systemMetrics.$inferInsert;
export type SystemHealth = typeof systemHealth.$inferSelect;
export type NewSystemHealth = typeof systemHealth.$inferInsert;
export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type NewScheduledTask = typeof scheduledTasks.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type SystemLog = typeof systemLogs.$inferSelect;
export type NewSystemLog = typeof systemLogs.$inferInsert;