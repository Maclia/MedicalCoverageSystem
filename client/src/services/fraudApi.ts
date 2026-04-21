// API service for fraud detection backend integration

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

// Fraud Detection Service API
export const fraudApi = {
  // Claim Fraud Detection
  async detectClaimFraud(claimId: number, options: {
    deepAnalysis?: boolean;
    includeHistorical?: boolean;
  } = {}) {
    return apiRequest(`/fraud/claims/${claimId}/analyze`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  async getClaimFraudScore(claimId: number) {
    return apiRequest(`/fraud/claims/${claimId}/score`);
  },

  async getClaimFraudIndicators(claimId: number) {
    return apiRequest(`/fraud/claims/${claimId}/indicators`);
  },

  // Fraud Alerts
  async getFraudAlerts(params: {
    status?: 'new' | 'reviewed' | 'investigating' | 'resolved' | 'dismissed';
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    page?: number;
    limit?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/fraud/alerts?${searchParams}`);
  },

  async getFraudAlert(alertId: string) {
    return apiRequest(`/fraud/alerts/${alertId}`);
  },

  async updateFraudAlertStatus(alertId: string, statusUpdate: {
    status: string;
    reviewedBy?: string;
    notes?: string;
    resolution?: string;
  }) {
    return apiRequest(`/fraud/alerts/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusUpdate),
    });
  },

  // Investigation Cases
  async createInvestigation(investigationData: {
    alertId?: string;
    claimId?: number;
    type: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    description?: string;
  }) {
    return apiRequest('/fraud/investigations', {
      method: 'POST',
      body: JSON.stringify(investigationData),
    });
  },

  async getInvestigations(params: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/fraud/investigations?${searchParams}`);
  },

  async getInvestigation(investigationId: string) {
    return apiRequest(`/fraud/investigations/${investigationId}`);
  },

  async addInvestigationNote(investigationId: string, noteData: {
    note: string;
    addedBy: string;
    type?: 'observation' | 'evidence' | 'decision' | 'communication';
  }) {
    return apiRequest(`/fraud/investigations/${investigationId}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  },

  // Risk Assessment
  async assessMemberRisk(memberId: number) {
    return apiRequest(`/fraud/members/${memberId}/risk-assessment`);
  },

  async assessProviderRisk(providerId: number) {
    return apiRequest(`/fraud/providers/${providerId}/risk-assessment`);
  },

  // Fraud Patterns & Rules
  async getFraudPatterns(params: {
    activeOnly?: boolean;
    category?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/fraud/patterns?${searchParams}`);
  },

  async getDetectionRules() {
    return apiRequest('/fraud/rules');
  },

  async testDetectionRule(ruleId: string, testData: any) {
    return apiRequest(`/fraud/rules/${ruleId}/test`, {
      method: 'POST',
      body: JSON.stringify(testData),
    });
  },

  // Fraud Analytics
  async getFraudDashboardMetrics() {
    return apiRequest('/fraud/analytics/dashboard');
  },

  async getFraudTrends(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/fraud/analytics/trends?${searchParams}`);
  },

  // Batch Operations
  async runBatchFraudDetection(claimIds: number[]) {
    return apiRequest('/fraud/batch/analyze', {
      method: 'POST',
      body: JSON.stringify({ claimIds }),
    });
  },

  // Fraud Prevention
  async getPreAuthCheck(preAuthData: {
    memberId: number;
    providerId?: number;
    procedureCode?: string;
    estimatedAmount?: number;
  }) {
    return apiRequest('/fraud/preauth/check', {
      method: 'POST',
      body: JSON.stringify(preAuthData),
    });
  },

  // Blacklist Management
  async getBlacklistEntries(params: {
    type?: 'member' | 'provider' | 'ip' | 'device';
    activeOnly?: boolean;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/fraud/blacklist?${searchParams}`);
  },

  async addToBlacklist(blacklistEntry: {
    entityType: string;
    entityId: string;
    reason: string;
    expiresAt?: string;
    addedBy?: string;
  }) {
    return apiRequest('/fraud/blacklist', {
      method: 'POST',
      body: JSON.stringify(blacklistEntry),
    });
  },
};