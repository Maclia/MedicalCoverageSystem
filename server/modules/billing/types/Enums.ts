/**
 * Billing Module Enums
 */

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  CANCELLED = 'CANCELLED',
  WRITTEN_OFF = 'WRITTEN_OFF'
}

export enum InvoiceType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE',
  GROUP = 'GROUP',
  ADJUSTMENT = 'ADJUSTMENT',
  CREDIT_NOTE = 'CREDIT_NOTE'
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CHEQUE = 'CHEQUE',
  CASH = 'CASH',
  DIRECT_DEBIT = 'DIRECT_DEBIT'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum LineItemType {
  BASE_PREMIUM = 'BASE_PREMIUM',
  DEPENDENT = 'DEPENDENT',
  ADJUSTMENT = 'ADJUSTMENT',
  TAX = 'TAX',
  DISCOUNT = 'DISCOUNT',
  LATE_FEE = 'LATE_FEE',
  INTEREST = 'INTEREST',
  CREDIT = 'CREDIT'
}

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated'
}

export enum CollectionStatus {
  CURRENT = 'current',
  OVERDUE = 'overdue',
  COLLECTIONS = 'collections',
  LEGAL = 'legal',
  WRITTEN_OFF = 'written_off'
}

export enum NotificationType {
  INVOICE_SENT = 'invoice_sent',
  PAYMENT_REMINDER = 'payment_reminder',
  OVERDUE_NOTICE = 'overdue_notice',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  PAYMENT_FAILED = 'payment_failed',
  COLLECTION_NOTICE = 'collection_notice',
  ACCOUNT_SUSPENSION = 'account_suspension'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  SEMI_ANNUAL = 'semi_annual',
  CUSTOM = 'custom'
}