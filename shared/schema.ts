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
