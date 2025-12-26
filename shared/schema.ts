import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, uuid, varchar, decimal, json, sql } from "drizzle-orm/pg-core";
import { index } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const memberTypeEnum = pgEnum('member_type', ['principal', 'dependent']);
export const dependentTypeEnum = pgEnum('dependent_type', ['spouse', 'child', 'parent', 'guardian']);
export const periodStatusEnum = pgEnum('period_status', ['active', 'inactive', 'upcoming', 'expired']);
export const periodTypeEnum = pgEnum('period_type', ['short_term', 'long_term', 'standard']);
export const benefitCategoryEnum = pgEnum('benefit_category', ['medical', 'dental', 'vision', 'wellness', 'hospital', 'prescription', 'emergency', 'maternity', 'specialist', 'other']);
export const institutionTypeEnum = pgEnum('institution_type', ['hospital', 'clinic', 'laboratory', 'imaging', 'pharmacy', 'specialist', 'general']);
export const personnelTypeEnum = pgEnum('personnel_type', ['doctor', 'nurse', 'specialist', 'technician', 'pharmacist', 'therapist', 'other']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'suspended']);
export const claimStatusEnum = pgEnum('claim_status', ['submitted', 'under_review', 'approved', 'rejected', 'paid', 'fraud_review', 'fraud_confirmed']);
export const premiumRateTypeEnum = pgEnum('premium_rate_type', ['standard', 'age_banded', 'family_size']);

// Enhanced Premium Calculation Enums
export const pricingMethodologyEnum = pgEnum('pricing_methodology', ['community_rated', 'experience_rated', 'adjusted_community_rated', 'benefit_rated']);
export const riskAdjustmentTierEnum = pgEnum('risk_adjustment_tier', ['low_risk', 'average_risk', 'moderate_risk', 'high_risk', 'very_high_risk']);
export const inflationCategoryEnum = pgEnum('inflation_category', ['medical_trend', 'utilization_trend', 'cost_shifting', 'technology_advancement', 'regulatory_impact']);

// Provider Network Management Enums
export const networkTierEnum = pgEnum('network_tier', ['tier_1', 'tier_2', 'tier_3', 'premium', 'basic', 'standard']);
export const contractStatusEnum = pgEnum('contract_status', ['draft', 'active', 'expired', 'terminated', 'renewal_pending']);
export const tariffStatusEnum = pgEnum('tariff_status', ['active', 'inactive', 'pending', 'deprecated']);
export const reimbursementModelEnum = pgEnum('reimbursement_model', ['fee_for_service', 'capitation', 'drg', 'per_diem', 'package_deal']);

// Members & Clients Module Enhanced Enums
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);
export const maritalStatusEnum = pgEnum('marital_status', ['single', 'married', 'divorced', 'widowed']);
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'suspended', 'pending', 'terminated', 'expired']);
export const clientTypeEnum = pgEnum('client_type', ['individual', 'corporate', 'sme', 'government', 'education', 'association']);
export const billingFrequencyEnum = pgEnum('billing_frequency', ['monthly', 'quarterly', 'annual', 'pro_rata']);
export const lifeEventTypeEnum = pgEnum('life_event_type', ['enrollment', 'activation', 'suspension', 'upgrade', 'downgrade', 'renewal', 'transfer', 'termination', 'reinstatement', 'death']);
export const documentTypeEnum = pgEnum('document_type', ['national_id', 'passport', 'birth_certificate', 'marriage_certificate', 'employment_letter', 'medical_report', 'student_letter', 'government_id', 'proof_of_address', 'insurance_card', 'dependent_document', 'other']);
export const communicationTypeEnum = pgEnum('communication_type', ['enrollment_confirmation', 'renewal_notification', 'card_generation', 'pre_auth_update', 'limit_reminder', 'payment_due', 'suspension_notice', 'termination_notice']);
export const communicationChannelEnum = pgEnum('communication_channel', ['sms', 'email', 'mobile_app', 'postal', 'provider_notification']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'sent', 'delivered', 'failed', 'bounced']);
export const consentTypeEnum = pgEnum('consent_type', ['data_processing', 'marketing_communications', 'data_sharing_providers', 'data_sharing_partners', 'wellness_programs']);
export const auditActionEnum = pgEnum('audit_action', ['create', 'read', 'update', 'delete', 'view']);
export const auditEntityTypeEnum = pgEnum('audit_entity_type', ['member', 'company', 'benefit', 'claim', 'document']);

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  contactPerson: text("contact_person").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  address: text("address").notNull(),
  // Enhanced fields for Members & Clients module
  clientType: clientTypeEnum("client_type").default("corporate"),
  billingFrequency: billingFrequencyEnum("billing_frequency").default("monthly"),
  employerContributionPercentage: real("employer_contribution_percentage"),
  experienceRatingEnabled: boolean("experience_rating_enabled").default(false),
  customBenefitStructure: boolean("custom_benefit_structure").default(false),
  gradeBasedBenefits: boolean("grade_based_benefits").default(false),
  isActive: boolean("is_active").default(true),
  registrationExpiryDate: date("registration_expiry_date"),
  // Original fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Members table
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  employeeId: text("employee_id").notNull(),
  memberType: memberTypeEnum("member_type").notNull(),
  principalId: integer("principal_id").references(() => members.id),
  dependentType: dependentTypeEnum("dependent_type"),
  hasDisability: boolean("has_disability").default(false),
  disabilityDetails: text("disability_details"),
  // Enhanced fields for Members & Clients module
  gender: genderEnum("gender"),
  maritalStatus: maritalStatusEnum("marital_status"),
  nationalId: text("national_id"),
  passportNumber: text("passport_number"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("Kenya"),
  membershipStatus: membershipStatusEnum("membership_status").default("pending"),
  enrollmentDate: date("enrollment_date"),
  terminationDate: date("termination_date"),
  renewalDate: date("renewal_date"),
  lastSuspensionDate: date("last_suspension_date"),
  suspensionReason: text("suspension_reason"),
  deathDate: date("death_date"),
  deathCertificateNumber: text("death_certificate_number"),
  beneficiaryName: text("beneficiary_name"),
  beneficiaryRelationship: text("beneficiary_relationship"),
  beneficiaryContact: text("beneficiary_contact"),
  // Original fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Periods table
export const periods = pgTable("periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: periodStatusEnum("status").notNull(),
  periodType: periodTypeEnum("period_type").default("standard").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Premium rates table
export const premiumRates = pgTable("premium_rates", {
  id: serial("id").primaryKey(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  rateType: premiumRateTypeEnum("rate_type").default("standard").notNull(),
  principalRate: real("principal_rate").notNull(),
  spouseRate: real("spouse_rate").notNull(),
  childRate: real("child_rate").notNull(),
  specialNeedsRate: real("special_needs_rate").notNull(),
  taxRate: real("tax_rate").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Age banded premium rates table
export const ageBandedRates = pgTable("age_banded_rates", {
  id: serial("id").primaryKey(),
  premiumRateId: integer("premium_rate_id").references(() => premiumRates.id).notNull(),
  minAge: integer("min_age").notNull(),
  maxAge: integer("max_age").notNull(),
  rate: real("rate").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Family premium rates table
export const familyRates = pgTable("family_rates", {
  id: serial("id").primaryKey(),
  premiumRateId: integer("premium_rate_id").references(() => premiumRates.id).notNull(),
  familySize: integer("family_size").notNull(), // 1 = M (Principal only), 2 = M+1, 3 = M+2, etc.
  description: text("description"), // e.g., "Principal + 1 Dependent", "Principal + 2 Dependents"
  rate: real("rate").notNull(),
  maxDependents: integer("max_dependents"), // Maximum number of dependents covered at this rate
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Premiums table
// Company Periods table (links companies to specific periods)
export const companyPeriods = pgTable("company_periods", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  isActive: boolean("is_active").default(true),
  adjustmentFactor: real("adjustment_factor").default(1.0), // Company-specific adjustment factor for premiums
  customStartDate: date("custom_start_date"), // Custom start date if different from period start
  customEndDate: date("custom_end_date"), // Custom end date if different from period end
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const premiums = pgTable("premiums", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  principalCount: integer("principal_count").notNull(),
  spouseCount: integer("spouse_count").notNull(),
  childCount: integer("child_count").notNull(),
  specialNeedsCount: integer("special_needs_count").notNull(),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").notNull(),
  total: real("total").notNull(),
  proRatedTotal: real("pro_rated_total"),
  effectiveStartDate: timestamp("effective_start_date"),
  effectiveEndDate: timestamp("effective_end_date"),
  adjustmentFactor: real("adjustment_factor").default(1.0),
  status: text("status").default('active').notNull(),
  issuedDate: timestamp("issued_date").notNull(),
  paidDate: timestamp("paid_date"),
  notes: text("notes"),
  previousPremiumId: integer("previous_premium_id"),
  isAdjustment: boolean("is_adjustment").default(false),
  proRataStartDate: timestamp("pro_rata_start_date"),
  proRataEndDate: timestamp("pro_rata_end_date"),
  proRataAmount: real("pro_rata_amount"),
  refundAmount: real("refund_amount"),
  refundDate: timestamp("refund_date"),
  refundReason: text("refund_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Benefits table (defined by insurance company)
export const benefits = pgTable("benefits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: benefitCategoryEnum("category").notNull(), 
  coverageDetails: text("coverage_details").notNull(),
  limitAmount: real("limit_amount"),
  hasWaitingPeriod: boolean("has_waiting_period").default(false),
  waitingPeriodDays: integer("waiting_period_days"),
  isStandard: boolean("is_standard").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Company Benefits table (chosen by companies)
export const companyBenefits = pgTable("company_benefits", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  benefitId: integer("benefit_id").references(() => benefits.id).notNull(),
  premiumId: integer("premium_id").references(() => premiums.id).notNull(),
  isActive: boolean("is_active").default(true),
  additionalCoverage: boolean("additional_coverage").default(false),
  additionalCoverageDetails: text("additional_coverage_details"),
  limitAmount: real("limit_amount"), // Custom limit amount per company
  limitClause: text("limit_clause"), // Limit clause text/description
  coverageRate: real("coverage_rate").default(100.0), // Coverage rate in percentage (e.g., 80% coverage)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
// // export const insertCompanySchema = createInsertSchema(companies).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertMemberSchema = createInsertSchema(members).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertPeriodSchema = createInsertSchema(periods).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertPremiumRateSchema = createInsertSchema(premiumRates).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertPremiumSchema = createInsertSchema(premiums).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertBenefitSchema = createInsertSchema(benefits).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertCompanyBenefitSchema = createInsertSchema(companyBenefits).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertCompanyPeriodSchema = createInsertSchema(companyPeriods).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertAgeBandedRateSchema = createInsertSchema(ageBandedRates).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertFamilyRateSchema = createInsertSchema(familyRates).omit({
//   id: true,
//   createdAt: true,
// });

// ===================
// CRM MODULE TABLES
// ===================

// Lead Management Tables
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Basic Information
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  companyName: varchar('company_name', { length: 255 }),
  // Lead Details
  leadSource: leadSourceEnum('lead_source').notNull().default('website'),
  leadStatus: leadStatusEnum('lead_status').notNull().default('new'),
  priority: leadPriorityEnum('priority').notNull().default('medium'),
  leadScore: integer('lead_score').default(0),
  // Classification
  memberType: memberTypeEnum('member_type'), // Use existing enum
  schemeInterest: text('scheme_interest'), // Reference to existing scheme types
  estimatedCoverage: integer('estimated_coverage'), // in currency units
  estimatedPremium: integer('estimated_premium'), // in currency units
  // Assignment and Tracking
  assignedAgentId: integer('assigned_agent_id').references(() => users.id),
  assignedTeamId: integer('assigned_team_id'),
  territoryId: integer('territory_id'),
  // Dates
  firstContactDate: timestamp('first_contact_date'),
  lastContactDate: timestamp('last_contact_date'),
  nextFollowUpDate: timestamp('next_follow_up_date'),
  conversionDate: timestamp('conversion_date'),
  // Lead scoring fields
  score: integer('score'), // Current lead score (0-100)
  scoreTier: varchar('score_tier', { length: 10 }), // hot, warm, cool, cold
  lastScored: timestamp('last_scored'), // When score was last calculated
  scoringModelId: varchar('scoring_model_id', { length: 100 }), // Which model was used
  // Additional lead qualification fields
  jobTitle: varchar('job_title', { length: 100 }),
  companyId: integer('company_id').references(() => companies.id),
  company: varchar('company', { length: 255 }), // For backwards compatibility
  budgetRange: varchar('budget_range', { length: 100 }),
  timeline: varchar('timeline', { length: 100 }),
  immediateNeed: boolean('immediate_need').default(false),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('active'), // For compatibility with lead scoring service
  // System fields
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
});

export const salesOpportunities = pgTable('sales_opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id).notNull(),
  opportunityName: varchar('opportunity_name', { length: 255 }).notNull(),
  stage: opportunityStageEnum('stage').notNull().default('lead'),
  // Financial details
  estimatedValue: integer('estimated_value'), // Annual premium estimate
  actualValue: integer('actual_value'), // Final premium when issued
  probability: integer('probability').default(0), // 0-100 percentage
  // Timeline
  expectedCloseDate: timestamp('expected_close_date'),
  actualCloseDate: timestamp('actual_close_date'),
  // Assignment
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  // System
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const salesActivities = pgTable('sales_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Relations
  leadId: uuid('lead_id').references(() => leads.id),
  opportunityId: uuid('opportunity_id').references(() => salesOpportunities.id),
  memberId: integer('member_id').references(() => members.id), // Link to existing members
  agentId: integer('agent_id').references(() => users.id).notNull(),
  // Activity details
  activityType: activityTypeEnum('activity_type').notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description'),
  // Outcomes
  outcome: varchar('outcome', { length: 100 }),
  nextStep: text('next_step'),
  nextFollowUpDate: timestamp('next_follow_up_date'),
  // System
  createdAt: timestamp('created_at').defaultNow(),
});

export const salesTeams = pgTable('sales_teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamName: varchar('team_name', { length: 100 }).notNull(),
  teamLeadId: integer('team_lead_id').references(() => users.id),
  managerId: integer('manager_id').references(() => users.id),
  department: varchar('department', { length: 100 }),
  territoryId: integer('territory_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const territories = pgTable('territories', {
  id: uuid('id').primaryKey().defaultRandom(),
  territoryName: varchar('territory_name', { length: 100 }).notNull(),
  territoryType: territoryTypeEnum('territory_type').notNull(),
  // Geographic definitions
  regions: text('regions').array(), // Array of regions/states
  cities: text('cities').array(), // Array of cities
  postalCodes: text('postal_codes').array(), // Array of postal codes
  // Assignment
  primaryOwnerId: integer('primary_owner_id').references(() => users.id),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Agent Management Tables
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  agentCode: varchar('agent_code', { length: 20 }).notNull().unique(),
  agentType: agentTypeEnum('agent_type').notNull(),
  // Licensing
  licenseNumber: varchar('license_number', { length: 50 }),
  licenseExpiryDate: timestamp('license_expiry_date'),
  licenseStatus: licenseStatusEnum('license_status').default('active'),
  // Commission Structure
  commissionTierId: uuid('commission_tier_id'),
  baseCommissionRate: decimal('base_commission_rate', { precision: 5, scale: 2 }),
  overrideRate: decimal('override_rate', { precision: 5, scale: 2 }),
  // Hierarchy
  supervisorId: uuid('supervisor_id').references(() => agents.id),
  teamId: uuid('team_id').references(() => salesTeams.id),
  // Performance
  targetAnnualPremium: integer('target_annual_premium'),
  ytdPremium: integer('ytd_premium').default(0),
  ytdCommission: integer('ytd_commission').default(0),
  // Status
  isActive: boolean('is_active').default(true),
  joinDate: timestamp('join_date').defaultNow(),
  terminationDate: timestamp('termination_date'),
  // System
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const commissionTiers = pgTable('commission_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tierName: varchar('tier_name', { length: 100 }).notNull(),
  description: text('description'),
  // Rate Structure
  baseRate: decimal('base_rate', { precision: 5, scale: 2 }).notNull(),
  bonusThreshold: integer('bonus_threshold'), // Premium threshold for bonus
  bonusRate: decimal('bonus_rate', { precision: 5, scale: 2 }),
  // Product-specific rates
  individualRate: decimal('individual_rate', { precision: 5, scale: 2 }),
  corporateRate: decimal('corporate_rate', { precision: 5, scale: 2 }),
  familyRate: decimal('family_rate', { precision: 5, scale: 2 }),
  // Validity
  effectiveDate: timestamp('effective_date').defaultNow(),
  expiryDate: timestamp('expiry_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const commissionTransactions = pgTable('commission_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  policyId: integer('policy_id'), // Will reference policies table when implemented
  memberId: integer('member_id').references(() => members.id),
  // Transaction Details
  transactionType: commissionTransactionTypeEnum('transaction_type').notNull(),
  amount: integer('amount').notNull(),
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(),
  premiumAmount: integer('premium_amount').notNull(),
  // Calculation Details
  baseCommission: integer('base_commission').notNull(),
  bonusCommission: integer('bonus_commission').default(0),
  overrideCommission: integer('override_commission').default(0),
  totalCommission: integer('total_commission').notNull(),
  // Payment Details
  paymentDate: timestamp('payment_date'),
  paymentStatus: paymentStatusEnum('payment_status').default('pending'),
  paymentReference: varchar('payment_reference', { length: 100 }),
  // Period
  commissionPeriod: varchar('commission_period', { length: 20 }), // YYYY-MM format
  createdAt: timestamp('created_at').defaultNow(),
});

export const agentPerformance = pgTable('agent_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  period: varchar('period', { length: 20 }).notNull(), // YYYY-MM
  // Metrics
  leadsAssigned: integer('leads_assigned').default(0),
  leadsContacted: integer('leads_contacted').default(0),
  appointmentsSet: integer('appointments_set').default(0),
  quotesIssued: integer('quotes_issued').default(0),
  policiesSold: integer('policies_sold').default(0),
  totalPremium: integer('total_premium').default(0),
  totalCommission: integer('total_commission').default(0),
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 2 }).default(0),
  averageDealSize: integer('average_deal_size').default(0),
  // Rankings
  teamRank: integer('team_rank'),
  companyRank: integer('company_rank'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Workflow Automation Tables
export const workflowDefinitions = pgTable('workflow_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowName: varchar('workflow_name', { length: 100 }).notNull(),
  description: text('description'),
  triggerType: triggerTypeEnum('trigger_type').notNull(),
  triggerConditions: text('trigger_conditions'), // JSON for complex conditions
  // Workflow definition
  steps: text('steps').notNull(), // JSON array of workflow steps
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(5), // 1-10 priority
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflowDefinitions.id).notNull(),
  triggeredBy: integer('triggered_by').references(() => users.id),
  entityId: varchar('entity_id', { length: 100 }), // Lead ID, Opportunity ID, etc.
  entityType: varchar('entity_type', { length: 50 }),
  // Execution details
  status: workflowExecutionStatusEnum('status').default('running'),
  currentStep: integer('current_step').default(0),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  errorDetails: text('error_details'),
  executionData: text('execution_data'), // JSON runtime data
});

export const emailCampaigns = pgTable('email_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignName: varchar('campaign_name', { length: 100 }).notNull(),
  subjectTemplate: varchar('subject_template', { length: 255 }),
  bodyTemplate: text('body_template'),
  targetSegment: text('target_segment'), // JSON lead criteria for targeting
  schedule: text('schedule'), // JSON scheduling info
  status: campaignStatusEnum('status').default('draft'),
  // Metrics
  sentCount: integer('sent_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  openedCount: integer('opened_count').default(0),
  clickedCount: integer('clicked_count').default(0),
  unsubscribedCount: integer('unsubscribed_count').default(0),
  // System
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Basic Insert Schemas for Core Tables - must be declared before usage
export const insertMemberSchema = createInsertSchema(members);
export const insertCompanySchema = createInsertSchema(companies);
export const insertPeriodSchema = createInsertSchema(periods);
export const insertPremiumRateSchema = createInsertSchema(premiumRates);
export const insertPremiumSchema = createInsertSchema(premiums);
export const insertBenefitSchema = createInsertSchema(benefits);

// Principal member schema with validation
export const insertPrincipalMemberSchema = insertMemberSchema.omit({
  principalId: true,
  dependentType: true,
  hasDisability: true,
  disabilityDetails: true
}).extend({
  memberType: z.literal('principal')
});

// Dependent member schema with validation
export const insertDependentMemberSchema = insertMemberSchema.omit({
  employeeId: true
}).extend({
  memberType: z.literal('dependent'),
  principalId: z.number().positive(),
  dependentType: z.enum(['spouse', 'child']),
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type InsertPrincipalMember = z.infer<typeof insertPrincipalMemberSchema>;
export type InsertDependentMember = z.infer<typeof insertDependentMemberSchema>;

export type Period = typeof periods.$inferSelect;
export type InsertPeriod = z.infer<typeof insertPeriodSchema>;

export type PremiumRate = typeof premiumRates.$inferSelect;
export type InsertPremiumRate = z.infer<typeof insertPremiumRateSchema>;

export type Premium = typeof premiums.$inferSelect;
export type InsertPremium = z.infer<typeof insertPremiumSchema>;

export type Benefit = typeof benefits.$inferSelect;
export type InsertBenefit = z.infer<typeof insertBenefitSchema>;

// Regions table
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  state: text("state").notNull(),
  city: text("city"),
  postalCode: text("postal_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medical Institutions table
export const medicalInstitutions = pgTable("medical_institutions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: institutionTypeEnum("type").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  regionId: integer("region_id").references(() => regions.id).notNull(),
  address: text("address").notNull(),
  contactPerson: text("contact_person").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  approvalStatus: approvalStatusEnum("approval_status").default("pending").notNull(),
  approvalDate: timestamp("approval_date"),
  validUntil: timestamp("valid_until"),
  website: text("website"),
  description: text("description"),
  // Enhanced provider network fields
  networkAssignments: text("network_assignments"), // JSON array of network IDs
  primaryNetworkId: integer("primary_network_id"),
  networkTier: networkTierEnum("network_type"),
  qualityScore: real("quality_score").default(0.0),
  lastQualityReview: timestamp("last_quality_review"),
  networkComplianceStatus: text("network_compliance_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Provider Networks table
export const providerNetworks = pgTable("provider_networks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tier: networkTierEnum("tier").notNull(),
  description: text("description"),
  coverageArea: text("coverage_area"), // Geographic coverage description
  isActive: boolean("is_active").default(true).notNull(),
  minimumProviders: integer("minimum_providers").default(1),
  maximumProviders: integer("maximum_providers"),
  qualityThreshold: real("quality_threshold").default(0.0), // Minimum quality score
  costControlLevel: integer("cost_control_level").default(1), // 1-5 cost control strictness
  specialRequirements: text("special_requirements"), // JSON with special network requirements
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Network Assignments table
export const providerNetworkAssignments = pgTable("provider_network_assignments", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  networkId: integer("network_id").references(() => providerNetworks.id).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").default(true).notNull(),
  assignmentType: text("assignment_type").notNull(), // 'full', 'selective', 'emergency_only'
  coveredSpecializations: text("covered_specializations"), // JSON array of specializations
  networkDiscount: real("network_discount").default(0.0), // Percentage discount for network
  specialTerms: text("special_terms"), // Special network terms
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Provider Contracts table
export const providerContracts = pgTable("provider_contracts", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  contractNumber: text("contract_number").notNull().unique(),
  contractName: text("contract_name").notNull(),
  contractType: text("contract_type").notNull(), // 'service', 'facility', 'specialty', 'network'
  status: contractStatusEnum("status").default("draft").notNull(),
  reimbursementModel: reimbursementModelEnum("reimbursement_model").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  autoRenewal: boolean("auto_renewal").default(false),
  renewalTermMonths: integer("renewal_term_months").default(12),
  terminationDays: integer("termination_days").default(90),
  negotiatedDiscount: real("negotiated_discount").default(0.0),
  capitationRate: real("capitation_rate"), // For capitation contracts
  packageDealDetails: text("package_deal_details"), // JSON with package deal terms
  preAuthorizationRequirements: text("pre_authorization_requirements"), // JSON with pre-auth rules
  qualityMetrics: text("quality_metrics"), // JSON with quality KPI requirements
  utilizationLimits: text("utilization_limits"), // JSON with utilization constraints
  complianceRequirements: text("compliance_requirements"), // JSON with compliance rules
  contractValue: real("contract_value"),
  billingCycle: text("billing_cycle").default("monthly"), // 'weekly', 'monthly', 'quarterly'
  paymentTerms: text("payment_terms").default("NET_30"), // Payment terms in days
  specialTerms: text("special_terms"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contract Documents table
export const contractDocuments = pgTable("contract_documents", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => providerContracts.id).notNull(),
  documentType: text("document_type").notNull(), // 'master_agreement', 'schedule', 'addendum', 'appendix', 'signature'
  documentName: text("document_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  storedFilePath: text("stored_file_path").notNull(),
  fileHash: text("file_hash").notNull(), // SHA-256 hash for integrity
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: text("mime_type").notNull(),
  version: integer("version").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  expiryDate: timestamp("expiry_date"),
  required: boolean("required").default(false),
  documentStatus: text("document_status").default("pending"), // 'pending', 'approved', 'rejected'
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contract Signatures table
export const contractSignatures = pgTable("contract_signatures", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => providerContracts.id).notNull(),
  documentId: integer("document_id").references(() => contractDocuments.id).notNull(),
  signerType: text("signer_type").notNull(), // 'provider', 'insurer', 'witness'
  signerName: text("signer_name").notNull(),
  signerTitle: text("signer_title"),
  signerEmail: text("signer_email").notNull(),
  signatureDate: timestamp("signature_date").notNull(),
  signatureMethod: text("signature_method").notNull(), // 'electronic', 'digital', 'wet_ink'
  signatureData: text("signature_data"), // Base64 encoded signature or digital signature hash
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  geolocation: text("geolocation"), // JSON with lat/lng
  verificationStatus: text("verification_status").default("pending"), // 'pending', 'verified', 'rejected'
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedDate: timestamp("verified_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medical Personnel table
export const medicalPersonnel = pgTable("medical_personnel", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  type: personnelTypeEnum("type").notNull(),
  licenseNumber: text("license_number").notNull().unique(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  specialization: text("specialization"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  approvalStatus: approvalStatusEnum("approval_status").default("pending").notNull(),
  approvalDate: timestamp("approval_date"),
  validUntil: timestamp("valid_until"),
  qualifications: text("qualifications").notNull(),
  yearsOfExperience: integer("years_of_experience").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documentation for medical panel
export const panelDocumentation = pgTable("panel_documentation", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id),
  personnelId: integer("personnel_id").references(() => medicalPersonnel.id),
  documentType: text("document_type").notNull(), // license, certification, accreditation
  documentName: text("document_name").notNull(),
  documentPath: text("document_path"), // file path or URL
  expiryDate: timestamp("expiry_date"),
  isVerified: boolean("is_verified").default(false),
  verificationDate: timestamp("verification_date"),
  verifiedBy: text("verified_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Claims submitted by medical panels
export const diagnosisCodeTypeEnum = pgEnum('diagnosis_code_type', ['ICD-10', 'ICD-11']);

// Enum for fraud risk indicators
export const fraudRiskLevelEnum = pgEnum('fraud_risk_level', ['none', 'low', 'medium', 'high', 'confirmed']);

// Diagnosis Codes Table
export const diagnosisCodes = pgTable("diagnosis_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  codeType: diagnosisCodeTypeEnum("code_type").notNull(), // ICD-10 or ICD-11
  category: text("category").notNull(), // Disease category
  subcategory: text("subcategory"), // Optional subcategory
  searchTerms: text("search_terms"), // Additional search terms to help find codes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  claimNumber: text("claim_number").unique().notNull(), // Unique claim identifier
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  personnelId: integer("personnel_id").references(() => medicalPersonnel.id),
  providerId: integer("provider_id").references(() => providers.id), // Link to providers table
  memberId: integer("member_id").references(() => members.id).notNull(),
  schemeId: integer("scheme_id").references(() => schemes.id), // Link to schemes table
  benefitId: integer("benefit_id").references(() => benefits.id).notNull(),
  claimDate: timestamp("claim_date").defaultNow().notNull(),
  serviceDate: timestamp("service_date").notNull(),
  // Enhanced fields for integration
  memberName: text("member_name").notNull(), // Denormalized for easier integration
  serviceType: text("service_type").notNull(), // Service type categorization
  totalAmount: real("total_amount").notNull(), // Total claim amount
  approvedAmount: real("approved_amount"), // Approved amount after adjudication
  coveredAmount: real("covered_amount"), // Amount covered by insurance
  patientAmount: real("patient_amount"), // Patient responsibility amount
  procedureCode: text("procedure_code"), // Medical procedure code
  preAuthRequired: boolean("pre_auth_required").default(false),
  preAuthApproved: boolean("pre_auth_approved").default(false),
  preAuthNumber: text("pre_auth_number"),
  // Original fields
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  diagnosis: text("diagnosis").notNull(),
  diagnosisCode: text("diagnosis_code").notNull(), // ICD-10 or ICD-11 code
  diagnosisCodeType: diagnosisCodeTypeEnum("diagnosis_code_type").notNull(), // Type of diagnosis code
  treatmentDetails: text("treatment_details"),
  status: claimStatusEnum("status").default("submitted").notNull(),
  reviewDate: timestamp("review_date"),
  reviewerNotes: text("reviewer_notes"),
  paymentDate: timestamp("payment_date"),
  paymentReference: text("payment_reference"),
  // Provider verification fields
  providerVerified: boolean("provider_verified").default(false),
  requiresHigherApproval: boolean("requires_higher_approval").default(false),
  approvedByAdmin: boolean("approved_by_admin").default(false),
  adminApprovalDate: timestamp("admin_approval_date"),
  adminReviewNotes: text("admin_review_notes"),
  // Fraud detection fields
  fraudRiskLevel: fraudRiskLevelEnum("fraud_risk_level").default("none"),
  fraudRiskFactors: text("fraud_risk_factors"),
  fraudReviewDate: timestamp("fraud_review_date"),
  fraudReviewerId: integer("fraud_reviewer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for new entities
// // export const insertDiagnosisCodeSchema = createInsertSchema(diagnosisCodes).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertRegionSchema = createInsertSchema(regions).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertMedicalInstitutionSchema = createInsertSchema(medicalInstitutions).omit({
//   id: true,
//   approvalDate: true,
//   createdAt: true,
// });

// // export const insertMedicalPersonnelSchema = createInsertSchema(medicalPersonnel).omit({
//   id: true,
//   approvalDate: true,
//   createdAt: true,
// });

// // export const insertPanelDocumentationSchema = createInsertSchema(panelDocumentation).omit({
//   id: true,
//   verificationDate: true,
//   createdAt: true,
// });

// // export const insertClaimSchema = createInsertSchema(claims).omit({
//   id: true,
//   reviewDate: true,
//   paymentDate: true,
//   createdAt: true,
//   // Admin approval fields
//   adminApprovalDate: true,
//   fraudReviewDate: true,
// }).extend({
//   diagnosisCode: z.string().min(3, "Diagnosis code must be at least 3 characters").max(50, "Diagnosis code is too long"),
//   diagnosisCodeType: z.enum(["ICD-10", "ICD-11"], {
//     required_error: "Diagnosis code type is required (ICD-10 or ICD-11)",
//     invalid_type_error: "Diagnosis code type must be either ICD-10 or ICD-11",
//   }),
//   // Provider verification and fraud risk are set by the system, not provided by user
//   providerVerified: z.boolean().optional().default(false),
//   requiresHigherApproval: z.boolean().optional().default(false),
//   approvedByAdmin: z.boolean().optional().default(false),
//   adminReviewNotes: z.string().optional(),
//   fraudRiskLevel: z.enum(["none", "low", "medium", "high", "confirmed"]).optional().default("none"),
//   fraudRiskFactors: z.string().optional(),
//   fraudReviewerId: z.number().optional(),
// });

export type CompanyBenefit = typeof companyBenefits.$inferSelect;
export type InsertCompanyBenefit = z.infer<typeof insertCompanyBenefitSchema>;

export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;

export type MedicalInstitution = typeof medicalInstitutions.$inferSelect;
export type InsertMedicalInstitution = z.infer<typeof insertMedicalInstitutionSchema>;

export type MedicalPersonnel = typeof medicalPersonnel.$inferSelect;
export type InsertMedicalPersonnel = z.infer<typeof insertMedicalPersonnelSchema>;

export type PanelDocumentation = typeof panelDocumentation.$inferSelect;
export type InsertPanelDocumentation = z.infer<typeof insertPanelDocumentationSchema>;

export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;

export type CompanyPeriod = typeof companyPeriods.$inferSelect;
export type InsertCompanyPeriod = z.infer<typeof insertCompanyPeriodSchema>;

export type AgeBandedRate = typeof ageBandedRates.$inferSelect;
export type InsertAgeBandedRate = z.infer<typeof insertAgeBandedRateSchema>;

export type FamilyRate = typeof familyRates.$inferSelect;
export type InsertFamilyRate = z.infer<typeof insertFamilyRateSchema>;

export type DiagnosisCode = typeof diagnosisCodes.$inferSelect;
export type InsertDiagnosisCode = z.infer<typeof insertDiagnosisCodeSchema>;

// Payment types enum
export const paymentTypeEnum = pgEnum('payment_type', ['premium', 'claim', 'disbursement']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['credit_card', 'bank_transfer', 'check', 'cash', 'online']);
export const procedureCategoryEnum = pgEnum('procedure_category', ['consultation', 'surgery', 'diagnostic', 'laboratory', 'imaging', 'dental', 'vision', 'medication', 'therapy', 'emergency', 'maternity', 'preventative', 'other']);

// CRM Lead Management Enums
export const leadSourceEnum = pgEnum('lead_source', ['website', 'referral', 'campaign', 'cold_call', 'partner', 'event', 'social_media', 'email_marketing', 'third_party', 'manual']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost', 'duplicate']);
export const leadPriorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'urgent']);
export const opportunityStageEnum = pgEnum('opportunity_stage', ['lead', 'qualified', 'quotation', 'underwriting', 'issuance', 'closed_won', 'closed_lost']);
export const activityTypeEnum = pgEnum('activity_type', ['call', 'email', 'meeting', 'sms', 'whatsapp', 'note', 'task', 'demo', 'proposal']);
export const territoryTypeEnum = pgEnum('territory_type', ['geographic', 'industry', 'company_size', 'product_line', 'mixed']);

// Agent Management Enums
export const agentTypeEnum = pgEnum('agent_type', ['internal_agent', 'external_broker', 'independent_agent', 'captive_agent', 'agency']);
export const licenseStatusEnum = pgEnum('license_status', ['active', 'expired', 'suspended', 'pending', 'revoked']);
export const commissionTransactionTypeEnum = pgEnum('commission_transaction_type', ['new_business', 'renewal', 'bonus', 'override', 'adjustment', 'clawback']);

// Workflow Automation Enums
export const triggerTypeEnum = pgEnum('trigger_type', ['lead_created', 'lead_status_changed', 'opportunity_stage_changed', 'date_based', 'manual', 'webhook', 'email_opened', 'link_clicked']);
export const workflowExecutionStatusEnum = pgEnum('workflow_execution_status', ['running', 'completed', 'failed', 'cancelled', 'paused']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled']);

// User type enum for authentication
export const userTypeEnum = pgEnum('user_type', ['insurance', 'institution', 'provider', 'sales_admin', 'sales_manager', 'team_lead', 'sales_agent', 'broker', 'underwriter']);

// Token System Enums
export const tokenPurchaseTypeEnum = pgEnum('token_purchase_type', ['one_time', 'subscription', 'auto_topup']);
export const tokenPurchaseStatusEnum = pgEnum('token_purchase_status', ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'paused', 'payment_failed', 'cancelled', 'expired']);
export const subscriptionFrequencyEnum = pgEnum('subscription_frequency', ['monthly', 'quarterly', 'annual']);
export const autoTopupTriggerTypeEnum = pgEnum('auto_topup_trigger_type', ['threshold', 'scheduled', 'both']);
export const autoTopupScheduleFrequencyEnum = pgEnum('auto_topup_schedule_frequency', ['daily', 'weekly', 'monthly']);
export const notificationThresholdTypeEnum = pgEnum('notification_threshold_type', ['percentage', 'absolute']);

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  userType: userTypeEnum("user_type").notNull(),
  entityId: integer("entity_id").notNull(), // References company, institution, or personnel ID
  permissions: text("permissions").array().default(sql`'{}'::text[]`), // Array of permission strings like 'tokens.purchase', 'tokens.view', 'tokens.configure'
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User sessions table for JWT token management
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit logs for security and compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Token System Tables

// Organization Token Wallets - Store token balance and configuration for each organization
export const organizationTokenWallets = pgTable("organization_token_wallets", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => companies.id).notNull().unique(),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  totalPurchased: decimal("total_purchased", { precision: 15, scale: 2 }).notNull().default("0"),
  totalConsumed: decimal("total_consumed", { precision: 15, scale: 2 }).notNull().default("0"),
  pricePerToken: decimal("price_per_token", { precision: 10, scale: 4 }).notNull(),
  expirationEnabled: boolean("expiration_enabled").default(false),
  expirationDays: integer("expiration_days"),
  currency: text("currency").notNull().default("USD"),
  isActive: boolean("is_active").default(true),
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Token Packages - Define predefined token package quantities
export const tokenPackages = pgTable("token_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tokenQuantity: decimal("token_quantity", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  isCustom: boolean("is_custom").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Token Purchases - Immutable ledger of all token purchases
export const tokenPurchases = pgTable("token_purchases", {
  id: serial("id").primaryKey(),
  purchaseReferenceId: text("purchase_reference_id").notNull().unique(),
  organizationId: integer("organization_id").references(() => companies.id).notNull(),
  purchasedBy: integer("purchased_by").references(() => users.id).notNull(),
  purchaseType: tokenPurchaseTypeEnum("purchase_type").notNull(),
  tokenQuantity: decimal("token_quantity", { precision: 15, scale: 2 }).notNull(),
  pricePerToken: decimal("price_per_token", { precision: 10, scale: 4 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  packageId: integer("package_id").references(() => tokenPackages.id),
  status: tokenPurchaseStatusEnum("status").notNull(),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id),
  gatewayProvider: text("gateway_provider"),
  gatewayTransactionId: text("gateway_transaction_id"),
  invoiceId: integer("invoice_id"),
  subscriptionId: integer("subscription_id"),
  autoTopupPolicyId: integer("auto_topup_policy_id"),
  tokenExpirationDate: timestamp("token_expiration_date"),
  paymentInitiatedAt: timestamp("payment_initiated_at"),
  paymentCompletedAt: timestamp("payment_completed_at"),
  tokensAllocatedAt: timestamp("tokens_allocated_at"),
  failureReason: text("failure_reason"),
  refundedAt: timestamp("refunded_at"),
  refundAmount: decimal("refund_amount", { precision: 15, scale: 2 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Token Subscriptions - Recurring subscription-based token purchases
export const tokenSubscriptions = pgTable("token_subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => companies.id).notNull(),
  packageId: integer("package_id").references(() => tokenPackages.id).notNull(),
  tokenQuantity: decimal("token_quantity", { precision: 15, scale: 2 }).notNull(),
  pricePerToken: decimal("price_per_token", { precision: 10, scale: 4 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  frequency: subscriptionFrequencyEnum("frequency").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id).notNull(),
  nextBillingDate: date("next_billing_date").notNull(),
  lastBillingDate: date("last_billing_date"),
  lastSuccessfulPayment: timestamp("last_successful_payment"),
  failedPaymentCount: integer("failed_payment_count").default(0),
  gracePeriodEnds: timestamp("grace_period_ends"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: integer("cancelled_by").references(() => users.id),
  cancellationReason: text("cancellation_reason"),
  startedAt: timestamp("started_at").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Auto Top-Up Policies - Auto top-up configuration per organization
export const autoTopupPolicies = pgTable("auto_topup_policies", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => companies.id).notNull().unique(),
  isEnabled: boolean("is_enabled").default(false),
  triggerType: autoTopupTriggerTypeEnum("trigger_type").notNull(),
  thresholdPercentage: decimal("threshold_percentage", { precision: 5, scale: 2 }),
  scheduleFrequency: autoTopupScheduleFrequencyEnum("schedule_frequency"),
  nextScheduledRun: timestamp("next_scheduled_run"),
  topupPackageId: integer("topup_package_id").references(() => tokenPackages.id),
  topupTokenQuantity: decimal("topup_token_quantity", { precision: 15, scale: 2 }),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id).notNull(),
  maxSpendingLimitPerMonth: decimal("max_spending_limit_per_month", { precision: 15, scale: 2 }),
  currentMonthSpending: decimal("current_month_spending", { precision: 15, scale: 2 }).default("0"),
  spendingResetDate: date("spending_reset_date"),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastPurchaseId: integer("last_purchase_id").references(() => tokenPurchases.id),
  failureCount: integer("failure_count").default(0),
  pausedAt: timestamp("paused_at"),
  pauseReason: text("pause_reason"),
  invoiceEnabled: boolean("invoice_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Token Balance History - Track token balance changes over time
export const tokenBalanceHistory = pgTable("token_balance_history", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => companies.id).notNull(),
  changeAmount: decimal("change_amount", { precision: 15, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }).notNull(),
  changeType: text("change_type").notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  description: text("description"),
  performedBy: integer("performed_by").references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: text("metadata"),
});

// Low Balance Notifications - Track low balance notification thresholds
export const lowBalanceNotifications = pgTable("low_balance_notifications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => companies.id).notNull(),
  thresholdType: notificationThresholdTypeEnum("threshold_type").notNull(),
  thresholdValue: decimal("threshold_value", { precision: 15, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastNotifiedBalance: decimal("last_notified_balance", { precision: 15, scale: 2 }),
  notificationsSentCount: integer("notifications_sent_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Token Usage Forecasts - Store usage forecasts and analytics data
export const tokenUsageForecasts = pgTable("token_usage_forecasts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => companies.id).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  tokensConsumed: decimal("tokens_consumed", { precision: 15, scale: 2 }).notNull(),
  averageDailyConsumption: decimal("average_daily_consumption", { precision: 15, scale: 2 }),
  projectedDaysRemaining: integer("projected_days_remaining"),
  projectedDepletionDate: date("projected_depletion_date"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

// Premium Payments table
export const premiumPayments = pgTable("premium_payments", {
  id: serial("id").primaryKey(),
  premiumId: integer("premium_id").references(() => premiums.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  amount: real("amount").notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentReference: text("payment_reference").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  transactionId: text("transaction_id"),
  paymentDetails: text("payment_details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Claim Payments table
export const claimPayments = pgTable("claim_payments", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  amount: real("amount").notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentReference: text("payment_reference").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  transactionId: text("transaction_id"),
  notes: text("notes"),
  approvedBy: text("approved_by").notNull(),
  approvalDate: timestamp("approval_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Disbursements table
export const providerDisbursements = pgTable("provider_disbursements", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  totalAmount: real("total_amount").notNull(),
  paidAmount: real("paid_amount").default(0).notNull(),
  pendingAmount: real("pending_amount").notNull(),
  disbursementDate: timestamp("disbursement_date").defaultNow().notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentReference: text("payment_reference").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  transactionId: text("transaction_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Disbursement Items (links disbursements to claims)
export const disbursementItems = pgTable("disbursement_items", {
  id: serial("id").primaryKey(),
  disbursementId: integer("disbursement_id").references(() => providerDisbursements.id).notNull(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  amount: real("amount").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insurance balance tracking
export const insuranceBalances = pgTable("insurance_balances", {
  id: serial("id").primaryKey(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  totalPremiums: real("total_premiums").default(0).notNull(),
  totalClaims: real("total_claims").default(0).notNull(),
  pendingClaims: real("pending_claims").default(0).notNull(),
  activeBalance: real("active_balance").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced Premium Calculation Tables
export const enhancedPremiumCalculations = pgTable("enhanced_premium_calculations", {
  id: serial("id").primaryKey(),
  premiumId: integer("premium_id").references(() => premiums.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  basePremium: real("base_premium").notNull(),
  riskAdjustmentFactor: real("risk_adjustment_factor").notNull(),
  demographicAdjustment: real("demographic_adjustment").notNull(),
  healthcareInflationFactor: real("healthcare_inflation_factor").notNull(),
  regionalCostAdjustment: real("regional_cost_adjustment").notNull(),
  finalAdjustedPremium: real("final_adjusted_premium").notNull(),
  riskScore: real("risk_score").notNull(),
  pricingMethodology: pricingMethodologyEnum("pricing_methodology").notNull(),
  riskAdjustmentTier: riskAdjustmentTierEnum("risk_adjustment_tier").notNull(),
  calculationDate: timestamp("calculation_date").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  calculationMetadata: text("calculation_metadata"), // JSON string with detailed breakdown
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const riskAdjustmentFactors = pgTable("risk_adjustment_factors", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  healthConditionRisk: real("health_condition_risk").notNull(),
  lifestyleRisk: real("lifestyle_risk").notNull(),
  demographicRisk: real("demographic_risk").notNull(),
  geographicRisk: real("geographic_risk").notNull(),
  occupationalRisk: real("occupational_risk").notNull(),
  familyHistoryRisk: real("family_history_risk").notNull(),
  overallRiskScore: real("overall_risk_score").notNull(),
  riskAdjustmentTier: riskAdjustmentTierEnum("risk_adjustment_tier").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  nextReviewDate: timestamp("next_review_date").notNull(),
  calculationMetadata: text("calculation_metadata"), // JSON string with risk factors breakdown
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const healthcareInflationRates = pgTable("healthcare_inflation_rates", {
  id: serial("id").primaryKey(),
  category: inflationCategoryEnum("category").notNull(),
  regionId: integer("region_id").references(() => regions.id),
  baseYear: integer("base_year").notNull(),
  targetYear: integer("target_year").notNull(),
  inflationRate: real("inflation_rate").notNull(),
  projectedMedicalTrend: real("projected_medical_trend").notNull(),
  utilizationTrend: real("utilization_trend").notNull(),
  costShiftingFactor: real("cost_shifting_factor").notNull(),
  technologyImpact: real("technology_impact").notNull(),
  regulatoryImpact: real("regulatory_impact").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expiresAt: timestamp("expires_at"),
  dataSource: text("data_source").notNull(),
  confidenceLevel: real("confidence_level").notNull(), // 0.0 to 1.0
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const actuarialRateTables = pgTable("actuarial_rate_tables", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pricingMethodology: pricingMethodologyEnum("pricing_methodology").notNull(),
  regionId: integer("region_id").references(() => regions.id),
  minAge: integer("min_age").notNull(),
  maxAge: integer("max_age").notNull(),
  gender: text("gender"), // 'male', 'female', 'all', null for unisex
  smokerStatus: text("smoker_status"), // 'smoker', 'non_smoker', 'all', null for no distinction
  baseRate: real("base_rate").notNull(),
  lossRatioTarget: real("loss_ratio_target").notNull(),
  expenseLoading: real("expense_loading").notNull(),
  profitMargin: real("profit_margin").notNull(),
  regulatoryComplianceFactors: text("regulatory_compliance_factors"), // JSON string with compliance details
  marketAdjustmentFactor: real("market_adjustment_factor").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expiresAt: timestamp("expires_at"),
  approvedBy: text("approved_by").notNull(),
  version: text("version").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for payment tables
// // export const insertPremiumPaymentSchema = createInsertSchema(premiumPayments).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertClaimPaymentSchema = createInsertSchema(claimPayments).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderDisbursementSchema = createInsertSchema(providerDisbursements).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertDisbursementItemSchema = createInsertSchema(disbursementItems).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertInsuranceBalanceSchema = createInsertSchema(insuranceBalances).omit({
//   id: true,
//   createdAt: true,
// });

// Insert schemas for enhanced premium calculation tables
// // export const insertEnhancedPremiumCalculationSchema = createInsertSchema(enhancedPremiumCalculations).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertRiskAdjustmentFactorSchema = createInsertSchema(riskAdjustmentFactors).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertHealthcareInflationRateSchema = createInsertSchema(healthcareInflationRates).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertActuarialRateTableSchema = createInsertSchema(actuarialRateTables).omit({
//   id: true,
//   createdAt: true,
// });

// Types for payment entities
export type PremiumPayment = typeof premiumPayments.$inferSelect;
export type InsertPremiumPayment = z.infer<typeof insertPremiumPaymentSchema>;

export type ClaimPayment = typeof claimPayments.$inferSelect;
export type InsertClaimPayment = z.infer<typeof insertClaimPaymentSchema>;

export type ProviderDisbursement = typeof providerDisbursements.$inferSelect;
export type InsertProviderDisbursement = z.infer<typeof insertProviderDisbursementSchema>;

export type DisbursementItem = typeof disbursementItems.$inferSelect;
export type InsertDisbursementItem = z.infer<typeof insertDisbursementItemSchema>;

export type InsuranceBalance = typeof insuranceBalances.$inferSelect;
export type InsertInsuranceBalance = z.infer<typeof insertInsuranceBalanceSchema>;

// Types for enhanced premium calculation entities
export type EnhancedPremiumCalculation = typeof enhancedPremiumCalculations.$inferSelect;
export type InsertEnhancedPremiumCalculation = z.infer<typeof insertEnhancedPremiumCalculationSchema>;

export type RiskAdjustmentFactor = typeof riskAdjustmentFactors.$inferSelect;
export type InsertRiskAdjustmentFactor = z.infer<typeof insertRiskAdjustmentFactorSchema>;

export type HealthcareInflationRate = typeof healthcareInflationRates.$inferSelect;
export type InsertHealthcareInflationRate = z.infer<typeof insertHealthcareInflationRateSchema>;

export type ActuarialRateTable = typeof actuarialRateTables.$inferSelect;
export type InsertActuarialRateTable = z.infer<typeof insertActuarialRateTableSchema>;

// Medical Procedures/Items tables for claim processing
export const medicalProcedures = pgTable("medical_procedures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  category: procedureCategoryEnum("category").notNull(),
  description: text("description"),
  standardRate: real("standard_rate").notNull(),
  active: boolean("active").default(true).notNull(),
  // Enhanced procedure fields
  icd10Codes: text("icd10_codes"), // JSON array of related ICD-10 codes
  cptCodes: text("cpt_codes"), // JSON array of CPT codes
  hcpcsCodes: text("hcpcs_codes"), // JSON array of HCPCS codes
  descriptionLong: text("description_long"), // Detailed clinical description
  clinicalNotes: text("clinical_notes"), // Clinical guidelines and notes
  complexityLevel: integer("complexity_level").default(1), // 1-5 complexity
  averageDuration: integer("average_duration"), // Average procedure duration in minutes
  requiresSpecialist: boolean("requires_specialist").default(false),
  facilityRequirements: text("facility_requirements"), // JSON with facility requirements
  preAuthRequired: boolean("pre_auth_required").default(false),
  bundledProcedures: text("bundled_procedures"), // JSON array of bundled procedure IDs
  subCategory: text("sub_category"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Provider-specific procedure rates
export const providerProcedureRates = pgTable("provider_procedure_rates", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  procedureId: integer("procedure_id").references(() => medicalProcedures.id).notNull(),
  agreedRate: real("agreed_rate").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tariff Catalog Management tables

// Tariff catalogs table
export const tariffCatalogs = pgTable("tariff_catalogs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  catalogType: text("catalog_type").notNull(), // 'standard', 'network', 'provider', 'regional'
  description: text("description"),
  version: text("version").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  status: tariffStatusEnum("status").default("active").notNull(),
  regionId: integer("region_id").references(() => regions.id),
  networkId: integer("network_id").references(() => providerNetworks.id),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id),
  currency: text("currency").default("USD").notNull(),
  baseRateAdjustment: real("base_rate_adjustment").default(1.0),
  inflationAdjustment: real("inflation_adjustment").default(1.0),
  specialNotes: text("special_notes"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvalDate: timestamp("approval_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tariff items table
export const tariffItems = pgTable("tariff_items", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id").references(() => tariffCatalogs.id).notNull(),
  procedureId: integer("procedure_id").references(() => medicalProcedures.id).notNull(),
  unitRate: real("unit_rate").notNull(),
  negotiatedRate: real("negotiated_rate"),
  professionalFee: real("professional_fee"),
  facilityFee: real("facility_fee"),
  consumablesCost: real("consumables_cost"),
  anesthesiaFee: real("anesthesia_fee"),
  minimumCharge: real("minimum_charge"),
  maximumCharge: real("maximum_charge"),
  rateBasis: text("rate_basis").notNull(), // 'percentage', 'fixed', 'rrv', 'custom'
  rateBasisValue: real("rate_basis_value"),
  complexityMultiplier: real("complexity_multiplier").default(1.0),
  geographicAdjustment: real("geographic_adjustment").default(1.0),
  timeAdjustment: real("time_adjustment").default(1.0),
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to"),
  specialConditions: text("special_conditions"), // JSON with special pricing conditions
  bundlingRules: text("bundling_rules"), // JSON with bundling rules
  discountRules: text("discount_rules"), // JSON with discount rules
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pharmacy price lists table
export const pharmacyPriceLists = pgTable("pharmacy_price_lists", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id").references(() => tariffCatalogs.id).notNull(),
  drugName: text("drug_name").notNull(),
  genericName: text("generic_name"),
  ndcCode: text("ndc_code").notNull(), // National Drug Code
  atcCode: text("atc_code"), // Anatomical Therapeutic Chemical code
  dosageForm: text("dosage_form"), // 'tablet', 'capsule', 'injection', etc.
  strength: text("strength"), // e.g., '500mg', '10mg/ml'
  packageSize: text("package_size"), // e.g., '30 tablets', '100ml'
  unitPrice: real("unit_price").notNull(), // Price per unit
  packagePrice: real("package_price").notNull(), // Price per package
  genericAvailable: boolean("generic_available").default(false),
  genericPrice: real("generic_price"),
  therapeuticClass: text("therapeutic_class"),
  brandPremium: real("brand_premium").default(0.0),
  dispensingFee: real("dispensing_fee").default(0.0),
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to"),
  specialNotes: text("special_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Consumables price lists table
export const consumablesPriceLists = pgTable("consumables_price_lists", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id").references(() => tariffCatalogs.id).notNull(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(), // 'surgical', 'diagnostic', 'pharmaceutical', etc.
  subCategory: text("sub_category"),
  manufacturer: text("manufacturer"),
  modelNumber: text("model_number"),
  skuCode: text("sku_code"),
  unitOfMeasure: text("unit_of_measure").notNull(), // 'each', 'box', 'pack', 'bottle'
  unitPrice: real("unit_price").notNull(),
  minimumOrderQuantity: integer("minimum_order_quantity").default(1),
  bulkDiscountThreshold: integer("bulk_discount_threshold"),
  bulkDiscountRate: real("bulk_discount_rate").default(0.0),
  expiryDate: timestamp("expiry_date"),
  storageRequirements: text("storage_requirements"), // JSON with storage conditions
  qualityStandards: text("quality_standards"), // ISO, CE, FDA certifications
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to"),
  specialNotes: text("special_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Claim procedure items
export const claimProcedureItems = pgTable("claim_procedure_items", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  procedureId: integer("procedure_id").references(() => medicalProcedures.id).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitRate: real("unit_rate").notNull(),
  totalAmount: real("total_amount").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for medical procedures tables
// // export const insertMedicalProcedureSchema = createInsertSchema(medicalProcedures).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderProcedureRateSchema = createInsertSchema(providerProcedureRates).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertClaimProcedureItemSchema = createInsertSchema(claimProcedureItems).omit({
//   id: true,
//   createdAt: true,
// });

// Types for medical procedures entities
export type MedicalProcedure = typeof medicalProcedures.$inferSelect;
export type InsertMedicalProcedure = z.infer<typeof insertMedicalProcedureSchema>;

export type ProviderProcedureRate = typeof providerProcedureRates.$inferSelect;
export type InsertProviderProcedureRate = z.infer<typeof insertProviderProcedureRateSchema>;

export type ClaimProcedureItem = typeof claimProcedureItems.$inferSelect;
export type InsertClaimProcedureItem = z.infer<typeof insertClaimProcedureItemSchema>;

// Insert schemas for authentication tables
// // export const insertUserSchema = createInsertSchema(users).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
//   id: true,
//   timestamp: true,
// });

// Types for authentication entities
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Member Engagement Hub - Onboarding System
export const onboardingStatusEnum = pgEnum('onboarding_status', ['pending', 'active', 'completed', 'paused', 'cancelled']);
export const taskTypeEnum = pgEnum('task_type', ['profile_completion', 'document_upload', 'benefits_education', 'dependent_registration', 'wellness_setup', 'emergency_setup', 'completion']);
export const documentStatusEnum = pgEnum('document_status', ['pending', 'approved', 'rejected', 'expired']);
export const activationStatusEnum = pgEnum('activation_status', ['pending', 'active', 'expired', 'used']);

// Onboarding sessions table
export const onboardingSessions = pgTable("onboarding_sessions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  currentDay: integer("current_day").default(1).notNull(),
  completionDate: timestamp("completion_date"),
  status: onboardingStatusEnum("status").default("pending").notNull(),
  activationCompleted: boolean("activation_completed").default(false),
  totalPointsEarned: integer("total_points_earned").default(0),
  streakDays: integer("streak_days").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Onboarding tasks table
export const onboardingTasks = pgTable("onboarding_tasks", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => onboardingSessions.id).notNull(),
  dayNumber: integer("day_number").notNull(),
  taskType: taskTypeEnum("task_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  completionStatus: boolean("completion_status").default(false),
  completedAt: timestamp("completed_at"),
  pointsEarned: integer("points_earned").default(0),
  taskData: text("task_data"), // JSON string for additional task-specific data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Member documents table
export const memberDocuments = pgTable("member_documents", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  originalFileName: text("original_file_name").notNull(),
  storedFilePath: text("stored_file_path").notNull(),
  fileHash: text("file_hash").notNull(), // SHA-256 hash for integrity
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: text("mime_type").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  verificationStatus: documentStatusEnum("verification_status").default("pending").notNull(),
  verificationDate: timestamp("verification_date"),
  verifiedBy: integer("verified_by"), // Admin user ID
  rejectionReason: text("rejection_reason"),
  extractedData: text("extracted_data"), // JSON string for OCR/extracted data
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Onboarding preferences table
export const onboardingPreferences = pgTable("onboarding_preferences", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  emailFrequency: text("email_frequency").default("daily").notNull(), // daily, weekly, none
  smsEnabled: boolean("sms_enabled").default(true).notNull(),
  timezone: text("timezone").default("UTC").notNull(),
  preferredTime: text("preferred_time").default("09:00").notNull(), // HH:MM format
  language: text("language").default("en").notNull(),
  communicationChannel: text("communication_channel").default("email").notNull(), // email, sms, both
  autoAdvanceDays: boolean("auto_advance_days").default(false).notNull(),
  reminderEnabled: boolean("reminder_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activation tokens table
export const activationTokens = pgTable("activation_tokens", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  tokenHash: text("token_hash").notNull().unique(), // SHA-256 hash of the activation token
  status: activationStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Personalization System
export const personalizationLevelEnum = pgEnum('personalization_level', ['minimal', 'moderate', 'full']);
export const recommendationTypeEnum = pgEnum('recommendation_type', ['preventive_care', 'wellness', 'cost_optimization', 'care_coordination', 'educational']);
export const journeyStageEnum = pgEnum('journey_stage', ['new_member', 'established_member', 'long_term_member', 'new_parent', 'chronic_condition', 'high_risk', 'wellness_champion']);

// Member preferences table
export const memberPreferences = pgTable("member_preferences", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  personalizationLevel: personalizationLevelEnum("personalization_level").default("moderate").notNull(),
  contentCategories: text("content_categories"), // JSON array of preferred content categories
  excludedTopics: text("excluded_topics"), // JSON array of excluded topics
  dataSharingConsent: boolean("data_sharing_consent").default(false).notNull(),
  recommendationFeedback: boolean("recommendation_feedback").default(true).notNull(),
  interfacePreferences: text("interface_preferences"), // JSON string for UI preferences
  healthGoals: text("health_goals"), // JSON string for wellness goals
  lifestyleFactors: text("lifestyle_factors"), // JSON string for lifestyle data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Behavior analytics table
export const behaviorAnalytics = pgTable("behavior_analytics", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  eventType: text("event_type").notNull(), // page_view, click, form_submit, search, etc.
  resourceName: text("resource_name").notNull(), // page/component name
  resourceData: text("resource_data"), // JSON string with additional context
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  sessionId: text("session_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  timeOnPage: integer("time_on_page"), // in seconds
  scrollDepth: integer("scroll_depth"), // percentage
  coordinates: text("coordinates"), // JSON string with click coordinates
});

// Personalization scores table
export const personalizationScores = pgTable("personalization_scores", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  category: text("category").notNull(), // benefits, wellness, preventive, etc.
  contentId: integer("content_id").notNull(),
  score: real("score").notNull(), // 0.0 to 1.0 relevance score
  confidence: real("confidence").default(0.0).notNull(), // confidence in the recommendation
  lastCalculated: timestamp("last_calculated").defaultNow().notNull(),
  factors: text("factors"), // JSON string explaining score factors
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Journey stages table
export const journeyStages = pgTable("journey_stages", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  currentStage: journeyStageEnum("current_stage").notNull(),
  previousStage: journeyStageEnum("previous_stage"),
  stageStartDate: timestamp("stage_start_date").defaultNow().notNull(),
  progressPercentage: real("progress_percentage").default(0).notNull(),
  milestonesCompleted: text("milestones_completed"), // JSON array of completed milestones
  nextMilestone: text("next_milestone"),
  estimatedCompletion: timestamp("estimated_completion"),
  transitionCriteria: text("transition_criteria"), // JSON string for stage transition rules
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recommendation history table
export const recommendationHistory = pgTable("recommendation_history", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  recommendationType: recommendationTypeEnum("recommendation_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  contentData: text("content_data"), // JSON string with recommendation content
  priority: integer("priority").default(0).notNull(), // 0-10, higher is more important
  validUntil: timestamp("valid_until"),
  memberResponse: text("member_response"), // clicked, dismissed, completed, etc.
  responseDate: timestamp("response_date"),
  feedbackRating: integer("feedback_rating"), // 1-5 stars
  feedbackText: text("feedback_text"),
  effectiveness: real("effectiveness"), // 0.0 to 1.0, calculated later
  shownAt: timestamp("shown_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for onboarding system
// // export const insertOnboardingSessionSchema = createInsertSchema(onboardingSessions).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertOnboardingTaskSchema = createInsertSchema(onboardingTasks).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertMemberDocumentSchema = createInsertSchema(memberDocuments).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertOnboardingPreferenceSchema = createInsertSchema(onboardingPreferences).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertActivationTokenSchema = createInsertSchema(activationTokens).omit({
//   id: true,
//   createdAt: true,
// });

// Insert schemas for personalization system
// // export const insertMemberPreferenceSchema = createInsertSchema(memberPreferences).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertBehaviorAnalyticSchema = createInsertSchema(behaviorAnalytics).omit({
//   id: true,
// });

// // export const insertPersonalizationScoreSchema = createInsertSchema(personalizationScores).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertJourneyStageSchema = createInsertSchema(journeyStages).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertRecommendationHistorySchema = createInsertSchema(recommendationHistory).omit({
//   id: true,
//   createdAt: true,
// });

// Types for onboarding system
export type OnboardingSession = typeof onboardingSessions.$inferSelect;
export type InsertOnboardingSession = z.infer<typeof insertOnboardingSessionSchema>;

export type OnboardingTask = typeof onboardingTasks.$inferSelect;
export type InsertOnboardingTask = z.infer<typeof insertOnboardingTaskSchema>;

export type MemberDocument = typeof memberDocuments.$inferSelect;
export type InsertMemberDocument = z.infer<typeof insertMemberDocumentSchema>;

export type OnboardingPreference = typeof onboardingPreferences.$inferSelect;
export type InsertOnboardingPreference = z.infer<typeof insertOnboardingPreferenceSchema>;

export type ActivationToken = typeof activationTokens.$inferSelect;
export type InsertActivationToken = z.infer<typeof insertActivationTokenSchema>;

// Types for personalization system
export type MemberPreference = typeof memberPreferences.$inferSelect;
export type InsertMemberPreference = z.infer<typeof insertMemberPreferenceSchema>;

export type BehaviorAnalytic = typeof behaviorAnalytics.$inferSelect;
export type InsertBehaviorAnalytic = z.infer<typeof insertBehaviorAnalyticSchema>;

export type PersonalizationScore = typeof personalizationScores.$inferSelect;
export type InsertPersonalizationScore = z.infer<typeof insertPersonalizationScoreSchema>;

export type JourneyStage = typeof journeyStages.$inferSelect;
export type InsertJourneyStage = z.infer<typeof insertJourneyStageSchema>;

export type RecommendationHistory = typeof recommendationHistory.$inferSelect;
export type InsertRecommendationHistory = z.infer<typeof insertRecommendationHistorySchema>;

// Claims processing enums
export const adjudicationResultEnum = pgEnum('adjudication_result', ['APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'PENDING_REVIEW']);
export const medicalNecessityResultEnum = pgEnum('medical_necessity_result', ['PASS', 'FAIL', 'REVIEW_REQUIRED']);
export const eobStatusEnum = pgEnum('eob_status', ['GENERATED', 'SENT', 'ACKNOWLEDGED', 'DISPUTED']);
export const claimEventTypeEnum = pgEnum('claim_event_type', ['SUBMITTED', 'ELIGIBILITY_CHECKED', 'VALIDATED', 'ADJUDICATED', 'MEDICAL_REVIEW', 'FRAUD_DETECTED', 'APPROVED', 'DENIED', 'PAID']);

// Enhanced claims processing tables

// Claim adjudication results
export const claimAdjudicationResults = pgTable("claim_adjudication_results", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  adjudicationDate: timestamp("adjudication_date").defaultNow().notNull(),
  originalAmount: real("original_amount").notNull(),
  approvedAmount: real("approved_amount").default(0).notNull(),
  memberResponsibility: real("member_responsibility").default(0).notNull(),
  insurerResponsibility: real("insurer_responsibility").default(0).notNull(),
  denialReasons: text("denial_reasons"), // JSON array of denial reasons
  appliedRules: text("applied_rules"), // JSON array of applied business rules
  waitingPeriodApplied: boolean("waiting_period_applied").default(false),
  deductibleApplied: real("deductible_applied").default(0),
  copayApplied: real("copay_applied").default(0),
  coinsuranceApplied: real("coinsurance_applied").default(0),
  providerDiscountApplied: real("provider_discount_applied").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medical necessity validations
export const medicalNecessityValidations = pgTable("medical_necessity_validations", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  diagnosisCode: text("diagnosis_code").notNull(),
  procedureCodes: text("procedure_codes").notNull(), // JSON array
  validationResult: text("validation_result").notNull(), // PASS, FAIL, REVIEW
  clinicalGuidelineReference: text("clinical_guideline_reference"),
  necessityScore: real("necessity_score"), // 0-100 confidence score
  reviewerNotes: text("reviewer_notes"),
  requiresClinicalReview: boolean("requires_clinical_review").default(false),
  clinicalReviewDate: timestamp("clinical_review_date"),
  clinicalReviewerId: integer("clinical_reviewer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fraud detection results
export const fraudDetectionResults = pgTable("fraud_detection_results", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  detectionDate: timestamp("detection_date").defaultNow().notNull(),
  riskScore: real("risk_score").notNull(), // 0-100
  riskLevel: text("risk_level").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  detectedIndicators: text("detected_indicators").notNull(), // JSON array
  mlModelConfidence: real("ml_model_confidence"),
  ruleBasedViolations: text("rule_based_violations"), // JSON array
  investigationRequired: boolean("investigation_required").default(false),
  investigationStatus: text("investigation_status"), // PENDING, IN_PROGRESS, RESOLVED
  fraudType: text("fraud_type"), // BILLING_FRAUD, UPSELLING, DUPLICATE, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Explanation of Benefits
export const explanationOfBenefits = pgTable("explanation_of_benefits", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  eobDate: timestamp("eob_date").defaultNow().notNull(),
  eobNumber: text("eob_number").notNull().unique(),
  totalBilledAmount: real("total_billed_amount").notNull(),
  totalAllowedAmount: real("total_allowed_amount").notNull(),
  totalPaidAmount: real("total_paid_amount").notNull(),
  memberResponsibility: real("member_responsibility").notNull(),
  planResponsibility: real("plan_responsibility").notNull(),
  serviceDetails: text("service_details").notNull(), // JSON with line item details
  denialReasons: text("denial_reasons"), // JSON array
  appealInformation: text("appeal_information"),
  status: text("status").notNull(), // GENERATED, SENT, ACKNOWLEDGED
  sentDate: timestamp("sent_date"),
  acknowledgmentDate: timestamp("acknowledgment_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced claim audit trails
export const claimAuditTrails = pgTable("claim_audit_trails", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  eventType: text("event_type").notNull(), // SUBMITTED, VALIDATED, ADJUDICATED, etc.
  eventDate: timestamp("event_date").defaultNow().notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  userId: integer("user_id"), // System user or reviewer
  automatedDecision: boolean("automated_decision").default(false),
  decisionFactors: text("decision_factors"), // JSON explaining decision
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Benefit utilization tracking
export const benefitUtilization = pgTable("benefit_utilization", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  benefitId: integer("benefit_id").references(() => benefits.id).notNull(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  usedAmount: real("used_amount").notNull(),
  limitAmount: real("limit_amount"),
  remainingAmount: real("remaining_amount"),
  utilizationPercentage: real("utilization_percentage"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for enhanced claims processing tables
// // export const insertClaimAdjudicationResultSchema = createInsertSchema(claimAdjudicationResults).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertMedicalNecessityValidationSchema = createInsertSchema(medicalNecessityValidations).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertFraudDetectionResultSchema = createInsertSchema(fraudDetectionResults).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertExplanationOfBenefitsSchema = createInsertSchema(explanationOfBenefits).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertClaimAuditTrailSchema = createInsertSchema(claimAuditTrails).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertBenefitUtilizationSchema = createInsertSchema(benefitUtilization).omit({
//   id: true,
//   createdAt: true,
// });

// Types for enhanced claims processing entities
export type ClaimAdjudicationResult = typeof claimAdjudicationResults.$inferSelect;
export type InsertClaimAdjudicationResult = z.infer<typeof insertClaimAdjudicationResultSchema>;

export type MedicalNecessityValidation = typeof medicalNecessityValidations.$inferSelect;
export type InsertMedicalNecessityValidation = z.infer<typeof insertMedicalNecessityValidationSchema>;

export type FraudDetectionResult = typeof fraudDetectionResults.$inferSelect;
export type InsertFraudDetectionResult = z.infer<typeof insertFraudDetectionResultSchema>;

export type ExplanationOfBenefits = typeof explanationOfBenefits.$inferSelect;
export type InsertExplanationOfBenefits = z.infer<typeof insertExplanationOfBenefitsSchema>;

export type ClaimAuditTrail = typeof claimAuditTrails.$inferSelect;
export type InsertClaimAuditTrail = z.infer<typeof insertClaimAuditTrailSchema>;

export type BenefitUtilization = typeof benefitUtilization.$inferSelect;
export type InsertBenefitUtilization = z.infer<typeof insertBenefitUtilizationSchema>;

// Card Management System

// Card management enums
export const cardTypeEnum = pgEnum('card_type', ['physical', 'digital', 'both']);
export const cardStatusEnum = pgEnum('card_status', ['pending', 'active', 'inactive', 'expired', 'lost', 'stolen', 'damaged', 'replaced']);
export const cardTemplateEnum = pgEnum('card_template', ['standard', 'premium', 'corporate', 'family', 'individual']);

// Member Cards table
export const memberCards = pgTable("member_cards", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  cardNumber: text("card_number").notNull().unique(),
  cardType: cardTypeEnum("card_type").notNull(),
  status: cardStatusEnum("status").default("pending").notNull(),
  templateType: cardTemplateEnum("template_type").default("standard").notNull(),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date").notNull(),
  activationDate: timestamp("activation_date"),
  deactivationDate: timestamp("deactivation_date"),
  physicalCardPrinted: boolean("physical_card_printed").default(false),
  physicalCardShipped: boolean("physical_card_shipped").default(false),
  physicalCardTracking: text("physical_card_tracking"),
  digitalCardUrl: text("digital_card_url"), // Secure URL for digital card access
  qrCodeData: text("qr_code_data"), // Encrypted QR code content
  magneticStripeData: text("magnetic_stripe_data"), // Encrypted stripe data
  chipEnabled: boolean("chip_enabled").default(false),
  nfcEnabled: boolean("nfc_enabled").default(false),
  personalizationData: text("personalization_data"), // JSON with member-specific card design
  securityPin: text("security_pin"), // Encrypted PIN for virtual card access
  replacementReason: text("replacement_reason"),
  previousCardId: integer("previous_card_id").references(() => memberCards.id),
  deliveryMethod: text("delivery_method"), // 'standard_mail', 'express', 'pickup', 'digital_only'
  deliveryAddress: text("delivery_address"),
  batchId: text("batch_id"), // For batch processing
  auditLog: text("audit_log"), // JSON array of card lifecycle events
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Card Templates table
export const cardTemplates = pgTable("card_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  templateName: text("template_name").notNull(),
  templateType: cardTemplateEnum("template_type").notNull(),
  templateDescription: text("template_description"),
  backgroundColor: text("background_color").default("#ffffff"),
  foregroundColor: text("foreground_color").default("#000000"),
  accentColor: text("accent_color").default("#1976d2"),
  fontFamily: text("font_family").default("Arial"),
  logoUrl: text("logo_url"), // Company logo URL
  backgroundPattern: text("background_pattern"),
  cardWidth: real("card_width").default(85.6), // Standard credit card width in mm
  cardHeight: real("card_height").default(53.98), // Standard credit card height in mm
  templateHtml: text("template_html"), // HTML template for card rendering
  templateCss: text("template_css"), // CSS styles for card
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Card Verification Events table
export const cardVerificationEvents = pgTable("card_verification_events", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").references(() => memberCards.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  verifierId: integer("verifier_id"), // Provider or institution ID
  verificationMethod: text("verification_method").notNull(), // 'qr_scan', 'card_number', 'api_call', 'nfc'
  verificationResult: text("verification_result").notNull(), // 'success', 'failed', 'expired', 'inactive'
  verificationData: text("verification_data"), // JSON with verification details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  geolocation: text("geolocation"), // JSON with lat/lng
  verificationTimestamp: timestamp("verification_timestamp").defaultNow().notNull(),
  providerResponseTime: real("provider_response_time"), // Time in milliseconds
  fraudRiskScore: real("fraud_risk_score").default(0),
  fraudIndicators: text("fraud_indicators"), // JSON array of fraud indicators
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Card Production Batches table
export const cardProductionBatches = pgTable("card_production_batches", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull().unique(),
  batchName: text("batch_name").notNull(),
  batchType: text("batch_type").notNull(), // 'initial_issue', 'renewal', 'replacement', 'bulk'
  totalCards: integer("total_cards").notNull(),
  processedCards: integer("processed_cards").default(0),
  productionStatus: text("production_status").default("pending").notNull(), // 'pending', 'processing', 'printed', 'shipped', 'completed'
  printVendor: text("print_vendor"),
  productionStartDate: timestamp("production_start_date"),
  completionDate: timestamp("completion_date"),
  shippingDate: timestamp("shipping_date"),
  trackingNumbers: text("tracking_numbers"), // JSON array of tracking numbers
  costPerCard: real("cost_per_card"),
  totalCost: real("total_cost"),
  productionNotes: text("production_notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for card management
// // export const insertMemberCardSchema = createInsertSchema(memberCards).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertCardTemplateSchema = createInsertSchema(cardTemplates).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertCardVerificationEventSchema = createInsertSchema(cardVerificationEvents).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertCardProductionBatchSchema = createInsertSchema(cardProductionBatches).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// Types for card management entities
export type MemberCard = typeof memberCards.$inferSelect;
export type InsertMemberCard = z.infer<typeof insertMemberCardSchema>;

export type CardTemplate = typeof cardTemplates.$inferSelect;
export type InsertCardTemplate = z.infer<typeof insertCardTemplateSchema>;

export type CardVerificationEvent = typeof cardVerificationEvents.$inferSelect;
export type InsertCardVerificationEvent = z.infer<typeof insertCardVerificationEventSchema>;

export type CardProductionBatch = typeof cardProductionBatches.$inferSelect;
export type InsertCardProductionBatch = z.infer<typeof insertCardProductionBatchSchema>;

// Insert schemas for provider network management tables
// // export const insertProviderNetworkSchema = createInsertSchema(providerNetworks).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderNetworkAssignmentSchema = createInsertSchema(providerNetworkAssignments).omit({
//   id: true,
//   createdAt: true,
// });

// Insert schemas for contract management tables
// // export const insertProviderContractSchema = createInsertSchema(providerContracts).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertContractDocumentSchema = createInsertSchema(contractDocuments).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertContractSignatureSchema = createInsertSchema(contractSignatures).omit({
//   id: true,
//   createdAt: true,
// });

// Insert schemas for tariff catalog tables
// // export const insertTariffCatalogSchema = createInsertSchema(tariffCatalogs).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertTariffItemSchema = createInsertSchema(tariffItems).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertPharmacyPriceListSchema = createInsertSchema(pharmacyPriceLists).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertConsumablesPriceListSchema = createInsertSchema(consumablesPriceLists).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// Types for provider network management entities
export type ProviderNetwork = typeof providerNetworks.$inferSelect;
export type InsertProviderNetwork = z.infer<typeof insertProviderNetworkSchema>;

export type ProviderNetworkAssignment = typeof providerNetworkAssignments.$inferSelect;
export type InsertProviderNetworkAssignment = z.infer<typeof insertProviderNetworkAssignmentSchema>;

// Types for contract management entities
export type ProviderContract = typeof providerContracts.$inferSelect;
export type InsertProviderContract = z.infer<typeof insertProviderContractSchema>;

export type ContractDocument = typeof contractDocuments.$inferSelect;
export type InsertContractDocument = z.infer<typeof insertContractDocumentSchema>;

export type ContractSignature = typeof contractSignatures.$inferSelect;
export type InsertContractSignature = z.infer<typeof insertContractSignatureSchema>;

// Types for tariff catalog entities
export type TariffCatalog = typeof tariffCatalogs.$inferSelect;
export type InsertTariffCatalog = z.infer<typeof insertTariffCatalogSchema>;

export type TariffItem = typeof tariffItems.$inferSelect;
export type InsertTariffItem = z.infer<typeof insertTariffItemSchema>;

export type PharmacyPriceList = typeof pharmacyPriceLists.$inferSelect;
export type InsertPharmacyPriceList = z.infer<typeof insertPharmacyPriceListSchema>;

export type ConsumablesPriceList = typeof consumablesPriceLists.$inferSelect;
export type InsertConsumablesPriceList = z.infer<typeof insertConsumablesPriceListSchema>;

// Schemes & Benefits Module Enums

// Scheme definition enums
export const schemeTypeEnum = pgEnum('scheme_type', ['individual_medical', 'corporate_medical', 'nhif_top_up', 'student_cover', 'international_health', 'micro_insurance']);
export const pricingModelEnum = pgEnum('pricing_model', ['age_rated', 'community_rated', 'group_rate', 'experience_rated']);
export const targetMarketEnum = pgEnum('target_market', ['individuals', 'small_groups', 'large_corporates', 'students', 'seniors', 'expatriates']);
export const planTierEnum = pgEnum('plan_tier', ['bronze', 'silver', 'gold', 'platinum', 'vip']);

// Cost sharing rules enums
export const costSharingTypeEnum = pgEnum('cost_sharing_type', ['copay_fixed', 'copay_percentage', 'coinsurance', 'deductible', 'annual_deductible']);
export const limitTypeEnum = pgEnum('limit_type', ['overall_annual', 'benefit_annual', 'sub_limit', 'frequency', 'age_based']);
export const limitCategoryEnum = pgEnum('limit_category', ['icu', 'room_type', 'procedure_type', 'professional_fee', 'medication', 'therapy']);
export const frequencyLimitEnum = pgEnum('frequency_limit', ['per_visit', 'per_day', 'per_admission', 'annual', 'lifetime']);

// Corporate customization enums
export const employeeGradeEnum = pgEnum('employee_grade', ['executive', 'senior_management', 'middle_management', 'junior_staff', 'intern']);

// Rules engine enums
export const ruleCategoryEnum = pgEnum('rule_category', ['eligibility', 'benefit_application', 'limit_check', 'cost_sharing', 'exclusion']);
export const ruleTypeEnum = pgEnum('rule_type', ['condition', 'calculation', 'validation', 'workflow']);
export const ruleResultEnum = pgEnum('rule_result', ['PASS', 'FAIL', 'SKIP']);

// Enhanced Provider Management System

// Provider Management Enums
export const providerVerificationStatusEnum = pgEnum('provider_verification_status', ['pending', 'verified', 'rejected', 'suspended', 'under_review']);
export const providerOnboardingStatusEnum = pgEnum('provider_onboarding_status', ['registered', 'document_pending', 'verification_in_progress', 'approved', 'rejected', 'active', 'suspended']);
export const providerPerformanceTierEnum = pgEnum('provider_performance_tier', ['excellent', 'good', 'average', 'below_average', 'poor']);
export const accreditationStatusEnum = pgEnum('accreditation_status', ['accredited', 'provisional', 'not_accredited', 'expired']);
export const complianceStatusEnum = pgEnum('compliance_status', ['compliant', 'minor_violations', 'major_violations', 'suspended']);

// Provider Onboarding Applications table
export const providerOnboardingApplications = pgTable("provider_onboarding_applications", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  applicationNumber: text("application_number").notNull().unique(),
  applicationType: text("application_type").notNull(), // 'new', 'renewal', 'expansion', 'specialization_add'
  onboardingStatus: providerOnboardingStatusEnum("onboarding_status").default("registered").notNull(),
  submissionDate: timestamp("submission_date").defaultNow().notNull(),
  completionDate: timestamp("completion_date"),
  reviewDate: timestamp("review_date"),
  reviewerId: integer("reviewer_id").references(() => users.id),
  assignedCaseWorker: integer("assigned_case_worker").references(() => users.id),
  priorityLevel: integer("priority_level").default(3), // 1-5, 1 being highest priority
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  applicationNotes: text("application_notes"),
  rejectionReason: text("rejection_reason"),
  appealStatus: text("appeal_status"), // 'none', 'pending', 'approved', 'rejected'
  appealDate: timestamp("appeal_date"),
  appealDecision: text("appeal_decision"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  automatedChecksCompleted: boolean("automated_checks_completed").default(false),
  manualVerificationRequired: boolean("manual_verification_required").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Verification Checklist table
export const providerVerificationChecklist = pgTable("provider_verification_checklist", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => providerOnboardingApplications.id).notNull(),
  verificationCategory: text("verification_category").notNull(), // 'licensing', 'accreditation', 'compliance', 'quality', 'financial'
  checklistItem: text("checklist_item").notNull(),
  isRequired: boolean("is_required").default(true).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completionDate: timestamp("completion_date"),
  completedBy: integer("completed_by").references(() => users.id),
  supportingDocuments: text("supporting_documents"), // JSON array of document IDs
  verificationNotes: text("verification_notes"),
  automaticVerification: boolean("automatic_verification").default(false),
  externalVerificationRequired: boolean("external_verification_required").default(false),
  verificationMethod: text("verification_method"), // 'document', 'api_call', 'site_visit', 'third_party'
  expiryDate: timestamp("expiry_date"),
  reminderDate: timestamp("reminder_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Accreditation and Certification table
export const providerAccreditations = pgTable("provider_accreditations", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  accreditationBody: text("accreditation_body").notNull(), // 'JCI', 'COHSASA', 'ISO', 'National Health Dept', etc.
  accreditationType: text("accreditation_type").notNull(), // 'hospital', 'clinic', 'laboratory', 'radiology', 'pharmacy'
  accreditationNumber: text("accreditation_number").notNull(),
  accreditationStatus: accreditationStatusEnum("accreditation_status").default("not_accredited").notNull(),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  lastAuditDate: timestamp("last_audit_date"),
  nextAuditDate: timestamp("next_audit_date"),
  auditScore: real("audit_score"), // 0-100 score from last audit
  auditReportPath: text("audit_report_path"), // Path to audit report document
  complianceStandards: text("compliance_standards"), // JSON array of standards complied with
  nonComplianceIssues: text("non_compliance_issues"), // JSON array of identified issues
  correctiveActions: text("corrective_actions"), // JSON array of required corrective actions
  verificationStatus: providerVerificationStatusEnum("verification_status").default("pending").notNull(),
  verifiedBy: integer("verified_by").references(() => users.id),
  verificationDate: timestamp("verification_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Performance Metrics table
export const providerPerformanceMetrics = pgTable("provider_performance_metrics", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  metricCategory: text("metric_category").notNull(), // 'quality', 'efficiency', 'patient_satisfaction', 'financial', 'compliance'
  metricName: text("metric_name").notNull(),
  metricValue: real("metric_value").notNull(),
  targetValue: real("target_value"),
  performanceThreshold: real("performance_threshold").notNull(),
  measurementPeriod: text("measurement_period").notNull(), // 'monthly', 'quarterly', 'annually'
  measurementDate: timestamp("measurement_date").notNull(),
  previousValue: real("previous_value"),
  trendDirection: text("trend_direction"), // 'improving', 'declining', 'stable'
  performanceTier: providerPerformanceTierEnum("performance_tier").notNull(),
  benchmarkComparison: real("benchmark_comparison"), // Comparison to industry benchmark
  dataSource: text("data_source").notNull(), // Source of the metric data
  collectionMethod: text("collection_method"), // How the data was collected
  notes: text("notes"),
  isKPI: boolean("is_kpi").default(false), // Whether this is a Key Performance Indicator
  weight: real("weight").default(1.0), // Weight in composite calculations
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Compliance Monitoring table
export const providerComplianceMonitoring = pgTable("provider_compliance_monitoring", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  complianceCategory: text("compliance_category").notNull(), // 'clinical', 'administrative', 'financial', 'safety', 'privacy'
  complianceStandard: text("compliance_standard").notNull(), // 'HIPAA', 'GDPR', 'Local Health Regulations', etc.
  complianceStatus: complianceStatusEnum("compliance_status").notNull(),
  lastAuditDate: timestamp("last_audit_date"),
  nextAuditDate: timestamp("next_audit_date"),
  auditScore: real("audit_score"),
  criticalFindings: text("critical_findings"), // JSON array of critical compliance issues
  minorFindings: text("minor_findings"), // JSON array of minor compliance issues
  correctiveActionPlan: text("corrective_action_plan"), // JSON object with action plan details
  actionPlanDeadline: timestamp("action_plan_deadline"),
  actionPlanStatus: text("action_plan_status"), // 'not_started', 'in_progress', 'completed', 'overdue'
  monitoringFrequency: text("monitoring_frequency"), // 'continuous', 'monthly', 'quarterly', 'annually'
  riskLevel: text("risk_level"), // 'low', 'medium', 'high', 'critical'
  reportedTo: integer("reported_to").references(() => users.id), // Who was informed of compliance status
  externalReporting: boolean("external_reporting").default(false), // Whether reported to external authorities
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Quality Scores table
export const providerQualityScores = pgTable("provider_quality_scores", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  assessmentDate: timestamp("assessment_date").notNull(),
  overallQualityScore: real("overall_quality_score").notNull(), // 0-100
  clinicalQualityScore: real("clinical_quality_score"),
  patientExperienceScore: real("patient_experience_score"),
  efficiencyScore: real("efficiency_score"),
  safetyScore: real("safety_score"),
  accessScore: real("access_score"),
  scoringMethodology: text("scoring_methodology").notNull(), // Description of how scores were calculated
  assessmentPeriod: text("assessment_period").notNull(),
  dataPoints: integer("data_points").notNull(), // Number of data points used in assessment
  confidenceLevel: real("confidence_level"), // Statistical confidence in the scores
  peerComparisonPercentile: real("peer_comparison_percentile"), // Percentile rank among peers
  qualityTier: providerPerformanceTierEnum("quality_tier").notNull(),
  improvementAreas: text("improvement_areas"), // JSON array of identified improvement areas
  strengths: text("strengths"), // JSON array of identified strengths
  externalValidation: boolean("external_validation").default(false), // Whether externally validated
  validationSource: text("validation_source"),
  assessedBy: integer("assessed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Financial Performance table
export const providerFinancialPerformance = pgTable("provider_financial_performance", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  reportingPeriod: text("reporting_period").notNull(), // 'Q1-2024', 'Monthly-2024-01', etc.
  totalRevenue: real("total_revenue").notNull(),
  insuranceRevenue: real("insurance_revenue"),
  cashRevenue: real("cash_revenue"),
  totalExpenses: real("total_expenses").notNull(),
  operatingExpenses: real("operating_expenses"),
  staffExpenses: real("staff_expenses"),
  facilityExpenses: real("facility_expenses"),
  profitMargin: real("profit_margin"),
  revenueGrowth: real("revenue_growth"), // Percentage growth from previous period
  costPerClaim: real("cost_per_claim"),
  averageClaimValue: real("average_claim_value"),
  denialRate: real("denial_rate"), // Percentage of claims denied
  collectionRate: real("collection_rate"), // Percentage of billed amounts collected
  daysInAR: real("days_in_ar"), // Days in accounts receivable
  financialStability: text("financial_stability"), // 'excellent', 'good', 'fair', 'poor'
  riskFactors: text("risk_factors"), // JSON array of identified financial risk factors
  profitabilityTrend: text("profitability_trend"), // 'improving', 'declining', 'stable'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Referral Network table
export const providerReferralNetwork = pgTable("provider_referral_network", {
  id: serial("id").primaryKey(),
  sourceInstitutionId: integer("source_institution_id").references(() => medicalInstitutions.id).notNull(),
  targetInstitutionId: integer("target_institution_id").references(() => medicalInstitutions.id).notNull(),
  referralType: text("referral_type").notNull(), // 'specialist', 'diagnostic', 'hospital', 'therapy', 'emergency'
  referralVolume: integer("referral_volume").default(0),
  acceptanceRate: real("acceptance_rate"), // Percentage of referrals accepted
  averageResponseTime: real("average_response_time"), // Average response time in hours
  qualityScore: real("quality_score"), // Quality rating of referrals
  costEffectiveness: real("cost_effectiveness"), // Cost-effectiveness score
  patientSatisfaction: real("patient_satisfaction"), // Patient satisfaction with referrals
  contractTerms: text("contract_terms"), // JSON with contract terms for referrals
  isActive: boolean("is_active").default(true).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  lastReviewDate: timestamp("last_review_date"),
  performanceMetrics: text("performance_metrics"), // JSON with detailed performance metrics
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Education and Training table
export const providerEducationTraining = pgTable("provider_education_training", {
  id: serial("id").primaryKey(),
  personnelId: integer("personnel_id").references(() => medicalPersonnel.id).notNull(),
  educationType: text("education_type").notNull(), // 'degree', 'certification', 'license', 'training', 'continuing_education'
  institutionName: text("institution_name").notNull(),
  degree: text("degree"),
  fieldOfStudy: text("field_of_study"),
  specialization: text("specialization"),
  startDate: timestamp("start_date"),
  completionDate: timestamp("completion_date"),
  isCurrent: boolean("is_current").default(false),
  gpaScore: real("gpa_score"),
  honors: text("honors"),
  licenseNumber: text("license_number"),
  licenseIssuingAuthority: text("license_issuing_authority"),
  licenseIssueDate: timestamp("license_issue_date"),
  licenseExpiryDate: timestamp("license_expiry_date"),
  licenseStatus: text("license_status").default("active"),
  verificationStatus: providerVerificationStatusEnum("verification_status").default("pending").notNull(),
  verificationDate: timestamp("verification_date"),
  verifiedBy: integer("verified_by").references(() => users.id),
  supportingDocuments: text("supporting_documents"), // JSON array of document IDs
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Provider Clinical Expertise table
export const providerClinicalExpertise = pgTable("provider_clinical_expertise", {
  id: serial("id").primaryKey(),
  personnelId: integer("personnel_id").references(() => medicalPersonnel.id).notNull(),
  clinicalArea: text("clinical_area").notNull(),
  expertiseLevel: text("expertise_level").notNull(), // 'basic', 'intermediate', 'advanced', 'expert'
  yearsOfExperience: integer("years_of_experience").notNull(),
  proceduresPerformed: integer("procedures_performed").default(0),
  successRate: real("success_rate"),
  complicationRate: real("complication_rate"),
  patientSatisfactionScore: real("patient_satisfaction_score"),
  peerRecognition: text("peer_recognition"), // Awards, recognition, publications
  researchPublications: integer("research_publications").default(0),
  clinicalTrials: integer("clinical_trials").default(0),
  teachingExperience: boolean("teaching_experience").default(false),
  boardCertifications: text("board_certifications"), // JSON array of board certifications
  specialTraining: text("special_training"), // JSON array of special training programs
  proficiencyTests: text("proficiency_tests"), // JSON array of passed proficiency tests
  lastAssessmentDate: timestamp("last_assessment_date"),
  nextAssessmentDate: timestamp("next_assessment_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for enhanced provider management tables
// // export const insertProviderOnboardingApplicationSchema = createInsertSchema(providerOnboardingApplications).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderVerificationChecklistSchema = createInsertSchema(providerVerificationChecklist).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderAccreditationSchema = createInsertSchema(providerAccreditations).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderPerformanceMetricSchema = createInsertSchema(providerPerformanceMetrics).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderComplianceMonitoringSchema = createInsertSchema(providerComplianceMonitoring).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderQualityScoreSchema = createInsertSchema(providerQualityScores).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderFinancialPerformanceSchema = createInsertSchema(providerFinancialPerformance).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderReferralNetworkSchema = createInsertSchema(providerReferralNetwork).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderEducationTrainingSchema = createInsertSchema(providerEducationTraining).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertProviderClinicalExpertiseSchema = createInsertSchema(providerClinicalExpertise).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// Insert schemas for Schemes & Benefits module
// // export const insertSchemeSchema = createInsertSchema(schemes).omit({
// //   id: true,
// //   createdAt: true,
// //   updatedAt: true,
// // });
// 
// // export const insertSchemeVersionSchema = createInsertSchema(schemeVersions).omit({
//   id: true,
//   createdAt: true,
// });

// // export const insertPlanTierSchema = createInsertSchema(planTiers).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertEnhancedBenefitSchema = createInsertSchema(enhancedBenefits).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertSchemeBenefitMappingSchema = createInsertSchema(schemeBenefitMappings).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertCostSharingRuleSchema = createInsertSchema(costSharingRules).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertBenefitLimitSchema = createInsertSchema(benefitLimits).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertCorporateSchemeConfigSchema = createInsertSchema(corporateSchemeConfigs).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertEmployeeGradeBenefitSchema = createInsertSchema(employeeGradeBenefits).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertDependentCoverageRuleSchema = createInsertSchema(dependentCoverageRules).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertBenefitRiderSchema = createInsertSchema(benefitRiders).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertMemberRiderSelectionSchema = createInsertSchema(memberRiderSelections).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertBenefitRuleSchema = createInsertSchema(benefitRules).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// // export const insertRuleExecutionLogSchema = createInsertSchema(ruleExecutionLogs).omit({
//   id: true,
//   createdAt: true,
// });

// Types for enhanced provider management entities
export type ProviderOnboardingApplication = typeof providerOnboardingApplications.$inferSelect;
export type InsertProviderOnboardingApplication = z.infer<typeof insertProviderOnboardingApplicationSchema>;

export type ProviderVerificationChecklist = typeof providerVerificationChecklist.$inferSelect;
export type InsertProviderVerificationChecklist = z.infer<typeof insertProviderVerificationChecklistSchema>;

export type ProviderAccreditation = typeof providerAccreditations.$inferSelect;
export type InsertProviderAccreditation = z.infer<typeof insertProviderAccreditationSchema>;

export type ProviderPerformanceMetric = typeof providerPerformanceMetrics.$inferSelect;
export type InsertProviderPerformanceMetric = z.infer<typeof insertProviderPerformanceMetricSchema>;

export type ProviderComplianceMonitoring = typeof providerComplianceMonitoring.$inferSelect;
export type InsertProviderComplianceMonitoring = z.infer<typeof insertProviderComplianceMonitoringSchema>;

export type ProviderQualityScore = typeof providerQualityScores.$inferSelect;
export type InsertProviderQualityScore = z.infer<typeof insertProviderQualityScoreSchema>;

export type ProviderFinancialPerformance = typeof providerFinancialPerformance.$inferSelect;
export type InsertProviderFinancialPerformance = z.infer<typeof insertProviderFinancialPerformanceSchema>;

export type ProviderReferralNetwork = typeof providerReferralNetwork.$inferSelect;
export type InsertProviderReferralNetwork = z.infer<typeof insertProviderReferralNetworkSchema>;

export type ProviderEducationTraining = typeof providerEducationTraining.$inferSelect;
export type InsertProviderEducationTraining = z.infer<typeof insertProviderEducationTrainingSchema>;

export type ProviderClinicalExpertise = typeof providerClinicalExpertise.$inferSelect;
export type InsertProviderClinicalExpertise = z.infer<typeof insertProviderClinicalExpertiseSchema>;

// Types for Schemes & Benefits module
export type Scheme = typeof schemes.$inferSelect;
export type InsertScheme = z.infer<typeof insertSchemeSchema>;

export type SchemeVersion = typeof schemeVersions.$inferSelect;
export type InsertSchemeVersion = z.infer<typeof insertSchemeVersionSchema>;

export type PlanTier = typeof planTiers.$inferSelect;
export type InsertPlanTier = z.infer<typeof insertPlanTierSchema>;

export type EnhancedBenefit = typeof enhancedBenefits.$inferSelect;
export type InsertEnhancedBenefit = z.infer<typeof insertEnhancedBenefitSchema>;

export type SchemeBenefitMapping = typeof schemeBenefitMappings.$inferSelect;
export type InsertSchemeBenefitMapping = z.infer<typeof insertSchemeBenefitMappingSchema>;

export type CostSharingRule = typeof costSharingRules.$inferSelect;
export type InsertCostSharingRule = z.infer<typeof insertCostSharingRuleSchema>;

export type BenefitLimit = typeof benefitLimits.$inferSelect;
export type InsertBenefitLimit = z.infer<typeof insertBenefitLimitSchema>;

export type CorporateSchemeConfig = typeof corporateSchemeConfigs.$inferSelect;
export type InsertCorporateSchemeConfig = z.infer<typeof insertCorporateSchemeConfigSchema>;

export type EmployeeGradeBenefit = typeof employeeGradeBenefits.$inferSelect;
export type InsertEmployeeGradeBenefit = z.infer<typeof insertEmployeeGradeBenefitSchema>;

export type DependentCoverageRule = typeof dependentCoverageRules.$inferSelect;
export type InsertDependentCoverageRule = z.infer<typeof insertDependentCoverageRuleSchema>;

export type BenefitRider = typeof benefitRiders.$inferSelect;
export type InsertBenefitRider = z.infer<typeof insertBenefitRiderSchema>;

export type MemberRiderSelection = typeof memberRiderSelections.$inferSelect;
export type InsertMemberRiderSelection = z.infer<typeof insertMemberRiderSelectionSchema>;

export type BenefitRule = typeof benefitRules.$inferSelect;
export type InsertBenefitRule = z.infer<typeof insertBenefitRuleSchema>;

export type RuleExecutionLog = typeof ruleExecutionLogs.$inferSelect;
export type InsertRuleExecutionLog = z.infer<typeof insertRuleExecutionLogSchema>;

// Schemes & Benefits Module Tables

// Scheme definitions layer
export const schemes = pgTable("schemes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  schemeCode: text("scheme_code").notNull().unique(),
  schemeType: schemeTypeEnum("scheme_type").notNull(),
  description: text("description").notNull(),
  targetMarket: targetMarketEnum("target_market").notNull(),
  pricingModel: pricingModelEnum("pricing_model").notNull(),
  isActive: boolean("is_active").default(true),
  launchDate: timestamp("launch_date"),
  sunsetDate: timestamp("sunset_date"),
  minAge: integer("min_age").default(0),
  maxAge: integer("max_age"),
  geographicCoverage: text("geographic_coverage"), // JSON array of regions
  currency: text("currency").default("USD"),
  taxTreatment: text("tax_treatment"), // 'tax_free', 'taxable', 'partially_taxable'
  underwritingGuidelines: text("underwriting_guidelines"), // JSON with underwriting rules
  waitingPeriodRules: text("waiting_period_rules"), // JSON with waiting period configurations
  renewalTerms: text("renewal_terms"), // JSON with renewal conditions
  cancellationTerms: text("cancellation_terms"), // JSON with cancellation rules
  gracePeriodDays: integer("grace_period_days").default(30),
  createdById: integer("created_by_id").references(() => users.id),
  approvedById: integer("approved_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Scheme versions for version control
export const schemeVersions = pgTable("scheme_versions", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => schemes.id).notNull(),
  versionNumber: text("version_number").notNull(),
  versionDescription: text("version_description"),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").default(false),
  isDraft: boolean("is_draft").default(true),
  changeSummary: text("change_summary"), // Summary of changes from previous version
  migrationRules: text("migration_rules"), // JSON for member migration
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Plan tiers for Bronze/Silver/Gold/Platinum structure
export const planTiers = pgTable("plan_tiers", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => schemes.id).notNull(),
  tierLevel: planTierEnum("tier_level").notNull(),
  tierName: text("tier_name").notNull(),
  tierDescription: text("tier_description").notNull(),
  overallAnnualLimit: real("overall_annual_limit").notNull(),
  networkAccessLevel: text("network_access_level").notNull(), // 'tier_1_only', 'full_network', 'premium_network'
  roomTypeCoverage: text("room_type_coverage").notNull(), // 'general_ward', 'semi_private', 'private', 'deluxe'
  dentalCoverage: boolean("dental_coverage").default(false),
  opticalCoverage: boolean("optical_coverage").default(false),
  maternityCoverage: boolean("maternity_coverage").default(false),
  chronicCoverage: boolean("chronic_coverage").default(false),
  evacuationCoverage: boolean("evacuation_coverage").default(false),
  internationalCoverage: boolean("international_coverage").default(false),
  wellnessBenefits: boolean("wellness_benefits").default(false),
  premiumMultiplier: real("premium_multiplier").default(1.0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enhanced benefits structure (extends current benefits)
export const enhancedBenefits = pgTable("enhanced_benefits", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id").references(() => enhancedBenefits.id), // For hierarchical benefits
  benefitCode: text("benefit_code").notNull().unique(),
  benefitName: text("benefit_name").notNull(),
  benefitCategory: text("benefit_category").notNull(), // 'inpatient', 'outpatient', 'dental', 'optical', 'maternity', 'chronic', 'wellness', 'evacuation'
  benefitSubcategory: text("benefit_subcategory"), // 'consultation', 'procedure', 'medication', 'diagnostic'
  description: text("description").notNull(),
  clinicalDefinitions: text("clinical_definitions"), // JSON with clinical criteria
  icd10CoverageCodes: text("icd10_coverage_codes"), // JSON array of covered ICD-10 codes
  cptProcedureCodes: text("cpt_procedure_codes"), // JSON array of covered CPT codes
  isOptional: boolean("is_optional").default(false),
  isRider: boolean("is_rider").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Scheme benefit mappings
export const schemeBenefitMappings = pgTable("scheme_benefit_mappings", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => schemes.id).notNull(),
  planTierId: integer("plan_tier_id").references(() => planTiers.id).notNull(),
  benefitId: integer("benefit_id").references(() => enhancedBenefits.id).notNull(),
  isCovered: boolean("is_covered").default(true),
  coveragePercentage: real("coverage_percentage").default(100.0),
  annualLimit: real("annual_limit"),
  perVisitLimit: real("per_visit_limit"),
  waitingPeriodDays: integer("waiting_period_days").default(0),
  preAuthRequired: boolean("pre_auth_required").default(false),
  networkRestriction: text("network_restriction"), // 'any_provider', 'network_only', 'tier_1_only'
  referralRequired: boolean("referral_required").default(false),
  isActive: boolean("is_active").default(true),
  customTerms: text("custom_terms"), // JSON with custom coverage terms
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comprehensive cost-sharing rules
export const costSharingRules = pgTable("cost_sharing_rules", {
  id: serial("id").primaryKey(),
  schemeBenefitMappingId: integer("scheme_benefit_mapping_id").references(() => schemeBenefitMappings.id).notNull(),
  costSharingType: costSharingTypeEnum("cost_sharing_type").notNull(),
  costSharingValue: real("cost_sharing_value").notNull(),
  costSharingUnit: text("cost_sharing_unit").notNull(), // 'currency', 'percentage', 'visits'
  minimumAmount: real("minimum_amount"),
  maximumAmount: real("maximum_amount"),
  appliesTo: text("applies_to").notNull(), // 'all_claims', 'hospitalization_only', 'outpatient_only', 'specific_procedures'
  frequencyLimit: text("frequency_limit"),
  exemptionConditions: text("exemption_conditions"), // JSON with conditions where cost-sharing doesn't apply
  networkProviderDiscount: real("network_provider_discount").default(0.0),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comprehensive limits hierarchy
export const benefitLimits = pgTable("benefit_limits", {
  id: serial("id").primaryKey(),
  schemeBenefitMappingId: integer("scheme_benefit_mapping_id").references(() => schemeBenefitMappings.id).notNull(),
  limitType: limitTypeEnum("limit_type").notNull(),
  limitCategory: limitCategoryEnum("limit_category"),
  limitAmount: real("limit_amount").notNull(),
  limitUnit: text("limit_unit").notNull(), // 'currency', 'days', 'visits', 'procedures'
  limitPeriod: text("limit_period"), // 'annual', 'lifetime', 'per_admission', 'per_condition'
  ageMin: integer("age_min"),
  ageMax: integer("age_max"),
  gender: text("gender"), // 'male', 'female', 'all'
  conditionCriteria: text("condition_criteria"), // JSON with medical condition criteria
  resetConditions: text("reset_conditions"), // JSON with limit reset conditions
  carryOverAllowed: boolean("carry_over_allowed").default(false),
  carryOverPercentage: real("carry_over_percentage").default(0.0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Corporate customization system
export const corporateSchemeConfigs = pgTable("corporate_scheme_configs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  schemeId: integer("scheme_id").references(() => schemes.id).notNull(),
  configName: text("config_name").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  customTerms: text("custom_terms"), // JSON with company-specific modifications
  waiverConditions: text("waiver_conditions"), // JSON with waiting period waivers
  enhancedLimits: text("enhanced_limits"), // JSON with enhanced benefit limits
  customCostSharing: text("custom_cost_sharing"), // JSON with company-specific cost-sharing
  customNetworkAccess: text("custom_network_access"), // JSON with network modifications
  wellnessIntegration: text("wellness_integration"), // JSON with wellness program details
  isActive: boolean("is_active").default(true),
  approvedById: integer("approved_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employee grade benefits
export const employeeGradeBenefits = pgTable("employee_grade_benefits", {
  id: serial("id").primaryKey(),
  corporateConfigId: integer("corporate_config_id").references(() => corporateSchemeConfigs.id).notNull(),
  employeeGrade: employeeGradeEnum("employee_grade").notNull(),
  planTierId: integer("plan_tier_id").references(() => planTiers.id).notNull(),
  customLimits: text("custom_limits"), // JSON with grade-specific limits
  customCostSharing: text("custom_cost_sharing"), // JSON with grade-specific cost-sharing
  additionalBenefits: text("additional_benefits"), // JSON array of additional benefits for this grade
  enhancedCoverage: text("enhanced_coverage"), // JSON with enhanced coverage details
  premiumContribution: real("premium_contribution"), // Company contribution percentage
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dependent coverage rules
export const dependentCoverageRules = pgTable("dependent_coverage_rules", {
  id: serial("id").primaryKey(),
  corporateConfigId: integer("corporate_config_id").references(() => corporateSchemeConfigs.id).notNull(),
  dependentType: dependentTypeEnum("dependent_type").notNull(),
  maxAge: integer("max_age").notNull(),
  coveragePercentage: real("coverage_percentage").default(100.0),
  customLimits: text("custom_limits"), // JSON with dependent-specific limits
  additionalPremium: real("additional_premium"),
  coverageConditions: text("coverage_conditions"), // JSON with eligibility conditions
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Riders & add-ons system
export const benefitRiders = pgTable("benefit_riders", {
  id: serial("id").primaryKey(),
  riderCode: text("rider_code").notNull().unique(),
  riderName: text("rider_name").notNull(),
  riderType: text("rider_type").notNull(), // 'benefit_enhancement', 'additional_coverage', 'premium_protection'
  description: text("description").notNull(),
  baseSchemeId: integer("base_scheme_id").references(() => schemes.id).notNull(),
  applicableTiers: text("applicable_tiers"), // JSON array of plan tiers where rider can be added
  premiumMultiplier: real("premium_multiplier").notNull(),
  additionalBenefits: text("additional_benefits"), // JSON array of additional benefits provided
  enhancedLimits: text("enhanced_limits"), // JSON with limit enhancements
  eligibilityCriteria: text("eligibility_criteria"), // JSON with rider eligibility conditions
  waitingPeriodDays: integer("waiting_period_days").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Member rider selections
export const memberRiderSelections = pgTable("member_rider_selections", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  riderId: integer("rider_id").references(() => benefitRiders.id).notNull(),
  selectionDate: timestamp("selection_date").defaultNow().notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  premiumImpact: real("premium_impact").notNull(),
  waiverReason: text("waiver_reason"), // If premium is waived
  approvedById: integer("approved_by_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enterprise-grade rules engine
export const benefitRules = pgTable("benefit_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  ruleCategory: ruleCategoryEnum("rule_category").notNull(),
  ruleType: ruleTypeEnum("rule_type").notNull(),
  rulePriority: integer("rule_priority").default(0), // Higher numbers execute first
  conditionExpression: text("condition_expression").notNull(), // JSON-based rule condition
  actionExpression: text("action_expression").notNull(), // JSON-based rule action
  errorMessage: text("error_message"), // Error message if rule fails
  isMandatory: boolean("is_mandatory").default(false),
  isActive: boolean("is_active").default(true),
  version: text("version").notNull(),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rule execution logs
export const ruleExecutionLogs = pgTable("rule_execution_logs", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id),
  memberId: integer("member_id").references(() => members.id),
  ruleId: integer("rule_id").references(() => benefitRules.id).notNull(),
  executionDate: timestamp("execution_date").defaultNow().notNull(),
  executionContext: text("execution_context").notNull(), // JSON with data context during execution
  result: ruleResultEnum("result").notNull(),
  executionTime: integer("execution_time"), // Execution time in milliseconds
  modifiedFields: text("modified_fields"), // JSON with fields modified by rule
  errorMessage: text("error_message"),
  executedBy: text("executed_by").notNull(), // 'system', 'user_id'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// MEMBERS & CLIENTS MODULE ENHANCED TABLES
// ============================================================================

// Member Life Events Table - Track all member lifecycle events
export const memberLifeEvents = pgTable("member_life_events", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  eventType: lifeEventTypeEnum("event_type").notNull(),
  eventDate: date("event_date").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  reason: text("reason"),
  notes: text("notes"),
  processedBy: integer("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dependents Validation Rules Table - Define dependent eligibility rules
export const dependentRules = pgTable("dependent_rules", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  dependentType: dependentTypeEnum("dependent_type").notNull(),
  maxAge: integer("max_age"),
  maxCount: integer("max_count"),
  documentationRequired: text("documentation_required"), // JSON array of required documents
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Employee Grades Table - Corporate employee grade structure
export const employeeGrades = pgTable("employee_grades", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  gradeCode: text("grade_code").notNull(),
  gradeName: text("grade_name").notNull(),
  level: integer("level").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Member Documents table is already defined above (line 1246)

// Communication Logs Table - Track all member communications
export const communicationLogs = pgTable("communication_logs", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  companyId: integer("company_id").references(() => companies.id),
  communicationType: communicationTypeEnum("communication_type").notNull(),
  channel: communicationChannelEnum("channel").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveryStatus: deliveryStatusEnum("delivery_status").default("pending"),
  errorMessage: text("error_message"),
  templateId: integer("template_id"), // References notification_templates if available
});

// Consent Management Table - Track member consent for data processing
export const memberConsents = pgTable("member_consents", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  consentType: consentTypeEnum("consent_type").notNull(),
  consentGiven: boolean("consent_given").notNull(),
  consentDate: timestamp("consent_date").defaultNow().notNull(),
  expiryDate: date("expiry_date"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  documentVersion: text("document_version"),
  withdrawnAt: timestamp("withdrawn_at"),
  withdrawnReason: text("withdrawn_reason"),
});

// Audit Logs table is already defined above (line 1104)

// Wellness Activities Table - Track member health and wellness activities
export const wellnessActivities = pgTable("wellness_activities", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  activityType: text("activity_type").notNull(), // exercise, health_screening, vaccination, checkup, nutrition
  wellnessScore: integer("wellness_score"), // Calculated wellness score for this activity
  duration: integer("duration"), // Duration in minutes
  calories: integer("calories"), // Calories burned
  steps: integer("steps"), // Steps taken
  heartRate: integer("heart_rate"), // Heart rate during activity
  activityDate: date("activity_date").notNull(),
  notes: text("notes"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Risk Assessments Table - Store member risk assessment data
export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  riskScore: integer("risk_score").notNull(), // Overall risk score (0-100)
  riskCategory: text("risk_category").notNull(), // low, medium, high, very_high
  assessmentDate: date("assessment_date").notNull(),
  nextReviewDate: date("next_review_date"),
  factors: text("factors"), // JSON object containing risk factors
  recommendations: text("recommendations"), // JSON array of recommendations
  assessorId: integer("assessor_id").references(() => users.id),
  assessmentType: text("assessment_type").notNull(), // initial, periodic, event_based
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Healthcare Providers Table - Comprehensive provider information
export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  providerCode: text("provider_code").notNull().unique(),
  networkStatus: text("network_status").default("pending"), // active, inactive, pending, suspended
  specialties: text("specialties").array(), // Array of specialties
  locations: text("locations").array(), // Array of practice locations
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  website: text("website"),
  contractStatus: text("contract_status").default("draft"), // draft, active, expired, terminated
  contractType: text("contract_type").default("standard"), // standard, capitated, fee_for_service
  reimbursementRate: integer("reimbursement_rate").default(80), // Percentage of billed charges
  capitationRate: real("capitation_rate"), // Monthly rate per member for capitation
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  networkTier: text("network_tier").default("tier_1"), // tier_1, tier_2, tier_3
  participationLevel: text("participation_level").default("full"), // full, partial, limited
  qualityScore: real("quality_score").default(0), // 0-5 quality rating
  complianceScore: real("compliance_score").default(0), // 0-5 compliance rating
  satisfactionScore: real("satisfaction_score").default(0), // 0-5 patient satisfaction
  accreditationNumber: text("accreditation_number"),
  licenseNumber: text("license_number").notNull(),
  licenseExpiryDate: date("license_expiry_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// Basic Insert Schemas for Core Tables

// Basic Insert Schemas will be declared before usage
export const insertCompanyBenefitSchema = createInsertSchema(companyBenefits);
export const insertRegionSchema = createInsertSchema(regions);
export const insertMedicalInstitutionSchema = createInsertSchema(medicalInstitutions);
export const insertMedicalPersonnelSchema = createInsertSchema(medicalPersonnel);
export const insertPanelDocumentationSchema = createInsertSchema(panelDocumentation);
export const insertClaimSchema = createInsertSchema(claims);
export const insertCompanyPeriodSchema = createInsertSchema(companyPeriods);
export const insertAgeBandedRateSchema = createInsertSchema(ageBandedRates);
export const insertFamilyRateSchema = createInsertSchema(familyRates);
export const insertDiagnosisCodeSchema = createInsertSchema(diagnosisCodes);
export const insertPremiumPaymentSchema = createInsertSchema(premiumPayments);
export const insertClaimPaymentSchema = createInsertSchema(claimPayments);
export const insertProviderDisbursementSchema = createInsertSchema(providerDisbursements);
export const insertDisbursementItemSchema = createInsertSchema(disbursementItems);
export const insertInsuranceBalanceSchema = createInsertSchema(insuranceBalances);
export const insertEnhancedPremiumCalculationSchema = createInsertSchema(enhancedPremiumCalculations);
export const insertRiskAdjustmentFactorSchema = createInsertSchema(riskAdjustmentFactors);
export const insertHealthcareInflationRateSchema = createInsertSchema(healthcareInflationRates);
export const insertActuarialRateTableSchema = createInsertSchema(actuarialRateTables);
export const insertMedicalProcedureSchema = createInsertSchema(medicalProcedures);
export const insertProviderProcedureRateSchema = createInsertSchema(providerProcedureRates);
export const insertClaimProcedureItemSchema = createInsertSchema(claimProcedureItems);
export const insertUserSchema = createInsertSchema(users);
export const insertUserSessionSchema = createInsertSchema(userSessions);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertOnboardingSessionSchema = createInsertSchema(onboardingSessions);
export const insertOnboardingTaskSchema = createInsertSchema(onboardingTasks);
export const insertMemberDocumentSchema = createInsertSchema(memberDocuments);
export const insertOnboardingPreferenceSchema = createInsertSchema(onboardingPreferences);
export const insertActivationTokenSchema = createInsertSchema(activationTokens);
export const insertMemberPreferenceSchema = createInsertSchema(memberPreferences);
export const insertBehaviorAnalyticSchema = createInsertSchema(behaviorAnalytics);
export const insertPersonalizationScoreSchema = createInsertSchema(personalizationScores);
export const insertJourneyStageSchema = createInsertSchema(journeyStages);
export const insertRecommendationHistorySchema = createInsertSchema(recommendationHistory);
export const insertClaimAdjudicationResultSchema = createInsertSchema(claimAdjudicationResults);
export const insertMedicalNecessityValidationSchema = createInsertSchema(medicalNecessityValidations);
export const insertFraudDetectionResultSchema = createInsertSchema(fraudDetectionResults);
export const insertExplanationOfBenefitsSchema = createInsertSchema(explanationOfBenefits);
export const insertClaimAuditTrailSchema = createInsertSchema(claimAuditTrails);
export const insertBenefitUtilizationSchema = createInsertSchema(benefitUtilization);
export const insertMemberCardSchema = createInsertSchema(memberCards);
export const insertCardTemplateSchema = createInsertSchema(cardTemplates);
export const insertCardVerificationEventSchema = createInsertSchema(cardVerificationEvents);
export const insertCardProductionBatchSchema = createInsertSchema(cardProductionBatches);
export const insertProviderNetworkSchema = createInsertSchema(providerNetworks);
export const insertProviderNetworkAssignmentSchema = createInsertSchema(providerNetworkAssignments);
export const insertProviderContractSchema = createInsertSchema(providerContracts);
export const insertContractDocumentSchema = createInsertSchema(contractDocuments);
export const insertContractSignatureSchema = createInsertSchema(contractSignatures);
export const insertTariffCatalogSchema = createInsertSchema(tariffCatalogs);
export const insertTariffItemSchema = createInsertSchema(tariffItems);
export const insertPharmacyPriceListSchema = createInsertSchema(pharmacyPriceLists);
export const insertConsumablesPriceListSchema = createInsertSchema(consumablesPriceLists);
export const insertProviderOnboardingApplicationSchema = createInsertSchema(providerOnboardingApplications);
export const insertProviderVerificationChecklistSchema = createInsertSchema(providerVerificationChecklist);
export const insertProviderAccreditationSchema = createInsertSchema(providerAccreditations);
export const insertProviderPerformanceMetricSchema = createInsertSchema(providerPerformanceMetrics);
export const insertProviderComplianceMonitoringSchema = createInsertSchema(providerComplianceMonitoring);
export const insertProviderQualityScoreSchema = createInsertSchema(providerQualityScores);
export const insertProviderFinancialPerformanceSchema = createInsertSchema(providerFinancialPerformance);
export const insertProviderReferralNetworkSchema = createInsertSchema(providerReferralNetwork);
export const insertProviderEducationTrainingSchema = createInsertSchema(providerEducationTraining);
export const insertProviderClinicalExpertiseSchema = createInsertSchema(providerClinicalExpertise);

// Schemes & Benefits module insert schemas
export const insertSchemeSchema = createInsertSchema(schemes);
export const insertSchemeVersionSchema = createInsertSchema(schemeVersions);
export const insertPlanTierSchema = createInsertSchema(planTiers);
export const insertEnhancedBenefitSchema = createInsertSchema(enhancedBenefits);
export const insertSchemeBenefitMappingSchema = createInsertSchema(schemeBenefitMappings);
export const insertCostSharingRuleSchema = createInsertSchema(costSharingRules);
export const insertBenefitLimitSchema = createInsertSchema(benefitLimits);
export const insertCorporateSchemeConfigSchema = createInsertSchema(corporateSchemeConfigs);
export const insertEmployeeGradeBenefitSchema = createInsertSchema(employeeGradeBenefits);
export const insertDependentCoverageRuleSchema = createInsertSchema(dependentCoverageRules);
export const insertBenefitRiderSchema = createInsertSchema(benefitRiders);
export const insertMemberRiderSelectionSchema = createInsertSchema(memberRiderSelections);
export const insertBenefitRuleSchema = createInsertSchema(benefitRules);
export const insertRuleExecutionLogSchema = createInsertSchema(ruleExecutionLogs);

// Task Management Tables
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'escalated']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const taskCategoryEnum = pgEnum('task_category', ['follow_up', 'documentation', 'meeting', 'call', 'email', 'review', 'custom']);

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  // Entity relationships
  leadId: uuid('lead_id').references(() => leads.id),
  opportunityId: uuid('opportunity_id').references(() => salesOpportunities.id),
  memberId: integer('member_id').references(() => members.id),
  // Assignment
  assignedTo: integer('assigned_to').references(() => users.id),
  assignedToType: varchar('assigned_to_type', { length: 10 }).default('user'), // 'user' or 'agent'
  // Task details
  category: taskCategoryEnum('category').notNull(),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  status: taskStatusEnum('status').notNull().default('pending'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  completedBy: integer('completed_by').references(() => users.id),
  // Time tracking
  estimatedHours: decimal('estimated_hours', { precision: 5, scale: 2 }),
  actualHours: decimal('actual_hours', { precision: 5, scale: 2 }),
  // Task content
  checklist: text('checklist'), // JSON array
  tags: text('tags'), // JSON array
  notes: text('notes'),
  // Escalation
  escalatedAt: timestamp('escalated_at'),
  escalatedTo: integer('escalated_to').references(() => users.id),
  escalationReason: text('escalation_reason'),
  // Automation
  templateId: varchar('template_id', { length: 100 }),
  autoGenerated: boolean('auto_generated').default(false),
  // System
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
});

// Task Templates for automation
export const taskTemplates = pgTable('task_templates', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: taskCategoryEnum('category').notNull(),
  priority: taskPriorityEnum('priority').notNull(),
  estimatedDuration: integer('estimated_duration').notNull(), // in minutes
  checklist: text('checklist').notNull(), // JSON array
  autoAssignTo: varchar('auto_assign_to', { length: 20 }).notNull(), // 'lead_owner', 'opportunity_owner', 'team_lead', 'specific_role'
  dueDateOffset: text('due_date_offset').notNull(), // JSON with value, unit, from
  dependencies: text('dependencies'), // JSON array of template IDs
  recurringPattern: text('recurring_pattern'), // JSON with frequency, interval, endDate
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
});

// Notification System Tables
export const notificationTypeEnum = pgEnum('notification_type', ['email', 'sms', 'in_app', 'push', 'webhook']);
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms', 'mobile_app', 'web', 'api']);
export const notificationPriorityEnum = pgEnum('notification_priority', ['low', 'medium', 'high', 'urgent']);
export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'failed', 'scheduled', 'cancelled']);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Recipient
  recipientId: integer('recipient_id').notNull(),
  recipientType: varchar('recipient_type', { length: 10 }).notNull(), // 'user', 'agent', 'lead', 'member'
  // Content
  type: notificationTypeEnum('type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  subject: varchar('subject', { length: 255 }),
  message: text('message').notNull(),
  data: text('data'), // JSON with additional data
  // Delivery
  priority: notificationPriorityEnum('priority').notNull().default('medium'),
  status: notificationStatusEnum('status').notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  scheduledAt: timestamp('scheduled_at'),
  // Tracking
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  // Metadata
  metadata: text('metadata'), // JSON with metadata
  triggerEvent: varchar('trigger_event', { length: 100 }),
  templateId: varchar('template_id', { length: 100 }),
  // System
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const notificationTemplates = pgTable('notification_templates', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: notificationTypeEnum('type').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  variables: text('variables'), // JSON array of variables used in template
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  agentId: uuid('agent_id').references(() => agents.id),
  channels: text('channels').notNull(), // JSON with channel preferences
  categories: text('categories').notNull(), // JSON with category preferences
  quietHours: text('quiet_hours').notNull(), // JSON with quiet hours settings
  frequency: text('frequency').notNull(), // JSON with frequency preferences
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// CRM Module Insert Schemas
export const insertLeadSchema = createInsertSchema(leads);
export const insertSalesOpportunitySchema = createInsertSchema(salesOpportunities);
export const insertSalesActivitySchema = createInsertSchema(salesActivities);
export const insertSalesTeamSchema = createInsertSchema(salesTeams);
export const insertTerritorySchema = createInsertSchema(territories);
export const insertAgentSchema = createInsertSchema(agents);
export const insertCommissionTierSchema = createInsertSchema(commissionTiers);
export const insertCommissionTransactionSchema = createInsertSchema(commissionTransactions);
export const insertAgentPerformanceSchema = createInsertSchema(agentPerformance);
export const insertWorkflowDefinitionSchema = createInsertSchema(workflowDefinitions);
export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions);
export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertTaskTemplateSchema = createInsertSchema(taskTemplates);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates);
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences);

// ============================================================================
// COMPREHENSIVE FINANCE MANAGEMENT SYSTEM - MODULE 1: BILLING & INVOICING
// ============================================================================

// Finance Management Enums
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue', 'written_off', 'cancelled']);
export const invoiceTypeEnum = pgEnum('invoice_type', ['individual', 'corporate', 'group']);
export const lineItemTypeEnum = pgEnum('line_item_type', ['base_premium', 'dependent', 'adjustment', 'tax', 'discount']);
export const arAccountStatusEnum = pgEnum('ar_account_status', ['active', 'suspended', 'terminated', 'collection', 'write_off']);
export const collectionStatusEnum = pgEnum('collection_status', ['none', 'reminder', 'demand', 'agency', 'legal']);
export const billingCommunicationTypeEnum = pgEnum('billing_communication_type', ['payment_reminder', 'overdue_notice', 'suspension_warning', 'termination_notice', 'payment_receipt', 'invoice_sent', 'collection_notice']);
export const billingCommunicationStatusEnum = pgEnum('billing_communication_status', ['scheduled', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked']);
export const billingChannelEnum = pgEnum('billing_channel', ['email', 'sms', 'postal_mail', 'phone', 'portal']);

// Invoices table - Premium billing and invoicing
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  memberId: integer("member_id").references(() => members.id),
  companyId: integer("company_id").references(() => companies.id),
  invoiceType: invoiceTypeEnum("invoice_type").notNull(),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  billingPeriodStart: date("billing_period_start").notNull(),
  billingPeriodEnd: date("billing_period_end").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  totalAmount: real("total_amount").notNull(),
  subtotal: real("subtotal").notNull(),
  taxAmount: real("tax_amount").default(0),
  discountAmount: real("discount_amount").default(0),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  overdueAt: timestamp("overdue_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invoice line items table
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  itemType: lineItemTypeEnum("item_type").notNull(),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitRate: real("unit_rate").notNull(),
  amount: real("amount").notNull(),
  prorationFactor: real("proration_factor"),
  memberId: integer("member_id").references(() => members.id),
  benefitId: integer("benefit_id").references(() => benefits.id),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invoice payments table
export const invoicePayments = pgTable("invoice_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  paymentId: integer("payment_id"),
  amount: real("amount").notNull(),
  allocationDate: timestamp("allocation_date").defaultNow().notNull(),
  allocatedBy: integer("allocated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Accounts Receivable table
export const accountsReceivable = pgTable("accounts_receivable", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  companyId: integer("company_id").references(() => companies.id),
  currentBalance: real("current_balance").notNull().default(0),
  aging0Days: real("aging_0_days").notNull().default(0), // Current
  aging30Days: real("aging_30_days").notNull().default(0), // 0-30 days overdue
  aging60Days: real("aging_60_days").notNull().default(0), // 31-60 days overdue
  aging90Days: real("aging_90_days").notNull().default(0), // 61-90 days overdue
  aging90PlusDays: real("aging_90_plus_days").notNull().default(0), // 90+ days overdue
  creditLimit: real("credit_limit").notNull().default(0),
  accountStatus: arAccountStatusEnum("account_status").default("active").notNull(),
  lastPaymentDate: timestamp("last_payment_date"),
  suspensionDate: timestamp("suspension_date"),
  collectionStatus: collectionStatusEnum("collection_status").default("none").notNull(),
  badDebtReserve: real("bad_debt_reserve").notNull().default(0),
  writeOffAmount: real("write_off_amount").notNull().default(0),
  totalPaid: real("total_paid").notNull().default(0),
  totalBilled: real("total_billed").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Billing communications table
export const billingCommunications = pgTable("billing_communications", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  companyId: integer("company_id").references(() => companies.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  type: billingCommunicationTypeEnum("type").notNull(),
  templateId: integer("template_id"),
  channel: communicationChannelEnum("channel").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  subject: text("subject"),
  messageContent: text("message_content").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  sentDate: timestamp("sent_date"),
  status: communicationStatusEnum("status").default("scheduled").notNull(),
  deliveryAttempts: integer("delivery_attempts").default(0).notNull(),
  responseReceived: boolean("response_received").default(false).notNull(),
  responseDate: timestamp("response_date"),
  nextActionDate: timestamp("next_action_date"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Communication templates table
export const billingCommunicationTemplates = pgTable("billing_communication_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull().unique(),
  templateType: billingCommunicationTypeEnum("template_type").notNull(),
  channel: communicationChannelEnum("channel").notNull(),
  subjectTemplate: text("subject_template"),
  messageTemplate: text("message_template").notNull(),
  variables: text("variables"), // JSON array of template variables
  isActive: boolean("is_active").default(true).notNull(),
  language: text("language").default("en").notNull(),
  clientType: text("client_type").notNull(), // individual, corporate, both
  approvalRequired: boolean("approval_required").default(false).notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Communication rules table
export const communicationRules = pgTable("communication_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull().unique(),
  triggerEvent: text("trigger_event").notNull(),
  triggerCondition: text("trigger_condition").notNull(),
  templateId: integer("template_id").references(() => billingCommunicationTemplates.id).notNull(),
  channel: communicationChannelEnum("channel").notNull(),
  delayDays: integer("delay_days").default(0).notNull(),
  frequency: text("frequency").notNull(), // once, weekly, monthly
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(5).notNull(),
  clientType: text("client_type").notNull(), // individual, corporate, both
  stopOnPayment: boolean("stop_on_payment").default(true).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Collection workflows table
export const collectionWorkflows = pgTable("collection_workflows", {
  id: serial("id").primaryKey(),
  arRecordId: integer("ar_record_id").references(() => accountsReceivable.id).notNull(),
  workflowType: text("workflow_type").notNull(), // reminder, suspension, termination, collection_agency, legal_action
  triggerCondition: text("trigger_condition").notNull(),
  triggerDays: integer("trigger_days").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  templateId: integer("template_id").references(() => billingCommunicationTemplates.id),
  escalationRules: text("escalation_rules"), // JSON array of escalation rules
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Collection actions table
export const collectionActions = pgTable("collection_actions", {
  id: serial("id").primaryKey(),
  arRecordId: integer("ar_record_id").references(() => accountsReceivable.id).notNull(),
  actionType: text("action_type").notNull(), // contact_attempt, payment_arrangement, suspension, referral, write_off
 actionDate: timestamp("action_date").defaultNow().notNull(),
  outcome: text("outcome").notNull(),
  nextActionDate: timestamp("next_action_date"),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dunning rules table
export const dunningRules = pgTable("dunning_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull().unique(),
  agingThreshold: integer("aging_threshold").notNull(),
  actionType: text("action_type").notNull(), // email, sms, letter, phone, suspend, terminate
  templateId: integer("template_id").references(() => billingCommunicationTemplates.id),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(5).notNull(),
  frequency: text("frequency").notNull(), // once, weekly, monthly
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Finance Management Module 1 Insert Schemas
export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoicePaymentSchema = createInsertSchema(invoicePayments).omit({
  id: true,
  createdAt: true,
});

export const insertAccountsReceivableSchema = createInsertSchema(accountsReceivable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillingCommunicationSchema = createInsertSchema(billingCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillingCommunicationTemplateSchema = createInsertSchema(billingCommunicationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationRuleSchema = createInsertSchema(communicationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollectionWorkflowSchema = createInsertSchema(collectionWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollectionActionSchema = createInsertSchema(collectionActions).omit({
  id: true,
  createdAt: true,
});

export const insertDunningRuleSchema = createInsertSchema(dunningRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Finance Management Module 1 Types
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;

export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type InsertInvoicePayment = z.infer<typeof insertInvoicePaymentSchema>;

export type AccountsReceivable = typeof accountsReceivable.$inferSelect;
export type InsertAccountsReceivable = z.infer<typeof insertAccountsReceivableSchema>;

export type BillingCommunication = typeof billingCommunications.$inferSelect;
export type InsertBillingCommunication = z.infer<typeof insertBillingCommunicationSchema>;

export type BillingCommunicationTemplate = typeof billingCommunicationTemplates.$inferSelect;
export type InsertBillingCommunicationTemplate = z.infer<typeof insertBillingCommunicationTemplateSchema>;

export type CommunicationRule = typeof communicationRules.$inferSelect;
export type InsertCommunicationRule = z.infer<typeof insertCommunicationRuleSchema>;

export type CollectionWorkflow = typeof collectionWorkflows.$inferSelect;
export type InsertCollectionWorkflow = z.infer<typeof insertCollectionWorkflowSchema>;

export type CollectionAction = typeof collectionActions.$inferSelect;
export type InsertCollectionAction = z.infer<typeof insertCollectionActionSchema>;

export type DunningRule = typeof dunningRules.$inferSelect;
export type InsertDunningRule = z.infer<typeof insertDunningRuleSchema>;

// ============================================================================
// COMPREHENSIVE FINANCE MANAGEMENT SYSTEM - MODULE 2: PAYMENT MANAGEMENT
// ============================================================================

// Payment Management Enums
export const financePaymentStatusEnum = pgEnum('finance_payment_status', ['pending', 'completed', 'failed', 'reversed', 'refunded']);
export const paymentMethodTypeEnum = pgEnum('payment_method_type', ['bank', 'card', 'mobile_money', 'digital_wallet', 'ach', 'wire']);
export const paymentGatewayTypeEnum = pgEnum('payment_gateway_type', ['stripe', 'paypal', 'mpesa', 'bank_transfer', 'square', 'adyen']);
export const paymentNotificationTypeEnum = pgEnum('payment_notification_type', ['payment_receipt', 'payment_failure', 'payment_retry', 'upcoming_payment', 'auto_payment_confirmation', 'payment_method_expiry', 'payment_method_update_request', 'payment_allocation_confirmation', 'refund_confirmation', 'chargeback_notification', 'reversal_notification', 'payment_method_added', 'payment_method_removed', 'subscription_renewal', 'payment_reminder', 'overdue_payment', 'payment_plan_update']);
export const paymentNotificationChannelEnum = pgEnum('payment_notification_channel', ['email', 'sms', 'push', 'in_app', 'postal_mail', 'whatsapp']);
export const paymentNotificationStatusEnum = pgEnum('payment_notification_status', ['scheduled', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'replied']);
export const reconciliationStatusEnum = pgEnum('reconciliation_status', ['pending', 'in_progress', 'completed', 'requires_review']);
export const exceptionTypeEnum = pgEnum('exception_type', ['unmatched_payment', 'partial_match', 'overpayment', 'duplicate_payment', 'chargeback', 'refund_mismatch']);
export const exceptionSeverityEnum = pgEnum('exception_severity', ['low', 'medium', 'high', 'critical']);
export const paymentReversalTypeEnum = pgEnum('payment_reversal_type', ['chargeback', 'refund', 'bank_error', 'duplicate', 'fraud']);

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  companyId: integer("company_id").references(() => companies.id),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentMethod: paymentMethodTypeEnum("payment_method").notNull(),
  gatewayTransactionId: text("gateway_transaction_id"),
  gatewayProvider: text("gateway_provider").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  invoiceIds: integer("invoice_ids").array(), // Array of invoice IDs
  allocationDetails: text("allocation_details"), // JSON string for allocation details
  reversalReason: text("reversal_reason"),
  refundDetails: text("refund_details"), // JSON string for refund details
  processedDate: timestamp("processed_date"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0),
  nextRetryDate: timestamp("next_retry_date"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment methods table
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  companyId: integer("company_id").references(() => companies.id),
  type: paymentMethodTypeEnum("type").notNull(),
  gatewayProvider: text("gateway_provider").notNull(),
  tokenizedData: text("tokenized_data"), // Encrypted tokenized payment method details
  cardDetails: text("card_details"), // JSON string for card details (last4, brand, etc.)
  bankDetails: text("bank_details"), // JSON string for bank details
  mobileMoneyDetails: text("mobile_money_details"), // JSON string for mobile money details
  digitalWalletDetails: text("digital_wallet_details"), // JSON string for digital wallet details
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiryDate: timestamp("expiry_date"),
  lastUsedDate: timestamp("last_used_date"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment allocations table
export const paymentAllocations = pgTable("payment_allocations", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => payments.id).notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  amount: real("amount").notNull(),
  allocationType: text("allocation_type").notNull(), // full, partial, overpayment, prepayment
  allocationDate: timestamp("allocation_date").defaultNow().notNull(),
  allocatedBy: integer("allocated_by").references(() => users.id),
  method: text("method").default("auto").notNull(), // auto, manual
  confidence: real("confidence").default(0).notNull(), // 0-1 confidence score
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment reconciliations table
export const paymentReconciliations = pgTable("payment_reconciliations", {
  id: serial("id").primaryKey(),
  statementDate: date("statement_date").notNull(),
  totalPayments: integer("total_payments").notNull(),
  totalAmount: real("total_amount").notNull(),
  matchedPayments: integer("matched_payments").notNull(),
  matchedAmount: real("matched_amount").notNull(),
  unmatchedAmount: real("unmatched_amount").notNull(),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewDate: timestamp("review_date"),
  status: reconciliationStatusEnum("status").default("pending").notNull(),
  metadata: text("metadata").notNull(), // JSON string for reconciliation metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bank statement imports table
export const bankStatementImports = pgTable("bank_statement_imports", {
  id: serial("id").primaryKey(),
  financialInstitution: text("financial_institution").notNull(),
  accountNumber: text("account_number").notNull(),
  accountType: text("account_type").notNull(), // checking, savings, business
  statementPeriodStart: date("statement_period_start").notNull(),
  statementPeriodEnd: date("statement_period_end").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  importStatus: text("import_status").notNull(), // pending, processing, completed, failed, needs_review
  importedTransactions: integer("imported_transactions").notNull(),
  matchedTransactions: integer("matched_transactions").notNull(),
  exceptionsCount: integer("exceptions_count").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  processedDate: timestamp("processed_date"),
  errorDetails: text("error_details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bank transactions table
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  statementImportId: integer("statement_import_id").references(() => bankStatementImports.id).notNull(),
  transactionDate: date("transaction_date").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  balance: real("balance"),
  transactionType: text("transaction_type").notNull(), // credit, debit
  referenceNumber: text("reference_number"),
  checkNumber: text("check_number"),
  category: text("category"),
  status: text("status").default("unmatched").notNull(), // unmatched, matched, exception, excluded
  paymentId: integer("payment_id").references(() => payments.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  matchingScore: real("matching_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment reversals table
export const paymentReversals = pgTable("payment_reversals", {
  id: serial("id").primaryKey(),
  originalPaymentId: integer("original_payment_id").references(() => payments.id).notNull(),
  reversalAmount: real("reversal_amount").notNull(),
  reversalReason: text("reversal_reason").notNull(),
  reversalType: paymentReversalTypeEnum("reversal_type").notNull(),
  initiatedBy: integer("initiated_by").references(() => users.id).notNull(),
  initiatedDate: timestamp("initiated_date").defaultNow().notNull(),
  gatewayTransactionId: text("gateway_transaction_id"),
  status: text("status").default("pending").notNull(), // pending, processing, completed, failed
  evidence: text("evidence"), // JSON array of URLs to supporting documents
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  processedBy: integer("processed_by").references(() => users.id),
  processedDate: timestamp("processed_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment notifications table
export const paymentNotifications = pgTable("payment_notifications", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => payments.id),
  memberId: integer("member_id").references(() => members.id),
  companyId: integer("company_id").references(() => companies.id),
  type: paymentNotificationTypeEnum("type").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  subject: text("subject"),
  messageContent: text("message_content").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  sentDate: timestamp("sent_date"),
  status: notificationStatusEnum("status").default("scheduled").notNull(),
  deliveryAttempts: integer("delivery_attempts").default(0).notNull(),
  responseReceived: boolean("response_received").default(false).notNull(),
  responseDate: timestamp("response_date"),
  nextActionDate: timestamp("next_action_date"),
  metadata: text("metadata").notNull(), // JSON string for payment notification metadata
  templateId: integer("template_id").references(() => paymentNotificationTemplates.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment notification templates table
export const paymentNotificationTemplates = pgTable("payment_notification_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull().unique(),
  templateType: paymentNotificationTypeEnum("template_type").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  subjectTemplate: text("subject_template"),
  messageTemplate: text("message_template").notNull(),
  variables: text("variables"), // JSON array of template variables
  language: text("language").default("en").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  clientType: text("client_type").notNull(), // individual, corporate, both
  approvalRequired: boolean("approval_required").default(false).notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reconciliation exceptions table
export const reconciliationExceptions = pgTable("reconciliation_exceptions", {
  id: serial("id").primaryKey(),
  reconciliationId: integer("reconciliation_id").references(() => paymentReconciliations.id),
  type: exceptionTypeEnum("type").notNull(),
  severity: exceptionSeverityEnum("severity").notNull(),
  description: text("description").notNull(),
  details: text("details").notNull(), // JSON string for exception details
  status: text("status").default("open").notNull(), // open, investigating, resolved, closed
  assignedTo: integer("assigned_to").references(() => users.id),
  resolution: text("resolution"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Finance Management Module 2 Insert Schemas
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentAllocationSchema = createInsertSchema(paymentAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentReconciliationSchema = createInsertSchema(paymentReconciliations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankStatementImportSchema = createInsertSchema(bankStatementImports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentReversalSchema = createInsertSchema(paymentReversals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentNotificationSchema = createInsertSchema(paymentNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentNotificationTemplateSchema = createInsertSchema(paymentNotificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReconciliationExceptionSchema = createInsertSchema(reconciliationExceptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Finance Management Module 2 Types
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type InsertPaymentAllocation = z.infer<typeof insertPaymentAllocationSchema>;

export type PaymentReconciliation = typeof paymentReconciliations.$inferSelect;
export type InsertPaymentReconciliation = z.infer<typeof insertPaymentReconciliationSchema>;

export type BankStatementImport = typeof bankStatementImports.$inferSelect;
export type InsertBankStatementImport = z.infer<typeof insertBankStatementImportSchema>;

export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;

export type PaymentReversal = typeof paymentReversals.$inferSelect;
export type InsertPaymentReversal = z.infer<typeof insertPaymentReversalSchema>;

export type PaymentNotification = typeof paymentNotifications.$inferSelect;
export type InsertPaymentNotification = z.infer<typeof insertPaymentNotificationSchema>;

export type PaymentNotificationTemplate = typeof paymentNotificationTemplates.$inferSelect;
export type InsertPaymentNotificationTemplate = z.infer<typeof insertPaymentNotificationTemplateSchema>;

export type ReconciliationException = typeof reconciliationExceptions.$inferSelect;
export type InsertReconciliationException = z.infer<typeof insertReconciliationExceptionSchema>;

// ============================================================================
// COMPREHENSIVE FINANCE MANAGEMENT SYSTEM - MODULE 3: COMMISSION PAYMENTS
// ============================================================================

// Commission Management Enums
export const commissionStatusEnum = pgEnum('commission_status', ['accrued', 'earned', 'paid', 'clawed_back', 'adjusted']);
export const commissionFinanceTransactionTypeEnum = pgEnum('commission_finance_transaction_type', ['new_business', 'renewal', 'bonus', 'override', 'adjustment', 'clawback']);
export const clawbackTypeEnum = pgEnum('clawback_type', ['early_cancellation', 'policy_lapse', 'fraud', 'compliance', 'performance']);
export const paymentRunStatusEnum = pgEnum('payment_run_status', ['draft', 'pending_approval', 'approved', 'processing', 'processed', 'failed']);
export const auditStatusEnum = pgEnum('audit_status', ['pending', 'in_progress', 'completed', 'exceptions_found']);
export const auditTypeEnum = pgEnum('audit_type', ['pre_payment', 'post_payment', 'random', 'targeted', 'investigative']);
export const findingTypeEnum = pgEnum('finding_type', ['calculation_error', 'policy_violation', 'documentation_gap', 'compliance_issue', 'fraud_detection']);
export const findingSeverityEnum = pgEnum('finding_severity', ['low', 'medium', 'high', 'critical']);
export const adjustmentTypeEnum = pgEnum('adjustment_type', ['bonus', 'penalty', 'correction', 'retroactive', 'clawback_recovery']);
export const taxTypeEnum = pgEnum('tax_type', ['income_tax', 'withholding_tax', 'vat', 'gst']);
export const taxCalculationMethodEnum = pgEnum('tax_calculation_method', ['flat_rate', 'progressive', 'tiered']);
export const reportStatusEnum = pgEnum('report_status', ['generating', 'completed', 'failed']);
export const reportTypeEnum = pgEnum('report_type', ['summary', 'detailed', 'tax', 'compliance', 'agent_performance']);
export const leaderboardCategoryEnum = pgEnum('leaderboard_category', ['total_sales', 'new_business', 'renewals', 'commission_earned', 'growth_rate', 'customer_satisfaction', 'quality_score']);
export const performancePeriodTypeEnum = pgEnum('performance_period_type', ['daily', 'weekly', 'monthly', 'quarterly', 'annual']);

// Commission accruals table
export const commissionAccruals = pgTable("commission_accruals", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  policyId: integer("policy_id").references(() => policies.id),
  productId: integer("product_id").references(() => benefits.id),
  memberId: integer("member_id").references(() => members.id),
  companyId: integer("company_id").references(() => companies.id),
  transactionId: text("transaction_id").notNull().unique(),
  originalCalculation: text("original_calculation").notNull(), // JSON string for original calculation result
  accrualDate: timestamp("accrual_date").defaultNow().notNull(),
  earnedDate: timestamp("earned_date").notNull(),
  payableDate: timestamp("payable_date").notNull(),
  status: commissionStatusEnum("status").default("accrued").notNull(),
  amount: real("amount").notNull(),
  paidAmount: real("paid_amount").default(0).notNull(),
  clawbackAmount: real("clawback_amount").default(0).notNull(),
  adjustments: text("adjustments"), // JSON array of adjustment details
  paymentRunId: integer("payment_run_id").references(() => commissionPaymentRuns.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Commission payment runs table
export const commissionPaymentRuns = pgTable("commission_payment_runs", {
  id: serial("id").primaryKey(),
  runName: text("run_name").notNull(),
  runDate: timestamp("run_date").defaultNow().notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  status: paymentRunStatusEnum("status").default("draft").notNull(),
  totalAgents: integer("total_agents").notNull(),
  totalAmount: real("total_amount").notNull(),
  totalTaxWithheld: real("total_tax_withheld").notNull(),
  totalNetAmount: real("total_net_amount").notNull(),
  agentPayments: integer("agent_payments").array().default([]), // Array of agent payment IDs
  adjustments: integer("adjustments").array().default([]), // Array of adjustment IDs
  exceptions: integer("exceptions").array().default([]), // Array of exception IDs
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  processedBy: integer("processed_by").references(() => users.id),
  processedDate: timestamp("processed_date"),
  paymentBatchId: text("payment_batch_id"),
  bankTransferFile: text("bank_transfer_file"),
  reportFile: text("report_file"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agent commission payments table
export const agentCommissionPayments = pgTable("agent_commission_payments", {
  id: serial("id").primaryKey(),
  paymentRunId: integer("payment_run_id").references(() => commissionPaymentRuns.id).notNull(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  agentName: text("agent_name").notNull(),
  totalCommission: real("total_commission").notNull(),
  taxWithheld: real("tax_withheld").notNull(),
  netAmount: real("net_amount").notNull(),
  currency: text("currency").default("USD").notNull(),
  paymentMethod: text("payment_method").notNull(), // bank_transfer, check, direct_deposit
  bankDetails: text("bank_details").notNull(), // JSON string for bank details
  accrualIds: integer("accrual_ids").array().notNull(), // Array of commission accrual IDs
  breakdown: text("breakdown").notNull(), // JSON string for payment breakdown
  status: text("status").default("pending").notNull(), // pending, processing, processed, failed, reversed
  transactionId: text("transaction_id"),
  processedDate: timestamp("processed_date"),
  failureReason: text("failure_reason"),
  reversalDate: timestamp("reversal_date"),
  reversalReason: text("reversal_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment run adjustments table
export const paymentRunAdjustments = pgTable("payment_run_adjustments", {
  id: serial("id").primaryKey(),
  paymentRunId: integer("payment_run_id").references(() => commissionPaymentRuns.id).notNull(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  adjustmentType: adjustmentTypeEnum("adjustment_type").notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  approvedBy: integer("approved_by").references(() => users.id).notNull(),
  approvedDate: timestamp("approved_date").defaultNow().notNull(),
  category: text("category").notNull(), // performance, compliance, administrative, retroactive
  relatedPeriodStart: date("related_period_start"),
  relatedPeriodEnd: date("related_period_end"),
  supportingDocuments: text("supporting_documents").array(), // JSON array of file URLs
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment run exceptions table
export const paymentRunExceptions = pgTable("payment_run_exceptions", {
  id: serial("id").primaryKey(),
  paymentRunId: integer("payment_run_id").references(() => commissionPaymentRuns.id).notNull(),
  agentId: integer("agent_id").references(() => agents.id),
  exceptionType: text("exception_type").notNull(), // compliance_issue, payment_method_error, tax_issue, calculation_error, bank_error
  severity: text("severity").notNull(), // low, medium, high, critical
  description: text("description").notNull(),
  impact: real("impact").notNull(), // Financial impact
  resolution: text("resolution"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedDate: timestamp("resolved_date"),
  status: text("status").default("open").notNull(), // open, investigating, resolved, escalated
  escalationLevel: integer("escalation_level").default(1).notNull(),
  nextFollowUp: timestamp("next_follow_up"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tax configuration table
export const taxConfigurations = pgTable("tax_configurations", {
  id: serial("id").primaryKey(),
  country: text("country").notNull(),
  state: text("state"),
  taxType: taxTypeEnum("tax_type").notNull(),
  taxRate: real("tax_rate").notNull(),
  thresholdAmount: real("threshold_amount").default(0).notNull(),
  taxExemptAmount: real("tax_exempt_amount").default(0).notNull(),
  calculationMethod: taxCalculationMethodEnum("calculation_method").default("flat_rate").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date"),
  filingRequirements: text("filing_requirements"), // JSON array of filing requirements
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tax withholding calculations table
export const taxWithholdingCalculations = pgTable("tax_withholding_calculations", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  paymentAmount: real("payment_amount").notNull(),
  grossAmount: real("gross_amount").notNull(),
  taxableAmount: real("taxable_amount").notNull(),
  taxRate: real("tax_rate").notNull(),
  taxWithheld: real("tax_withheld").notNull(),
  netAmount: real("net_amount").notNull(),
  taxYear: integer("tax_year").notNull(),
  taxPeriod: text("tax_period").notNull(),
  taxConfigurationId: integer("tax_configuration_id").references(() => taxConfigurations.id),
  exemptions: text("exemptions"), // JSON array of tax exemptions
  calculations: text("calculations"), // JSON array of calculation details
  paymentRunId: integer("payment_run_id").references(() => commissionPaymentRuns.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Commission audits table
export const commissionAudits = pgTable("commission_audits", {
  id: serial("id").primaryKey(),
  paymentRunId: integer("payment_run_id").references(() => commissionPaymentRuns.id),
  auditType: auditTypeEnum("audit_type").notNull(),
  auditedBy: integer("audited_by").references(() => users.id).notNull(),
  auditDate: timestamp("audit_date").defaultNow().notNull(),
  status: auditStatusEnum("status").default("pending").notNull(),
  agentsAudited: integer("agents_audited").notNull(),
  totalAmount: real("total_amount").notNull(),
  exceptionsFound: integer("exceptions_found").default(0).notNull(),
  adjustmentsMade: integer("adjustments_made").default(0).notNull(),
  findings: text("findings"), // JSON array of audit findings
  recommendations: text("recommendations").array(), // JSON array of recommendations
  correctiveActions: text("corrective_actions").array(), // JSON array of corrective actions
  reportGenerated: boolean("report_generated").default(false).notNull(),
  reportFile: text("report_file"),
  score: integer("score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit findings table
export const auditFindings = pgTable("audit_findings", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").references(() => commissionAudits.id).notNull(),
  agentId: integer("agent_id").references(() => agents.id),
  findingType: findingTypeEnum("finding_type").notNull(),
  severity: findingSeverityEnum("severity").notNull(),
  description: text("description").notNull(),
  financialImpact: real("financial_impact").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  status: text("status").default("open").notNull(), // open, in_progress, resolved
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedDate: timestamp("resolved_date"),
  evidence: text("evidence").array(), // JSON array of supporting evidence
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agent performance metrics table
export const agentPerformanceMetrics = pgTable("agent_performance_metrics", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  period: text("period").notNull(),
  periodType: performancePeriodTypeEnum("period_type").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  policiesSold: integer("policies_sold").notNull(),
  premiumVolume: real("premium_volume").notNull(),
  commissionEarned: real("commission_earned").notNull(),
  conversionRate: real("conversion_rate").notNull(),
  retentionRate: real("retention_rate").notNull(),
  averagePolicySize: real("average_policy_size").notNull(),
  tierLevel: text("tier_level").notNull(),
  performanceScore: integer("performance_score"),
  qualityScore: integer("quality_score"),
  customerSatisfaction: real("customer_satisfaction"),
  claimRatio: real("claim_ratio"),
  productivityMetrics: text("productivity_metrics"), // JSON string for productivity metrics
  ranking: text("ranking"), // JSON string for ranking data
  trends: text("trends"), // JSON string for trend data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agent leaderboards table
export const agentLeaderboards = pgTable("agent_leaderboards", {
  id: serial("id").primaryKey(),
  leaderboardCategory: leaderboardCategoryEnum("leaderboard_category").notNull(),
  period: text("period").notNull(),
  periodType: performancePeriodTypeEnum("period_type").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  rankings: text("rankings").notNull(), // JSON array of leaderboard entries
  summary: text("summary").notNull(), // JSON string for summary statistics
  trends: text("trends"), // JSON string for trend data
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  generatedBy: integer("generated_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Commission reports table
export const commissionReports = pgTable("commission_reports", {
  id: serial("id").primaryKey(),
  reportId: text("report_id").notNull().unique(),
  reportType: reportTypeEnum("report_type").notNull(),
  reportPeriod: text("report_period").notNull(),
  generatedDate: timestamp("generated_date").defaultNow().notNull(),
  generatedBy: integer("generated_by").references(() => users.id).notNull(),
  status: reportStatusEnum("status").notNull(),
  data: text("data").notNull(), // JSON string for report data
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  format: text("format"), // pdf, excel, csv
  parameters: text("parameters"), // JSON string for report parameters
  filters: text("filters"), // JSON string for applied filters
  errorMessage: text("error_message"),
  accessLevel: text("access_level").default("all").notNull(), // all, management, executive
  downloads: integer("downloads").default(0),
  lastDownloaded: timestamp("last_downloaded"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Policies table (needed for commission accruals)
export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id),
  companyId: integer("company_id").references(() => companies.id),
  agentId: integer("agent_id").references(() => agents.id),
  policyNumber: text("policy_number").notNull().unique(),
  policyType: text("policy_type").notNull(), // individual, corporate, family, group
  productType: text("product_type").notNull(),
  premiumAmount: real("premium_amount").notNull(),
  coverageAmount: real("coverage_amount").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Finance Management Module 3 Insert Schemas
export const insertCommissionAccrualSchema = createInsertSchema(commissionAccruals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommissionPaymentRunSchema = createInsertSchema(commissionPaymentRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentCommissionPaymentSchema = createInsertSchema(agentCommissionPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentRunAdjustmentSchema = createInsertSchema(paymentRunAdjustments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentRunExceptionSchema = createInsertSchema(paymentRunExceptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaxConfigurationSchema = createInsertSchema(taxConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaxWithholdingCalculationSchema = createInsertSchema(taxWithholdingCalculations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommissionAuditSchema = createInsertSchema(commissionAudits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditFindingSchema = createInsertSchema(auditFindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentPerformanceMetricSchema = createInsertSchema(agentPerformanceMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentLeaderboardSchema = createInsertSchema(agentLeaderboards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommissionReportSchema = createInsertSchema(commissionReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Finance Management Module 3 Types
export type CommissionAccrual = typeof commissionAccruals.$inferSelect;
export type InsertCommissionAccrual = z.infer<typeof insertCommissionAccrualSchema>;

export type CommissionPaymentRun = typeof commissionPaymentRuns.$inferSelect;
export type InsertCommissionPaymentRun = z.infer<typeof insertCommissionPaymentRunSchema>;

export type AgentCommissionPayment = typeof agentCommissionPayments.$inferSelect;
export type InsertAgentCommissionPayment = z.infer<typeof insertAgentCommissionPaymentSchema>;

export type PaymentRunAdjustment = typeof paymentRunAdjustments.$inferSelect;
export type InsertPaymentRunAdjustment = z.infer<typeof insertPaymentRunAdjustmentSchema>;

export type PaymentRunException = typeof paymentRunExceptions.$inferSelect;
export type InsertPaymentRunException = z.infer<typeof insertPaymentRunExceptionSchema>;

export type TaxConfiguration = typeof taxConfigurations.$inferSelect;
export type InsertTaxConfiguration = z.infer<typeof insertTaxConfigurationSchema>;

export type TaxWithholdingCalculation = typeof taxWithholdingCalculations.$inferSelect;
export type InsertTaxWithholdingCalculation = z.infer<typeof insertTaxWithholdingCalculationSchema>;

export type CommissionAudit = typeof commissionAudits.$inferSelect;
export type InsertCommissionAudit = z.infer<typeof insertCommissionAuditSchema>;

export type AuditFinding = typeof auditFindings.$inferSelect;
export type InsertAuditFinding = z.infer<typeof insertAuditFindingSchema>;

export type AgentPerformanceMetric = typeof agentPerformanceMetrics.$inferSelect;
export type InsertAgentPerformanceMetric = z.infer<typeof insertAgentPerformanceMetricSchema>;

export type AgentLeaderboard = typeof agentLeaderboards.$inferSelect;
export type InsertAgentLeaderboard = z.infer<typeof insertAgentLeaderboardSchema>;

export type CommissionReport = typeof commissionReports.$inferSelect;
export type InsertCommissionReport = z.infer<typeof insertCommissionReportSchema>;

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

// ========================================
// FINANCE MANAGEMENT MODULE 4: CLAIMS FINANCIAL MANAGEMENT
// ========================================

// Enums for Claims Financial Management
export enum ClaimReserveType {
  INCURRED_LOSS = 'INCURRED_LOSS',
  EXPENSE = 'EXPENSE',
  SALVAGE_RECOVERY = 'SALVAGE_RECOVERY',
  LEGAL_EXPENSES = 'LEGAL_EXPENSES'
}

export enum ClaimReserveStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  EXHAUSTED = 'EXHAUSTED',
  SUPERSEDED = 'SUPERSEDED'
}

export enum ClaimPaymentType {
  INDEMNITY = 'INDEMNITY',
  EXPENSE = 'EXPENSE',
  LEGAL = 'LEGAL',
  MEDICAL = 'MEDICAL',
  REHABILITATION = 'REHABILITATION',
  LOSS_OF_EARNINGS = 'LOSS_OF_EARNINGS'
}

export enum ClaimPaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  ESCALATED = 'ESCALATED'
}

export enum ClaimApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export enum FinancialTransactionType {
  PAYMENT_REQUEST = 'PAYMENT_REQUEST',
  PAYMENT_EXECUTION = 'PAYMENT_EXECUTION',
  RESERVE_INCREASE = 'RESERVE_INCREASE',
  RESERVE_DECREASE = 'RESERVE_DECREASE',
  RECOVERY_RECEIVED = 'RECOVERY_RECEIVED',
  EXPENSE_ALLOCATION = 'EXPENSE_ALLOCATION'
}

export enum FinancialTransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED'
}

// Claim Reserves Table - Financial reserves set aside for claims
export const claimReserves = pgTable('claim_reserves', {
  id: serial('id').primaryKey(),
  claimId: integer('claim_id').references(() => claims.id, { onDelete: 'cascade' }).notNull(),
  reserveType: claimReserveTypeEnum('reserve_type').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: claimReserveStatusEnum('status').notNull().default(ClaimReserveStatus.ACTIVE),
  notes: text('notes'),
  reservedAt: timestamp('reserved_at').notNull().defaultNow(),
  lastAdjustmentAt: timestamp('last_adjustment_at'),
  lastAdjustmentBy: integer('last_adjustment_by').references(() => users.id),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  claimIdx: index('claim_reserves_claim_idx').on(table.claimId),
  statusIdx: index('claim_reserves_status_idx').on(table.status),
  typeIdx: index('claim_reserves_type_idx').on(table.reserveType)
}));

// Claim Reserve Transactions Table - History of reserve changes
export const claimReserveTransactions = pgTable('claim_reserve_transactions', {
  id: serial('id').primaryKey(),
  reserveId: integer('reserve_id').references(() => claimReserves.id, { onDelete: 'cascade' }).notNull(),
  transactionType: varchar('transaction_type', { length: 20 }).notNull(), // INITIAL, ADJUSTMENT, RELEASE, CLOSE
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  previousAmount: decimal('previous_amount', { precision: 15, scale: 2 }).notNull(),
  newAmount: decimal('new_amount', { precision: 15, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  reserveIdx: index('claim_reserve_transactions_reserve_idx').on(table.reserveId),
  transactionTypeIdx: index('claim_reserve_transactions_type_idx').on(table.transactionType),
  createdAtIdx: index('claim_reserve_transactions_created_idx').on(table.createdAt)
}));

// Claim Payments Table - Actual payments made for claims
export const claimFinancePayments = pgTable('claim_finance_payments', {
  id: serial('id').primaryKey(),
  claimId: integer('claim_id').references(() => claims.id, { onDelete: 'cascade' }).notNull(),
  paymentType: claimPaymentTypeEnum('claim_payment_type').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  description: text('description').notNull(),
  payeeName: varchar('payee_name', { length: 255 }).notNull(),
  payeeType: varchar('payee_type', { length: 20 }).notNull(), // MEMBER, PROVIDER, LAWYER, OTHER
  payeeReference: varchar('payee_reference', { length: 100 }),
  paymentMethod: varchar('payment_method', { length: 50 }), // BANK_TRANSFER, CHECK, MOBILE_MONEY, CREDIT_CARD
  paymentReference: varchar('payment_reference', { length: 100 }),
  status: claimPaymentStatusEnum('claim_payment_status').notNull().default(ClaimPaymentStatus.PENDING),
  dueDate: timestamp('due_date').notNull(),
  requestedBy: integer('requested_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  executedBy: integer('executed_by').references(() => users.id),
  executedAt: timestamp('executed_at'),
  completedAt: timestamp('completed_at'),
  confirmedBy: integer('confirmed_by').references(() => users.id),
  failureReason: text('failure_reason'),
  failureCode: varchar('failure_code', { length: 50 }),
  confirmationData: json('confirmation_data'),
  attachments: json('attachments'), // Array of file references
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  claimIdx: index('claim_payments_claim_idx').on(table.claimId),
  statusIdx: index('claim_payments_status_idx').on(table.status),
  paymentTypeIdx: index('claim_payments_type_idx').on(table.paymentType),
  dueDateIdx: index('claim_payments_due_date_idx').on(table.dueDate),
  payeeTypeIdx: index('claim_payments_payee_type_idx').on(table.payeeType)
}));

// Claim Approval Workflows Table - Workflow management for claim approvals
export const claimApprovalWorkflows = pgTable('claim_approval_workflows', {
  id: serial('id').primaryKey(),
  claimId: integer('claim_id').references(() => claims.id, { onDelete: 'cascade' }).notNull(),
  paymentId: integer('payment_id').references(() => claimPayments.id, { onDelete: 'cascade' }),
  workflowType: varchar('workflow_type', { length: 50 }).notNull(), // CLAIM_APPROVAL, PAYMENT_APPROVAL, RESERVE_APPROVAL
  currentStep: integer('current_step').notNull().default(1),
  totalSteps: integer('total_steps'),
  status: claimApprovalStatusEnum('claim_approval_status').notNull().default(ClaimApprovalStatus.PENDING),
  initiatorId: integer('initiator_id').references(() => users.id).notNull(),
  currentAssigneeId: integer('current_assignee_id').references(() => users.id),
  priority: varchar('priority', { length: 20 }).default('NORMAL'), // LOW, NORMAL, HIGH, URGENT
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  metadata: json('metadata'), // Additional workflow-specific data
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  claimIdx: index('claim_approval_workflows_claim_idx').on(table.claimId),
  paymentIdx: index('claim_approval_workflows_payment_idx').on(table.paymentId),
  statusIdx: index('claim_approval_workflows_status_idx').on(table.status),
  assigneeIdx: index('claim_approval_workflows_assignee_idx').on(table.currentAssigneeId),
  workflowTypeIdx: index('claim_approval_workflows_type_idx').on(table.workflowType)
}));

// Claim Approval Steps Table - Individual steps in approval workflows
export const claimApprovalSteps = pgTable('claim_approval_steps', {
  id: serial('id').primaryKey(),
  workflowId: integer('workflow_id').references(() => claimApprovalWorkflows.id, { onDelete: 'cascade' }).notNull(),
  stepNumber: integer('step_number').notNull(),
  stepType: varchar('step_type', { length: 50 }).notNull(), // REVIEW, APPROVAL, VERIFICATION, NOTIFICATION
  stepName: varchar('step_name', { length: 100 }).notNull(),
  description: text('description'),
  assignedTo: integer('assigned_to').references(() => users.id),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING, IN_PROGRESS, APPROVED, REJECTED, SKIPPED
  decision: varchar('decision', { length: 20 }), // APPROVED, REJECTED, NEEDS_INFO
  comments: text('comments'),
  attachments: json('attachments'),
  completedAt: timestamp('completed_at'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  workflowIdx: index('claim_approval_steps_workflow_idx').on(table.workflowId),
  stepNumberIdx: index('claim_approval_steps_step_number_idx').on(table.stepNumber),
  assignedToIdx: index('claim_approval_steps_assigned_to_idx').on(table.assignedTo),
  statusIdx: index('claim_approval_steps_status_idx').on(table.status)
}));

// Claim Financial Transactions Table - All financial transactions related to claims
export const claimFinancialTransactions = pgTable('claim_financial_transactions', {
  id: serial('id').primaryKey(),
  claimId: integer('claim_id').references(() => claims.id, { onDelete: 'cascade' }).notNull(),
  transactionType: financialTransactionTypeEnum('transaction_type').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: financialTransactionStatusEnum('status').notNull().default(FinancialTransactionStatus.PENDING),
  description: text('description').notNull(),
  referenceId: integer('reference_id'), // References payment_id, reserve_id, or other entity
  paymentReference: varchar('payment_reference', { length: 100 }),
  category: varchar('category', { length: 50 }), // For categorizing transactions
  glAccountCode: varchar('gl_account_code', { length: 20 }), // General ledger account code
  costCenter: varchar('cost_center', { length: 20 }),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }),
  metadata: json('metadata'), // Additional transaction-specific data
  approvedBy: integer('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  claimIdx: index('claim_financial_transactions_claim_idx').on(table.claimId),
  transactionTypeIdx: index('claim_financial_transactions_type_idx').on(table.transactionType),
  statusIdx: index('claim_financial_transactions_status_idx').on(table.status),
  referenceIdx: index('claim_financial_transactions_reference_idx').on(table.referenceId),
  createdAtIdx: index('claim_financial_transactions_created_idx').on(table.createdAt),
  glAccountIdx: index('claim_financial_transactions_gl_account_idx').on(table.glAccountCode)
}));

// Claim Analytics Table - Pre-computed analytics for claims
export const claimAnalytics = pgTable('claim_analytics', {
  id: serial('id').primaryKey(),
  claimId: integer('claim_id').references(() => claims.id, { onDelete: 'cascade' }).notNull().unique(),
  totalIncurred: decimal('total_incurred', { precision: 15, scale: 2 }).notNull().default('0'),
  totalPaid: decimal('total_paid', { precision: 15, scale: 2 }).notNull().default('0'),
  totalReserved: decimal('total_reserved', { precision: 15, scale: 2 }).notNull().default('0'),
  outstandingReserve: decimal('outstanding_reserve', { precision: 15, scale: 2 }).notNull().default('0'),
  recoveryAmount: decimal('recovery_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  netIncurred: decimal('net_incurred', { precision: 15, scale: 2 }).notNull().default('0'),
  settlementRatio: decimal('settlement_ratio', { precision: 5, scale: 4 }),
  reserveAdequacyRatio: decimal('reserve_adequacy_ratio', { precision: 5, scale: 4 }),
  paymentEfficiency: decimal('payment_efficiency', { precision: 5, scale: 4 }),
  costContainment: decimal('cost_containment', { precision: 5, scale: 4 }),
  averagePaymentTime: integer('average_payment_time'), // in days
  paymentCount: integer('payment_count').notNull().default(0),
  lastPaymentDate: timestamp('last_payment_date'),
  lastReserveAdjustmentDate: timestamp('last_reserve_adjustment_date'),
  riskScore: decimal('risk_score', { precision: 3, scale: 2 }), // 0-100 risk assessment
  complexity: varchar('complexity', { length: 20 }), // LOW, MEDIUM, HIGH, VERY_HIGH
  analyticsData: json('analytics_data'), // Additional analytics fields
  lastCalculatedAt: timestamp('last_calculated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  claimIdx: index('claim_analytics_claim_idx').on(table.claimId).unique(),
  lastCalculatedIdx: index('claim_analytics_last_calculated_idx').on(table.lastCalculatedAt),
  riskScoreIdx: index('claim_analytics_risk_score_idx').on(table.riskScore)
}));

// Claim Financial Metrics Table - Key performance indicators
export const claimFinancialMetrics = pgTable('claim_financial_metrics', {
  id: serial('id').primaryKey(),
  claimId: integer('claim_id').references(() => claims.id, { onDelete: 'cascade' }).notNull().unique(),
  metricPeriod: varchar('metric_period', { length: 20 }).notNull(), // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  metricDate: date('metric_date').notNull(),
  totalIncurred: decimal('total_incurred', { precision: 15, scale: 2 }).notNull().default('0'),
  totalPaid: decimal('total_paid', { precision: 15, scale: 2 }).notNull().default('0'),
  totalReserved: decimal('total_reserved', { precision: 15, scale: 2 }).notNull().default('0'),
  outstandingReserve: decimal('outstanding_reserve', { precision: 15, scale: 2 }).notNull().default('0'),
  incurredLoss: decimal('incurred_loss', { precision: 15, scale: 2 }).notNull().default('0'),
  expenseRatio: decimal('expense_ratio', { precision: 5, scale: 4 }),
  lossRatio: decimal('loss_ratio', { precision: 5, scale: 4 }),
  combinedRatio: decimal('combined_ratio', { precision: 5, scale: 4 }),
  reserveChange: decimal('reserve_change', { precision: 15, scale: 2 }),
  paymentVelocity: decimal('payment_velocity', { precision: 5, scale: 2 }), // Payments per day
  settlementSpeed: integer('settlement_speed'), // Days to settlement
  costEfficiency: decimal('cost_efficiency', { precision: 5, scale: 4 }),
  recoveryRate: decimal('recovery_rate', { precision: 5, scale: 4 }),
  predictedFinalCost: decimal('predicted_final_cost', { precision: 15, scale: 2 }),
  confidenceLevel: decimal('confidence_level', { precision: 3, scale: 2 }), // 0-100
  customMetrics: json('custom_metrics'), // Additional custom metrics
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  claimPeriodIdx: index('claim_financial_metrics_claim_period_idx').on(table.claimId, table.metricPeriod).unique(),
  metricDateIdx: index('claim_financial_metrics_date_idx').on(table.metricDate),
  lossRatioIdx: index('claim_financial_metrics_loss_ratio_idx').on(table.lossRatio)
}));

// Schema Validation
export const claimReserveTypeEnum = pgEnum('reserve_type', Object.values(ClaimReserveType));
export const claimReserveStatusEnum = pgEnum('reserve_status', Object.values(ClaimReserveStatus));
export const claimPaymentTypeEnum = pgEnum('claim_payment_type', Object.values(ClaimPaymentType));
export const claimPaymentStatusEnum = pgEnum('claim_payment_status', Object.values(ClaimPaymentStatus));
export const claimApprovalStatusEnum = pgEnum('claim_approval_status', Object.values(ClaimApprovalStatus));
export const financialTransactionTypeEnum = pgEnum('financial_transaction_type', Object.values(FinancialTransactionType));
export const financialTransactionStatusEnum = pgEnum('financial_transaction_status', Object.values(FinancialTransactionStatus));

// Zod schemas for validation
export const insertClaimReserveSchema = createInsertSchema(claimReserves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClaimReserveTransactionSchema = createInsertSchema(claimReserveTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertClaimFinancePaymentSchema = createInsertSchema(claimFinancePayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClaimApprovalWorkflowSchema = createInsertSchema(claimApprovalWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClaimApprovalStepSchema = createInsertSchema(claimApprovalSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClaimFinancialTransactionSchema = createInsertSchema(claimFinancialTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClaimAnalyticsSchema = createInsertSchema(claimAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClaimFinancialMetricsSchema = createInsertSchema(claimFinancialMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for Module 4
export type ClaimReserve = typeof claimReserves.$inferSelect;
export type InsertClaimReserve = z.infer<typeof insertClaimReserveSchema>;

export type ClaimReserveTransaction = typeof claimReserveTransactions.$inferSelect;
export type InsertClaimReserveTransaction = z.infer<typeof insertClaimReserveTransactionSchema>;

export type ClaimPayment = typeof claimPayments.$inferSelect;
export type InsertClaimPayment = z.infer<typeof insertClaimPaymentSchema>;

export type ClaimApprovalWorkflow = typeof claimApprovalWorkflows.$inferSelect;
export type InsertClaimApprovalWorkflow = z.infer<typeof insertClaimApprovalWorkflowSchema>;

export type ClaimApprovalStep = typeof claimApprovalSteps.$inferSelect;
export type InsertClaimApprovalStep = z.infer<typeof insertClaimApprovalStepSchema>;

export type ClaimFinancialTransaction = typeof claimFinancialTransactions.$inferSelect;
export type InsertClaimFinancialTransaction = z.infer<typeof insertClaimFinancialTransactionSchema>;

export type ClaimAnalytics = typeof claimAnalytics.$inferSelect;
export type InsertClaimAnalytics = z.infer<typeof insertClaimAnalyticsSchema>;

export type ClaimFinancialMetrics = typeof claimFinancialMetrics.$inferSelect;
export type InsertClaimFinancialMetrics = z.infer<typeof insertClaimFinancialMetricsSchema>;

// Additional analytics types for complex financial structures
export type ClaimCostBreakdown = {
  indemnityPayments: number;
  expensePayments: number;
  legalExpenses: number;
  administrativeCosts: number;
};

export type ClaimPaymentPatterns = {
  paymentFrequency: number;
  averagePaymentAmount: number;
  paymentTiming: any;
  seasonalPatterns: any;
};

export type ClaimReserveAnalysis = {
  initialReserve: number;
  finalReserve: number;
  reserveChanges: number;
  adequacyRatio: number;
  reserveAccuracy: number;
};

export type ClaimLossRatioAnalysis = {
  incurredLoss: number;
  earnedPremium: number;
  lossRatio: number;
  expenseRatio: number;
  combinedRatio: number;
};

// ============================================================================
// FRAUD DETECTION MODULE TABLES
// ============================================================================

// Fraud Detection Enums
export const fraudAlertSeverityEnum = pgEnum('fraud_alert_severity', ['low', 'medium', 'high', 'critical']);
export const fraudAlertStatusEnum = pgEnum('fraud_alert_status', ['open', 'investigating', 'resolved', 'dismissed', 'escalated']);
export const fraudRuleTypeEnum = pgEnum('fraud_rule_type', ['pattern', 'threshold', 'behavioral', 'statistical', 'network']);
export const fraudRuleStatusEnum = pgEnum('fraud_rule_status', ['active', 'inactive', 'draft', 'testing']);
export const fraudInvestigationStatusEnum = pgEnum('fraud_investigation_status', ['open', 'in_progress', 'completed', 'closed', 'escalated']);
export const fraudInvestigationPriorityEnum = pgEnum('fraud_investigation_priority', ['low', 'medium', 'high', 'urgent']);
export const mlModelTypeEnum = pgEnum('ml_model_type', ['supervised', 'unsupervised', 'semi_supervised', 'reinforcement']);
export const mlModelStatusEnum = pgEnum('ml_model_status', ['training', 'active', 'inactive', 'deprecated', 'failed']);
export const behavioralPatternTypeEnum = pgEnum('behavioral_pattern_type', ['frequency', 'amount', 'timing', 'provider', 'diagnosis', 'geographic']);
export const networkAnalysisTypeEnum = pgEnum('network_analysis_type', ['social', 'provider', 'billing', 'geographic', 'temporal']);
export const riskScoreLevelEnum = pgEnum('risk_score_level', ['very_low', 'low', 'medium', 'high', 'very_high', 'critical']);
export const fraudAnalyticsPeriodEnum = pgEnum('fraud_analytics_period', ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);

// Fraud Alerts Table
export const fraudAlerts = pgTable("fraud_alerts", {
  id: serial("id").primaryKey(),
  alertId: text("alert_id").notNull().unique(),
  claimId: integer("claim_id").references(() => claims.id),
  memberId: integer("member_id").references(() => members.id),
  providerId: integer("provider_id").references(() => providers.id),
  severity: fraudAlertSeverityEnum("severity").notNull(),
  status: fraudAlertStatusEnum("status").notNull().default("open"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  riskScore: real("risk_score").notNull(),
  confidence: real("confidence").notNull(),
  triggeredRules: text("triggered_rules").notNull(), // JSON array of rule IDs
  indicators: text("indicators").notNull(), // JSON array of fraud indicators
  evidence: text("evidence"), // JSON object with supporting evidence
  recommendedActions: text("recommended_actions"), // JSON array of recommended actions
  assignedTo: integer("assigned_to").references(() => users.id),
  priority: integer("priority").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
});

// Fraud Rules Table
export const fraudRules = pgTable("fraud_rules", {
  id: serial("id").primaryKey(),
  ruleId: text("rule_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: fraudRuleTypeEnum("type").notNull(),
  status: fraudRuleStatusEnum("status").notNull().default("draft"),
  conditions: text("conditions").notNull(), // JSON object defining rule conditions
  actions: text("actions").notNull(), // JSON object defining rule actions
  severity: fraudAlertSeverityEnum("severity").notNull(),
  threshold: real("threshold"),
  weight: real("weight").notNull().default(1.0),
  falsePositiveRate: real("false_positive_rate"),
  truePositiveRate: real("true_positive_rate"),
  createdBy: integer("created_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  version: text("version").notNull().default("1.0"),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  testResults: text("test_results"), // JSON object with testing results
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Fraud Investigations Table
export const fraudInvestigations = pgTable("fraud_investigations", {
  id: serial("id").primaryKey(),
  investigationId: text("investigation_id").notNull().unique(),
  alertId: integer("alert_id").references(() => fraudAlerts.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: fraudInvestigationStatusEnum("status").notNull().default("open"),
  priority: fraudInvestigationPriorityEnum("priority").notNull().default("medium"),
  assignedTo: integer("assigned_to").references(() => users.id),
  supervisorId: integer("supervisor_id").references(() => users.id),
  riskAmount: real("risk_amount"),
  potentialSavings: real("potential_savings"),
  investigationSteps: text("investigation_steps"), // JSON array of investigation steps
  findings: text("findings"), // JSON object with investigation findings
  evidence: text("evidence"), // JSON array of evidence files/documents
  recommendations: text("recommendations"), // JSON array of recommendations
  outcome: text("outcome"),
  fraudConfirmed: boolean("fraud_confirmed"),
  fraudType: text("fraud_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  closedAt: timestamp("closed_at"),
});

// ML Models Table
export const mlModels = pgTable("ml_models", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: mlModelTypeEnum("type").notNull(),
  status: mlModelStatusEnum("status").notNull().default("training"),
  algorithm: text("algorithm").notNull(),
  features: text("features").notNull(), // JSON array of feature names
  target: text("target").notNull(),
  hyperparameters: text("hyperparameters"), // JSON object with model hyperparameters
  trainingData: text("training_data"), // JSON object with training data info
  performanceMetrics: text("performance_metrics"), // JSON object with accuracy, precision, recall, etc.
  accuracy: real("accuracy"),
  precision: real("precision"),
  recall: real("recall"),
  f1Score: real("f1_score"),
  auc: real("auc"),
  modelPath: text("model_path").notNull(),
  version: text("version").notNull(),
  trainedAt: timestamp("trained_at"),
  deployedAt: timestamp("deployed_at"),
  lastUsed: timestamp("last_used"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Behavioral Profiles Table
export const behavioralProfiles = pgTable("behavioral_profiles", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  profileId: text("profile_id").notNull().unique(),
  patternType: behavioralPatternTypeEnum("pattern_type").notNull(),
  baselineMetrics: text("baseline_metrics").notNull(), // JSON object with baseline behavior
  currentMetrics: text("current_metrics").notNull(), // JSON object with current behavior
  deviations: text("deviations"), // JSON object with statistical deviations
  riskScore: real("risk_score").notNull(),
  confidence: real("confidence").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  nextReview: timestamp("next_review"),
  alertsTriggered: integer("alerts_triggered").default(0),
  investigationsCount: integer("investigations_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Network Analysis Table
export const networkAnalysis = pgTable("network_analysis", {
  id: serial("id").primaryKey(),
  analysisId: text("analysis_id").notNull().unique(),
  analysisType: networkAnalysisTypeEnum("analysis_type").notNull(),
  entityType: text("entity_type").notNull(), // 'member', 'provider', 'diagnosis', 'location'
  entityId: text("entity_id").notNull(),
  connections: text("connections").notNull(), // JSON array of network connections
  centrality: real("centrality"),
  clusteringCoefficient: real("clustering_coefficient"),
  degree: integer("degree"),
  betweenness: real("betweenness"),
  riskScore: real("risk_score"),
  anomalies: text("anomalies"), // JSON array of detected anomalies
  patterns: text("patterns"), // JSON object with identified patterns
  analysisDate: timestamp("analysis_date").defaultNow().notNull(),
  dataPeriod: text("data_period"), // Date range analyzed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Risk Scores Table
export const riskScores = pgTable("risk_scores", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'member', 'provider', 'claim', 'diagnosis'
  entityId: text("entity_id").notNull(),
  scoreId: text("score_id").notNull().unique(),
  overallScore: real("overall_score").notNull(),
  scoreLevel: riskScoreLevelEnum("score_level").notNull(),
  componentScores: text("component_scores").notNull(), // JSON object with individual component scores
  factors: text("factors").notNull(), // JSON array of risk factors
  confidence: real("confidence").notNull(),
  modelVersion: text("model_version"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  alertsCount: integer("alerts_count").default(0),
  investigationsCount: integer("investigations_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fraud Analytics Table
export const fraudAnalytics = pgTable("fraud_analytics", {
  id: serial("id").primaryKey(),
  period: fraudAnalyticsPeriodEnum("period").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  totalClaims: integer("total_claims").notNull(),
  fraudulentClaims: integer("fraudulent_claims").notNull(),
  fraudRate: real("fraud_rate").notNull(),
  totalLoss: real("total_loss").notNull(),
  preventedLoss: real("prevented_loss").notNull(),
  investigationCount: integer("investigation_count").notNull(),
  resolutionRate: real("resolution_rate").notNull(),
  averageDetectionTime: integer("average_detection_time"), // in days
  falsePositiveRate: real("false_positive_rate"),
  truePositiveRate: real("true_positive_rate"),
  topFraudTypes: text("top_fraud_types"), // JSON array of fraud types
  riskDistribution: text("risk_distribution"), // JSON object with risk score distribution
  geographicHotspots: text("geographic_hotspots"), // JSON array of high-risk locations
  providerRiskProfile: text("provider_risk_profile"), // JSON object with provider risk metrics
  memberRiskProfile: text("member_risk_profile"), // JSON object with member risk metrics
  modelPerformance: text("model_performance"), // JSON object with ML model performance
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas for Fraud Detection Module
export const insertFraudAlertSchema = createInsertSchema(fraudAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFraudRuleSchema = createInsertSchema(fraudRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFraudInvestigationSchema = createInsertSchema(fraudInvestigations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMlModelSchema = createInsertSchema(mlModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBehavioralProfileSchema = createInsertSchema(behavioralProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertNetworkAnalysisSchema = createInsertSchema(networkAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertRiskScoreSchema = createInsertSchema(riskScores).omit({
  id: true,
  createdAt: true,
});

export const insertFraudAnalyticsSchema = createInsertSchema(fraudAnalytics).omit({
  id: true,
  createdAt: true,
});

// Type exports for Fraud Detection Module
export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;

export type FraudRule = typeof fraudRules.$inferSelect;
export type InsertFraudRule = z.infer<typeof insertFraudRuleSchema>;

export type FraudInvestigation = typeof fraudInvestigations.$inferSelect;
export type InsertFraudInvestigation = z.infer<typeof insertFraudInvestigationSchema>;

export type MlModel = typeof mlModels.$inferSelect;
export type InsertMlModel = z.infer<typeof insertMlModelSchema>;

export type BehavioralProfile = typeof behavioralProfiles.$inferSelect;
export type InsertBehavioralProfile = z.infer<typeof insertBehavioralProfileSchema>;

export type NetworkAnalysis = typeof networkAnalysis.$inferSelect;
export type InsertNetworkAnalysis = z.infer<typeof insertNetworkAnalysisSchema>;

export type RiskScore = typeof riskScores.$inferSelect;
export type InsertRiskScore = z.infer<typeof insertRiskScoreSchema>;

export type FraudAnalytics = typeof fraudAnalytics.$inferSelect;
export type InsertFraudAnalytics = z.infer<typeof insertFraudAnalyticsSchema>;
