/**
 * Service Request Types
 * Request and response interfaces for billing services
 */

export interface InvoiceGenerationRequest {
  memberId?: number;
  companyId?: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  invoiceType: 'INDIVIDUAL' | 'CORPORATE' | 'GROUP' | 'ADJUSTMENT';
  generateLineItems: boolean;
  applyProration: boolean;
  includeTaxes: boolean;
  includeDiscounts: boolean;
  dueDate?: Date;
  description?: string;
  notes?: string;
  amount?: number;
  currency?: string;
}

export interface InvoiceUpdateRequest {
  status?: string;
  dueDate?: Date;
  notes?: string;
  description?: string;
  lineItems?: Array<{
    id?: number;
    amount?: number;
    description?: string;
  }>;
  adjustments?: Array<{
    type: 'DISCOUNT' | 'SURCHARGE' | 'CREDIT' | 'PENALTY';
    amount: number;
    reason: string;
    description?: string;
    appliesTo?: number;
  }>;
}

export interface InvoiceFilters {
  memberId?: number;
  companyId?: number;
  status?: string;
  invoiceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  overdue?: boolean;
  currency?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentReminderRequest {
  templateId?: string;
  recipients?: string[];
  customMessage?: string;
  includePaymentLink?: boolean;
  paymentMethods?: string[];
  daysBeforeDue?: number;
}

export interface BillingCycleRequest {
  cycleDate: Date;
  dryRun?: boolean;
  specificMembers?: number[];
  specificCompanies?: number[];
  skipNotifications?: boolean;
}

export interface AccountsReceivableUpdateRequest {
  recalculateAging?: boolean;
  updateLimits?: boolean;
  generateStatements?: boolean;
  specificAccounts?: number[];
}

export interface CollectionRequest {
  accountIds: number[];
  action: 'remind' | 'escalate' | 'suspend' | 'write_off';
  reason?: string;
  notes?: string;
  sendNotification?: boolean;
}