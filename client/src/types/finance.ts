// Type definitions for finance management system

// Invoice Types
export interface Invoice {
  id: number;
  memberId?: number;
  companyId?: number;
  invoiceNumber: string;
  invoiceType: 'INDIVIDUAL' | 'CORPORATE' | 'GROUP' | 'ADJUSTMENT';
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'CANCELLED' | 'WRITTEN_OFF';
  issueDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  currency: string;
  description?: string;
  notes?: string;
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  paidAt?: string;
}

export interface InvoiceLineItem {
  id?: number;
  invoiceId: number;
  itemType: 'BASE_PREMIUM' | 'DEPENDENT' | 'ADJUSTMENT' | 'TAX' | 'DISCOUNT' | 'LATE_FEE' | 'INTEREST' | 'CREDIT';
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

export interface InvoicePayment {
  id?: number;
  invoiceId: number;
  paymentId: number;
  amount: number;
  currency: string;
  paymentDate: string;
  method: 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_MONEY' | 'CHEQUE' | 'CASH' | 'DIRECT_DEBIT';
  reference?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
}

// Payment Types
export interface Payment {
  id: number;
  memberId?: number;
  companyId?: number;
  invoiceId?: number;
  amount: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'credit_card' | 'debit_card' | 'mobile_money' | 'cheque' | 'cash' | 'direct_debit';
  paymentReference: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED' | 'ESCALATED';
  failureReason?: string;
  failureCode?: string;
  processingDate?: string;
  completedDate?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: number;
  memberId?: number;
  companyId?: number;
  type: 'bank' | 'card' | 'mobile_money';
  isDefault: boolean;
  isActive: boolean;
  tokenizedData: string;
  expiryDate?: string;
  gatewayProvider: string;
  displayName?: string;
  maskedData?: {
    lastFour?: string;
    brand?: string;
    expiryMonth?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Commission Types
export interface Commission {
  id: number;
  agentId: number;
  policyId?: number;
  commissionType: 'new_business' | 'renewal' | 'endorsement' | 'bonus';
  premiumAmount: number;
  commissionAmount: number;
  commissionRate: number;
  calculationDate: string;
  periodStart: string;
  periodEnd: string;
  status: 'EARNED' | 'PAID' | 'CLAWED_BACK' | 'PENDING' | 'ADJUSTED';
  currency: string;
  modifiers: {
    isNewAgent?: boolean;
    isNewBusiness?: boolean;
    isGroupPolicy?: boolean;
    hasClaims?: boolean;
    policyAge?: number;
    customerAge?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CommissionPaymentRun {
  id: number;
  runDate: string;
  totalAmount: number;
  agentCount: number;
  status: 'draft' | 'approved' | 'processed' | 'completed' | 'cancelled';
  approvedBy?: number;
  approvedDate?: string;
  paymentDate?: string;
  paymentBatchId?: string;
  adjustments?: CommissionAdjustment[];
  exceptions?: PaymentRunException[];
  summary: {
    totalCommission: number;
    totalTaxWithheld: number;
    totalNetPayment: number;
    successCount: number;
    failureCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CommissionAdjustment {
  id: number;
  paymentRunId: number;
  commissionId: number;
  type: 'increase' | 'decrease' | 'correction';
  originalAmount: number;
  adjustedAmount: number;
  difference: number;
  reason: string;
  description?: string;
  approvedBy: number;
  createdAt: string;
}

export interface PaymentRunException {
  id: number;
  paymentRunId: number;
  agentId: number;
  commissionId: number;
  type: 'error' | 'adjustment' | 'calculation_issue' | 'data_missing';
  description: string;
  resolution?: string;
  resolvedBy?: number;
  resolvedAt?: string;
  createdAt: string;
}

export interface AgentPerformanceMetrics {
  id: number;
  agentId: number;
  period: string;
  policiesSold: number;
  premiumVolume: number;
  commissionEarned: number;
  conversionRate: number;
  retentionRate: number;
  averagePolicySize: number;
  tierLevel: string;
  performanceScore: number;
  rankings: {
    sales: number;
    commission: number;
    retention: number;
    efficiency: number;
  };
  achievements?: {
    newBusinessChampion?: boolean;
    retentionExpert?: boolean;
    topPerformer?: boolean;
    fastTrackPromotion?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Claim Financial Types
export interface ClaimReserve {
  id: number;
  claimId: number;
  reserveType: 'INCURRED_LOSS' | 'EXPENSE' | 'SALVAGE_RECOVERY' | 'LEGAL_EXPENSES';
  amount: number;
  currency: string;
  status: 'ACTIVE' | 'CLOSED' | 'EXHAUSTED' | 'SUPERSEDED';
  notes?: string;
  reservedAt: string;
  lastAdjustmentAt?: string;
  lastAdjustmentBy?: number;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimReserveTransaction {
  id: number;
  reserveId: number;
  transactionType: 'INITIAL' | 'ADJUSTMENT' | 'RELEASE' | 'CLOSE';
  amount: number;
  previousAmount: number;
  newAmount: number;
  reason: string;
  createdBy?: number;
  createdAt: string;
}

export interface ClaimPayment {
  id: number;
  claimId: number;
  paymentType: 'INDEMNITY' | 'EXPENSE' | 'LEGAL' | 'MEDICAL' | 'REHABILITATION' | 'LOSS_OF_EARNINGS';
  amount: number;
  currency: string;
  description: string;
  payeeName: string;
  payeeType: 'MEMBER' | 'PROVIDER' | 'LAWYER' | 'OTHER';
  payeeReference?: string;
  paymentMethod?: string;
  paymentReference?: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'CANCELLED' | 'ESCALATED';
  dueDate: string;
  requestedBy: number;
  approvedBy?: number;
  approvedAt?: string;
  executedBy?: number;
  executedAt?: string;
  completedAt?: string;
  confirmedBy?: number;
  failureReason?: string;
  failureCode?: string;
  confirmationData?: Record<string, any>;
  attachments?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ClaimFinancialTransaction {
  id: number;
  claimId: number;
  transactionType: 'PAYMENT_REQUEST' | 'PAYMENT_EXECUTION' | 'RESERVE_INCREASE' | 'RESERVE_DECREASE' | 'RECOVERY_RECEIVED' | 'EXPENSE_ALLOCATION';
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'POSTED' | 'REJECTED' | 'FAILED';
  description: string;
  referenceId?: number;
  paymentReference?: string;
  category?: string;
  glAccountCode?: string;
  costCenter?: string;
  taxAmount?: number;
  metadata?: Record<string, any>;
  approvedBy?: number;
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface DashboardAnalytics {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  averageAmount: number;
  agingReport: {
    current: number;
    overdue: number;
    thirtyDays: number;
    sixtyDays: number;
    ninetyPlus: number;
  };
  trends: {
    monthly: Array<{
      month: string;
      amount: number;
      count: number;
    }>;
  };
  metrics: {
    collectionRate: number;
    paymentSpeed: number;
    errorRate: number;
    automationRate: number;
  };
}

export interface RevenueAnalytics {
  monthly: Array<{
    month: string;
    revenue: number;
    growth: number;
    forecast: number;
  }>;
  yearly: Array<{
    year: string;
    revenue: number;
    growth: number;
  }>;
  totalRevenue: number;
  averageMonthly: number;
  growth: number;
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
  };
}

export interface ClaimFinancialAnalysis {
  claim: {
    id: number;
    claimNumber: string;
    status: string;
    incidentDate: string;
    reportedDate: string;
    settledDate?: string;
    amount: number;
    currency: string;
  };
  financialMetrics: {
    totalIncurred: number;
    totalPaid: number;
    totalReserved: number;
    totalRecovered: number;
    netIncurred: number;
    settlementRatio: number;
    reserveAdequacyRatio: number;
    paymentEfficiency: number;
    costContainment: number;
    averagePaymentTime: number;
  };
  costBreakdown: {
    indemnityPayments: number;
    expensePayments: number;
    legalExpenses: number;
    administrativeCosts: number;
  };
  paymentPatterns: {
    paymentFrequency: number;
    averagePaymentAmount: number;
    paymentTiming: {
      firstPaymentDays: number;
      totalPayments: number;
      paymentSpan: number;
    };
    seasonalPatterns: any;
  };
  reserveAnalysis: {
    initialReserve: number;
    finalReserve: number;
    reserveChanges: number;
    adequacyRatio: number;
    reserveAccuracy: number;
  };
  lossRatio: {
    incurredLoss: number;
    earnedPremium: number;
    lossRatio: number;
    expenseRatio: number;
    combinedRatio: number;
  };
  trends: Array<{
    month: string;
    transactionType: string;
    totalAmount: number;
    transactionCount: number;
  }>;
  recommendations: string[];
}

// Module System Types
export interface ModuleHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, boolean>;
  dependencies: Record<string, boolean>;
  lastCheck: string;
  errors: string[];
}

export interface ModuleStatus {
  name: string;
  version: string;
  enabled: boolean;
  active: boolean;
  initialized: boolean;
  dependencies: string[];
  lastUpdated: string;
}

export interface ModuleOverview {
  totalModules: number;
  enabledModules: number;
  activeModules: number;
  modules: ModuleStatus[];
  loadOrder: string[];
}

// Form Types
export interface InvoiceFormData {
  memberId?: number;
  companyId?: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoiceType: 'INDIVIDUAL' | 'CORPORATE' | 'GROUP' | 'ADJUSTMENT';
  generateLineItems: boolean;
  applyProration: boolean;
  includeTaxes: boolean;
  includeDiscounts: boolean;
  dueDate?: string;
  description?: string;
  notes?: string;
  amount?: number;
  currency?: string;
}

export interface PaymentFormData {
  invoiceId?: number;
  memberId?: number;
  companyId?: number;
  amount: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'credit_card' | 'debit_card' | 'mobile_money' | 'cheque' | 'cash' | 'direct_debit';
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
  mobileNumber?: string;
  paymentReference?: string;
  description?: string;
}

export interface CommissionCalculationFormData {
  agentId?: number;
  policyId?: number;
  premiumAmount: number;
  commissionType: 'new_business' | 'renewal' | 'endorsement' | 'bonus';
  calculationDate?: string;
  modifiers?: {
    isNewAgent?: boolean;
    isNewBusiness?: boolean;
    isGroupPolicy?: boolean;
    hasClaims?: boolean;
    policyAge?: number;
    customerAge?: number;
  };
}

export interface ReserveFormData {
  claimId: number;
  reserveType: 'INCURRED_LOSS' | 'EXPENSE' | 'SALVAGE_RECOVERY' | 'LEGAL_EXPENSES';
  amount: number;
  currency: string;
  notes?: string;
}

export interface ClaimPaymentFormData {
  claimId: number;
  paymentType: 'INDEMNITY' | 'EXPENSE' | 'LEGAL' | 'MEDICAL' | 'REHABILITATION' | 'LOSS_OF_EARNINGS';
  amount: number;
  currency: string;
  description: string;
  payeeName: string;
  payeeType: 'MEMBER' | 'PROVIDER' | 'LAWYER' | 'OTHER';
  payeeReference?: string;
  dueDate: string;
}

// Filter Types
export interface InvoiceFilters {
  memberId?: number;
  companyId?: number;
  status?: string;
  invoiceType?: string;
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  overdue?: boolean;
  currency?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentFilters {
  memberId?: number;
  invoiceId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  method?: string;
  amountMin?: number;
  amountMax?: number;
  page?: number;
  limit?: number;
}

export interface CommissionFilters {
  agentId?: number;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  metrics?: string[];
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  moduleId?: number;
  companyId?: number;
  agentId?: number;
  currency?: string;
  includeInactive?: boolean;
}

// Chart Data Types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    tension?: number;
    fill?: boolean;
  }>;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface MetricCard {
  title: string;
  value: number | string;
  change?: {
    value: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  icon?: string;
  color?: string;
  description?: string;
}

