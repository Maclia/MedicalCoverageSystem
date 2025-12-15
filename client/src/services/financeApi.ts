// API service for finance management backend integration

const API_BASE_URL = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generic API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Module Health and Status API
export const moduleApi = {
  // Get module system health
  async getSystemHealth() {
    return apiRequest('/modules/health');
  },

  // Get module overview
  async getModuleOverview() {
    return apiRequest('/modules');
  },

  // Get specific module information
  async getModuleInfo(moduleName: string) {
    return apiRequest(`/modules/${moduleName}`);
  },

  // Get module metrics
  async getModuleMetrics() {
    return apiRequest('/modules/metrics');
  },

  // Toggle module (admin only)
  async toggleModule(moduleName: string, enabled: boolean) {
    return apiRequest(`/modules/${moduleName}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },

  // Reload module (admin only)
  async reloadModule(moduleName: string) {
    return apiRequest(`/modules/${moduleName}/reload`, {
      method: 'POST',
    });
  },
};

// Billing Module API
export const billingApi = {
  // Generate new invoice
  async generateInvoice(data: {
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
  }) {
    return apiRequest('/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get invoice by ID
  async getInvoice(invoiceId: number) {
    return apiRequest(`/billing/invoices/${invoiceId}`);
  },

  // Update invoice
  async updateInvoice(invoiceId: number, data: {
    status?: string;
    dueDate?: string;
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
  }) {
    return apiRequest(`/billing/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Get invoices with filters
  async getInvoices(filters?: {
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
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/billing/invoices${query}`);
  },

  // Process billing cycle
  async processBillingCycle(data: {
    cycleDate?: string;
    dryRun?: boolean;
    specificMembers?: number[];
    specificCompanies?: number[];
    skipNotifications?: boolean;
  }) {
    return apiRequest('/billing/cycles/process', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get accounts receivable summary
  async getAccountsReceivableSummary() {
    return apiRequest('/billing/accounts-receivable');
  },

  // Get aging report
  async getAgingReport() {
    return apiRequest('/billing/accounts-receivable/aging');
  },

  // Update accounts receivable
  async updateAccountsReceivable() {
    return apiRequest('/billing/accounts-receivable/update');
  },

  // Send payment reminders
  async sendPaymentReminders() {
    return apiRequest('/billing/notifications/send-reminders');
  },

  // Send overdue notices
  async sendOverdueNotices() {
    return apiRequest('/billing/notifications/send-overdue');
  },

  // Get dashboard analytics
  async getDashboardAnalytics(filters?: {
    dateFrom?: string;
    dateTo?: string;
    moduleId?: number;
    companyId?: number;
    currency?: string;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/billing/analytics/dashboard${query}`);
  },

  // Get revenue analytics
  async getRevenueAnalytics(filters?: {
    dateFrom?: string;
    dateTo?: string;
    period?: 'monthly' | 'quarterly' | 'yearly';
    currency?: string;
    comparePeriod?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/billing/analytics/revenue${query}`);
  },

  // Generate bulk invoices
  async generateInvoicesBulk(data: {
    invoiceType?: string;
    memberId?: number;
    companyId?: number;
    memberIds?: number[];
    companyIds?: number[];
    billingPeriod: {
      start: string;
      end: string;
    };
    options?: {
      generateLineItems: boolean;
      applyProration: boolean;
      includeTaxes: boolean;
      includeDiscounts: boolean;
    };
  }) {
    return apiRequest('/billing/bulk/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Send bulk notifications
  async sendBulkNotifications(data: {
    type: 'reminders' | 'overdue' | 'payment' | 'collection';
    recipients?: any[];
    filters?: any;
    customMessage?: string;
    includePaymentLink?: boolean;
    paymentMethods?: string[];
  }) {
    return apiRequest('/billing/bulk/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Payments Module API
export const paymentsApi = {
  // Process payment
  async processPayment(data: {
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
  }) {
    return apiRequest('/payments/process', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get payment status
  async getPaymentStatus(paymentId: string) {
    return apiRequest(`/payments/${paymentId}/status`);
  },

  // Reconcile payments
  async reconcilePayments(data: {
    statementDate?: string;
    provider: string;
    accountNumber?: string;
    file?: File;
    autoMatch?: boolean;
    tolerance?: number;
    dryRun?: boolean;
  }) {
    const formData = new FormData();

    if (data.file) {
      formData.append('file', data.file);
    }

    // Add other fields to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'file' && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    return apiRequest('/payments/reconcile', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData
      },
    });
  },

  // Get payment methods
  async getPaymentMethods(memberId?: number) {
    const params = memberId ? `?memberId=${memberId}` : '';
    return apiRequest(`/payments/methods${params}`);
  },

  // Add payment method
  async addPaymentMethod(data: {
    memberId: number;
    type: 'bank' | 'card' | 'mobile_money';
    isDefault: boolean;
    tokenizedData: string;
    expiryDate?: string;
    gatewayProvider: string;
    displayName?: string;
  }) {
    return apiRequest('/payments/methods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Delete payment method
  async deletePaymentMethod(methodId: number) {
    return apiRequest(`/payments/methods/${methodId}`, {
      method: 'DELETE',
    });
  },

  // Get payment history
  async getPaymentHistory(filters?: {
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
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/payments/history${query}`);
  },

  // Get payment analytics
  async getPaymentAnalytics(filters?: {
    dateFrom?: string;
    dateTo?: string;
    period?: 'daily' | 'weekly' | 'monthly';
    method?: string;
    status?: string;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/payments/analytics${query}`);
  },

  // Get failed payments
  async getFailedPayments(filters?: {
    dateFrom?: string;
    dateTo?: string;
    reason?: string;
    method?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/payments/failed${query}`);
  },

  // Retry failed payment
  async retryPayment(paymentId: string) {
    return apiRequest(`/payments/${paymentId}/retry`, {
      method: 'POST',
    });
  },

  // Refund payment
  async refundPayment(paymentId: string, data: {
    amount?: number;
    reason: string;
    description?: string;
  }) {
    return apiRequest(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Commissions Module API
export const commissionsApi = {
  // Calculate commissions
  async calculateCommission(data: {
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
  }) {
    return apiRequest('/commissions/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Create payment run
  async createPaymentRun(data: {
    periodStart: string;
    periodEnd: string;
    runType: 'monthly' | 'quarterly' | 'annual' | 'custom';
    agentIds?: number[];
    policyIds?: number[];
    dryRun?: boolean;
    includeTaxes?: boolean;
    includeAdjustments?: boolean;
  }) {
    return apiRequest('/commissions/payment-runs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get agent performance
  async getAgentPerformance(agentId: number, filters?: {
    period?: string;
    periodStart?: string;
    periodEnd?: string;
    metrics?: string[];
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/commissions/agents/${agentId}/performance${query}`);
  },

  // Get leaderboard
  async getLeaderboard(filters?: {
    period?: string;
    limit?: number;
    metric?: 'commission' | 'policies' | 'revenue' | 'persistency';
    department?: string;
    rankType?: 'current' | 'best' | 'improvement';
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/commissions/leaderboard${query}`);
  },

  // Get commission statements
  async getCommissionStatements(agentId: number, filters?: {
    periodStart?: string;
    periodEnd?: string;
    status?: string;
    format?: 'json' | 'pdf';
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/commissions/statements/${agentId}${query}`);
  },

  // Get payment runs
  async getPaymentRuns(filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    runType?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/commissions/payment-runs${query}`);
  },

  // Get commission analytics
  async getCommissionAnalytics(filters?: {
    dateFrom?: string;
    dateTo?: string;
    period?: 'monthly' | 'quarterly' | 'yearly';
    agentId?: number;
    department?: string;
    metrics?: string[];
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/commissions/analytics${query}`);
  },

  // Adjust commission
  async adjustCommission(commissionId: number, data: {
    amount: number;
    reason: string;
    description?: string;
    adjustmentType: 'increase' | 'decrease' | 'correction';
    approvedBy?: string;
  }) {
    return apiRequest(`/commissions/adjust/${commissionId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Clawback commission
  async clawbackCommission(commissionId: number, data: {
    clawbackAmount: number;
    reason: string;
    policyId?: number;
    clawbackType: 'full' | 'partial';
    effectiveDate?: string;
  }) {
    return apiRequest(`/commissions/clawback/${commissionId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Claims Financial Module API
export const claimsFinancialApi = {
  // Get claim reserves
  async getClaimReserves(claimId: number) {
    return apiRequest(`/claims-financial/reserves/${claimId}`);
  },

  // Create reserve
  async createReserve(data: {
    claimId: number;
    reserveType: 'INCURRED_LOSS' | 'EXPENSE' | 'SALVAGE_RECOVERY' | 'LEGAL_EXPENSES';
    amount: number;
    currency: string;
    notes?: string;
  }) {
    return apiRequest('/claims-financial/reserves', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Adjust reserve
  async adjustReserve(reserveId: number, data: {
    newAmount: number;
    reason: string;
    adjusterId: number;
  }) {
    return apiRequest(`/claims-financial/reserves/${reserveId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Get claim payments
  async getClaimPayments(claimId: number, filters?: {
    status?: string;
    paymentType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/claims-financial/payments/${claimId}${query}`);
  },

  // Create claim payment
  async createClaimPayment(data: {
    claimId: number;
    paymentType: 'INDEMNITY' | 'EXPENSE' | 'LEGAL' | 'MEDICAL' | 'REHABILITATION' | 'LOSS_OF_EARNINGS';
    amount: number;
    currency: string;
    description: string;
    payeeName: string;
    payeeType: 'MEMBER' | 'PROVIDER' | 'LAWYER' | 'OTHER';
    payeeReference?: string;
    dueDate: string;
    requestedBy: number;
  }) {
    return apiRequest('/claims-financial/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get financial analysis
  async getClaimFinancialAnalysis(claimId: number) {
    return apiRequest(`/claims-financial/analysis/${claimId}`);
  },

  // Generate reserve adequacy report
  async generateReserveAdequacyReport(criteria?: {
    adjusterId?: number;
    minAmount?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const params = new URLSearchParams();
    if (criteria) {
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/claims-financial/reserves/adequacy${query}`);
  },

  // Get portfolio analytics
  async getPortfolioAnalytics(criteria?: {
    dateFrom?: string;
    dateTo?: string;
    coverageType?: string;
    minAmount?: number;
    status?: string;
  }) {
    const params = new URLSearchParams();
    if (criteria) {
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/claims-financial/portfolio${query}`);
  },

  // Predict final cost
  async predictFinalCost(claimId: number) {
    return apiRequest(`/claims-financial/predict/${claimId}`);
  },

  // Detect anomalies
  async detectAnomalies(criteria?: {
    dateFrom?: string;
    dateTo?: string;
    threshold?: number;
  }) {
    const params = new URLSearchParams();
    if (criteria) {
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString() ? `?${params}` : '';
    return apiRequest(`/claims-financial/anomalies${query}`);
  },

  // Process payment approval
  async processPaymentApproval(paymentId: number, data: {
    approved: boolean;
    approverId: number;
    comments?: string;
  }) {
    return apiRequest(`/claims-financial/payments/${paymentId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Execute payment
  async executePayment(paymentId: number, data: {
    paymentMethod: string;
    executionData: {
      referenceNumber?: string;
      accountNumber?: string;
      bankName?: string;
      checkNumber?: string;
      mobileNumber?: string;
    };
    executorId: number;
  }) {
    return apiRequest(`/claims-financial/payments/${paymentId}/execute`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Close claim reserves
  async closeClaimReserves(claimId: number, data: {
    reason: string;
    adjusterId: number;
  }) {
    return apiRequest(`/claims-financial/reserves/close/${claimId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Export all finance APIs
export default {
  module: moduleApi,
  billing: billingApi,
  payments: paymentsApi,
  commissions: commissionsApi,
  claimsFinancial: claimsFinancialApi,
};