import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  date,
  unique,
  index,
  foreignKey,
  pgEnum,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const membershipStatusEnum = pgEnum('membership_status', [
  'pending',
  'active',
  'suspended',
  'terminated',
  'expired'
]);

export const memberTypeEnum = pgEnum('member_type', [
  'principal',
  'dependent'
]);

export const dependentTypeEnum = pgEnum('dependent_type', [
  'spouse',
  'child',
  'parent'
]);

export const genderEnum = pgEnum('gender', [
  'male',
  'female',
  'other'
]);

export const maritalStatusEnum = pgEnum('marital_status', [
  'single',
  'married',
  'divorced',
  'widowed'
]);

export const documentTypeEnum = pgEnum('document_type', [
  'national_id',
  'passport',
  'birth_certificate',
  'marriage_certificate',
  'employment_letter',
  'medical_report',
  'student_letter',
  'disability_certificate',
  'income_proof',
  'address_proof',
  'other'
]);

export const lifeEventTypeEnum = pgEnum('life_event_type', [
  'enrollment',
  'activation',
  'suspension',
  'reinstatement',
  'termination',
  'renewal',
  'benefit_change',
  'coverage_update',
  'data_update'
]);

export const communicationTypeEnum = pgEnum('communication_type', [
  'enrollment_confirmation',
  'suspension_notice',
  'termination_notice',
  'renewal_notification',
  'benefit_update',
  'payment_reminder',
  'wellness_invite',
  'policy_update',
  'general_announcement',
  'compliance_notice'
]);

// Tables
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull(),
  memberId: varchar('member_id', { length: 20 }).unique().notNull(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  email: varchar('email', { length: 100 }).unique().notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  dateOfBirth: date('date_of_birth').notNull(),
  gender: genderEnum('gender'),
  maritalStatus: maritalStatusEnum('marital_status'),
  nationalId: varchar('national_id', { length: 50 }),
  passportNumber: varchar('passport_number', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 50 }).default('Kenya'),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  memberType: memberTypeEnum('member_type').default('principal'),
  principalId: integer('principal_id').references(() => members.id),
  dependentType: dependentTypeEnum('dependent_type'),
  membershipStatus: membershipStatusEnum('membership_status').default('pending'),
  enrollmentDate: date('enrollment_date').notNull(),
  activationDate: date('activation_date'),
  lastSuspensionDate: date('last_suspension_date'),
  suspensionReason: text('suspension_reason'),
  terminationDate: date('termination_date'),
  terminationReason: text('termination_reason'),
  renewalDate: date('renewal_date'),
  beneficiaryName: varchar('beneficiary_name', { length: 100 }),
  beneficiaryRelationship: varchar('beneficiary_relationship', { length: 50 }),
  beneficiaryContact: varchar('beneficiary_contact', { length: 100 }),
  hasDisability: boolean('has_disability').default(false),
  disabilityDetails: text('disability_details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  memberIdIndex: index('member_member_id_idx').on(table.memberId),
  emailIndex: index('member_email_idx').on(table.email),
  companyIndex: index('member_company_idx').on(table.companyId),
  statusIndex: index('member_status_idx').on(table.membershipStatus),
  nameIndex: index('member_name_idx').on(table.lastName, table.firstName)
}));

export const memberLifeEvents = pgTable('member_life_events', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  eventType: lifeEventTypeEnum('event_type').notNull(),
  eventDate: date('event_date').notNull(),
  previousStatus: membershipStatusEnum('previous_status'),
  newStatus: membershipStatusEnum('new_status'),
  reason: text('reason'),
  notes: text('notes'),
  processedBy: integer('processed_by'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  memberIndex: index('life_event_member_idx').on(table.memberId),
  dateIndex: index('life_event_date_idx').on(table.eventDate),
  typeIndex: index('life_event_type_idx').on(table.eventType)
}));

export const memberDocuments = pgTable('member_documents', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  documentType: documentTypeEnum('document_type').notNull(),
  documentName: varchar('document_name', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  checksum: varchar('checksum', { length: 64 }),
  expiresAt: date('expires_at'),
  isVerified: boolean('is_verified').default(false),
  verificationDate: date('verification_date'),
  verifiedBy: integer('verified_by'),
  uploadedBy: integer('uploaded_by'),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  memberIndex: index('doc_member_idx').on(table.memberId),
  typeIndex: index('doc_type_idx').on(table.documentType),
  verifiedIndex: index('doc_verified_idx').on(table.isVerified)
}));

export const memberConsents = pgTable('member_consents', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  consentType: varchar('consent_type', { length: 100 }).notNull(),
  consentVersion: varchar('consent_version', { length: 20 }).notNull(),
  isConsented: boolean('is_consented').notNull(),
  consentDate: date('consent_date').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  documentId: integer('document_id').references(() => memberDocuments.id),
  withdrawnAt: date('withdrawn_at'),
  withdrawnReason: text('withdrawn_reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  memberIndex: index('consent_member_idx').on(table.memberId),
  typeIndex: index('consent_type_idx').on(table.consentType),
  consentedIndex: index('consent_consented_idx').on(table.isConsented)
}));

export const communicationLogs = pgTable('communication_logs', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').references(() => members.id, { onDelete: 'cascade' }),
  communicationType: communicationTypeEnum('communication_type').notNull(),
  channel: varchar('channel', { length: 50 }).notNull(), // email, sms, push, whatsapp
  recipient: varchar('recipient', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  content: text('content').notNull(),
  status: varchar('status', { length: 50 }).default('pending'), // pending, sent, delivered, failed
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickCount: integer('click_count').default(0),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  templateId: varchar('template_id', { length: 100 }),
  scheduledAt: timestamp('scheduled_at'),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  memberIndex: index('comm_member_idx').on(table.memberId),
  typeIndex: index('comm_type_idx').on(table.communicationType),
  statusIndex: index('comm_status_idx').on(table.status),
  channelIndex: index('comm_channel_idx').on(table.channel)
}));

export const dependentRules = pgTable('dependent_rules', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull(),
  dependentType: dependentTypeEnum('dependent_type').notNull(),
  maxAge: integer('max_age'),
  minAge: integer('min_age'),
  maxNumber: integer('max_number'),
  requiredDocuments: jsonb('required_documents'),
  isActive: boolean('is_active').default(true),
  effectiveDate: date('effective_date').notNull(),
  expiryDate: date('expiry_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  companyIndex: index('dependent_rules_company_idx').on(table.companyId),
  typeIndex: index('dependent_rules_type_idx').on(table.dependentType),
  activeIndex: index('dependent_rules_active_idx').on(table.isActive)
}));

export const memberEligibility = pgTable('member_eligibility', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  benefitId: integer('benefit_id').notNull(),
  isEligible: boolean('is_eligible').notNull(),
  effectiveDate: date('effective_date').notNull(),
  expiryDate: date('expiry_date'),
  coverageLimit: decimal('coverage_limit', { precision: 12, scale: 2 }),
  remainingLimit: decimal('remaining_limit', { precision: 12, scale: 2 }),
  utilizationCount: integer('utilization_count').default(0),
  lastUtilizationDate: date('last_utilization_date'),
  restrictions: jsonb('restrictions'),
  conditions: jsonb('conditions'),
  notes: text('notes'),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: integer('verified_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  memberIndex: index('eligibility_member_idx').on(table.memberId),
  benefitIndex: index('eligibility_benefit_idx').on(table.benefitId),
  eligibleIndex: index('eligibility_eligible_idx').on(table.isEligible)
}));

// Relations
export const membersRelations = relations(members, ({ one, many }) => ({
  lifeEvents: many(memberLifeEvents),
  documents: many(memberDocuments),
  consents: many(memberConsents),
  communications: many(communicationLogs),
  eligibility: many(memberEligibility),
  dependents: many(members, { relationName: 'principal_dependents' }),
  principal: one(members, {
    fields: [members.principalId],
    references: [members.id],
    relationName: 'principal_dependents'
  })
}));

export const memberLifeEventsRelations = relations(memberLifeEvents, ({ one }) => ({
  member: one(members, {
    fields: [memberLifeEvents.memberId],
    references: [members.id]
  })
}));

export const memberDocumentsRelations = relations(memberDocuments, ({ one }) => ({
  member: one(members, {
    fields: [memberDocuments.memberId],
    references: [members.id]
  }),
  verificationConsents: many(memberConsents)
}));

export const memberConsentsRelations = relations(memberConsents, ({ one }) => ({
  member: one(members, {
    fields: [memberConsents.memberId],
    references: [members.id]
  }),
  document: one(memberDocuments, {
    fields: [memberConsents.documentId],
    references: [memberDocuments.id]
  })
}));

export const communicationLogsRelations = relations(communicationLogs, ({ one }) => ({
  member: one(members, {
    fields: [communicationLogs.memberId],
    references: [members.id]
  })
}));

export const memberEligibilityRelations = relations(memberEligibility, ({ one }) => ({
  member: one(members, {
    fields: [memberEligibility.memberId],
    references: [members.id]
  })
}));

// Types
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type MemberLifeEvent = typeof memberLifeEvents.$inferSelect;
export type NewMemberLifeEvent = typeof memberLifeEvents.$inferInsert;
export type MemberDocument = typeof memberDocuments.$inferSelect;
export type NewMemberDocument = typeof memberDocuments.$inferInsert;
export type MemberConsent = typeof memberConsents.$inferSelect;
export type NewMemberConsent = typeof memberConsents.$inferInsert;
export type CommunicationLog = typeof communicationLogs.$inferSelect;
export type NewCommunicationLog = typeof communicationLogs.$inferInsert;
export type DependentRule = typeof dependentRules.$inferSelect;
export type NewDependentRule = typeof dependentRules.$inferInsert;
export type MemberEligibility = typeof memberEligibility.$inferSelect;
export type NewMemberEligibility = typeof memberEligibility.$inferInsert;