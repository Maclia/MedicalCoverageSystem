/**
 * Finance Service Type Definitions
 * Follows the same standard type structure pattern as insurance-service and crm-service
 */

// Company Balance & Premium Utilization Types
export interface CompanyBalance {
  companyId: string;
  companyName: string;
  currentBalance: number;
  availableCredit: number;
  totalPremiumAllocated: number;
  totalPremiumUtilized: number;
  utilizationRate: number;
  pendingCharges: number;
  lastPaymentDate: string;
  nextBillingDate: string;
  status: 'active' | 'suspended' | 'delinquent';
}

export interface CompanyPremiumUtilization {
  companyId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  allocatedPremium: number;
  utilizedPremium: number;
  remainingPremium: number;
  utilizationPercentage: number;
  breakdownByScheme: Array<{
    schemeId: string;
    schemeName: string;
    allocated: number;
    utilized: number;
    utilizationRate: number;
  }>;
  membersEnrolled: number;
  activeCards: number;
  claimsProcessed: number;
  totalClaimsValue: number;
}

export interface CompanyTransaction {
  id: string;
  companyId: string;
  type: 'premium_payment' | 'claim_settlement' | 'card_charge' | 'credit_adjustment' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  description: string;
  transactionDate: string;
  createdBy: string;
}

// Provider Payment & Settlement Types
export interface ProviderPayment {
  id: string;
  providerId: string;
  providerName: string;
  claimId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'processed' | 'failed' | 'cancelled';
  transactionReference: string;
  settlementDate: string;
  dueDate: string;
  paidDate?: string;
}

export interface ProviderSettlement {
  id: string;
  providerId: string;
  periodStart: string;
  periodEnd: string;
  totalClaims: number;
  totalAmount: number;
  deductedAmount: number;
  netAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'reconciled';
  paymentDate?: string;
  reconciliationReference?: string;
  items: Array<{
    claimId: string;
    memberId: string;
    serviceDate: string;
    amount: number;
    status: string;
  }>;
}

export interface ProviderBalance {
  providerId: string;
  providerName: string;
  pendingPayments: number;
  approvedPayments: number;
  totalPaidThisPeriod: number;
  lastSettlementDate: string;
  nextSettlementDate: string;
  outstandingInvoices: number;
}

// Card Payment Transaction Types
export interface CardTransaction {
  id: string;
  cardId: string;
  memberId: string;
  companyId: string;
  transactionType: 'authorization' | 'capture' | 'refund' | 'reversal' | 'balance_check';
  amount: number;
  currency: string;
  merchantId: string;
  merchantName: string;
  status: 'pending' | 'approved' | 'declined' | 'voided';
  authorizationCode: string;
  referenceNumber: string;
  terminalId: string;
  transactionDate: string;
  responseCode: string;
  responseMessage: string;
}

export interface CardTransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  approvedCount: number;
  declinedCount: number;
  averageTransaction: number;
  successRate: number;
  breakdownByType: Array<{
    type: string;
    count: number;
    amount: number;
  }>;
}

// Report Filter Types
export interface CompanyReportFilters {
  companyId: string;
  startDate?: string;
  endDate?: string;
  schemeId?: string;
  status?: string;
}

export interface ProviderReportFilters {
  providerId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface CardReportFilters {
  cardId?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  transactionType?: string;
}