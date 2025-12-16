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
  index
} from 'drizzle-orm/pg-core';

// Invoice Management Tables
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  memberId: integer('member_id').notNull(),
  companyId: integer('company_id').notNull(),
  invoiceType: varchar('invoice_type', { length: 50 }).notNull(), // medical, insurance, subscription, penalty
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).default(0),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('KES'),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, sent, paid, overdue, cancelled
  paymentTerms: varchar('payment_terms', { length: 100 }),
  description: text('description'),
  items: jsonb('items'), // Array of invoice items
  discountAmount: decimal('discount_amount', { length: 15, scale: 2 }).default(0),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).default(0),
  penaltyAmount: decimal('penalty_amount', { precision: 15, scale: 2 }).default(0),
  lateFeeAmount: decimal('late_fee_amount', { precision: 15, scale: 2 }).default(0),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).default(0),
  balanceAmount: decimal('balance_amount', { precision: 15, scale: 2 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('unpaid'), // unpaid, partially_paid, paid
  billingAddress: jsonb('billing_address'),
  shippingAddress: jsonb('shipping_address'),
  notes: text('notes'),
  termsAndConditions: text('terms_and_conditions'),
  attachments: jsonb('attachments'), // Array of attachment URLs
  metadata: jsonb('metadata'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  invoiceNumberIdx: index('invoices_invoice_number_idx').on(table.invoiceNumber),
  memberIdIdx: index('invoices_member_id_idx').on(table.memberId),
  companyIdIdx: index('invoices_company_id_idx').on(table.companyId),
  statusIdx: index('invoices_status_idx').on(table.status),
  dueDateIdx: index('invoices_due_date_idx').on(table.dueDate),
  issueDateIdx: index('invoices_issue_date_idx').on(table.issueDate),
}));

// Payment Management Tables
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  paymentNumber: varchar('payment_number', { length: 50 }).notNull().unique(),
  invoiceId: integer('invoice_id').notNull(),
  memberId: integer('member_id').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('KES'),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // mpesa, card, bank, cash, mobile
  paymentDate: timestamp('payment_date').notNull(),
  transactionId: varchar('transaction_id', { length: 100 }), // External transaction ID
  referenceNumber: varchar('reference_number', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, completed, failed, refunded
  gateway: varchar('gateway', { length: 50 }), // stripe, paypal, mpesa, etc.
  gatewayResponse: jsonb('gateway_response'), // Response from payment gateway
  gatewayTransactionId: varchar('gateway_transaction_id', { length: 200 }),
  processingFee: decimal('processing_fee', { precision: 10, scale: 2 }).default(0),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default(0),
  netAmount: decimal('net_amount', { precision: 15, scale: 2 }).notNull(),
  refundAmount: decimal('refund_amount', { precision: 15, scale: 2 }).default(0),
  refundReason: varchar('refund_reason', { length: 255 }),
  refundDate: timestamp('refund_date'),
  failureReason: varchar('failure_reason', { length: 255 }),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  nextRetryDate: timestamp('next_retry_date'),
  ip: varchar('ip', { length: 45 }), // IPv6 compatible
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  notes: text('notes'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  paymentNumberIdx: index('payments_payment_number_idx').on(table.paymentNumber),
  invoiceIdIdx: index('payments_invoice_id_idx').on(table.invoiceId),
  memberIdIdx: index('payments_member_id_idx').on(table.memberId),
  statusIdx: index('payments_status_idx').on(table.status),
  paymentDateIdx: index('payments_payment_date_idx').on(table.paymentDate),
  transactionIdIdx: index('payments_transaction_id_idx').on(table.transactionId),
  gatewayTransactionIdIdx: index('payments_gateway_transaction_id_idx').on(table.gatewayTransactionId),
}));

// Commission Management Tables
export const commissions = pgTable('commissions', {
  id: serial('id').primaryKey(),
  commissionNumber: varchar('commission_number', { length: 50 }).notNull().unique(),
  agentId: integer('agent_id').notNull(),
  transactionId: integer('transaction_id'), // Related invoice or payment ID
  transactionType: varchar('transaction_type', { length: 50 }), // sale, renewal, referral
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('KES'),
  percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull(),
  baseAmount: decimal('base_amount', { precision: 15, scale: 2 }).notNull(),
  tierLevel: integer('tier_level').default(1),
  commissionType: varchar('commission_type', { length: 50 }).notNull(), // percentage, fixed, tiered
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, calculated, paid, cancelled
  calculationDate: timestamp('calculation_date'),
  paymentDate: timestamp('payment_date'),
  dueDate: timestamp('due_date'),
  periodStartDate: timestamp('period_start_date'),
  periodEndDate: timestamp('period_end_date'),
  metadata: jsonb('metadata'), // Calculation details, rates, etc.
  notes: text('notes'),
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  commissionNumberIdx: index('commissions_commission_number_idx').on(table.commissionNumber),
  agentIdIdx: index('commissions_agent_id_idx').on(table.agentId),
  transactionIdIdx: index('commissions_transaction_id_idx').on(table.transactionId),
  statusIdx: index('commissions_status_idx').on(table.status),
  calculationDateIdx: index('commissions_calculation_date_idx').on(table.calculationDate),
  dueDateIdx: index('commissions_due_date_idx').on(table.dueDate),
}));

// Expense Management Tables
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  expenseNumber: varchar('expense_number', { length: 50 }).notNull().unique(),
  categoryId: integer('category_id').notNull(),
  vendorId: integer('vendor_id'),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('KES'),
  expenseDate: timestamp('expense_date').notNull(),
  dueDate: timestamp('due_date'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, paid, rejected
  paymentMethod: varchar('payment_method', { length: 20 }),
  paidDate: timestamp('paid_date'),
  receiptNumber: varchar('receipt_number', { length: 100 }),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default(0),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  reimbursable: boolean('reimbursable').default(false),
  reimbursed: boolean('reimbursed').default(false),
  reimbursedAmount: decimal('reimbursed_amount', { precision: 15, scale: 2 }).default(0),
  reimbursedDate: timestamp('reimbursed_date'),
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at'),
  notes: text('notes'),
  attachments: jsonb('attachments'), // Array of attachment URLs
  metadata: jsonb('metadata'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  expenseNumberIdx: index('expenses_expense_number_idx').on(table.expenseNumber),
  categoryIdIdx: index('expenses_category_id_idx').on(table.categoryId),
  vendorIdIdx: index('expenses_vendor_id_idx').on(table.vendorId),
  statusIdx: index('expenses_status_idx').on(table.status),
  expenseDateIdx: index('expenses_expense_date_idx').on(table.expenseDate),
  reimbursableIdx: index('expenses_reimbursable_idx').on(table.reimbursable),
}));

// Budget Management Tables
export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(),
  budgetNumber: varchar('budget_number', { length: 50 }).notNull().unique(),
  categoryId: integer('category_id').notNull(),
  departmentId: integer('department_id'),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  budgetType: varchar('budget_type', { length: 50 }).notNull(), // operational, capital, project
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('KES'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  spentAmount: decimal('spent_amount', { precision: 15, scale: 2 }).default(0),
  remainingAmount: decimal('remaining_amount', { precision: 15, scale: 2 }).notNull(),
  percentageUsed: decimal('percentage_used', { precision: 5, scale: 2 }).default(0),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed, cancelled
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).default(0),
  unallocatedAmount: decimal('unallocated_amount', { precision: 15, scale: 2 }).notNull(),
  alerts: jsonb('alerts'), // Budget alert settings
  metadata: jsonb('metadata'),
  notes: text('notes'),
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  budgetNumberIdx: index('budgets_budget_number_idx').on(table.budgetNumber),
  categoryIdIdx: index('budgets_category_id_idx').on(table.categoryId),
  departmentIdIdx: index('budgets_department_id_idx').on(table.departmentId),
  statusIdx: index('budgets_status_idx').on(table.status),
  startDateIdx: index('budgets_start_date_idx').on(table.startDate),
  endDateIdx: index('budgets_end_date_idx').on(table.endDate),
}));

// Financial Reports Tables
export const financialReports = pgTable('financial_reports', {
  id: serial('id').primaryKey(),
  reportNumber: varchar('report_number', { length: 50 }).notNull().unique(),
  reportType: varchar('report_type', { length: 50 }).notNull(), // income_statement, balance_sheet, cash_flow, etc.
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  period: varchar('period', { length: 50 }).notNull(), // monthly, quarterly, yearly
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  reportData: jsonb('report_data').notNull(), // Complex financial data structure
  summary: jsonb('summary'), // Key metrics and summary
  generatedBy: integer('generated_by').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  status: varchar('status', { length: 20 }).notNull().default('generated'), // generated, approved, archived
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at'),
  format: varchar('format', { length: 20 }).default('json'), // json, pdf, excel
  downloadUrl: varchar('download_url', { length: 500 }),
  expiryDate: timestamp('expiry_date'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  reportNumberIdx: index('financial_reports_report_number_idx').on(table.reportNumber),
  reportTypeIdx: index('financial_reports_report_type_idx').on(table.reportType),
  periodIdx: index('financial_reports_period_idx').on(table.period),
  startDateIdx: index('financial_reports_start_date_idx').on(table.startDate),
  endDateIdx: index('financial_reports_end_date_idx').on(table.endDate),
  generatedByIdx: index('financial_reports_generated_by_idx').on(table.generatedBy),
}));

// Transaction Logs for Audit Trail
export const transactionLogs = pgTable('transaction_logs', {
  id: serial('id').primaryKey(),
  transactionId: varchar('transaction_id', { length: 100 }).notNull(),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // invoice, payment, refund, commission
  entityId: integer('entity_id').notNull(), // ID of the related entity
  action: varchar('action', { length: 50 }).notNull(), // create, update, delete, approve, reject
  oldValues: jsonb('old_values'), // Previous state
  newValues: jsonb('new_values'), // New state
  amount: decimal('amount', { precision: 15, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('KES'),
  userId: integer('user_id').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 100 }),
  reason: varchar('reason', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('completed'), // completed, failed, pending
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  transactionIdIdx: index('transaction_logs_transaction_id_idx').on(table.transactionId),
  transactionTypeIdx: index('transaction_logs_transaction_type_idx').on(table.transactionType),
  entityIdIdx: index('transaction_logs_entity_id_idx').on(table.entityId),
  userIdIdx: index('transaction_logs_user_id_idx').on(table.userId),
  actionIdx: index('transaction_logs_action_idx').on(table.action),
  createdAtIdx: index('transaction_logs_created_at_idx').on(table.createdAt),
}));

// Export all tables
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Commission = typeof commissions.$inferSelect;
export type NewCommission = typeof commissions.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type FinancialReport = typeof financialReports.$inferSelect;
export type NewFinancialReport = typeof financialReports.$inferInsert;
export type TransactionLog = typeof transactionLogs.$inferSelect;
export type NewTransactionLog = typeof transactionLogs.$inferInsert;