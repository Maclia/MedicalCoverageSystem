import { pgTable, text, serial, integer, boolean, date, timestamp, pgEnum, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
// Enums for Schemes Service
export const schemeTypeEnum = pgEnum('scheme_type', ['health_insurance', 'dental', 'vision', 'life', 'disability', 'accident']);
export const coverageLevelEnum = pgEnum('coverage_level', ['basic', 'standard', 'premium', 'gold', 'platinum']);
export const schemeStatusEnum = pgEnum('scheme_status', ['draft', 'active', 'inactive', 'deprecated', 'under_review']);
export const benefitTypeEnum = pgEnum('benefit_type', ['medical', 'dental', 'vision', 'pharmacy', 'hospitalization', 'outpatient', 'preventive', 'emergency', 'maternity']);
export const limitTypeEnum = pgEnum('limit_type', ['per_visit', 'per_day', 'per_year', 'lifetime', 'unlimited']);
export const waitingPeriodTypeEnum = pgEnum('waiting_period_type', ['immediate', 'days', 'months', 'years', 'age_based']);
// Insurance Schemes table
export const insuranceSchemes = pgTable("insurance_schemes", {
    id: serial("id").primaryKey(),
    schemeCode: varchar("scheme_code", { length: 20 }).notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    type: schemeTypeEnum("type").notNull(),
    schemeType: text("scheme_type"), // 'Funded', 'Insured'
    coverageLevel: coverageLevelEnum("coverage_level").notNull(),
    coverageType: text("coverage_type"),
    status: schemeStatusEnum("status").default("draft"),
    effectiveDate: date("effective_date").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    expiryDate: date("expiry_date"),
    minimumAge: integer("minimum_age"),
    maximumAge: integer("maximum_age"),
    isActive: boolean("is_active").default(true),
    premiumAmount: decimal("premium_amount", { precision: 10, scale: 2 }),
    premiumFrequency: text("premium_frequency"), // 'monthly', 'quarterly', 'yearly'
    deductible: decimal("deductible", { precision: 10, scale: 2 }),
    outOfPocketMax: decimal("out_of_pocket_max", { precision: 10, scale: 2 }),
    coinsurance: decimal("coinsurance", { precision: 5, scale: 2 }), // percentage
    copay: decimal("copay", { precision: 8, scale: 2 }),
    premiumBuffer: decimal("premium_buffer", { precision: 12, scale: 2 }),
    totalPremiumUtilized: decimal("total_premium_utilized", { precision: 12, scale: 2 }),
    totalPremiumAllocated: decimal("total_premium_allocated", { precision: 12, scale: 2 }),
    schemeAdministratorId: integer("scheme_administrator_id"), // Reference to core service user
    companyId: integer("company_id"), // Reference to company
    assignedAt: timestamp("assigned_at"),
    assignedBy: integer("assigned_by"),
    suspendedAt: timestamp("suspended_at"),
    suspendedBy: integer("suspended_by"),
    suspensionReason: text("suspension_reason"),
    activatedAt: timestamp("activated_at"),
    activatedBy: integer("activated_by"),
    approvedAt: timestamp("approved_at"),
    approvedBy: integer("approved_by"),
    allowedClaimTypes: text("allowed_claim_types"), // JSON array of allowed claim types
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// Scheme Benefits table
export const schemeBenefits = pgTable("scheme_benefits", {
    id: serial("id").primaryKey(),
    schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
    benefitId: integer("benefit_id"), // Reference to benefits catalog
    benefitType: benefitTypeEnum("benefit_type").notNull(),
    description: text("description"),
    coverageLimit: decimal("coverage_limit", { precision: 12, scale: 2 }),
    coveragePercentage: decimal("coverage_percentage", { precision: 5, scale: 2 }),
    limitAmount: decimal("limit_amount", { precision: 12, scale: 2 }),
    limitType: limitTypeEnum("limit_type").default("per_year"),
    waitingPeriod: integer("waiting_period"),
    waitingPeriodType: waitingPeriodTypeEnum("waiting_period_type").default("immediate"),
    copayment: decimal("copayment", { precision: 10, scale: 2 }),
    deductible: decimal("deductible", { precision: 10, scale: 2 }),
    annualLimit: decimal("annual_limit", { precision: 12, scale: 2 }),
    exclusions: text("exclusions"), // JSON array
    requirements: text("requirements"), // JSON array
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// Scheme Networks table
export const schemeNetworks = pgTable("scheme_networks", {
    id: serial("id").primaryKey(),
    schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
    networkId: integer("network_id").notNull(), // Reference to providers service
    tier: text("tier"), // 'in_network', 'out_of_network', 'preferred'
    discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
// Scheme Riders table
export const schemeRiders = pgTable("scheme_riders", {
    id: serial("id").primaryKey(),
    schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
    riderCode: varchar("rider_code", { length: 20 }).notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    additionalPremium: decimal("additional_premium", { precision: 8, scale: 2 }),
    coverageAmount: decimal("coverage_amount", { precision: 12, scale: 2 }),
    benefitType: benefitTypeEnum("benefit_type").notNull(),
    waitingPeriod: integer("waiting_period"),
    waitingPeriodType: waitingPeriodTypeEnum("waiting_period_type").default("immediate"),
    isOptional: boolean("is_optional").default(true),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
// Scheme Pricing table
export const schemePricing = pgTable("scheme_pricing", {
    id: serial("id").primaryKey(),
    schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
    ageGroup: text("age_group"), // '0-18', '19-25', '26-35', etc.
    gender: text("gender"), // 'male', 'female', 'unisex'
    region: text("region"),
    basePremium: decimal("base_premium", { precision: 10, scale: 2 }).notNull(),
    loadingPercentage: decimal("loading_percentage", { precision: 5, scale: 2 }), // for risk factors
    discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }), // for wellness programs
    effectiveDate: date("effective_date").notNull(),
    expiryDate: date("expiry_date"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
// Scheme Versions table
export const schemeVersions = pgTable("scheme_versions", {
    id: serial("id").primaryKey(),
    schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
    versionNumber: varchar("version_number", { length: 10 }).notNull(),
    changes: text("changes"), // JSON array of changes
    effectiveDate: date("effective_date").notNull(),
    createdBy: integer("created_by").notNull(), // Reference to core service
    approvedBy: integer("approved_by"), // Reference to core service
    approvalDate: timestamp("approval_date"),
    isActive: boolean("is_active").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
// Scheme Eligibility Rules table
export const schemeEligibilityRules = pgTable("scheme_eligibility_rules", {
    id: serial("id").primaryKey(),
    schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
    ruleType: text("rule_type").notNull(), // 'age', 'income', 'employment', 'residency'
    ruleCondition: text("rule_condition").notNull(), // JSON condition object
    ruleValue: text("rule_value"),
    isMandatory: boolean("is_mandatory").default(true),
    priority: integer("priority").default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
// Insert Schemas
export const insertInsuranceSchemeSchema = createInsertSchema(insuranceSchemes);
export const insertSchemeBenefitSchema = createInsertSchema(schemeBenefits);
export const insertSchemeNetworkSchema = createInsertSchema(schemeNetworks);
export const insertSchemeRiderSchema = createInsertSchema(schemeRiders);
export const insertSchemePricingSchema = createInsertSchema(schemePricing);
export const insertSchemeVersionSchema = createInsertSchema(schemeVersions);
export const insertSchemeEligibilityRuleSchema = createInsertSchema(schemeEligibilityRules);
