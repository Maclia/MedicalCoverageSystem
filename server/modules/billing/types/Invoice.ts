/**
 * Invoice Types
 * Core invoice and billing-related type definitions
 */

import { z } from 'zod';

// Invoice status enumeration
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  CANCELLED = 'CANCELLED',
  WRITTEN_OFF = 'WRITTEN_OFF'
}

// Invoice type enumeration
export enum InvoiceType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE',
  GROUP = 'GROUP',
  ADJUSTMENT = 'ADJUSTMENT',
  CREDIT_NOTE = 'CREDIT_NOTE'
}

// Invoice interface
export interface Invoice {
  id: number;
  memberId?: number;
  companyId?: number;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  currency: string;
  description?: string;
  notes?: string;
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  paidAt?: Date;
}

// Invoice line item interface
export interface InvoiceLineItem {
  id?: number;
  invoiceId: number;
  itemType: LineItemType;
  description: string;
  quantity: number;
  unitRate: number;
  amount: number;
  prorationFactor?: number;
  memberId?: number;
  policyId?: number;
  benefitId?: number;
  taxRate?: number;
  taxAmount?: number;
  discountRate?: number;
  discountAmount?: number;
  metadata?: Record<string, any>;
}

// Line item type enumeration
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

// Invoice payment interface
export interface InvoicePayment {
  id?: number;
  invoiceId: number;
  paymentId: number;
  amount: number;
  currency: string;
  paymentDate: Date;
  method: PaymentMethod;
  reference?: string;
  status: PaymentStatus;
}

// Payment method enumeration
export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CHEQUE = 'CHEQUE',
  CASH = 'CASH',
  DIRECT_DEBIT = 'DIRECT_DEBIT'
}

// Payment status enumeration
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

// Invoice generation request
export interface InvoiceGenerationRequest {
  memberId?: number;
  companyId?: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  invoiceType: InvoiceType;
  generateLineItems: boolean;
  applyProration: boolean;
  includeTaxes: boolean;
  includeDiscounts: boolean;
  dueDate?: Date;
  description?: string;
  notes?: string;
}

// Invoice update request
export interface InvoiceUpdateRequest {
  status?: InvoiceStatus;
  dueDate?: Date;
  notes?: string;
  description?: string;
  lineItems?: Partial<InvoiceLineItem>[];
  adjustments?: InvoiceAdjustment[];
}

// Invoice adjustment
export interface InvoiceAdjustment {
  type: 'DISCOUNT' | 'SURCHARGE' | 'CREDIT' | 'PENALTY';
  amount: number;
  reason: string;
  description?: string;
  appliesTo?: number; // Line item ID if applies to specific item
}

// Invoice filters
export interface InvoiceFilters {
  memberId?: number;
  companyId?: number;
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  overdue?: boolean;
  currency?: string;
}

// Invoice summary statistics
export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  overdueAmount: number;
  averageAmount: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  currencyBreakdown: Record<string, number>;
}

// Zod schemas for validation
export const InvoiceGenerationRequestSchema = z.object({
  memberId: z.number().optional(),
  companyId: z.number().optional(),
  billingPeriodStart: z.date(),
  billingPeriodEnd: z.date(),
  invoiceType: z.nativeEnum(InvoiceType),
  generateLineItems: z.boolean(),
  applyProration: z.boolean(),
  includeTaxes: z.boolean(),
  includeDiscounts: z.boolean(),
  dueDate: z.date().optional(),
  description: z.string().optional(),
  notes: z.string().optional()
});

export const InvoiceUpdateRequestSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  lineItems: z.array(z.object({
    id: z.number().optional(),
    amount: z.number().optional(),
    description: z.string().optional()
  })).optional(),
  adjustments: z.array(z.object({
    type: z.enum(['DISCOUNT', 'SURCHARGE', 'CREDIT', 'PENALTY']),
    amount: z.number(),
    reason: z.string(),
    description: z.string().optional(),
    appliesTo: z.number().optional()
  })).optional()
});

export const InvoiceFiltersSchema = z.object({
  memberId: z.number().optional(),
  companyId: z.number().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  invoiceType: z.nativeEnum(InvoiceType).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  amountFrom: z.number().optional(),
  amountTo: z.number().optional(),
  overdue: z.boolean().optional(),
  currency: z.string().optional()
});