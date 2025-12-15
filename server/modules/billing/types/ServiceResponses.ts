/**
 * Service Response Types
 * Response interfaces for billing services
 */

export interface InvoiceGenerationResponse {
  success: boolean;
  invoice?: any;
  errors?: string[];
  warnings?: string[];
  processedCount?: number;
}

export interface InvoiceUpdateResponse {
  success: boolean;
  invoice?: any;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  errors?: string[];
}

export interface InvoiceListResponse {
  invoices: any[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AccountsReceivableSummary {
  totalBalance: number;
  currentBalance: number;
  overdueBalance: number;
  aging: {
    current: number;
    thirtyDays: number;
    sixtyDays: number;
    ninetyPlus: number;
  };
  totalAccounts: number;
  activeAccounts: number;
  overdueAccounts: number;
}

export interface BillingCycleResponse {
  processedCount: number;
  totalAmount: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  processingTime: number;
  date: Date;
}

export interface PaymentNotificationResponse {
  sent: number;
  failed: number;
  total: number;
  types: Array<{
    type: string;
    count: number;
  }>;
  errors: string[];
}

export interface BulkOperationResponse {
  processed: number;
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    item: any;
    error: string;
  }>;
}

export interface DashboardAnalyticsResponse {
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
}

export interface RevenueAnalyticsResponse {
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

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, boolean>;
  dependencies: Record<string, boolean>;
  lastCheck: Date;
  errors: string[];
  metrics?: {
    uptime: number;
    requestCount: number;
    errorCount: number;
    responseTime: number;
    memoryUsage: number;
  };
}