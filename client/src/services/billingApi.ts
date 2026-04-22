// API service for billing backend integration

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

// Billing Service API
export const billingApi = {
  // Invoice Operations
  async getInvoices(params: {
    page?: number;
    limit?: number;
    status?: string;
    memberId?: number;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/billing/invoices?${searchParams}`);
  },

  async getInvoice(invoiceId: number) {
    return apiRequest(`/billing/invoices/${invoiceId}`);
  },

  async createInvoice(invoiceData: any) {
    return apiRequest('/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  async updateInvoice(invoiceId: number, invoiceData: any) {
    return apiRequest(`/billing/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  },

  async cancelInvoice(invoiceId: number) {
    return apiRequest(`/billing/invoices/${invoiceId}/cancel`, {
      method: 'POST',
    });
  },

  // Payment Operations
  async getPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    invoiceId?: number;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/billing/payments?${searchParams}`);
  },

  async getPayment(paymentId: number) {
    return apiRequest(`/billing/payments/${paymentId}`);
  },

  async processPayment(paymentData: {
    invoiceId: number;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    processedBy?: string;
  }) {
    return apiRequest('/billing/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  async refundPayment(paymentId: number, refundData: {
    amount: number;
    reason: string;
    processedBy?: string;
  }) {
    return apiRequest(`/billing/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(refundData),
    });
  },

  // Payment Methods
  async getPaymentMethods(memberId?: number) {
    const params = memberId ? `?memberId=${memberId}` : '';
    return apiRequest(`/billing/payment-methods${params}`);
  },

  async addPaymentMethod(paymentMethodData: any) {
    return apiRequest('/billing/payment-methods', {
      method: 'POST',
      body: JSON.stringify(paymentMethodData),
    });
  },

  async removePaymentMethod(methodId: number) {
    return apiRequest(`/billing/payment-methods/${methodId}`, {
      method: 'DELETE',
    });
  },

  // Commission Operations
  async calculateCommission(commissionData: {
    claimId: number;
    agentId: number;
    amount: number;
    commissionRate?: number;
  }) {
    return apiRequest('/billing/commissions/calculate', {
      method: 'POST',
      body: JSON.stringify(commissionData),
    });
  },

  async getCommissions(params: {
    agentId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/billing/commissions?${searchParams}`);
  },

  // Billing Reports
  async getBillingReport(reportType: 'daily' | 'monthly' | 'summary', params: {
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/billing/reports/${reportType}?${searchParams}`);
  },

  // Premium Calculations
  async calculatePremium(premiumData: {
    planId: number;
    memberCount?: number;
    coverageLevel?: string;
    additionalFactors?: any;
  }) {
    return apiRequest('/billing/premiums/calculate', {
      method: 'POST',
      body: JSON.stringify(premiumData),
    });
  },

  async getPremiumSchedule(memberId: number) {
    return apiRequest(`/billing/premiums/schedule/${memberId}`);
  },

  // Premium History
  async getPremiums(params: {
    companyId?: number;
    periodId?: number;
    page?: number;
    limit?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/billing/premiums?${searchParams}`);
  },
};