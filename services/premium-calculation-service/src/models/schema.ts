import { pgTable, uuid, varchar, date, timestamp, integer, numeric, boolean, text } from 'drizzle-orm/pg-core';

// =============================================
// PRICING SERVICE DATABASE SCHEMA
// 100% Modular, Versioned, Rules-Based Design
// =============================================

// ------------------------------
// 2.1 Rate Table Versions
// All rates are versioned for historical tracking and future pricing
export const rateTableVersions = pgTable('rate_table_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // DRAFT, ACTIVE, EXPIRED, ARCHIVED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by')
});

// ------------------------------
// 2.2 Base Premium (Age-Based)
export const basePremiumRates = pgTable('base_premium_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  minAge: integer('min_age').notNull(),
  maxAge: integer('max_age').notNull(),
  baseAmount: numeric('base_amount', { precision: 12, scale: 2 }).notNull()
});

// ------------------------------
// 2.3 Cover Limit Factors
export const coverLimitFactors = pgTable('cover_limit_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  coverType: varchar('cover_type', { length: 50 }).notNull(), // INPATIENT, OUTPATIENT, MATERNITY, DENTAL, OPTICAL
  minLimit: numeric('min_limit', { precision: 12, scale: 2 }).notNull(),
  maxLimit: numeric('max_limit', { precision: 12, scale: 2 }).notNull(),
  factor: numeric('factor', { precision: 6, scale: 3 }).notNull() // multiplier 1.000 = 0%, 1.150 = +15%
});

// ------------------------------
// 2.4 Outpatient Add-ons
export const outpatientAddons = pgTable('outpatient_addons', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  opLimit: numeric('op_limit', { precision: 12, scale: 2 }).notNull(),
  premiumAddon: numeric('premium_addon', { precision: 12, scale: 2 }).notNull()
});

// ------------------------------
// 2.5 Family Size Factors
export const familySizeFactors = pgTable('family_size_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  minMembers: integer('min_members').notNull(),
  maxMembers: integer('max_members').notNull(),
  factor: numeric('factor', { precision: 6, scale: 3 }).notNull()
});

// ------------------------------
// 2.6 Region / Provider Factors
export const regionFactors = pgTable('region_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  regionCode: varchar('region_code', { length: 50 }).notNull(), // NAIROBI_TOP, URBAN, RURAL, INTERNATIONAL
  factor: numeric('factor', { precision: 6, scale: 3 }).notNull()
});

// ------------------------------
// 2.7 Medical Risk Factors
export const medicalRiskFactors = pgTable('medical_risk_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  riskCode: varchar('risk_code', { length: 50 }).notNull(), // NONE, STANDARD, CHRONIC, HIGH_RISK, EXCLUSION
  factor: numeric('factor', { precision: 6, scale: 3 }).notNull()
});

// ------------------------------
// 2.8 Gender Factors
export const genderFactors = pgTable('gender_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  gender: varchar('gender', { length: 10 }).notNull(), // MALE, FEMALE, UNISEX
  factor: numeric('factor', { precision: 6, scale: 3 }).notNull()
});

// ------------------------------
// 2.9 Lifestyle Factors
export const lifestyleFactors = pgTable('lifestyle_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  lifestyleCode: varchar('lifestyle_code', { length: 50 }).notNull(), // NON_SMOKER, SMOKER, OCCUPATION_CLASS
  factor: numeric('factor', { precision: 6, scale: 3 }).notNull()
});

// ------------------------------
// 3.1 Rule Definitions
// Rules Engine Orchestration Layer
export const ratingRules = pgTable('rating_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  ruleName: varchar('rule_name', { length: 100 }).notNull(),
  ruleType: varchar('rule_type', { length: 50 }).notNull(), // MULTIPLIER, ADDITION, FIXED_AMOUNT, DISCOUNT
  executionOrder: integer('execution_order').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  description: text('description')
});

// ------------------------------
// 3.2 Rule Conditions (Dynamic Filtering)
export const ratingRuleConditions = pgTable('rating_rule_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').references(() => ratingRules.id).notNull(),
  fieldName: varchar('field_name', { length: 50 }).notNull(), // age, region, cover_limit, scheme_id, family_size
  operator: varchar('operator', { length: 10 }).notNull(), // =, >, <, >=, <=, BETWEEN, IN, NOT_NULL
  value: text('value').notNull()
});

// ------------------------------
// 3.3 Rule Actions
export const ratingRuleActions = pgTable('rating_rule_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').references(() => ratingRules.id).notNull(),
  actionType: varchar('action_type', { length: 50 }).notNull(), // APPLY_FACTOR, ADD_AMOUNT, SET_VALUE, APPLY_DISCOUNT
  sourceTable: varchar('source_table', { length: 50 }), // base_premium_rates, region_factors, etc.
  lookupKey: varchar('lookup_key', { length: 50 }), // field to match lookup on
  fixedValue: numeric('fixed_value', { precision: 12, scale: 4 }),
  formulaExpression: text('formula_expression') // for advanced formula logic
});

// ------------------------------
// Actuarial Components & Loadings
// Implements real insurance pricing components
export const actuarialComponents = pgTable('actuarial_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  componentType: varchar('component_type', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
  isMandatory: boolean('is_mandatory').default(true),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to')
});

// ------------------------------
// Medical Trend & Inflation Factors
export const medicalTrendFactors = pgTable('medical_trend_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull(),
  trendFactor: numeric('trend_factor', { precision: 5, scale: 4 }).notNull(), // e.g. 1.12 = 12% annual increase
  description: text('description')
});

// ------------------------------
// Claim Experience Loading
export const experienceLoadingSchemes = pgTable('experience_loading_schemes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schemeId: uuid('scheme_id').notNull(),
  lossRatio: numeric('loss_ratio', { precision: 5, scale: 2 }).notNull(), // actual / expected claims
  adjustmentFactor: numeric('adjustment_factor', { precision: 6, scale: 3 }).notNull(),
  minimumFactor: numeric('minimum_factor', { precision: 6, scale: 3 }).default('0.700'),
  maximumFactor: numeric('maximum_factor', { precision: 6, scale: 3 }).default('1.500'),
  effectivePeriod: varchar('effective_period', { length: 20 }).notNull()
});

// ------------------------------
// Benefit Specific Pricing
export const benefitPricing = pgTable('benefit_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  benefitCode: varchar('benefit_code', { length: 50 }).notNull(), // INPATIENT, MATERNITY, DENTAL, OPTICAL, MENTAL_HEALTH
  minLimit: numeric('min_limit', { precision: 12, scale: 2 }),
  maxLimit: numeric('max_limit', { precision: 12, scale: 2 }),
  baseRate: numeric('base_rate', { precision: 12, scale: 2 }).notNull(),
  factor: numeric('factor', { precision: 6, scale: 3 }).default('1.000')
});

// ------------------------------
// 6.1 Scheme Overrides (Corporate Clients)
export const schemeOverrides = pgTable('scheme_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  schemeId: uuid('scheme_id').notNull(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id),
  factorType: varchar('factor_type', { length: 50 }).notNull(),
  overrideValue: numeric('override_value', { precision: 6, scale: 3 }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to')
});

// ------------------------------
// 6.2 Claims Experience Loading
export const experienceLoadings = pgTable('experience_loadings', {
  id: uuid('id').primaryKey().defaultRandom(),
  schemeId: uuid('scheme_id').notNull(),
  lossRatio: numeric('loss_ratio', { precision: 5, scale: 2 }).notNull(),
  adjustmentFactor: numeric('adjustment_factor', { precision: 6, scale: 3 }).notNull(),
  effectivePeriod: varchar('effective_period', { length: 20 }).notNull()
});

// ------------------------------
// Calculation Audit Log
export const premiumCalculationLogs = pgTable('premium_calculation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull(),
  rateTableId: uuid('rate_table_id').references(() => rateTableVersions.id).notNull(),
  inputParameters: text('input_parameters').notNull(), // JSON of all inputs
  calculationSteps: text('calculation_steps').notNull(), // JSON break down of each step
  finalPremium: numeric('final_premium', { precision: 12, scale: 2 }).notNull(),
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  calculatedBy: uuid('calculated_by')
});