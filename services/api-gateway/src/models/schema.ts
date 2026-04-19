import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  date,
  unique,
  index,
  foreignKey,
  pgEnum,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'read',
  'update',
  'delete',
  'view'
]);

export const auditEntityTypeEnum = pgEnum('audit_entity_type', [
  'member',
  'company',
  'benefit',
  'claim',
  'document'
]);

export const requestMethodEnum = pgEnum('request_method', [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS'
]);

export const requestStatusEnum = pgEnum('request_status', [
  'success',
  'error',
  'timeout',
  'rate_limited',
  'unauthorized',
  'forbidden',
  'not_found',
  'internal_error'
]);

export const requestTypeEnum = pgEnum('request_type', [
  'api',
  'webhook',
  'internal',
  'external'
]);

export const rateLimitUnitEnum = pgEnum('rate_limit_unit', [
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'year'
]);

export const rateLimitTypeEnum = pgEnum('rate_limit_type', [
  'user',
  'api_key',
  'ip_address',
  'endpoint',
  'global'
]);

export const cacheStatusEnum = pgEnum('cache_status', [
  'hit',
  'miss',
  'expired',
  'invalidated'
]);

export const cacheTypeEnum = pgEnum('cache_type', [
  'memory',
  'redis',
  'database',
  'file'
]);

export const responseFormatEnum = pgEnum('response_format', [
  'json',
  'xml',
  'html',
  'text',
  'binary'
]);

export const authenticationMethodEnum = pgEnum('authentication_method', [
  'jwt',
  'api_key',
  'oauth2',
  'basic_auth',
  'saml',
  'ldap',
  'custom'
]);

export const authorizationMethodEnum = pgEnum('authorization_method', [
  'rbac',
  'abac',
  'jwt_claims',
  'api_key',
  'custom'
]);

export const corsStatusEnum = pgEnum('cors_status', [
  'allowed',
  'blocked',
  'preflight',
  'invalid'
]);

export const compressionStatusEnum = pgEnum('compression_status', [
  'enabled',
  'disabled',
  'partial'
]);

export const throttlingStatusEnum = pgEnum('throttling_status', [
  'active',
  'inactive',
  'paused',
  'expired'
]);

// Audit Log table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: varchar("user_email", { length: 255 }),
  entityType: auditEntityTypeEnum('entity_type').notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  action: auditActionEnum('action').notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  changes: jsonb("changes"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  requestUrl: text("request_url").notNull(),
  requestMethod: requestMethodEnum('request_method').notNull(),
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  responseStatus: integer("response_status"),
  responseTime: integer("response_time").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  userEmailIdx: index('audit_logs_user_email_idx').on(table.userEmail),
  entityTypeIdx: index('audit_logs_entity_type_idx').on(table.entityType),
  entityIdIdx: index('audit_logs_entity_id_idx').on(table.entityId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  requestUrlIdx: index('audit_logs_request_url_idx').on(table.requestUrl),
  requestMethodIdx: index('audit_logs_request_method_idx').on(table.requestMethod),
  responseStatusIdx: index('audit_logs_response_status_idx').on(table.responseStatus),
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
}));

// API Request Log table
export const apiRequestLogs = pgTable("api_request_logs", {
  id: serial("id").primaryKey(),
  requestId: varchar("request_id", { length: 100 }).notNull().unique(),
  userId: integer("user_id"),
  userEmail: varchar("user_email", { length: 255 }),
  apiKeyId: integer("api_key_id"),
  apiKey: varchar("api_key", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  requestUrl: text("request_url").notNull(),
  requestMethod: requestMethodEnum('request_method').notNull(),
  requestData: jsonb("request_data"),
  requestHeaders: jsonb("request_headers"),
  requestParams: jsonb("request_params"),
  requestQuery: jsonb("request_query"),
  requestType: requestTypeEnum('request_type').notNull().default('api'),
  authenticationMethod: authenticationMethodEnum('authentication_method'),
  authorizationMethod: authorizationMethodEnum('authorization_method'),
  rateLimitType: rateLimitTypeEnum('rate_limit_type'),
  rateLimitUnit: rateLimitUnitEnum('rate_limit_unit'),
  rateLimitValue: integer("rate_limit_value"),
  rateLimitRemaining: integer("rate_limit_remaining"),
  rateLimitReset: timestamp("rate_limit_reset"),
  cacheStatus: cacheStatusEnum('cache_status'),
  cacheType: cacheTypeEnum('cache_type'),
  cacheKey: varchar("cache_key", { length: 255 }),
  cacheTtl: integer("cache_ttl"),
  responseStatus: integer("response_status"),
  responseTime: integer("response_time").notNull(),
  responseSize: integer("response_size"),
  responseFormat: responseFormatEnum('response_format'),
  responseData: jsonb("response_data"),
  responseHeaders: jsonb("response_headers"),
  corsStatus: corsStatusEnum('cors_status'),
  corsOrigin: varchar("cors_origin", { length: 255 }),
  corsHeaders: jsonb("cors_headers"),
  compressionStatus: compressionStatusEnum('compression_status'),
  compressionType: varchar("compression_type", { length: 50 }),
  throttlingStatus: throttlingStatusEnum('throttling_status'),
  throttlingReason: text("throttling_reason"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"),
}, (table) => ({
  requestIdIdx: index('api_request_logs_request_id_idx').on(table.requestId),
  userIdIdx: index('api_request_logs_user_id_idx').on(table.userId),
  userEmailIdx: index('api_request_logs_user_email_idx').on(table.userEmail),
  apiKeyIdIdx: index('api_request_logs_api_key_id_idx').on(table.apiKeyId),
  apiKeyIdx: index('api_request_logs_api_key_idx').on(table.apiKey),
  ipAddressIdx: index('api_request_logs_ip_address_idx').on(table.ipAddress),
  requestUrlIdx: index('api_request_logs_request_url_idx').on(table.requestUrl),
  requestMethodIdx: index('api_request_logs_request_method_idx').on(table.requestMethod),
  requestTypeIdx: index('api_request_logs_request_type_idx').on(table.requestType),
  responseStatusIdx: index('api_request_logs_response_status_idx').on(table.responseStatus),
  responseTimeIdx: index('api_request_logs_response_time_idx').on(table.responseTime),
  timestampIdx: index('api_request_logs_timestamp_idx').on(table.timestamp),
}));

// API Rate Limit table
export const apiRateLimits = pgTable("api_rate_limits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: varchar("user_email", { length: 255 }),
  apiKeyId: integer("api_key_id"),
  apiKey: varchar("api_key", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  rateLimitType: rateLimitTypeEnum('rate_limit_type').notNull(),
  rateLimitUnit: rateLimitUnitEnum('rate_limit_unit').notNull(),
  rateLimitValue: integer("rate_limit_value").notNull(),
  rateLimitRemaining: integer("rate_limit_remaining").notNull(),
  rateLimitReset: timestamp("rate_limit_reset").notNull(),
  rateLimitWindowStart: timestamp("rate_limit_window_start").notNull(),
  rateLimitWindowEnd: timestamp("rate_limit_window_end").notNull(),
  currentUsage: integer("current_usage").default(0),
  maxUsage: integer("max_usage").default(0),
  isBlocked: boolean("is_blocked").default(false),
  blockReason: text("block_reason"),
  blockExpiresAt: timestamp("block_expires_at"),
  lastRequestAt: timestamp("last_request_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('api_rate_limits_user_id_idx').on(table.userId),
  userEmailIdx: index('api_rate_limits_user_email_idx').on(table.userEmail),
  apiKeyIdIdx: index('api_rate_limits_api_key_id_idx').on(table.apiKeyId),
  apiKeyIdx: index('api_rate_limits_api_key_idx').on(table.apiKey),
  ipAddressIdx: index('api_rate_limits_ip_address_idx').on(table.ipAddress),
  endpointIdx: index('api_rate_limits_endpoint_idx').on(table.endpoint),
  rateLimitTypeIdx: index('api_rate_limits_rate_limit_type_idx').on(table.rateLimitType),
  rateLimitUnitIdx: index('api_rate_limits_rate_limit_unit_idx').on(table.rateLimitUnit),
  rateLimitResetIdx: index('api_rate_limits_rate_limit_reset_idx').on(table.rateLimitReset),
  isBlockedIdx: index('api_rate_limits_is_blocked_idx').on(table.isBlocked),
  createdAtIdx: index('api_rate_limits_created_at_idx').on(table.createdAt),
  updatedAtIdx: index('api_rate_limits_updated_at_idx').on(table.updatedAt),
}));

// API Cache table
export const apiCache = pgTable("api_cache", {
  id: serial("id").primaryKey(),
  cacheKey: varchar("cache_key", { length: 255 }).notNull().unique(),
  cacheType: cacheTypeEnum('cache_type').notNull(),
  cacheData: jsonb("cache_data").notNull(),
  cacheTtl: integer("cache_ttl").notNull(),
  cacheExpiresAt: timestamp("cache_expires_at").notNull(),
  cacheHits: integer("cache_hits").default(0),
  lastHitAt: timestamp("last_hit_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  cacheKeyIdx: index('api_cache_cache_key_idx').on(table.cacheKey),
  cacheTypeIdx: index('api_cache_cache_type_idx').on(table.cacheType),
  cacheExpiresAtIdx: index('api_cache_cache_expires_at_idx').on(table.cacheExpiresAt),
  cacheHitsIdx: index('api_cache_cache_hits_idx').on(table.cacheHits),
  createdAtIdx: index('api_cache_created_at_idx').on(table.createdAt),
  updatedAtIdx: index('api_cache_updated_at_idx').on(table.updatedAt),
}));

// API Configuration table
export const apiConfiguration = pgTable("api_configuration", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key", { length: 255 }).notNull().unique(),
  configValue: text("config_value").notNull(),
  configType: varchar("config_type", { length: 50 }).notNull(),
  description: text("description"),
  isEncrypted: boolean("is_encrypted").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  configKeyIdx: index('api_configuration_config_key_idx').on(table.configKey),
  configTypeIdx: index('api_configuration_config_type_idx').on(table.configType),
  isActiveIdx: index('api_configuration_is_active_idx').on(table.isActive),
  createdAtIdx: index('api_configuration_created_at_idx').on(table.createdAt),
  updatedAtIdx: index('api_configuration_updated_at_idx').on(table.updatedAt),
}));

// Export all tables
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type ApiRequestLog = typeof apiRequestLogs.$inferSelect;
export type NewApiRequestLog = typeof apiRequestLogs.$inferInsert;
export type ApiRateLimit = typeof apiRateLimits.$inferSelect;
export type NewApiRateLimit = typeof apiRateLimits.$inferInsert;
export type ApiCache = typeof apiCache.$inferSelect;
export type NewApiCache = typeof apiCache.$inferInsert;
export type ApiConfiguration = typeof apiConfiguration.$inferSelect;
export type NewApiConfiguration = typeof apiConfiguration.$inferInsert;