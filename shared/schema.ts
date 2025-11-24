import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const memberTypeEnum = pgEnum('member_type', ['principal', 'dependent']);
export const dependentTypeEnum = pgEnum('dependent_type', ['spouse', 'child']);
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

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  contactPerson: text("contact_person").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  address: text("address").notNull(),
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
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
});

export const insertPeriodSchema = createInsertSchema(periods).omit({
  id: true,
  createdAt: true,
});

export const insertPremiumRateSchema = createInsertSchema(premiumRates).omit({
  id: true,
  createdAt: true,
});

export const insertPremiumSchema = createInsertSchema(premiums).omit({
  id: true,
  createdAt: true,
});

export const insertBenefitSchema = createInsertSchema(benefits).omit({
  id: true,
  createdAt: true,
});

export const insertCompanyBenefitSchema = createInsertSchema(companyBenefits).omit({
  id: true,
  createdAt: true,
});

export const insertCompanyPeriodSchema = createInsertSchema(companyPeriods).omit({
  id: true,
  createdAt: true,
});

export const insertAgeBandedRateSchema = createInsertSchema(ageBandedRates).omit({
  id: true,
  createdAt: true,
});

export const insertFamilyRateSchema = createInsertSchema(familyRates).omit({
  id: true,
  createdAt: true,
});

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
  institutionId: integer("institution_id").references(() => medicalInstitutions.id).notNull(),
  personnelId: integer("personnel_id").references(() => medicalPersonnel.id),
  memberId: integer("member_id").references(() => members.id).notNull(),
  benefitId: integer("benefit_id").references(() => benefits.id).notNull(),
  claimDate: timestamp("claim_date").defaultNow().notNull(),
  serviceDate: timestamp("service_date").notNull(),
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
export const insertDiagnosisCodeSchema = createInsertSchema(diagnosisCodes).omit({
  id: true,
  createdAt: true,
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
});

export const insertMedicalInstitutionSchema = createInsertSchema(medicalInstitutions).omit({
  id: true,
  approvalDate: true,
  createdAt: true,
});

export const insertMedicalPersonnelSchema = createInsertSchema(medicalPersonnel).omit({
  id: true,
  approvalDate: true,
  createdAt: true,
});

export const insertPanelDocumentationSchema = createInsertSchema(panelDocumentation).omit({
  id: true,
  verificationDate: true,
  createdAt: true,
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  reviewDate: true,
  paymentDate: true,
  createdAt: true,
  // Admin approval fields
  adminApprovalDate: true,
  fraudReviewDate: true,
}).extend({
  diagnosisCode: z.string().min(3, "Diagnosis code must be at least 3 characters").max(50, "Diagnosis code is too long"),
  diagnosisCodeType: z.enum(["ICD-10", "ICD-11"], {
    required_error: "Diagnosis code type is required (ICD-10 or ICD-11)",
    invalid_type_error: "Diagnosis code type must be either ICD-10 or ICD-11",
  }),
  // Provider verification and fraud risk are set by the system, not provided by user
  providerVerified: z.boolean().optional().default(false),
  requiresHigherApproval: z.boolean().optional().default(false),
  approvedByAdmin: z.boolean().optional().default(false),
  adminReviewNotes: z.string().optional(),
  fraudRiskLevel: z.enum(["none", "low", "medium", "high", "confirmed"]).optional().default("none"),
  fraudRiskFactors: z.string().optional(),
  fraudReviewerId: z.number().optional(),
});

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

// User type enum for authentication
export const userTypeEnum = pgEnum('user_type', ['insurance', 'institution', 'provider']);

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  userType: userTypeEnum("user_type").notNull(),
  entityId: integer("entity_id").notNull(), // References company, institution, or personnel ID
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
export const insertPremiumPaymentSchema = createInsertSchema(premiumPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClaimPaymentSchema = createInsertSchema(claimPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderDisbursementSchema = createInsertSchema(providerDisbursements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDisbursementItemSchema = createInsertSchema(disbursementItems).omit({
  id: true,
  createdAt: true,
});

export const insertInsuranceBalanceSchema = createInsertSchema(insuranceBalances).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for enhanced premium calculation tables
export const insertEnhancedPremiumCalculationSchema = createInsertSchema(enhancedPremiumCalculations).omit({
  id: true,
  createdAt: true,
});

export const insertRiskAdjustmentFactorSchema = createInsertSchema(riskAdjustmentFactors).omit({
  id: true,
  createdAt: true,
});

export const insertHealthcareInflationRateSchema = createInsertSchema(healthcareInflationRates).omit({
  id: true,
  createdAt: true,
});

export const insertActuarialRateTableSchema = createInsertSchema(actuarialRateTables).omit({
  id: true,
  createdAt: true,
});

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export const insertMedicalProcedureSchema = createInsertSchema(medicalProcedures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderProcedureRateSchema = createInsertSchema(providerProcedureRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClaimProcedureItemSchema = createInsertSchema(claimProcedureItems).omit({
  id: true,
  createdAt: true,
});

// Types for medical procedures entities
export type MedicalProcedure = typeof medicalProcedures.$inferSelect;
export type InsertMedicalProcedure = z.infer<typeof insertMedicalProcedureSchema>;

export type ProviderProcedureRate = typeof providerProcedureRates.$inferSelect;
export type InsertProviderProcedureRate = z.infer<typeof insertProviderProcedureRateSchema>;

export type ClaimProcedureItem = typeof claimProcedureItems.$inferSelect;
export type InsertClaimProcedureItem = z.infer<typeof insertClaimProcedureItemSchema>;

// Insert schemas for authentication tables
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

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
export const documentTypeEnum = pgEnum('document_type', ['government_id', 'proof_of_address', 'insurance_card', 'dependent_document']);
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
export const insertOnboardingSessionSchema = createInsertSchema(onboardingSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOnboardingTaskSchema = createInsertSchema(onboardingTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberDocumentSchema = createInsertSchema(memberDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOnboardingPreferenceSchema = createInsertSchema(onboardingPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivationTokenSchema = createInsertSchema(activationTokens).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for personalization system
export const insertMemberPreferenceSchema = createInsertSchema(memberPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBehaviorAnalyticSchema = createInsertSchema(behaviorAnalytics).omit({
  id: true,
});

export const insertPersonalizationScoreSchema = createInsertSchema(personalizationScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJourneyStageSchema = createInsertSchema(journeyStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecommendationHistorySchema = createInsertSchema(recommendationHistory).omit({
  id: true,
  createdAt: true,
});

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
export const insertClaimAdjudicationResultSchema = createInsertSchema(claimAdjudicationResults).omit({
  id: true,
  createdAt: true,
});

export const insertMedicalNecessityValidationSchema = createInsertSchema(medicalNecessityValidations).omit({
  id: true,
  createdAt: true,
});

export const insertFraudDetectionResultSchema = createInsertSchema(fraudDetectionResults).omit({
  id: true,
  createdAt: true,
});

export const insertExplanationOfBenefitsSchema = createInsertSchema(explanationOfBenefits).omit({
  id: true,
  createdAt: true,
});

export const insertClaimAuditTrailSchema = createInsertSchema(claimAuditTrails).omit({
  id: true,
  createdAt: true,
});

export const insertBenefitUtilizationSchema = createInsertSchema(benefitUtilization).omit({
  id: true,
  createdAt: true,
});

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
export const insertMemberCardSchema = createInsertSchema(memberCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCardTemplateSchema = createInsertSchema(cardTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCardVerificationEventSchema = createInsertSchema(cardVerificationEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCardProductionBatchSchema = createInsertSchema(cardProductionBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for card management entities
export type MemberCard = typeof memberCards.$inferSelect;
export type InsertMemberCard = z.infer<typeof insertMemberCardSchema>;

export type CardTemplate = typeof cardTemplates.$inferSelect;
export type InsertCardTemplate = z.infer<typeof insertCardTemplateSchema>;

export type CardVerificationEvent = typeof cardVerificationEvents.$inferSelect;
export type InsertCardVerificationEvent = z.infer<typeof insertCardVerificationEventSchema>;

export type CardProductionBatch = typeof cardProductionBatches.$inferSelect;
export type InsertCardProductionBatch = z.infer<typeof insertCardProductionBatchSchema>;
