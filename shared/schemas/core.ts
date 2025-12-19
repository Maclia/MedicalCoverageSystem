import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, uuid, varchar, decimal, sql } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for Core Service
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

// Companies table
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

// Periods table
export const periods = pgTable("periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Company Periods table
export const companyPeriods = pgTable("company_periods", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Member Documents table
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

// Onboarding Sessions table
export const onboardingSessions = pgTable("onboarding_sessions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Onboarding Tasks table
export const onboardingTasks = pgTable("onboarding_tasks", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => onboardingSessions.id).notNull(),
  taskName: text("task_name").notNull(),
  taskType: text("task_type").notNull(),
  status: text("status").notNull().default("pending"),
  priority: integer("priority").default(1),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Activation Tokens table
export const activationTokens = pgTable("activation_tokens", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  token: text("token").notNull().unique(),
  tokenType: text("token_type").notNull().default("activation"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Member Preferences table
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

// Member Life Events table
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

// Dependent Rules table
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

// Employee Grades table
export const employeeGrades = pgTable("employee_grades", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  gradeName: text("grade_name").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Member Cards table
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

// Card Templates table
export const cardTemplates = pgTable("card_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull(),
  templateType: text("template_type").notNull(),
  designData: text("design_data"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Card Verification Events table
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

// Card Production Batches table
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

// Onboarding Preferences table
export const onboardingPreferences = pgTable("onboarding_preferences", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  autoAssignTasks: boolean("auto_assign_tasks").default(true),
  requireDocumentVerification: boolean("require_document_verification").default(true),
  enableWelcomeEmails: boolean("enable_welcome_emails").default(true),
  defaultCommunicationChannel: communicationChannelEnum("default_communication_channel").default("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Logs table (for core service operations)
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

// Insert Schemas
export const insertCompanySchema = createInsertSchema(companies);
export const insertMemberSchema = createInsertSchema(members);
export const insertPeriodSchema = createInsertSchema(periods);
export const insertCompanyPeriodSchema = createInsertSchema(companyPeriods);
export const insertMemberDocumentSchema = createInsertSchema(memberDocuments);
export const insertOnboardingSessionSchema = createInsertSchema(onboardingSessions);
export const insertOnboardingTaskSchema = createInsertSchema(onboardingTasks);
export const insertActivationTokenSchema = createInsertSchema(activationTokens);
export const insertMemberPreferenceSchema = createInsertSchema(memberPreferences);
export const insertMemberLifeEventSchema = createInsertSchema(memberLifeEvents);
export const insertDependentRuleSchema = createInsertSchema(dependentRules);
export const insertEmployeeGradeSchema = createInsertSchema(employeeGrades);
export const insertMemberCardSchema = createInsertSchema(memberCards);
export const insertCardTemplateSchema = createInsertSchema(cardTemplates);
export const insertCardVerificationEventSchema = createInsertSchema(cardVerificationEvents);
export const insertCardProductionBatchSchema = createInsertSchema(cardProductionBatches);
export const insertOnboardingPreferenceSchema = createInsertSchema(onboardingPreferences);
export const insertAuditLogSchema = createInsertSchema(auditLogs);

// Types
export type Company = typeof companies.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Period = typeof periods.$inferSelect;
export type CompanyPeriod = typeof companyPeriods.$inferSelect;
export type MemberDocument = typeof memberDocuments.$inferSelect;
export type OnboardingSession = typeof onboardingSessions.$inferSelect;
export type OnboardingTask = typeof onboardingTasks.$inferSelect;
export type ActivationToken = typeof activationTokens.$inferSelect;
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

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type InsertPeriod = z.infer<typeof insertPeriodSchema>;
export type InsertCompanyPeriod = z.infer<typeof insertCompanyPeriodSchema>;
export type InsertMemberDocument = z.infer<typeof insertMemberDocumentSchema>;
export type InsertOnboardingSession = z.infer<typeof insertOnboardingSessionSchema>;
export type InsertOnboardingTask = z.infer<typeof insertOnboardingTaskSchema>;
export type InsertActivationToken = z.infer<typeof insertActivationTokenSchema>;
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