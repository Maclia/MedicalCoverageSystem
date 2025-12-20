import { pgTable, serial, varchar, text, decimal, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enums
const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded']);
const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded']);
const paymentMethodEnum = pgEnum('payment_method', ['cash', 'mpesa', 'card', 'bank_transfer', 'insurance', 'mobile_money']);
const commissionTypeEnum = pgEnum('commission_type', ['referral', 'service', 'performance', 'bonus']);
const commissionStatusEnum = pgEnum('commission_status', ['pending', 'approved', 'paid', 'rejected']);

// Invoices table
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  patientId: integer('patient_id').notNull(),
  patientName: varchar('patient_name', { length: 200 }).notNull(),
  patientEmail: varchar('patient_email', { length: 255 }),
  patientPhone: varchar('patient_phone', { length: 20 }).notNull(),
  institutionId: integer('institution_id'),
  institutionName: varchar('institution_name', { length: 200 }),

  // Invoice details
  description: text('description'),
  items: jsonb('items').notNull(), // Array of invoice items
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),

  // Status and dates
  status: invoiceStatusEnum('status').notNull().default('draft'),
  issueDate: timestamp('issue_date').notNull().defaultNow(),
  dueDate: timestamp('due_date').notNull(),
  paidDate: timestamp('paid_date'),
  cancelledDate: timestamp('cancelled_date'),

  // Payment tracking
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  balanceAmount: decimal('balance_amount', { precision: 12, scale: 2 }).notNull(),

  // Additional information
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by')
});

// Invoice items table (for detailed line items)
export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull(),

  // Item details
  itemType: varchar('item_type', { length: 50 }).notNull(), // 'service', 'product', 'consultation', 'procedure'
  itemCode: varchar('item_code', { length: 50 }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),

  // Additional item data
  serviceDate: timestamp('service_date'),
  personnelId: integer('personnel_id'),
  appointmentId: integer('appointment_id'),
  insuranceCoverage: decimal('insurance_coverage', { precision: 10, scale: 2 }).default('0.00'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Payments table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  paymentReference: varchar('payment_reference', { length: 100 }).notNull().unique(),
  invoiceId: integer('invoice_id').notNull(),
  patientId: integer('patient_id').notNull(),
  patientName: varchar('patient_name', { length: 200 }).notNull(),

  // Payment details
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  methodDetails: jsonb('method_details'), // Payment method specific details

  // Status and processing
  status: paymentStatusEnum('status').notNull().default('pending'),
  transactionId: varchar('transaction_id', { length: 255 }), // External transaction ID
  gatewayResponse: jsonb('gateway_response'), // Response from payment gateway

  // Dates
  paymentDate: timestamp('payment_date').notNull().defaultNow(),
  processedDate: timestamp('processed_date'),
  refundedDate: timestamp('refunded_date'),

  // Additional information
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  processedBy: integer('processed_by')
});

// Payment refunds table
export const paymentRefunds = pgTable('payment_refunds', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').notNull(),
  refundReference: varchar('refund_reference', { length: 100 }).notNull().unique(),

  // Refund details
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason').notNull(),

  // Status
  status: paymentStatusEnum('status').notNull().default('pending'),
  refundTransactionId: varchar('refund_transaction_id', { length: 255 }),
  gatewayResponse: jsonb('gateway_response'),

  // Dates
  refundDate: timestamp('refund_date').notNull().defaultNow(),
  processedDate: timestamp('processed_date'),

  // Audit fields
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedBy: integer('processed_by')
});

// Commission table
export const commissions = pgTable('commissions', {
  id: serial('id').primaryKey(),
  commissionReference: varchar('commission_reference', { length: 100 }).notNull().unique(),

  // Commission details
  personnelId: integer('personnel_id').notNull(),
  invoiceId: integer('invoice_id'),
  paymentId: integer('payment_id'),
  commissionType: commissionTypeEnum('commission_type').notNull(),

  // Amount calculations
  baseAmount: decimal('base_amount', { precision: 12, scale: 2 }).notNull(), // Amount commission is based on
  commissionRate: decimal('commission_rate', { precision: 5, scale: 4 }).notNull(), // e.g., 0.10 for 10%
  commissionAmount: decimal('commission_amount', { precision: 12, scale: 2 }).notNull(),

  // Status and dates
  status: commissionStatusEnum('status').notNull().default('pending'),
  calculationDate: timestamp('calculation_date').notNull().defaultNow(),
  approvalDate: timestamp('approval_date'),
  paymentDate: timestamp('payment_date'),

  // Additional information
  description: text('description'),
  calculationDetails: jsonb('calculation_details'),
  notes: text('notes'),

  // Audit fields
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  approvedBy: integer('approved_by'),
  paidBy: integer('paid_by')
});

// Billing settings table
export const billingSettings = pgTable('billing_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: integer('updated_by')
});

// Revenue and analytics table
export const revenueAnalytics = pgTable('revenue_analytics', {
  id: serial('id').primaryKey(),
  date: timestamp('date').notNull(),
  period: varchar('period', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly', 'yearly'

  // Revenue metrics
  totalRevenue: decimal('total_revenue', { precision: 15, scale: 2 }).notNull().default('0.00'),
  cashRevenue: decimal('cash_revenue', { precision: 15, scale: 2 }).notNull().default('0.00'),
  insuranceRevenue: decimal('insurance_revenue', { precision: 15, scale: 2 }).notNull().default('0.00'),
  mobileMoneyRevenue: decimal('mobile_money_revenue', { precision: 15, scale: 2 }).notNull().default('0.00'),

  // Transaction counts
  totalTransactions: integer('total_transactions').notNull().default(0),
  paidTransactions: integer('paid_transactions').notNull().default(0),
  pendingTransactions: integer('pending_transactions').notNull().default(0),
  failedTransactions: integer('failed_transactions').notNull().default(0),

  // Patient metrics
  uniquePatients: integer('unique_patients').notNull().default(0),
  averageTransactionValue: decimal('average_transaction_value', { precision: 12, scale: 2 }).notNull().default('0.00'),

  // Additional metrics
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Audit logs for billing operations
export const billingAuditLogs = pgTable('billing_audit_logs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 100 }).notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }),

  // Request details
  method: varchar('method', { length: 10 }).notNull(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),

  // Response details
  statusCode: integer('status_code').notNull(),
  responseStatus: varchar('response_status', { length: 20 }).notNull(),
  duration: integer('duration').notNull(),

  // Data changes
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),

  // Additional information
  notes: text('notes'),
  correlationId: varchar('correlation_id', { length: 100 }),

  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});