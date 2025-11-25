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

// Provider Network Management Enums
export const networkTierEnum = pgEnum('network_tier', ['tier_1', 'tier_2', 'tier_3', 'premium', 'basic', 'standard']);
export const contractStatusEnum = pgEnum('contract_status', ['draft', 'active', 'expired', 'terminated', 'renewal_pending']);
export const tariffStatusEnum = pgEnum('tariff_status', ['active', 'inactive', 'pending', 'deprecated']);
export const reimbursementModelEnum = pgEnum('reimbursement_model', ['fee_for_service', 'capitation', 'drg', 'per_diem', 'package_deal']);

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
export type CardProductionBatch = typeof cardProductionBatches.$inferSelect;
export type InsertCardProductionBatch = z.infer<typeof insertCardProductionBatchSchema>;

// Insert schemas for provider network management tables
export const insertProviderNetworkSchema = createInsertSchema(providerNetworks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderNetworkAssignmentSchema = createInsertSchema(providerNetworkAssignments).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for contract management tables
export const insertProviderContractSchema = createInsertSchema(providerContracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractDocumentSchema = createInsertSchema(contractDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertContractSignatureSchema = createInsertSchema(contractSignatures).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for tariff catalog tables
export const insertTariffCatalogSchema = createInsertSchema(tariffCatalogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTariffItemSchema = createInsertSchema(tariffItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPharmacyPriceListSchema = createInsertSchema(pharmacyPriceLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConsumablesPriceListSchema = createInsertSchema(consumablesPriceLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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
export const dependentTypeEnum = pgEnum('dependent_type', ['spouse', 'child', 'parent']);

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
export const insertProviderOnboardingApplicationSchema = createInsertSchema(providerOnboardingApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderVerificationChecklistSchema = createInsertSchema(providerVerificationChecklist).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderAccreditationSchema = createInsertSchema(providerAccreditations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderPerformanceMetricSchema = createInsertSchema(providerPerformanceMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderComplianceMonitoringSchema = createInsertSchema(providerComplianceMonitoring).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderQualityScoreSchema = createInsertSchema(providerQualityScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderFinancialPerformanceSchema = createInsertSchema(providerFinancialPerformance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderReferralNetworkSchema = createInsertSchema(providerReferralNetwork).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderEducationTrainingSchema = createInsertSchema(providerEducationTraining).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderClinicalExpertiseSchema = createInsertSchema(providerClinicalExpertise).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas for Schemes & Benefits module
export const insertSchemeSchema = createInsertSchema(schemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchemeVersionSchema = createInsertSchema(schemeVersions).omit({
  id: true,
  createdAt: true,
});

export const insertPlanTierSchema = createInsertSchema(planTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnhancedBenefitSchema = createInsertSchema(enhancedBenefits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchemeBenefitMappingSchema = createInsertSchema(schemeBenefitMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCostSharingRuleSchema = createInsertSchema(costSharingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBenefitLimitSchema = createInsertSchema(benefitLimits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCorporateSchemeConfigSchema = createInsertSchema(corporateSchemeConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeGradeBenefitSchema = createInsertSchema(employeeGradeBenefits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDependentCoverageRuleSchema = createInsertSchema(dependentCoverageRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBenefitRiderSchema = createInsertSchema(benefitRiders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberRiderSelectionSchema = createInsertSchema(memberRiderSelections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBenefitRuleSchema = createInsertSchema(benefitRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRuleExecutionLogSchema = createInsertSchema(ruleExecutionLogs).omit({
  id: true,
  createdAt: true,
});

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
