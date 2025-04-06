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
export const claimStatusEnum = pgEnum('claim_status', ['submitted', 'under_review', 'approved', 'rejected', 'paid']);

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
  principalRate: real("principal_rate").notNull(),
  spouseRate: real("spouse_rate").notNull(),
  childRate: real("child_rate").notNull(),
  specialNeedsRate: real("special_needs_rate").notNull(),
  taxRate: real("tax_rate").notNull(),
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
  treatmentDetails: text("treatment_details"),
  status: claimStatusEnum("status").default("submitted").notNull(),
  reviewDate: timestamp("review_date"),
  reviewerNotes: text("reviewer_notes"),
  paymentDate: timestamp("payment_date"),
  paymentReference: text("payment_reference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for new entities
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
