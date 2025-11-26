/**
 * Analytics Types
 * Analytics and reporting type definitions
 */

export interface InvoiceAnalytics {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  averageAmount: number;
  medianAmount: number;
  largestInvoice: number;
  smallestInvoice: number;
  currencyBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export interface RevenueTrend {
  period: string;
  revenue: number;
  growth: number;
  forecast: number;
  confidence: number;
  factors: string[];
}

export interface CollectionPerformance {
  totalAccounts: number;
  collectionRate: number;
  averageCollectionTime: number;
  badDebtRatio: number;
  collectionCost: number;
  recoveredAmount: number;
  writeOffs: number;
}

export interface BillingEfficiencyMetrics {
  processingTime: number;
  errorRate: number;
  automationRate: number;
  firstContactResolution: number;
  customerSatisfaction: number;
  costPerInvoice: number;
  productivityRate: number;
}

export interface CashFlowForecast {
  period: string;
  expectedInflows: number;
  actualInflows: number;
  variance: number;
  accuracy: number;
  riskFactors: string[];
}

export interface CustomerSegmentAnalytics {
  segmentName: string;
  customerCount: number;
  averageRevenue: number;
  totalRevenue: number;
  churnRate: number;
  paymentSpeed: number;
  collectionRate: number;
  profitability: number;
}