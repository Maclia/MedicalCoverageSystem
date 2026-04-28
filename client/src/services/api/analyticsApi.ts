// API service for analytics backend integration

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

// Analytics Service API
export const analyticsApi = {
  // Dashboard Analytics
  async getDashboardData(dashboardType: 'admin' | 'provider' | 'member' | 'finance' = 'admin') {
    return apiRequest(`/analytics/dashboard/${dashboardType}`);
  },

  async getRealTimeMetrics() {
    return apiRequest('/analytics/realtime');
  },

  // Claims Analytics
  async getClaimsAnalytics(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'status' | 'provider' | 'month' | 'benefit' | 'region';
    filters?: any;
  } = {}) {
    return apiRequest('/analytics/claims', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getClaimsFrequency(params: {
    startDate?: string;
    endDate?: string;
    interval?: 'day' | 'week' | 'month';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/claims/frequency?${searchParams}`);
  },

  async getClaimsProcessingMetrics(params: {
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/claims/processing?${searchParams}`);
  },

  // Financial Analytics
  async getFinancialAnalytics(params: {
    startDate?: string;
    endDate?: string;
    currency?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/financial?${searchParams}`);
  },

  async getRevenueMetrics(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'month' | 'quarter' | 'year';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/financial/revenue?${searchParams}`);
  },

  async getExpenseAnalysis(params: {
    startDate?: string;
    endDate?: string;
    category?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/financial/expenses?${searchParams}`);
  },

  // Membership Analytics
  async getMembershipAnalytics(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'status' | 'plan' | 'company' | 'region';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/membership?${searchParams}`);
  },

  async getMemberDemographics() {
    return apiRequest('/analytics/membership/demographics');
  },

  async getRetentionMetrics(params: {
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/membership/retention?${searchParams}`);
  },

  // Provider Analytics
  async getProviderAnalytics(params: {
    providerId?: number;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/providers?${searchParams}`);
  },

  async getProviderPerformance(providerId: number, params: {
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/providers/${providerId}/performance?${searchParams}`);
  },

  async getNetworkAnalytics(params: {
    region?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/providers/network?${searchParams}`);
  },

  // Benefit Utilization
  async getBenefitUtilization(params: {
    benefitId?: number;
    startDate?: string;
    endDate?: string;
    groupBy?: 'benefit' | 'member' | 'region';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/benefits/utilization?${searchParams}`);
  },

  // Trends & Forecasting
  async getTrendAnalysis(trendType: string, params: {
    startDate?: string;
    endDate?: string;
    forecastMonths?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/trends/${trendType}?${searchParams}`);
  },

  // Reports
  async generateReport(reportType: string, reportParams: any) {
    return apiRequest(`/analytics/reports/${reportType}`, {
      method: 'POST',
      body: JSON.stringify(reportParams),
    });
  },

  async exportReport(reportId: string, format: 'pdf' | 'excel' | 'csv' = 'pdf') {
    return apiRequest(`/analytics/reports/${reportId}/export?format=${format}`);
  },

  async getScheduledReports() {
    return apiRequest('/analytics/reports/scheduled');
  },

  // KPI Tracking
  async getKPI(kpiId: string, params: {
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/kpi/${kpiId}?${searchParams}`);
  },

  async getAllKPIs() {
    return apiRequest('/analytics/kpi');
  },

  // System Performance
  async getSystemPerformanceMetrics(params: {
    period?: 'hour' | 'day' | 'week' | 'month';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/system/performance?${searchParams}`);
  },

  // MLR (Medical Loss Ratio)
  async calculateMLR(params: {
    startDate?: string;
    endDate?: string;
    region?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/analytics/mlr?${searchParams}`);
  },

  // Comparative Analytics
  async getBenchmarks(benchmarkType: string) {
    return apiRequest(`/analytics/benchmarks/${benchmarkType}`);
  },

  async compareMetrics(comparisonData: {
    metrics: string[];
    dimensions: string[];
    filters?: any;
  }) {
    return apiRequest('/analytics/compare', {
      method: 'POST',
      body: JSON.stringify(comparisonData),
    });
  },

  // Dashboard Specific Endpoints
  async getInsuranceDashboardStats() {
    return apiRequest('/analytics/dashboard/insurance');
  },

  async getRecentActivity(params: { limit?: number } = {}) {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit.toString());
    return apiRequest(`/analytics/activity/recent?${searchParams}`);
  },

  // CRM Analytics Endpoints
  async getCRMDashboardData(params: {
    dateRange: string;
    agentId?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append('dateRange', params.dateRange);
    if (params.agentId) searchParams.append('agentId', params.agentId);
    return apiRequest(`/analytics/crm/dashboard?${searchParams}`);
  },

  async getCRMLeadSources(params: { dateRange: string }) {
    const searchParams = new URLSearchParams();
    searchParams.append('dateRange', params.dateRange);
    return apiRequest(`/analytics/crm/lead-sources?${searchParams}`);
  },

  async getCRMSalesPerformance(params: {
    dateRange: string;
    agentId?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append('dateRange', params.dateRange);
    if (params.agentId) searchParams.append('agentId', params.agentId);
    return apiRequest(`/analytics/crm/sales-performance?${searchParams}`);
  },

  async getCRMPipelineHealth() {
    return apiRequest('/analytics/crm/pipeline-health');
  },

  async getCRMTrendData(params: {
    days: number;
    agentId?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append('days', params.days.toString());
    if (params.agentId) searchParams.append('agentId', params.agentId);
    return apiRequest(`/analytics/crm/trends?${searchParams}`);
  },
};
