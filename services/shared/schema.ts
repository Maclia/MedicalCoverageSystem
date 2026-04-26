import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, uuid, varchar, decimal, json, jsonb, index, uniqueIndex, AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// 1. ENUMS (merged from all sources)
// ============================================================================

// Core enums
export const memberTypeEnum = pgEnum('member_type', ['principal', 'dependent']);
export const dependentTypeEnum = pgEnum('dependent_type', ['spouse', 'child', 'parent', 'guardian']);
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
export const userTypeEnum = pgEnum('user_type', ['insurance', 'institution', 'provider', 'sales_admin', 'sales_manager', 'team_lead', 'sales_agent', 'broker', 'underwriter', 'member']);

// CRM / Sales enums
export const leadSourceEnum = pgEnum('lead_source', ['website', 'referral', 'campaign', 'cold_call', 'partner', 'event', 'social_media', 'email_marketing', 'third_party', 'manual']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost', 'duplicate']);
export const leadPriorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'urgent']);
export const opportunityStageEnum = pgEnum('opportunity_stage', ['lead', 'qualified', 'quotation', 'underwriting', 'issuance', 'closed_won', 'closed_lost']);
export const activityTypeEnum = pgEnum('activity_type', ['call', 'email', 'meeting', 'sms', 'whatsapp', 'note', 'task', 'demo', 'proposal']);
export const territoryTypeEnum = pgEnum('territory_type', ['geographic', 'industry', 'company_size', 'product_line', 'mixed']);
export const agentTypeEnum = pgEnum('agent_type', ['individual', 'corporate', 'broker', 'tied_agent']);
export const licenseStatusEnum = pgEnum('license_status', ['active', 'expired', 'suspended', 'pending', 'revoked']);
export const commissionTransactionTypeEnum = pgEnum('commission_transaction_type', ['new_business', 'renewal', 'bonus', 'override', 'adjustment', 'clawback']);
export const teamTypeEnum = pgEnum('team_type', ['sales', 'support', 'management', 'regional']);
export const performancePeriodEnum = pgEnum('performance_period', ['monthly', 'quarterly', 'annual']);

// Claims & Adjudication enums
export const claimStatusEnum = pgEnum('claim_status', ['submitted', 'under_review', 'approved', 'rejected', 'paid', 'fraud_review', 'fraud_confirmed']);
export const diagnosisCodeTypeEnum = pgEnum('diagnosis_code_type', ['ICD-10', 'ICD-11']);
export const adjudicationResultEnum = pgEnum('adjudication_result', ['APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'PENDING_REVIEW']);
export const medicalNecessityResultEnum = pgEnum('medical_necessity_result', ['PASS', 'FAIL', 'REVIEW_REQUIRED']);
export const fraudRiskLevelEnum = pgEnum('fraud_risk_level', ['none', 'low', 'medium', 'high', 'confirmed']);
export const claimPaymentTypeEnum = pgEnum('claim_payment_type', ['full', 'partial', 'denial']);
export const claimPaymentStatusEnum = pgEnum('claim_payment_status', ['pending', 'approved', 'paid', 'reversed']);
export const claimApprovalStatusEnum = pgEnum('claim_approval_status', ['submitted', 'under_review', 'approved', 'rejected', 'appealed']);
export const eobStatusEnum = pgEnum('eob_status', ['GENERATED', 'SENT', 'ACKNOWLEDGED', 'DISPUTED']);

// Finance & Payment enums
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['credit_card', 'debit_card', 'bank_transfer', 'check', 'cash', 'electronic_funds_transfer']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid']);
export const transactionTypeEnum = pgEnum('transaction_type', ['premium', 'claim_payment', 'commission', 'fee', 'refund', 'adjustment', 'interest']);
export const accountTypeEnum = pgEnum('account_type', ['checking', 'savings', 'trust', 'escrow', 'investment']);
export const reconciliationStatusEnum = pgEnum('reconciliation_status', ['unreconciled', 'reconciled', 'pending', 'disputed']);
export const financialTransactionTypeEnum = pgEnum('financial_transaction_type', ['premium_collection', 'claim_payment', 'commission', 'refund', 'adjustment']);
export const financialTransactionStatusEnum = pgEnum('financial_transaction_status', ['pending', 'completed', 'failed', 'reversed']);

// Provider & Medical Institution enums
export const institutionTypeEnum = pgEnum('institution_type', ['hospital', 'clinic', 'laboratory', 'imaging', 'pharmacy', 'specialist', 'general']);
export const personnelTypeEnum = pgEnum('personnel_type', ['doctor', 'nurse', 'specialist', 'technician', 'pharmacist', 'therapist', 'other']);
export const contractStatusEnum = pgEnum('contract_status', ['draft', 'active', 'expired', 'terminated', 'renewal_pending']);
export const networkTierEnum = pgEnum('network_tier', ['tier_1', 'tier_2', 'tier_3', 'premium', 'basic', 'standard']);
export const reimbursementModelEnum = pgEnum('reimbursement_model', ['fee_for_service', 'capitation', 'drg', 'per_diem', 'package_deal']);
export const tariffStatusEnum = pgEnum('tariff_status', ['active', 'inactive', 'pending', 'deprecated']);
export const providerOnboardingStatusEnum = pgEnum('provider_onboarding_status', ['registered', 'document_pending', 'verification_in_progress', 'approved', 'rejected', 'active', 'suspended']);
export const providerPerformanceTierEnum = pgEnum('provider_performance_tier', ['excellent', 'good', 'average', 'below_average', 'poor']);
export const accreditationStatusEnum = pgEnum('accreditation_status', ['accredited', 'provisional', 'not_accredited', 'expired']);
export const complianceStatusEnum = pgEnum('compliance_status', ['compliant', 'minor_violations', 'major_violations', 'suspended']);

// Schemes & Benefits enums
export const schemeTypeEnum = pgEnum('scheme_type', ['individual_medical', 'corporate_medical', 'nhif_top_up', 'student_cover', 'international_health', 'micro_insurance']);
export const coverageLevelEnum = pgEnum('coverage_level', ['basic', 'standard', 'premium', 'gold', 'platinum']);
export const schemeStatusEnum = pgEnum('scheme_status', ['draft', 'active', 'inactive', 'deprecated', 'under_review']);
export const benefitTypeEnum = pgEnum('benefit_type', ['medical', 'dental', 'vision', 'pharmacy', 'hospitalization', 'outpatient', 'preventive', 'emergency', 'maternity']);
export const limitTypeEnum = pgEnum('limit_type', ['per_visit', 'per_day', 'per_year', 'lifetime', 'unlimited']);
export const waitingPeriodTypeEnum = pgEnum('waiting_period_type', ['immediate', 'days', 'months', 'years', 'age_based']);

// Fraud Detection enums
export const fraudStatusEnum = pgEnum('fraud_status', ['pending_review', 'investigating', 'confirmed_fraud', 'false_positive', 'resolved']);
export const detectionMethodEnum = pgEnum('detection_method', ['rule_based', 'statistical', 'machine_learning', 'manual_review', 'network_analysis']);
export const alertPriorityEnum = pgEnum('alert_priority', ['low', 'medium', 'high', 'urgent']);
export const investigationStatusEnum = pgEnum('investigation_status', ['open', 'in_progress', 'closed', 'escalated']);

// Analytics enums
export const metricTypeEnum = pgEnum('metric_type', ['count', 'sum', 'average', 'percentage', 'rate', 'ratio']);
export const timeGranularityEnum = pgEnum('time_granularity', ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
export const reportTypeEnum = pgEnum('report_type', ['operational', 'financial', 'clinical', 'compliance', 'performance', 'trend']);
export const dashboardTypeEnum = pgEnum('dashboard_type', ['executive', 'operational', 'clinical', 'financial', 'compliance']);
export const alertTypeEnum = pgEnum('alert_type', ['threshold', 'anomaly', 'trend', 'compliance', 'performance']);
export const alertSeverityEnum = pgEnum('alert_severity', ['low', 'medium', 'high', 'critical']);

// Token Management enums
export const tokenTypeEnum = pgEnum('token_type', ['access', 'refresh', 'api_key', 'session', 'verification', 'reset_password']);
export const tokenStatusEnum = pgEnum('token_status', ['active', 'expired', 'revoked', 'used']);
export const grantTypeEnum = pgEnum('grant_type', ['authorization_code', 'client_credentials', 'password', 'refresh_token', 'implicit']);
export const scopeEnum = pgEnum('scope', ['read', 'write', 'admin', 'member_read', 'member_write', 'claims_read', 'claims_write', 'finance_read', 'finance_write']);

// Onboarding & Personalization enums
export const onboardingStatusEnum = pgEnum('onboarding_status', ['pending', 'active', 'completed', 'paused', 'cancelled']);
export const taskTypeEnum = pgEnum('task_type', ['profile_completion', 'document_upload', 'benefits_education', 'dependent_registration', 'wellness_setup', 'emergency_setup', 'completion']);
export const documentStatusEnum = pgEnum('document_status', ['pending', 'approved', 'rejected', 'expired']);
export const activationStatusEnum = pgEnum('activation_status', ['pending', 'active', 'expired', 'used']);
export const personalizationLevelEnum = pgEnum('personalization_level', ['minimal', 'moderate', 'full']);
export const recommendationTypeEnum = pgEnum('recommendation_type', ['preventive_care', 'wellness', 'cost_optimization', 'care_coordination', 'educational']);
export const journeyStageEnum = pgEnum('journey_stage', ['new_member', 'established_member', 'long_term_member', 'new_parent', 'chronic_condition', 'high_risk', 'wellness_champion']);

// ============================================================================
// 2. TABLES (merged from both sources)
// ============================================================================

// ---------- Core ----------
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  contactPerson: text("contact_person").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  address: text("address").notNull(),
  clientType: clientTypeEnum("client_type").default("corporate"),
  billingFrequency: billingFrequencyEnum("billing_frequency").default("monthly"),
  employerContributionPercentage: real("employer_contribution_percentage"),
  experienceRatingEnabled: boolean("experience_rating_enabled").default(false),
  customBenefitStructure: boolean("custom_benefit_structure").default(false),
  gradeBasedBenefits: boolean("grade_based_benefits").default(false),
  isActive: boolean("is_active").default(true),
  registrationExpiryDate: date("registration_expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  secondName: text("second_name"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  employeeId: text("employee_id").notNull(),
  memberType: memberTypeEnum("member_type").notNull(),
  principalId: integer("principal_id").references((): AnyPgColumn => members.id).notNull(),
  dependentType: dependentTypeEnum("dependent_type"),
  hasDisability: boolean("has_disability").default(false),
  disabilityDetails: text("disability_details"),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username").unique(),
  fullName: text("full_name"),
  role: text("role"),
  userType: userTypeEnum("user_type").notNull(),
  entityId: integer("entity_id").notNull(),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const periods = pgTable("periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companyPeriods = pgTable("company_periods", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: text("category"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- CRM & Sales ----------
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  leadCode: varchar("lead_code", { length: 20 }).notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  jobTitle: text("job_title"),
  leadSource: text("lead_source").notNull(),
  leadStatus: leadStatusEnum("lead_status").default("new"),
  leadScore: integer("lead_score").default(0),
  assignedAgentId: integer("assigned_agent_id"),
  assignedDate: timestamp("assigned_date"),
  firstContactDate: timestamp("first_contact_date"),
  lastContactDate: timestamp("last_contact_date"),
  nextFollowUpDate: date("next_follow_up_date"),
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }),
  conversionProbability: real("conversion_probability"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salesTeams = pgTable("sales_teams", {
  id: serial("id").primaryKey(),
  teamName: text("team_name").notNull(),
  teamType: teamTypeEnum("team_type").default("sales"),
  description: text("description"),
  managerId: integer("manager_id"),
  department: text("department"),
  targetRevenue: decimal("target_revenue", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const territories = pgTable("territories", {
  id: serial("id").primaryKey(),
  territoryName: text("territory_name").notNull(),
  territoryType: territoryTypeEnum("territory_type").default("geographic"),
  description: text("description"),
  geographicRegion: text("geographic_region"),
  industryFocus: text("industry_focus"),
  assignedAgentId: integer("assigned_agent_id"),
  targetRevenue: decimal("target_revenue", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  agentCode: varchar("agent_code", { length: 20 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  agentType: agentTypeEnum("agent_type").default("individual"),
  teamId: integer("team_id").references(() => salesTeams.id),
  territoryId: integer("territory_id").references(() => territories.id),
  supervisorId: integer("supervisor_id"),
  commissionTierId: integer("commission_tier_id"),
  baseCommissionRate: real("base_commission_rate").default(0),
  overrideRate: real("override_rate"),
  targetAnnualPremium: decimal("target_annual_premium", { precision: 15, scale: 2 }),
  ytdPremium: decimal("ytd_premium", { precision: 15, scale: 2 }).default('0'),
  ytdCommission: decimal("ytd_commission", { precision: 15, scale: 2 }).default('0'),
  joinDate: date("join_date").notNull(),
  terminationDate: date("termination_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commissionTiers = pgTable("commission_tiers", {
  id: serial("id").primaryKey(),
  tierName: text("tier_name").notNull(),
  tierLevel: integer("tier_level").notNull(),
  baseRate: real("base_rate").notNull(),
  bonusThreshold: decimal("bonus_threshold", { precision: 15, scale: 2 }),
  bonusRate: real("bonus_rate"),
  individualRate: real("individual_rate"),
  corporateRate: real("corporate_rate"),
  familyRate: real("family_rate"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesOpportunities = pgTable("sales_opportunities", {
  id: serial("id").primaryKey(),
  opportunityCode: varchar("opportunity_code", { length: 20 }).notNull().unique(),
  title: text("title").notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  stage: opportunityStageEnum("stage").default("lead"),
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }),
  probability: real("probability"),
  expectedCloseDate: date("expected_close_date"),
  actualCloseDate: date("actual_close_date"),
  lostReason: text("lost_reason"),
  competitor: text("competitor"),
  nextStep: text("next_step"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salesActivities = pgTable("sales_activities", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => salesOpportunities.id),
  leadId: integer("lead_id").references(() => leads.id),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  activityType: activityTypeEnum("activity_type").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  duration: integer("duration"),
  outcome: text("outcome"),
  nextAction: text("next_action"),
  nextActionDate: date("next_action_date"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commissionTransactions = pgTable("commission_transactions", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  transactionType: commissionTransactionTypeEnum("transaction_type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  commissionRate: real("commission_rate").notNull(),
  premiumAmount: decimal("premium_amount", { precision: 15, scale: 2 }),
  paymentDate: date("payment_date"),
  paymentReference: text("payment_reference"),
  commissionPeriod: varchar("commission_period", { length: 7 }),
  status: paymentStatusEnum("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentPerformance = pgTable("agent_performance", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  totalPremium: decimal("total_premium", { precision: 15, scale: 2 }).default('0'),
  totalCommission: decimal("total_commission", { precision: 15, scale: 2 }).default('0'),
  policiesSold: integer("policies_sold").default(0),
  conversionRate: real("conversion_rate"),
  averageDealSize: decimal("average_deal_size", { precision: 15, scale: 2 }),
  companyRank: integer("company_rank"),
  teamRank: integer("team_rank"),
  targetAchievement: real("target_achievement"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentPerformanceMetrics = pgTable("agent_performance_metrics", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  metricName: text("metric_name").notNull(),
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }),
  metricPeriod: performancePeriodEnum("metric_period").default("monthly"),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  achievement: real("achievement"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentLeaderboards = pgTable("agent_leaderboards", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  leaderboardType: text("leaderboard_type").notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  rank: integer("rank").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  totalParticipants: integer("total_participants").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commissionReports = pgTable("commission_reports", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  reportPeriod: varchar("report_period", { length: 7 }).notNull(),
  totalCommission: decimal("total_commission", { precision: 15, scale: 2 }).default('0'),
  baseCommission: decimal("base_commission", { precision: 15, scale: 2 }).default('0'),
  bonusCommission: decimal("bonus_commission", { precision: 15, scale: 2 }).default('0'),
  adjustments: decimal("adjustments", { precision: 15, scale: 2 }).default('0'),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default('0'),
  pendingAmount: decimal("pending_amount", { precision: 15, scale: 2 }).default('0'),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// ---------- Claims & Adjudication ----------
export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  claimNumber: varchar("claim_number", { length: 20 }).notNull().unique(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  providerId: integer("provider_id").references(() => providers.id).notNull(),
  diagnosisCode: text("diagnosis_code").notNull(),
  serviceDate: date("service_date").notNull(),
  submissionDate: timestamp("submission_date").defaultNow().notNull(),
  claimStatus: claimStatusEnum("claim_status").default("submitted"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 15, scale: 2 }),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }),
  patientResponsibility: decimal("patient_responsibility", { precision: 15, scale: 2 }),
  adjudicationDate: timestamp("adjudication_date"),
  paymentDate: timestamp("payment_date"),
  denialReason: text("denial_reason"),
  notes: text("notes"),
  priority: text("priority").default("normal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const diagnosisCodes = pgTable("diagnosis_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: text("description").notNull(),
  codeType: diagnosisCodeTypeEnum("code_type").default("ICD-10"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const claimAdjudicationResults = pgTable("claim_adjudication_results", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  result: adjudicationResultEnum("result").notNull(),
  approvedAmount: decimal("approved_amount", { precision: 15, scale: 2 }),
  deniedAmount: decimal("denied_amount", { precision: 15, scale: 2 }),
  denialReason: text("denial_reason"),
  adjudicationRules: text("adjudication_rules"),
  processedBy: integer("processed_by"),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  reviewRequired: boolean("review_required").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const medicalNecessityValidations = pgTable("medical_necessity_validations", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  diagnosisCode: text("diagnosis_code").notNull(),
  procedureCodes: text("procedure_codes").notNull(),
  validationResult: medicalNecessityResultEnum("validation_result").notNull(),
  confidenceScore: real("confidence_score"),
  clinicalGuidelines: text("clinical_guidelines"),
  validationNotes: text("validation_notes"),
  validatedBy: integer("validated_by"),
  validatedAt: timestamp("validated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fraudDetectionResults = pgTable("fraud_detection_results", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  result: fraudStatusEnum("result").default("pending_review"),
  riskScore: real("risk_score"),
  flags: text("flags"),
  investigationNotes: text("investigation_notes"),
  investigatedBy: integer("investigated_by"),
  investigatedAt: timestamp("investigated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const claimAuditTrails = pgTable("claim_audit_trails", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  action: text("action").notNull(),
  oldStatus: claimStatusEnum("old_status"),
  newStatus: claimStatusEnum("new_status"),
  oldAmount: decimal("old_amount", { precision: 15, scale: 2 }),
  newAmount: decimal("new_amount", { precision: 15, scale: 2 }),
  userId: integer("user_id"),
  notes: text("notes"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const benefitUtilization = pgTable("benefit_utilization", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  benefitCategory: text("benefit_category").notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  utilizedAmount: decimal("utilized_amount", { precision: 15, scale: 2 }).default("0"),
  limitAmount: decimal("limit_amount", { precision: 15, scale: 2 }),
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }),
  utilizationPercentage: real("utilization_percentage"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const explanationOfBenefits = pgTable("explanation_of_benefits", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  issueDate: date("issue_date").notNull(),
  servicePeriod: text("service_period"),
  totalBilled: decimal("total_billed", { precision: 15, scale: 2 }),
  planPaid: decimal("plan_paid", { precision: 15, scale: 2 }),
  memberResponsibility: decimal("member_responsibility", { precision: 15, scale: 2 }),
  benefitDetails: text("benefit_details"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const claimProcedureItems = pgTable("claim_procedure_items", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  procedureCode: text("procedure_code").notNull(),
  quantity: integer("quantity").default(1),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }),
  approvedAmount: decimal("approved_amount", { precision: 15, scale: 2 }),
  denialReason: text("denial_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Finance & Billing ----------
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  transactionId: varchar("transaction_id", { length: 50 }).notNull().unique(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: paymentStatusEnum("status").default("pending"),
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
  processedDate: timestamp("processed_date"),
  referenceNumber: text("reference_number"),
  description: text("description"),
  gatewayResponse: text("gateway_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const premiumInvoices = pgTable("premium_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 20 }).notNull().unique(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  billingPeriodStart: date("billing_period_start").notNull(),
  billingPeriodEnd: date("billing_period_end").notNull(),
  dueDate: date("due_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").default("draft"),
  sentDate: timestamp("sent_date"),
  paidDate: timestamp("paid_date"),
  paymentTransactionId: integer("payment_transaction_id").references(() => paymentTransactions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financialAccounts = pgTable("financial_accounts", {
  id: serial("id").primaryKey(),
  accountNumber: varchar("account_number", { length: 20 }).notNull().unique(),
  accountName: text("account_name").notNull(),
  accountType: accountTypeEnum("account_type").notNull(),
  bankName: text("bank_name"),
  routingNumber: varchar("routing_number", { length: 9 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generalLedgerEntries = pgTable("general_ledger_entries", {
  id: serial("id").primaryKey(),
  entryDate: date("entry_date").notNull(),
  accountId: integer("account_id").references(() => financialAccounts.id).notNull(),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  referenceId: integer("reference_id"),
  referenceType: text("reference_type"),
  reconciliationStatus: reconciliationStatusEnum("reconciliation_status").default("unreconciled"),
  reconciledDate: timestamp("reconciled_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commissionPayments = pgTable("commission_payments", {
  id: serial("id").primaryKey(),
  commissionId: integer("commission_id").notNull(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: paymentStatusEnum("status").default("pending"),
  transactionId: integer("transaction_id").references(() => paymentTransactions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financialReports = pgTable("financial_reports", {
  id: serial("id").primaryKey(),
  reportType: text("report_type").notNull(),
  reportPeriod: text("report_period").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  generatedDate: timestamp("generated_date").defaultNow().notNull(),
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }),
  netIncome: decimal("net_income", { precision: 15, scale: 2 }),
  reportData: text("report_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Providers & Medical Institutions ----------
export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  providerCode: varchar("provider_code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  type: institutionTypeEnum("type").notNull(),
  licenseNumber: text("license_number"),
  taxId: text("tax_id"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const medicalInstitutions = pgTable("medical_institutions", {
  id: serial("id").primaryKey(),
  institutionCode: varchar("institution_code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  type: institutionTypeEnum("type").notNull(),
  licenseNumber: text("license_number"),
  accreditation: text("accreditation"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  capacity: integer("capacity"),
  specialties: text("specialties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providerNetworks = pgTable("provider_networks", {
  id: serial("id").primaryKey(),
  networkName: text("network_name").notNull(),
  networkType: text("network_type").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providerNetworkAssignments = pgTable("provider_network_assignments", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => providers.id).notNull(),
  networkId: integer("network_id").references(() => providerNetworks.id).notNull(),
  tier: networkTierEnum("tier").default("standard"),
  effectiveDate: date("effective_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providerContracts = pgTable("provider_contracts", {
  id: serial("id").primaryKey(),
  contractNumber: varchar("contract_number", { length: 20 }).notNull().unique(),
  providerId: integer("provider_id").references(() => providers.id).notNull(),
  status: contractStatusEnum("status").default("draft"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  contractValue: decimal("contract_value", { precision: 15, scale: 2 }),
  terms: text("terms"),
  signedDate: date("signed_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const medicalPersonnel = pgTable("medical_personnel", {
  id: serial("id").primaryKey(),
  personnelCode: varchar("personnel_code", { length: 20 }).notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  type: personnelTypeEnum("type").notNull(),
  licenseNumber: text("license_number"),
  specialty: text("specialty"),
  providerId: integer("provider_id").references(() => providers.id),
  institutionId: integer("institution_id").references(() => medicalInstitutions.id),
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Fraud Detection ----------
export const fraudAlerts = pgTable("fraud_alerts", {
  id: serial("id").primaryKey(),
  alertId: varchar("alert_id", { length: 50 }).notNull().unique(),
  claimId: integer("claim_id").references(() => claims.id),
  memberId: integer("member_id").references(() => members.id),
  providerId: integer("provider_id").references(() => providers.id),
  riskLevel: fraudRiskLevelEnum("risk_level").default("low"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  detectionMethod: detectionMethodEnum("detection_method").notNull(),
  alertType: text("alert_type").notNull(),
  description: text("description"),
  indicators: jsonb("indicators"),
  status: fraudStatusEnum("status").default("pending_review"),
  priority: alertPriorityEnum("priority").default("medium"),
  assignedTo: integer("assigned_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fraudRules = pgTable("fraud_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  ruleType: text("rule_type").notNull(),
  description: text("description"),
  conditions: jsonb("conditions"),
  actions: jsonb("actions"),
  riskWeight: decimal("risk_weight", { precision: 3, scale: 2 }).default("1.00"),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fraudInvestigations = pgTable("fraud_investigations", {
  id: serial("id").primaryKey(),
  investigationId: varchar("investigation_id", { length: 50 }).notNull().unique(),
  alertId: integer("alert_id").references(() => fraudAlerts.id),
  title: text("title").notNull(),
  description: text("description"),
  status: investigationStatusEnum("status").default("open"),
  assignedInvestigator: integer("assigned_investigator"),
  findings: jsonb("findings"),
  evidence: jsonb("evidence"),
  conclusion: text("conclusion"),
  estimatedLoss: decimal("estimated_loss", { precision: 12, scale: 2 }),
  actualLoss: decimal("actual_loss", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const fraudPatterns = pgTable("fraud_patterns", {
  id: serial("id").primaryKey(),
  patternId: varchar("pattern_id", { length: 50 }).notNull().unique(),
  patternType: text("pattern_type").notNull(),
  patternName: text("pattern_name").notNull(),
  description: text("description"),
  indicators: jsonb("indicators"),
  riskMultiplier: decimal("risk_multiplier", { precision: 3, scale: 2 }).default("1.00"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  isActive: boolean("is_active").default(true),
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
  lastSeen: timestamp("last_seen"),
});

export const riskScores = pgTable("risk_scores", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  riskLevel: fraudRiskLevelEnum("risk_level"),
  factors: jsonb("factors"),
  lastCalculated: timestamp("last_calculated").defaultNow().notNull(),
  nextReview: timestamp("next_review"),
  isActive: boolean("is_active").default(true),
});

export const fraudAnalytics = pgTable("fraud_analytics", {
  id: serial("id").primaryKey(),
  metricType: text("metric_type").notNull(),
  metricValue: decimal("metric_value", { precision: 10, scale: 2 }),
  timePeriod: text("time_period"),
  date: date("date").notNull(),
  dimensions: jsonb("dimensions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mlModels = pgTable("ml_models", {
  id: serial("id").primaryKey(),
  modelName: text("model_name").notNull(),
  modelType: text("model_type").notNull(),
  algorithm: text("algorithm"),
  version: varchar("version", { length: 20 }).notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 4 }),
  precision: decimal("precision", { precision: 5, scale: 4 }),
  recall: decimal("recall", { precision: 5, scale: 4 }),
  f1Score: decimal("f1_score", { precision: 5, scale: 4 }),
  modelData: jsonb("model_data"),
  isActive: boolean("is_active").default(false),
  trainedAt: timestamp("trained_at"),
  deployedAt: timestamp("deployed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const networkAnalysis = pgTable("network_analysis", {
  id: serial("id").primaryKey(),
  networkId: varchar("network_id", { length: 50 }).notNull().unique(),
  networkType: text("network_type").notNull(),
  entities: jsonb("entities"),
  connections: jsonb("connections"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  analysisDate: timestamp("analysis_date").defaultNow().notNull(),
  findings: jsonb("findings"),
  isActive: boolean("is_active").default(true),
});

export const behavioralProfiles = pgTable("behavioral_profiles", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  profileData: jsonb("profile_data"),
  baselineMetrics: jsonb("baseline_metrics"),
  anomalies: jsonb("anomalies"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
});

export const fraudPreventionRules = pgTable("fraud_prevention_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  ruleCategory: text("rule_category").notNull(),
  conditions: jsonb("conditions"),
  actions: jsonb("actions"),
  effectiveness: decimal("effectiveness", { precision: 5, scale: 4 }),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Analytics ----------
export const analyticsMetrics = pgTable("analytics_metrics", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  metricType: metricTypeEnum("metric_type").notNull(),
  description: text("description"),
  unit: text("unit"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const metricData = pgTable("metric_data", {
  id: serial("id").primaryKey(),
  metricId: integer("metric_id").references(() => analyticsMetrics.id).notNull(),
  date: date("date").notNull(),
  timeGranularity: timeGranularityEnum("time_granularity").default("daily"),
  value: decimal("value", { precision: 15, scale: 4 }),
  count: integer("count"),
  dimension1: text("dimension1"),
  dimension2: text("dimension2"),
  dimension3: text("dimension3"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reportName: text("report_name").notNull(),
  reportType: reportTypeEnum("report_type").notNull(),
  description: text("description"),
  queryDefinition: text("query_definition"),
  parameters: text("parameters"),
  schedule: text("schedule"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportExecutions = pgTable("report_executions", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id).notNull(),
  executionDate: timestamp("execution_date").defaultNow().notNull(),
  status: text("status"),
  parameters: text("parameters"),
  resultData: text("result_data"),
  executionTime: integer("execution_time"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dashboards = pgTable("dashboards", {
  id: serial("id").primaryKey(),
  dashboardName: text("dashboard_name").notNull(),
  dashboardType: dashboardTypeEnum("dashboard_type").notNull(),
  description: text("description"),
  layout: text("layout"),
  filters: text("filters"),
  isPublic: boolean("is_public").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").references(() => dashboards.id).notNull(),
  widgetType: text("widget_type").notNull(),
  widgetName: text("widget_name").notNull(),
  position: text("position"),
  size: text("size"),
  configuration: text("configuration"),
  metricIds: text("metric_ids"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  alertName: text("alert_name").notNull(),
  alertType: alertTypeEnum("alert_type").notNull(),
  severity: alertSeverityEnum("alert_severity").default("medium"),
  description: text("description"),
  condition: text("condition"),
  metricId: integer("metric_id").references(() => analyticsMetrics.id),
  threshold: decimal("threshold", { precision: 10, scale: 2 }),
  comparison: text("comparison"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alertInstances = pgTable("alert_instances", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => alerts.id).notNull(),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  message: text("message"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: integer("acknowledged_by"),
  resolvedAt: timestamp("resolved_at"),
  status: text("status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dataQualityChecks = pgTable("data_quality_checks", {
  id: serial("id").primaryKey(),
  checkName: text("check_name").notNull(),
  checkType: text("check_type").notNull(),
  tableName: text("table_name"),
  columnName: text("column_name"),
  rule: text("rule"),
  threshold: decimal("threshold", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  lastRun: timestamp("last_run"),
  lastResult: text("last_result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const predictiveModels = pgTable("predictive_models", {
  id: serial("id").primaryKey(),
  modelName: text("model_name").notNull(),
  modelType: text("model_type").notNull(),
  description: text("description"),
  algorithm: text("algorithm"),
  features: text("features"),
  target: text("target"),
  accuracy: decimal("accuracy", { precision: 5, scale: 4 }),
  isActive: boolean("is_active").default(true),
  trainedAt: timestamp("trained_at"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Token Management ----------
export const accessTokens = pgTable("access_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  tokenType: tokenTypeEnum("token_type").default("access"),
  userId: integer("user_id").references(() => users.id).notNull(),
  clientId: text("client_id"),
  scopes: text("scopes"),
  expiresAt: timestamp("expires_at").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  status: tokenStatusEnum("status").default("active"),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  accessTokenId: integer("access_token_id").references(() => accessTokens.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  clientId: text("client_id"),
  scopes: text("scopes"),
  expiresAt: timestamp("expires_at").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  status: tokenStatusEnum("status").default("active"),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id).notNull(),
  scopes: text("scopes"),
  rateLimit: integer("rate_limit"),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  status: tokenStatusEnum("status").default("active"),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const oauthClients = pgTable("oauth_clients", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  redirectUris: text("redirect_uris"),
  grantTypes: text("grant_types"),
  scopes: text("scopes"),
  isConfidential: boolean("is_confidential").default(true),
  userId: integer("user_id"),
  status: tokenStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authorizationCodes = pgTable("authorization_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  clientId: text("client_id").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  redirectUri: text("redirect_uri"),
  scopes: text("scopes"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  status: tokenStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokenBlacklist = pgTable("token_blacklist", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  tokenType: tokenTypeEnum("token_type").notNull(),
  reason: text("reason"),
  blacklistedAt: timestamp("blacklisted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionTokens = pgTable("session_tokens", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  status: tokenStatusEnum("status").default("active"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Schemes & Benefits ----------
export const insuranceSchemes = pgTable("insurance_schemes", {
  id: serial("id").primaryKey(),
  schemeCode: varchar("scheme_code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: schemeTypeEnum("type").notNull(),
  coverageLevel: coverageLevelEnum("coverage_level").notNull(),
  status: schemeStatusEnum("status").default("draft"),
  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date"),
  minimumAge: integer("minimum_age"),
  maximumAge: integer("maximum_age"),
  premiumAmount: decimal("premium_amount", { precision: 10, scale: 2 }),
  premiumFrequency: text("premium_frequency"),
  deductible: decimal("deductible", { precision: 10, scale: 2 }),
  outOfPocketMax: decimal("out_of_pocket_max", { precision: 10, scale: 2 }),
  coinsurance: decimal("coinsurance", { precision: 5, scale: 2 }),
  copay: decimal("copay", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schemeBenefits = pgTable("scheme_benefits", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
  benefitType: benefitTypeEnum("benefit_type").notNull(),
  description: text("description"),
  coveragePercentage: decimal("coverage_percentage", { precision: 5, scale: 2 }),
  limitAmount: decimal("limit_amount", { precision: 12, scale: 2 }),
  limitType: limitTypeEnum("limit_type").default("per_year"),
  waitingPeriod: integer("waiting_period"),
  waitingPeriodType: waitingPeriodTypeEnum("waiting_period_type").default("immediate"),
  exclusions: text("exclusions"),
  requirements: text("requirements"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schemeNetworks = pgTable("scheme_networks", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
  networkId: integer("network_id").notNull(),
  tier: text("tier"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const schemePricing = pgTable("scheme_pricing", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
  ageGroup: text("age_group"),
  gender: text("gender"),
  region: text("region"),
  basePremium: decimal("base_premium", { precision: 10, scale: 2 }).notNull(),
  loadingPercentage: decimal("loading_percentage", { precision: 5, scale: 2 }),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schemeVersions = pgTable("scheme_versions", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
  versionNumber: varchar("version_number", { length: 10 }).notNull(),
  changes: text("changes"),
  effectiveDate: date("effective_date").notNull(),
  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  approvalDate: timestamp("approval_date"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schemeEligibilityRules = pgTable("scheme_eligibility_rules", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => insuranceSchemes.id).notNull(),
  ruleType: text("rule_type").notNull(),
  ruleCondition: text("rule_condition").notNull(),
  ruleValue: text("rule_value"),
  isMandatory: boolean("is_mandatory").default(true),
  priority: integer("priority").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Onboarding & Member Engagement ----------
export const onboardingSessions = pgTable("onboarding_sessions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  status: onboardingStatusEnum("status").default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const onboardingTasks = pgTable("onboarding_tasks", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => onboardingSessions.id).notNull(),
  taskName: text("task_name").notNull(),
  taskType: taskTypeEnum("task_type").notNull(),
  status: text("status").default("pending"),
  priority: integer("priority").default(1),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activationTokens = pgTable("activation_tokens", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  token: text("token").notNull().unique(),
  tokenType: text("token_type").default("activation"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberDocuments = pgTable("member_documents", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  documentNumber: text("document_number"),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  expiresAt: date("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberPreferences = pgTable("member_preferences", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  communicationChannel: communicationChannelEnum("communication_channel").default("email"),
  language: text("language").default("en"),
  timezone: text("timezone").default("UTC"),
  marketingConsent: boolean("marketing_consent").default(false),
  dataSharingConsent: boolean("data_sharing_consent").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberLifeEvents = pgTable("member_life_events", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  eventType: lifeEventTypeEnum("event_type").notNull(),
  eventDate: date("event_date").notNull(),
  description: text("description"),
  supportingDocuments: text("supporting_documents"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dependentRules = pgTable("dependent_rules", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  dependentType: dependentTypeEnum("dependent_type").notNull(),
  ageLimit: integer("age_limit"),
  coveragePercentage: real("coverage_percentage").default(100),
  requiresApproval: boolean("requires_approval").default(false),
  supportingDocuments: text("supporting_documents"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeGrades = pgTable("employee_grades", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  gradeName: text("grade_name").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberCards = pgTable("member_cards", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  cardNumber: text("card_number").notNull().unique(),
  cardType: text("card_type").notNull().default("physical"),
  status: text("status").notNull().default("active"),
  issuedDate: date("issued_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  pinHash: text("pin_hash"),
  isBlocked: boolean("is_blocked").default(false),
  blockReason: text("block_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cardTemplates = pgTable("card_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull(),
  templateType: text("template_type").notNull(),
  designData: text("design_data"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cardVerificationEvents = pgTable("card_verification_events", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").references(() => memberCards.id).notNull(),
  eventType: text("event_type").notNull(),
  verificationMethod: text("verification_method").notNull(),
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cardProductionBatches = pgTable("card_production_batches", {
  id: serial("id").primaryKey(),
  batchNumber: text("batch_number").notNull().unique(),
  templateId: integer("template_id").references(() => cardTemplates.id),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("pending"),
  productionDate: date("production_date"),
  deliveryDate: date("delivery_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const onboardingPreferences = pgTable("onboarding_preferences", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  autoAssignTasks: boolean("auto_assign_tasks").default(true),
  requireDocumentVerification: boolean("require_document_verification").default(true),
  enableWelcomeEmails: boolean("enable_welcome_emails").default(true),
  defaultCommunicationChannel: communicationChannelEnum("default_communication_channel").default("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- Audit ----------
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityType: auditEntityTypeEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: auditActionEnum("action").notNull(),
  userId: integer("user_id"),
  oldValues: text("old_values"),
  newValues: text("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// 3. INSERT SCHEMAS (Zod)
// ============================================================================
// Core
export const insertCompanySchema = createInsertSchema(companies);
export const insertMemberSchema = createInsertSchema(members);
export const insertUserSchema = createInsertSchema(users);
export const insertPeriodSchema = createInsertSchema(periods);
export const insertCompanyPeriodSchema = createInsertSchema(companyPeriods);
export const insertUserSessionSchema = createInsertSchema(userSessions);
export const insertSystemLogSchema = createInsertSchema(systemLogs);
export const insertSystemSettingSchema = createInsertSchema(systemSettings);

// CRM
export const insertLeadSchema = createInsertSchema(leads);
export const insertSalesTeamSchema = createInsertSchema(salesTeams);
export const insertTerritorySchema = createInsertSchema(territories);
export const insertAgentSchema = createInsertSchema(agents);
export const insertCommissionTierSchema = createInsertSchema(commissionTiers);
export const insertSalesOpportunitySchema = createInsertSchema(salesOpportunities);
export const insertSalesActivitySchema = createInsertSchema(salesActivities);
export const insertCommissionTransactionSchema = createInsertSchema(commissionTransactions);
export const insertAgentPerformanceSchema = createInsertSchema(agentPerformance);
export const insertAgentPerformanceMetricSchema = createInsertSchema(agentPerformanceMetrics);
export const insertAgentLeaderboardSchema = createInsertSchema(agentLeaderboards);
export const insertCommissionReportSchema = createInsertSchema(commissionReports);

// Claims
export const insertClaimSchema = createInsertSchema(claims);
export const insertDiagnosisCodeSchema = createInsertSchema(diagnosisCodes);
export const insertClaimAdjudicationResultSchema = createInsertSchema(claimAdjudicationResults);
export const insertMedicalNecessityValidationSchema = createInsertSchema(medicalNecessityValidations);
export const insertFraudDetectionResultSchema = createInsertSchema(fraudDetectionResults);
export const insertClaimAuditTrailSchema = createInsertSchema(claimAuditTrails);
export const insertBenefitUtilizationSchema = createInsertSchema(benefitUtilization);
export const insertExplanationOfBenefitSchema = createInsertSchema(explanationOfBenefits);
export const insertClaimProcedureItemSchema = createInsertSchema(claimProcedureItems);

// Finance
export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions);
export const insertPremiumInvoiceSchema = createInsertSchema(premiumInvoices);
export const insertFinancialAccountSchema = createInsertSchema(financialAccounts);
export const insertGeneralLedgerEntrySchema = createInsertSchema(generalLedgerEntries);
export const insertCommissionPaymentSchema = createInsertSchema(commissionPayments);
export const insertFinancialReportSchema = createInsertSchema(financialReports);

// Providers
export const insertProviderSchema = createInsertSchema(providers);
export const insertMedicalInstitutionSchema = createInsertSchema(medicalInstitutions);
export const insertProviderNetworkSchema = createInsertSchema(providerNetworks);
export const insertProviderNetworkAssignmentSchema = createInsertSchema(providerNetworkAssignments);
export const insertProviderContractSchema = createInsertSchema(providerContracts);
export const insertMedicalPersonnelSchema = createInsertSchema(medicalPersonnel);

// Fraud
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

// Analytics
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

// Tokens
export const insertAccessTokenSchema = createInsertSchema(accessTokens);
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens);
export const insertApiKeySchema = createInsertSchema(apiKeys);
export const insertOauthClientSchema = createInsertSchema(oauthClients);
export const insertAuthorizationCodeSchema = createInsertSchema(authorizationCodes);
export const insertTokenBlacklistSchema = createInsertSchema(tokenBlacklist);
export const insertSessionTokenSchema = createInsertSchema(sessionTokens);

// Schemes
export const insertInsuranceSchemeSchema = createInsertSchema(insuranceSchemes);
export const insertSchemeBenefitSchema = createInsertSchema(schemeBenefits);
export const insertSchemeNetworkSchema = createInsertSchema(schemeNetworks);
export const insertSchemeRiderSchema = createInsertSchema(schemeRiders);
export const insertSchemePricingSchema = createInsertSchema(schemePricing);
export const insertSchemeVersionSchema = createInsertSchema(schemeVersions);
export const insertSchemeEligibilityRuleSchema = createInsertSchema(schemeEligibilityRules);

// Onboarding
export const insertOnboardingSessionSchema = createInsertSchema(onboardingSessions);
export const insertOnboardingTaskSchema = createInsertSchema(onboardingTasks);
export const insertActivationTokenSchema = createInsertSchema(activationTokens);
export const insertMemberDocumentSchema = createInsertSchema(memberDocuments);
export const insertMemberPreferenceSchema = createInsertSchema(memberPreferences);
export const insertMemberLifeEventSchema = createInsertSchema(memberLifeEvents);
export const insertDependentRuleSchema = createInsertSchema(dependentRules);
export const insertEmployeeGradeSchema = createInsertSchema(employeeGrades);
export const insertMemberCardSchema = createInsertSchema(memberCards);
export const insertCardTemplateSchema = createInsertSchema(cardTemplates);
export const insertCardVerificationEventSchema = createInsertSchema(cardVerificationEvents);
export const insertCardProductionBatchSchema = createInsertSchema(cardProductionBatches);
export const insertOnboardingPreferenceSchema = createInsertSchema(onboardingPreferences);

// Audit
export const insertAuditLogSchema = createInsertSchema(auditLogs);

// ============================================================================
// 4. TYPES
// ============================================================================
export type Company = typeof companies.$inferSelect;
export type Member = typeof members.$inferSelect;
export type User = typeof users.$inferSelect;
export type Period = typeof periods.$inferSelect;
export type CompanyPeriod = typeof companyPeriods.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;

export type Lead = typeof leads.$inferSelect;
export type SalesTeam = typeof salesTeams.$inferSelect;
export type Territory = typeof territories.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type CommissionTier = typeof commissionTiers.$inferSelect;
export type SalesOpportunity = typeof salesOpportunities.$inferSelect;
export type SalesActivity = typeof salesActivities.$inferSelect;
export type CommissionTransaction = typeof commissionTransactions.$inferSelect;
export type AgentPerformance = typeof agentPerformance.$inferSelect;
export type AgentPerformanceMetric = typeof agentPerformanceMetrics.$inferSelect;
export type AgentLeaderboard = typeof agentLeaderboards.$inferSelect;
export type CommissionReport = typeof commissionReports.$inferSelect;

export type Claim = typeof claims.$inferSelect;
export type DiagnosisCode = typeof diagnosisCodes.$inferSelect;
export type ClaimAdjudicationResult = typeof claimAdjudicationResults.$inferSelect;
export type MedicalNecessityValidation = typeof medicalNecessityValidations.$inferSelect;
export type FraudDetectionResult = typeof fraudDetectionResults.$inferSelect;
export type ClaimAuditTrail = typeof claimAuditTrails.$inferSelect;
export type BenefitUtilization = typeof benefitUtilization.$inferSelect;
export type ExplanationOfBenefit = typeof explanationOfBenefits.$inferSelect;
export type ClaimProcedureItem = typeof claimProcedureItems.$inferSelect;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type PremiumInvoice = typeof premiumInvoices.$inferSelect;
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type GeneralLedgerEntry = typeof generalLedgerEntries.$inferSelect;
export type CommissionPayment = typeof commissionPayments.$inferSelect;
export type FinancialReport = typeof financialReports.$inferSelect;

export type Provider = typeof providers.$inferSelect;
export type MedicalInstitution = typeof medicalInstitutions.$inferSelect;
export type ProviderNetwork = typeof providerNetworks.$inferSelect;
export type ProviderNetworkAssignment = typeof providerNetworkAssignments.$inferSelect;
export type ProviderContract = typeof providerContracts.$inferSelect;
export type MedicalPersonnel = typeof medicalPersonnel.$inferSelect;

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

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type MetricData = typeof metricData.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ReportExecution = typeof reportExecutions.$inferSelect;
export type Dashboard = typeof dashboards.$inferSelect;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type AlertInstance = typeof alertInstances.$inferSelect;
export type DataQualityCheck = typeof dataQualityChecks.$inferSelect;
export type PredictiveModel = typeof predictiveModels.$inferSelect;

export type AccessToken = typeof accessTokens.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type OauthClient = typeof oauthClients.$inferSelect;
export type AuthorizationCode = typeof authorizationCodes.$inferSelect;
export type TokenBlacklist = typeof tokenBlacklist.$inferSelect;
export type SessionToken = typeof sessionTokens.$inferSelect;

export type InsuranceScheme = typeof insuranceSchemes.$inferSelect;
export type SchemeBenefit = typeof schemeBenefits.$inferSelect;
export type SchemeNetwork = typeof schemeNetworks.$inferSelect;
export type SchemeRider = typeof schemeRiders.$inferSelect;
export type SchemePricing = typeof schemePricing.$inferSelect;
export type SchemeVersion = typeof schemeVersions.$inferSelect;
export type SchemeEligibilityRule = typeof schemeEligibilityRules.$inferSelect;

export type OnboardingSession = typeof onboardingSessions.$inferSelect;
export type OnboardingTask = typeof onboardingTasks.$inferSelect;
export type ActivationToken = typeof activationTokens.$inferSelect;
export type MemberDocument = typeof memberDocuments.$inferSelect;
export type MemberPreference = typeof memberPreferences.$inferSelect;
export type MemberLifeEvent = typeof memberLifeEvents.$inferSelect;
export type DependentRule = typeof dependentRules.$inferSelect;
export type EmployeeGrade = typeof employeeGrades.$inferSelect;
export type MemberCard = typeof memberCards.$inferSelect;
export type CardTemplate = typeof cardTemplates.$inferSelect;
export type CardVerificationEvent = typeof cardVerificationEvents.$inferSelect;
export type CardProductionBatch = typeof cardProductionBatches.$inferSelect;
export type OnboardingPreference = typeof onboardingPreferences.$inferSelect;

export type AuditLog = typeof auditLogs.$inferSelect;

// Insert types
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPeriod = z.infer<typeof insertPeriodSchema>;
export type InsertCompanyPeriod = z.infer<typeof insertCompanyPeriodSchema>;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertSalesTeam = z.infer<typeof insertSalesTeamSchema>;
export type InsertTerritory = z.infer<typeof insertTerritorySchema>;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InsertCommissionTier = z.infer<typeof insertCommissionTierSchema>;
export type InsertSalesOpportunity = z.infer<typeof insertSalesOpportunitySchema>;
export type InsertSalesActivity = z.infer<typeof insertSalesActivitySchema>;
export type InsertCommissionTransaction = z.infer<typeof insertCommissionTransactionSchema>;
export type InsertAgentPerformance = z.infer<typeof insertAgentPerformanceSchema>;
export type InsertAgentPerformanceMetric = z.infer<typeof insertAgentPerformanceMetricSchema>;
export type InsertAgentLeaderboard = z.infer<typeof insertAgentLeaderboardSchema>;
export type InsertCommissionReport = z.infer<typeof insertCommissionReportSchema>;

export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type InsertDiagnosisCode = z.infer<typeof insertDiagnosisCodeSchema>;
export type InsertClaimAdjudicationResult = z.infer<typeof insertClaimAdjudicationResultSchema>;
export type InsertMedicalNecessityValidation = z.infer<typeof insertMedicalNecessityValidationSchema>;
export type InsertFraudDetectionResult = z.infer<typeof insertFraudDetectionResultSchema>;
export type InsertClaimAuditTrail = z.infer<typeof insertClaimAuditTrailSchema>;
export type InsertBenefitUtilization = z.infer<typeof insertBenefitUtilizationSchema>;
export type InsertExplanationOfBenefit = z.infer<typeof insertExplanationOfBenefitSchema>;
export type InsertClaimProcedureItem = z.infer<typeof insertClaimProcedureItemSchema>;

export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type InsertPremiumInvoice = z.infer<typeof insertPremiumInvoiceSchema>;
export type InsertFinancialAccount = z.infer<typeof insertFinancialAccountSchema>;
export type InsertGeneralLedgerEntry = z.infer<typeof insertGeneralLedgerEntrySchema>;
export type InsertCommissionPayment = z.infer<typeof insertCommissionPaymentSchema>;
export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;

export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type InsertMedicalInstitution = z.infer<typeof insertMedicalInstitutionSchema>;
export type InsertProviderNetwork = z.infer<typeof insertProviderNetworkSchema>;
export type InsertProviderNetworkAssignment = z.infer<typeof insertProviderNetworkAssignmentSchema>;
export type InsertProviderContract = z.infer<typeof insertProviderContractSchema>;
export type InsertMedicalPersonnel = z.infer<typeof insertMedicalPersonnelSchema>;

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

export type InsertAccessToken = z.infer<typeof insertAccessTokenSchema>;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type InsertOauthClient = z.infer<typeof insertOauthClientSchema>;
export type InsertAuthorizationCode = z.infer<typeof insertAuthorizationCodeSchema>;
export type InsertTokenBlacklist = z.infer<typeof insertTokenBlacklistSchema>;
export type InsertSessionToken = z.infer<typeof insertSessionTokenSchema>;

export type InsertInsuranceScheme = z.infer<typeof insertInsuranceSchemeSchema>;
export type InsertSchemeBenefit = z.infer<typeof insertSchemeBenefitSchema>;
export type InsertSchemeNetwork = z.infer<typeof insertSchemeNetworkSchema>;
export type InsertSchemeRider = z.infer<typeof insertSchemeRiderSchema>;
export type InsertSchemePricing = z.infer<typeof insertSchemePricingSchema>;
export type InsertSchemeVersion = z.infer<typeof insertSchemeVersionSchema>;
export type InsertSchemeEligibilityRule = z.infer<typeof insertSchemeEligibilityRuleSchema>;

export type InsertOnboardingSession = z.infer<typeof insertOnboardingSessionSchema>;
export type InsertOnboardingTask = z.infer<typeof insertOnboardingTaskSchema>;
export type InsertActivationToken = z.infer<typeof insertActivationTokenSchema>;
export type InsertMemberDocument = z.infer<typeof insertMemberDocumentSchema>;
export type InsertMemberPreference = z.infer<typeof insertMemberPreferenceSchema>;
export type InsertMemberLifeEvent = z.infer<typeof insertMemberLifeEventSchema>;
export type InsertDependentRule = z.infer<typeof insertDependentRuleSchema>;
export type InsertEmployeeGrade = z.infer<typeof insertEmployeeGradeSchema>;
export type InsertMemberCard = z.infer<typeof insertMemberCardSchema>;
export type InsertCardTemplate = z.infer<typeof insertCardTemplateSchema>;
export type InsertCardVerificationEvent = z.infer<typeof insertCardVerificationEventSchema>;
export type InsertCardProductionBatch = z.infer<typeof insertCardProductionBatchSchema>;
export type InsertOnboardingPreference = z.infer<typeof insertOnboardingPreferenceSchema>;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;