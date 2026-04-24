import { BaseServiceClient } from './BaseServiceClient.js';
import config from '../config/index.js';

export interface BillingInvoice {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  serviceType: string;
  customerId: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  status: 'success' | 'failed' | 'pending';
  gatewayResponse?: any;
  createdAt: string;
}

export interface CommissionPayment {
  id: string;
  agentId: string;
  amount: number;
  invoiceId: string;
  percentage: number;
  status: string;
  paidDate?: string;
}

class BillingServiceClient extends BaseServiceClient {
  protected readonly serviceUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:3003';

  constructor() {
    super('billing-service');
  }

  async getInvoices(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    customerId?: string;
  }): Promise<BillingInvoice[]> {
    const queryParams = new URLSearchParams(filters as any).toString();
    return this.get(`/api/invoices${queryParams ? `?${queryParams}` : ''}`);
  }

  async getInvoiceTotals(dateRange?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    invoiceCount: number;
  }> {
    const queryParams = new URLSearchParams(dateRange as any).toString();
    return this.get(`/api/invoices/totals${queryParams ? `?${queryParams}` : ''}`);
  }

  async getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<PaymentTransaction[]> {
    const queryParams = new URLSearchParams(filters as any).toString();
    return this.get(`/api/payments/transactions${queryParams ? `?${queryParams}` : ''}`);
  }

  async getCommissions(filters?: {
    startDate?: string;
    endDate?: string;
    agentId?: string;
  }): Promise<CommissionPayment[]> {
    const queryParams = new URLSearchParams(filters as any).toString();
    return this.get(`/api/commissions${queryParams ? `?${queryParams}` : ''}`);
  }

  async getRevenueByService(dateRange?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    serviceType: string;
    totalAmount: number;
    transactionCount: number;
  }>> {
    const queryParams = new URLSearchParams(dateRange as any).toString();
    return this.get(`/api/billing/revenue-by-service${queryParams ? `?${queryParams}` : ''}`);
  }

  async getDailyBillingSummary(date: string): Promise<{
    date: string;
    invoicesIssued: number;
    paymentsReceived: number;
    totalAmount: number;
    averageInvoice: number;
  }> {
    return this.get(`/api/billing/summary/${date}`);
  }

  async getCompanyBillingStats(companyId: string): Promise<{
    companyName: string;
    currentBalance: number;
    availableCredit: number;
    pendingCharges: number;
    lastPaymentDate: string | null;
    nextBillingDate: string | null;
    status: string;
  }> {
    return this.get(`/api/billing/companies/${companyId}/stats`);
  }
}

export const billingServiceClient = new BillingServiceClient();
export default billingServiceClient;