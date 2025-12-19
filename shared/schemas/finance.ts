import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for Finance Service
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['credit_card', 'debit_card', 'bank_transfer', 'check', 'cash', 'electronic_funds_transfer']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid']);
export const transactionTypeEnum = pgEnum('transaction_type', ['premium', 'claim_payment', 'commission', 'fee', 'refund', 'adjustment', 'interest']);
export const accountTypeEnum = pgEnum('account_type', ['checking', 'savings', 'trust', 'escrow', 'investment']);
export const reconciliationStatusEnum = pgEnum('reconciliation_status', ['unreconciled', 'reconciled', 'pending', 'disputed']);

// Payment Transactions table
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  transactionId: varchar("transaction_id", { length: 50 }).notNull().unique(),
  memberId: integer("member_id").notNull(), // Reference to core service
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: paymentStatusEnum("status").default("pending"),
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
  processedDate: timestamp("processed_date"),
  referenceNumber: text("reference_number"),
  description: text("description"),
  gatewayResponse: text("gateway_response"), // JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Premium Invoices table
export const premiumInvoices = pgTable("premium_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 20 }).notNull().unique(),
  memberId: integer("member_id").notNull(), // Reference to core service
  billingPeriodStart: date("billing_period_start").notNull(),
  billingPeriodEnd: date("billing_period_end").notNull(),
  dueDate: date("due_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").default("draft"),
  sentDate: timestamp("sent_date"),
  paidDate: timestamp("paid_date"),
  paymentTransactionId: integer("payment_transaction_id").references(() => paymentTransactions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Financial Accounts table
export const financialAccounts = pgTable("financial_accounts", {
  id: serial("id").primaryKey(),
  accountNumber: varchar("account_number", { length: 20 }).notNull().unique(),
  accountName: text("account_name").notNull(),
  accountType: accountTypeEnum("account_type").notNull(),
  bankName: text("bank_name"),
  routingNumber: varchar("routing_number", { length: 9 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// General Ledger Entries table
export const generalLedgerEntries = pgTable("general_ledger_entries", {
  id: serial("id").primaryKey(),
  entryDate: date("entry_date").notNull(),
  accountId: integer("account_id").references(() => financialAccounts.id).notNull(),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  referenceId: integer("reference_id"), // Can reference various entities
  referenceType: text("reference_type"), // 'payment', 'invoice', 'commission', etc.
  reconciliationStatus: reconciliationStatusEnum("reconciliation_status").default("unreconciled"),
  reconciledDate: timestamp("reconciled_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Commission Payments table
export const commissionPayments = pgTable("commission_payments", {
  id: serial("id").primaryKey(),
  commissionId: integer("commission_id").notNull(), // Reference to CRM service
  agentId: integer("agent_id").notNull(), // Reference to CRM service
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: paymentStatusEnum("status").default("pending"),
  transactionId: integer("transaction_id").references(() => paymentTransactions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Financial Reports table
export const financialReports = pgTable("financial_reports", {
  id: serial("id").primaryKey(),
  reportType: text("report_type").notNull(), // 'income_statement', 'balance_sheet', 'cash_flow', etc.
  reportPeriod: text("report_period").notNull(), // 'monthly', 'quarterly', 'yearly'
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  generatedDate: timestamp("generated_date").defaultNow().notNull(),
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }),
  netIncome: decimal("net_income", { precision: 15, scale: 2 }),
  reportData: text("report_data"), // JSON with detailed report data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions);
export const insertPremiumInvoiceSchema = createInsertSchema(premiumInvoices);
export const insertFinancialAccountSchema = createInsertSchema(financialAccounts);
export const insertGeneralLedgerEntrySchema = createInsertSchema(generalLedgerEntries);
export const insertCommissionPaymentSchema = createInsertSchema(commissionPayments);
export const insertFinancialReportSchema = createInsertSchema(financialReports);

// Types
export type PaymentTransaction = typeof paymentTransactions.;
export type PremiumInvoice = typeof premiumInvoices.;
export type FinancialAccount = typeof financialAccounts.;
export type GeneralLedgerEntry = typeof generalLedgerEntries.;
export type CommissionPayment = typeof commissionPayments.;
export type FinancialReport = typeof financialReports.;

export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type InsertPremiumInvoice = z.infer<typeof insertPremiumInvoiceSchema>;
export type InsertFinancialAccount = z.infer<typeof insertFinancialAccountSchema>;
export type InsertGeneralLedgerEntry = z.infer<typeof insertGeneralLedgerEntrySchema>;
export type InsertCommissionPayment = z.infer<typeof insertCommissionPaymentSchema>;
export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;
