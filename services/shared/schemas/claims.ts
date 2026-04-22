import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for Claims Service
export const claimStatusEnum = pgEnum('claim_status', ['submitted', 'under_review', 'approved', 'rejected', 'paid', 'fraud_review', 'fraud_confirmed']);
export const diagnosisCodeEnum = pgEnum('diagnosis_code_type', ['icd10', 'icd9', 'custom']);
export const adjudicationResultEnum = pgEnum('adjudication_result', ['approved', 'denied', 'partial', 'pended']);
export const medicalNecessityEnum = pgEnum('medical_necessity', ['met', 'not_met', 'pending_review']);
export const fraudDetectionResultEnum = pgEnum('fraud_detection_result', ['clear', 'suspected', 'confirmed', 'under_review']);

// Claims table
export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  claimNumber: varchar("claim_number", { length: 20 }).notNull().unique(),
  memberId: integer("member_id").notNull(),
  providerId: integer("provider_id").notNull(),
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

// Diagnosis Codes table
export const diagnosisCodes = pgTable("diagnosis_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: text("description").notNull(),
  codeType: diagnosisCodeEnum("code_type").default("icd10"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Claim Adjudication Results table
export const claimAdjudicationResults = pgTable("claim_adjudication_results", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  result: adjudicationResultEnum("result").notNull(),
  approvedAmount: decimal("approved_amount", { precision: 15, scale: 2 }),
  deniedAmount: decimal("denied_amount", { precision: 15, scale: 2 }),
  denialReason: text("denial_reason"),
  adjudicationRules: text("adjudication_rules"), // JSON string of applied rules
  processedBy: integer("processed_by"),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  reviewRequired: boolean("review_required").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medical Necessity Validations table
export const medicalNecessityValidations = pgTable("medical_necessity_validations", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  diagnosisCode: text("diagnosis_code").notNull(),
  procedureCodes: text("procedure_codes").notNull(), // JSON array
  validationResult: medicalNecessityEnum("validation_result").notNull(),
  confidenceScore: real("confidence_score"),
  clinicalGuidelines: text("clinical_guidelines"), // JSON string
  validationNotes: text("validation_notes"),
  validatedBy: integer("validated_by"),
  validatedAt: timestamp("validated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fraud Detection Results table
export const fraudDetectionResults = pgTable("fraud_detection_results", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  result: fraudDetectionResultEnum("result").notNull(),
  riskScore: real("risk_score"),
  flags: text("flags"), // JSON array of fraud flags
  investigationNotes: text("investigation_notes"),
  investigatedBy: integer("investigated_by"),
  investigatedAt: timestamp("investigated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Explanation of Benefits table
export const explanationOfBenefits = pgTable("explanation_of_benefits", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id).notNull(),
  memberId: integer("member_id").notNull(),
  issueDate: date("issue_date").notNull(),
  servicePeriod: text("service_period"),
  totalBilled: decimal("total_billed", { precision: 15, scale: 2 }),
  planPaid: decimal("plan_paid", { precision: 15, scale: 2 }),
  memberResponsibility: decimal("member_responsibility", { precision: 15, scale: 2 }),
  benefitDetails: text("benefit_details"), // JSON string
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// Claim Audit Trails table
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

// Benefit Utilization table
export const benefitUtilization = pgTable("benefit_utilization", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  benefitCategory: text("benefit_category").notNull(),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
  utilizedAmount: decimal("utilized_amount", { precision: 15, scale: 2 }).default("0"),
  limitAmount: decimal("limit_amount", { precision: 15, scale: 2 }),
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }),
  utilizationPercentage: real("utilization_percentage"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Claim Procedure Items table
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

// Insert Schemas
export const insertClaimSchema = createInsertSchema(claims);
export const insertDiagnosisCodeSchema = createInsertSchema(diagnosisCodes);
export const insertClaimAdjudicationResultSchema = createInsertSchema(claimAdjudicationResults);
export const insertMedicalNecessityValidationSchema = createInsertSchema(medicalNecessityValidations);
export const insertFraudDetectionResultSchema = createInsertSchema(fraudDetectionResults);
export const insertExplanationOfBenefitSchema = createInsertSchema(explanationOfBenefits);
export const insertClaimAuditTrailSchema = createInsertSchema(claimAuditTrails);
export const insertBenefitUtilizationSchema = createInsertSchema(benefitUtilization);
export const insertClaimProcedureItemSchema = createInsertSchema(claimProcedureItems);

// Types
export type Claim = typeof claims.$inferSelect;
export type DiagnosisCode = typeof diagnosisCodes.$inferSelect;
export type ClaimAdjudicationResult = typeof claimAdjudicationResults.$inferSelect;
export type MedicalNecessityValidation = typeof medicalNecessityValidations.$inferSelect;
export type FraudDetectionResult = typeof fraudDetectionResults.$inferSelect;
export type ExplanationOfBenefit = typeof explanationOfBenefits.$inferSelect;
export type ClaimAuditTrail = typeof claimAuditTrails.$inferSelect;
export type BenefitUtilization = typeof benefitUtilization.$inferSelect;
export type ClaimProcedureItem = typeof claimProcedureItems.$inferSelect;

export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type InsertDiagnosisCode = z.infer<typeof insertDiagnosisCodeSchema>;
export type InsertClaimAdjudicationResult = z.infer<typeof insertClaimAdjudicationResultSchema>;
export type InsertMedicalNecessityValidation = z.infer<typeof insertMedicalNecessityValidationSchema>;
export type InsertFraudDetectionResult = z.infer<typeof insertFraudDetectionResultSchema>;
export type InsertExplanationOfBenefit = z.infer<typeof insertExplanationOfBenefitSchema>;
export type InsertClaimAuditTrail = z.infer<typeof insertClaimAuditTrailSchema>;
export type InsertBenefitUtilization = z.infer<typeof insertBenefitUtilizationSchema>;
export type InsertClaimProcedureItem = z.infer<typeof insertClaimProcedureItemSchema>;