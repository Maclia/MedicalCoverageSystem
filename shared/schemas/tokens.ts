import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for Tokens Service
export const tokenTypeEnum = pgEnum('token_type', ['access', 'refresh', 'api_key', 'session', 'verification', 'reset_password']);
export const tokenStatusEnum = pgEnum('token_status', ['active', 'expired', 'revoked', 'used']);
export const grantTypeEnum = pgEnum('grant_type', ['authorization_code', 'client_credentials', 'password', 'refresh_token', 'implicit']);
export const scopeEnum = pgEnum('scope', ['read', 'write', 'admin', 'member_read', 'member_write', 'claims_read', 'claims_write', 'finance_read', 'finance_write']);

// Access Tokens table
export const accessTokens = pgTable("access_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  tokenType: tokenTypeEnum("token_type").default("access"),
  userId: integer("user_id").notNull(), // Reference to core service
  clientId: text("client_id"),
  scopes: text("scopes"), // JSON array of scopes
  expiresAt: timestamp("expires_at").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  status: tokenStatusEnum("status").default("active"),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Refresh Tokens table
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  accessTokenId: integer("access_token_id").references(() => accessTokens.id),
  userId: integer("user_id").notNull(), // Reference to core service
  clientId: text("client_id"),
  scopes: text("scopes"), // JSON array of scopes
  expiresAt: timestamp("expires_at").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  status: tokenStatusEnum("status").default("active"),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// API Keys table
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull(), // Reference to core service
  scopes: text("scopes"), // JSON array of scopes
  rateLimit: integer("rate_limit"), // requests per hour
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  status: tokenStatusEnum("status").default("active"),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OAuth Clients table
export const oauthClients = pgTable("oauth_clients", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  redirectUris: text("redirect_uris"), // JSON array
  grantTypes: text("grant_types"), // JSON array
  scopes: text("scopes"), // JSON array
  isConfidential: boolean("is_confidential").default(true),
  userId: integer("user_id"), // Reference to core service - null for public clients
  status: tokenStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Authorization Codes table
export const authorizationCodes = pgTable("authorization_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  clientId: text("client_id").notNull(),
  userId: integer("user_id").notNull(), // Reference to core service
  redirectUri: text("redirect_uri"),
  scopes: text("scopes"), // JSON array
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  status: tokenStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Token Blacklist table
export const tokenBlacklist = pgTable("token_blacklist", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  tokenType: tokenTypeEnum("token_type").notNull(),
  reason: text("reason"),
  blacklistedAt: timestamp("blacklisted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Session Tokens table
export const sessionTokens = pgTable("session_tokens", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userId: integer("user_id").notNull(), // Reference to core service
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  status: tokenStatusEnum("status").default("active"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertAccessTokenSchema = createInsertSchema(accessTokens);
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens);
export const insertApiKeySchema = createInsertSchema(apiKeys);
export const insertOauthClientSchema = createInsertSchema(oauthClients);
export const insertAuthorizationCodeSchema = createInsertSchema(authorizationCodes);
export const insertTokenBlacklistSchema = createInsertSchema(tokenBlacklist);
export const insertSessionTokenSchema = createInsertSchema(sessionTokens);

// Types
export type AccessToken = typeof accessTokens.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type OauthClient = typeof oauthClients.$inferSelect;
export type AuthorizationCode = typeof authorizationCodes.$inferSelect;
export type TokenBlacklist = typeof tokenBlacklist.$inferSelect;
export type SessionToken = typeof sessionTokens.$inferSelect;

export type InsertAccessToken = z.infer<typeof insertAccessTokenSchema>;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type InsertOauthClient = z.infer<typeof insertOauthClientSchema>;
export type InsertAuthorizationCode = z.infer<typeof insertAuthorizationCodeSchema>;
export type InsertTokenBlacklist = z.infer<typeof insertTokenBlacklistSchema>;
export type InsertSessionToken = z.infer<typeof insertSessionTokenSchema>;
