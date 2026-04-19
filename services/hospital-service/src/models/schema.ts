import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  jsonb,
  index,
  uuid,
  pgEnum
} from 'drizzle-orm/pg-core';

// Enums
export const hospitalTypeEnum = pgEnum('hospital_type', [
  'general',
  'specialty',
  'teaching',
  'research'
]);

export const hospitalCategoryEnum = pgEnum('hospital_category', [
  'public',
  'private',
  'non-profit',
  'military'
]);

export const hospitalDepartmentTypeEnum = pgEnum('hospital_department_type', [
  'medical',
  'surgical',
  'diagnostic',
  'support'
]);

export const hospitalStaffTypeEnum = pgEnum('hospital_staff_type', [
  'doctor',
  'nurse',
  'technician',
  'admin',
  'support'
]);

export const hospitalAppointmentTypeEnum = pgEnum('hospital_appointment_type', [
  'consultation',
  'follow_up',
  'emergency',
  'procedure'
]);

export const hospitalAppointmentStatusEnum = pgEnum('hospital_appointment_status', [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
]);

export const hospitalAppointmentPriorityEnum = pgEnum('hospital_appointment_priority', [
  'normal',
  'urgent',
  'emergency'
]);

export const hospitalBedTypeEnum = pgEnum('hospital_bed_type', [
  'general',
  'semi_private',
  'private',
  'icu',
  'nicu',
  'pediatric'
]);

export const hospitalBedStatusEnum = pgEnum('hospital_bed_status', [
  'available',
  'occupied',
  'maintenance',
  'reserved'
]);

export const hospitalInventoryTypeEnum = pgEnum('hospital_inventory_type', [
  'medical',
  'consumable',
  'equipment',
  'furniture'
]);

// Hospital Management Tables
export const hospitals = pgTable('hospitals', {
  id: serial('id').primaryKey(),
  hospitalCode: varchar('hospital_code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  registrationNumber: varchar('registration_number', { length: 100 }).notNull().unique(),
  type: hospitalTypeEnum('type').notNull(),
  category: hospitalCategoryEnum('category'),
  bedCapacity: integer('bed_capacity').default(0),
  icuCapacity: integer('icu_capacity').default(0),
  emergencyCapacity: integer('emergency_capacity').default(0),
  accreditationStatus: varchar('accreditation_status', { length: 100 }),
  accreditationBody: varchar('accreditation_body', { length: 255 }),
  accreditationExpiry: timestamp('accreditation_expiry'),
  licenseNumber: varchar('license_number', { length: 100 }).notNull(),
  licenseExpiry: timestamp('license_expiry').notNull(),
  regionId: integer('region_id').notNull(),
  address: text('address').notNull(),
  postalCode: varchar('postal_code', { length: 20 }),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).default('Kenya'),
  website: varchar('website', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  fax: varchar('fax', { length: 20 }),
  emergencyPhone: varchar('emergency_phone', { length: 20 }),
  is24Hour: boolean('is_24_hour').default(false),
  operatingHours: jsonb('operating_hours'),
  services: jsonb('services'),
  specializations: jsonb('specializations'),
  equipment: jsonb('equipment'),
  facilities: jsonb('facilities'),
  qualityScore: decimal('quality_score', { precision: 3, scale: 2 }).default(0.0),
  rating: decimal('rating', { precision: 3, scale: 2 }).default(0.0),
  reviewCount: integer('review_count').default(0),
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  verificationDate: timestamp('verification_date'),
  approvedBy: varchar('approved_by', { length: 100 }),
  approvedAt: timestamp('approved_at'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  hospitalCodeIdx: index('hospitals_hospital_code_idx').on(table.hospitalCode),
  nameIdx: index('hospitals_name_idx').on(table.name),
  registrationNumberIdx: index('hospitals_registration_number_idx').on(table.registrationNumber),
  regionIdIdx: index('hospitals_region_id_idx').on(table.regionId),
  emailIdx: index('hospitals_email_idx').on(table.email),
  phoneIdx: index('hospitals_phone_idx').on(table.phone),
  isActiveIdx: index('hospitals_is_active_idx').on(table.isActive),
  isVerifiedIdx: index('hospitals_is_verified_idx').on(table.isVerified),
  qualityScoreIdx: index('hospitals_quality_score_idx').on(table.qualityScore),
  ratingIdx: index('hospitals_rating_idx').on(table.rating),
}));

export const hospitalDepartments = pgTable('hospital_departments', {
  id: serial('id').primaryKey(),
  hospitalId: integer('hospital_id').references(() => hospitals.id).notNull(),
  departmentName: varchar('department_name', { length: 255 }).notNull(),
  departmentType: hospitalDepartmentTypeEnum('department_type').notNull(),
  headOfDepartment: varchar('head_of_department', { length: 255 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  extension: varchar('extension', { length: 20 }),
  location: varchar('location', { length: 255 }),
  description: text('description'),
  services: jsonb('services'),
  equipment: jsonb('equipment'),
  operatingHours: jsonb('operating_hours'),
  isEmergency: boolean('is_emergency').default(false),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  hospitalIdIdx: index('hospital_departments_hospital_id_idx').on(table.hospitalId),
  departmentNameIdx: index('hospital_departments_department_name_idx').on(table.departmentName),
  departmentTypeIdx: index('hospital_departments_department_type_idx').on(table.departmentType),
  isActiveIdx: index('hospital_departments_is_active_idx').on(table.isActive),
  isEmergencyIdx: index('hospital_departments_is_emergency_idx').on(table.isEmergency),
}));

export const hospitalStaff = pgTable('hospital_staff', {
  id: serial('id').primaryKey(),
  hospitalId: integer('hospital_id').references(() => hospitals.id).notNull(),
  staffType: hospitalStaffTypeEnum('staff_type').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  employeeId: varchar('employee_id', { length: 50 }).notNull().unique(),
  departmentId: integer('department_id').references(() => hospitalDepartments.id),
  specialization: varchar('specialization', { length: 100 }),
  qualifications: text('qualifications'),
  licenseNumber: varchar('license_number', { length: 100 }),
  licenseExpiry: timestamp('license_expiry'),
  yearsOfExperience: integer('years_of_experience').default(0),
  isConsultant: boolean('is_consultant').default(false),
  isAvailable: boolean('is_available').default(true),
  availability: jsonb('availability'),
  consultationFee: decimal('consultation_fee', { precision: 10, scale: 2 }),
  consultationDuration: integer('consultation_duration').default(30),
  rating: decimal('rating', { precision: 3, scale: 2 }).default(0.0),
  reviewCount: integer('review_count').default(0),
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  verificationDate: timestamp('verification_date'),
  approvedBy: varchar('approved_by', { length: 100 }),
  approvedAt: timestamp('approved_at'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  hospitalIdIdx: index('hospital_staff_hospital_id_idx').on(table.hospitalId),
  staffTypeIdx: index('hospital_staff_staff_type_idx').on(table.staffType),
  emailIdx: index('hospital_staff_email_idx').on(table.email),
  employeeIdIdx: index('hospital_staff_employee_id_idx').on(table.employeeId),
  departmentIdIdx: index('hospital_staff_department_id_idx').on(table.departmentId),
  isActiveIdx: index('hospital_staff_is_active_idx').on(table.isActive),
  isVerifiedIdx: index('hospital_staff_is_verified_idx').on(table.isVerified),
  ratingIdx: index('hospital_staff_rating_idx').on(table.rating),
}));

export const hospitalAppointments = pgTable('hospital_appointments', {
  id: serial('id').primaryKey(),
  appointmentNumber: varchar('appointment_number', { length: 50 }).notNull().unique(),
  hospitalId: integer('hospital_id').references(() => hospitals.id).notNull(),
  departmentId: integer('department_id').references(() => hospitalDepartments.id),
  staffId: integer('staff_id').references(() => hospitalStaff.id),
  patientId: integer('patient_id').notNull(),
  patientName: varchar('patient_name', { length: 255 }).notNull(),
  patientEmail: varchar('patient_email', { length: 255 }),
  patientPhone: varchar('patient_phone', { length: 20 }).notNull(),
  appointmentType: hospitalAppointmentTypeEnum('appointment_type').notNull(),
  appointmentDate: timestamp('appointment_date').notNull(),
  appointmentTime: timestamp('appointment_time').notNull(),
  duration: integer('duration').default(30),
  status: hospitalAppointmentStatusEnum('status').notNull().default('scheduled'),
  priority: hospitalAppointmentPriorityEnum('priority').default('normal'),
  reason: text('reason'),
  symptoms: text('symptoms'),
  medicalHistory: text('medical_history'),
  currentMedications: text('current_medications'),
  allergies: text('allergies'),
  notes: text('notes'),
  referralSource: varchar('referral_source', { length: 100 }),
  referralDoctor: varchar('referral_doctor', { length: 255 }),
  referralHospital: varchar('referral_hospital', { length: 255 }),
  isWalkIn: boolean('is_walk_in').default(false),
  isEmergency: boolean('is_emergency').default(false),
  emergencyType: varchar('emergency_type', { length: 100 }),
  triageLevel: varchar('triage_level', { length: 20 }),
  checkInTime: timestamp('check_in_time'),
  checkOutTime: timestamp('check_out_time'),
  consultationTime: timestamp('consultation_time'),
  consultationNotes: text('consultation_notes'),
  diagnosis: text('diagnosis'),
  treatmentPlan: text('treatment_plan'),
  prescription: text('prescription'),
  followUpRequired: boolean('follow_up_required').default(false),
  followUpDate: timestamp('follow_up_date'),
  followUpNotes: text('follow_up_notes'),
  billingAmount: decimal('billing_amount', { precision: 10, scale: 2 }),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).default(0),
  paymentStatus: varchar('payment_status', { length: 20 }).default('pending'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentReference: varchar('payment_reference', { length: 100 }),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  appointmentNumberIdx: index('hospital_appointments_appointment_number_idx').on(table.appointmentNumber),
  hospitalIdIdx: index('hospital_appointments_hospital_id_idx').on(table.hospitalId),
  departmentIdIdx: index('hospital_appointments_department_id_idx').on(table.departmentId),
  staffIdIdx: index('hospital_appointments_staff_id_idx').on(table.staffId),
  patientIdIdx: index('hospital_appointments_patient_id_idx').on(table.patientId),
  appointmentDateIdx: index('hospital_appointments_appointment_date_idx').on(table.appointmentDate),
  statusIdx: index('hospital_appointments_status_idx').on(table.status),
  priorityIdx: index('hospital_appointments_priority_idx').on(table.priority),
  isEmergencyIdx: index('hospital_appointments_is_emergency_idx').on(table.isEmergency),
}));

export const hospitalBeds = pgTable('hospital_beds', {
  id: serial('id').primaryKey(),
  hospitalId: integer('hospital_id').references(() => hospitals.id).notNull(),
  bedNumber: varchar('bed_number', { length: 50 }).notNull(),
  bedType: hospitalBedTypeEnum('bed_type').notNull(),
  ward: varchar('ward', { length: 100 }),
  room: varchar('room', { length: 50 }),
  floor: varchar('floor', { length: 20 }),
  status: hospitalBedStatusEnum('status').notNull().default('available'),
  patientId: integer('patient_id'),
  patientName: varchar('patient_name', { length: 255 }),
  admissionDate: timestamp('admission_date'),
  expectedDischargeDate: timestamp('expected_discharge_date'),
  actualDischargeDate: timestamp('actual_discharge_date'),
  notes: text('notes'),
  equipment: jsonb('equipment'),
  monitoring: jsonb('monitoring'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  hospitalIdIdx: index('hospital_beds_hospital_id_idx').on(table.hospitalId),
  bedNumberIdx: index('hospital_beds_bed_number_idx').on(table.bedNumber),
  statusIdx: index('hospital_beds_status_idx').on(table.status),
  patientIdIdx: index('hospital_beds_patient_id_idx').on(table.patientId),
  wardIdx: index('hospital_beds_ward_idx').on(table.ward),
  roomIdx: index('hospital_beds_room_idx').on(table.room),
}));

export const hospitalInventory = pgTable('hospital_inventory', {
  id: serial('id').primaryKey(),
  hospitalId: integer('hospital_id').references(() => hospitals.id).notNull(),
  itemId: varchar('item_id', { length: 100 }).notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  itemType: hospitalInventoryTypeEnum('item_type').notNull(),
  category: varchar('category', { length: 100 }),
  brand: varchar('brand', { length: 100 }),
  model: varchar('model', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  batchNumber: varchar('batch_number', { length: 100 }),
  supplier: varchar('supplier', { length: 255 }),
  purchaseDate: timestamp('purchase_date'),
  expiryDate: timestamp('expiry_date'),
  unit: varchar('unit', { length: 20 }),
  quantity: integer('quantity').default(0),
  minQuantity: integer('min_quantity').default(0),
  maxQuantity: integer('max_quantity'),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }),
  storageLocation: varchar('storage_location', { length: 255 }),
  storageConditions: varchar('storage_conditions', { length: 255 }),
  isConsumable: boolean('is_consumable').default(false),
  isEquipment: boolean('is_equipment').default(false),
  maintenanceSchedule: jsonb('maintenance_schedule'),
  calibrationDue: timestamp('calibration_due'),
  warrantyExpiry: timestamp('warranty_expiry'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  hospitalIdIdx: index('hospital_inventory_hospital_id_idx').on(table.hospitalId),
  itemIdIdx: index('hospital_inventory_item_id_idx').on(table.itemId),
  itemNameIdx: index('hospital_inventory_item_name_idx').on(table.itemName),
  itemTypeIdx: index('hospital_inventory_item_type_idx').on(table.itemType),
  categoryIdx: index('hospital_inventory_category_idx').on(table.category),
  supplierIdx: index('hospital_inventory_supplier_idx').on(table.supplier),
  expiryDateIdx: index('hospital_inventory_expiry_date_idx').on(table.expiryDate),
  minQuantityIdx: index('hospital_inventory_min_quantity_idx').on(table.minQuantity),
}));

// Export all tables
export type Hospital = typeof hospitals.$inferSelect;
export type NewHospital = typeof hospitals.$inferInsert;
export type HospitalDepartment = typeof hospitalDepartments.$inferSelect;
export type NewHospitalDepartment = typeof hospitalDepartments.$inferInsert;
export type HospitalStaff = typeof hospitalStaff.$inferSelect;
export type NewHospitalStaff = typeof hospitalStaff.$inferInsert;
export type HospitalAppointment = typeof hospitalAppointments.$inferSelect;
export type NewHospitalAppointment = typeof hospitalAppointments.$inferInsert;
export type HospitalBed = typeof hospitalBeds.$inferSelect;
export type NewHospitalBed = typeof hospitalBeds.$inferInsert;
export type HospitalInventory = typeof hospitalInventory.$inferSelect;
export type NewHospitalInventory = typeof hospitalInventory.$inferInsert;