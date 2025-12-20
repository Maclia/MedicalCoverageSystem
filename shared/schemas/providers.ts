import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for Providers Service
export const institutionTypeEnum = pgEnum('institution_type', ['hospital', 'clinic', 'laboratory', 'imaging', 'pharmacy', 'specialist', 'general']);
export const personnelTypeEnum = pgEnum('personnel_type', ['doctor', 'nurse', 'specialist', 'technician', 'pharmacist', 'therapist', 'other']);
export const contractStatusEnum = pgEnum('contract_status', ['draft', 'active', 'expired', 'terminated', 'renewal_pending']);
export const networkTierEnum = pgEnum('network_tier', ['tier_1', 'tier_2', 'tier_3', 'premium', 'basic', 'standard']);

// Providers table
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

// Medical Institutions table
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
  specialties: text("specialties"), // JSON array
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Provider Networks table
export const providerNetworks = pgTable("provider_networks", {
  id: serial("id").primaryKey(),
  networkName: text("network_name").notNull(),
  networkType: text("network_type").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Provider Network Assignments table
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

// Provider Contracts table
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

// Medical Personnel table
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

// Insert Schemas
export const insertProviderSchema = createInsertSchema(providers);
export const insertMedicalInstitutionSchema = createInsertSchema(medicalInstitutions);
export const insertProviderNetworkSchema = createInsertSchema(providerNetworks);
export const insertProviderNetworkAssignmentSchema = createInsertSchema(providerNetworkAssignments);
export const insertProviderContractSchema = createInsertSchema(providerContracts);
export const insertMedicalPersonnelSchema = createInsertSchema(medicalPersonnel);

// Types
export type Provider = typeof providers.$inferSelect;
export type MedicalInstitution = typeof medicalInstitutions.$inferSelect;
export type ProviderNetwork = typeof providerNetworks.$inferSelect;
export type ProviderNetworkAssignment = typeof providerNetworkAssignments.$inferSelect;
export type ProviderContract = typeof providerContracts.$inferSelect;
export type MedicalPersonnel = typeof medicalPersonnel.$inferSelect;

export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type InsertMedicalInstitution = z.infer<typeof insertMedicalInstitutionSchema>;
export type InsertProviderNetwork = z.infer<typeof insertProviderNetworkSchema>;
export type InsertProviderNetworkAssignment = z.infer<typeof insertProviderNetworkAssignmentSchema>;
export type InsertProviderContract = z.infer<typeof insertProviderContractSchema>;
export type InsertMedicalPersonnel = z.infer<typeof insertMedicalPersonnelSchema>;
