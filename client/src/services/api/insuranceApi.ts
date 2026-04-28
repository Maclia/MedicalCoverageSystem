// API service for insurance backend integration

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

// Insurance Service API
export const insuranceApi = {
  // Policies Management
  async getPolicies(params: {
    page?: number;
    limit?: number;
    status?: string;
    memberId?: number;
    planId?: number;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/insurance/policies?${searchParams}`);
  },

  async getPolicy(policyId: number) {
    return apiRequest(`/insurance/policies/${policyId}`);
  },

  async createPolicy(policyData: any) {
    return apiRequest('/insurance/policies', {
      method: 'POST',
      body: JSON.stringify(policyData),
    });
  },

  async updatePolicy(policyId: number, policyData: any) {
    return apiRequest(`/insurance/policies/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(policyData),
    });
  },

  async cancelPolicy(policyId: number, cancelData: {
    cancellationDate: string;
    reason: string;
    processedBy?: string;
  }) {
    return apiRequest(`/insurance/policies/${policyId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(cancelData),
    });
  },

  // Benefit Plans
  async getBenefitPlans(params: {
    activeOnly?: boolean;
    planType?: string;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/insurance/benefit-plans?${searchParams}`);
  },

  async getBenefitPlan(planId: number) {
    return apiRequest(`/insurance/benefit-plans/${planId}`);
  },

  async createBenefitPlan(planData: any) {
    return apiRequest('/insurance/benefit-plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  },

  // Coverage & Eligibility
  async checkCoverage(coverageCheck: {
    memberId: number;
    benefitId?: number;
    serviceDate?: string;
    procedureCode?: string;
    amount?: number;
  }) {
    return apiRequest('/insurance/coverage/check', {
      method: 'POST',
      body: JSON.stringify(coverageCheck),
    });
  },

  async getMemberBenefits(memberId: number, effectiveDate?: string) {
    const params = effectiveDate ? `?effectiveDate=${effectiveDate}` : '';
    return apiRequest(`/insurance/members/${memberId}/benefits${params}`);
  },

  async getBenefitLimits(memberId: number, benefitId: number) {
    return apiRequest(`/insurance/members/${memberId}/benefits/${benefitId}/limits`);
  },

  // Claims Adjudication
  async adjudicateClaim(claimId: number, adjudicationData: {
    adjudicatorId?: string;
    adjudicationNotes?: string;
    autoAdjudicate?: boolean;
  }) {
    return apiRequest(`/insurance/claims/${claimId}/adjudicate`, {
      method: 'POST',
      body: JSON.stringify(adjudicationData),
    });
  },

  async getAdjudicationHistory(claimId: number) {
    return apiRequest(`/insurance/claims/${claimId}/adjudication-history`);
  },

  // Premium Calculations
  async calculatePolicyPremium(premiumData: {
    planId: number;
    memberAge: number;
    coverageLevel?: string;
    addons?: string[];
    riskFactors?: any;
  }) {
    return apiRequest('/insurance/premiums/calculate', {
      method: 'POST',
      body: JSON.stringify(premiumData),
    });
  },

  async getPremiumSchedule(policyId: number) {
    return apiRequest(`/insurance/policies/${policyId}/premium-schedule`);
  },

  // Schemes Management
  async getSchemes(params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/insurance/schemes?${searchParams}`);
  },

  async getScheme(schemeId: number) {
    return apiRequest(`/insurance/schemes/${schemeId}`);
  },

  // Insurance Analytics
  async getPolicyMetrics(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'status' | 'plan' | 'month';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/insurance/analytics/policies?${searchParams}`);
  },

  async getClaimsUtilization(params: {
    startDate?: string;
    endDate?: string;
    planId?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/insurance/analytics/utilization?${searchParams}`);
  },

  // Exclusions & Limitations
  async getPolicyExclusions(policyId: number) {
    return apiRequest(`/insurance/policies/${policyId}/exclusions`);
  },

  async getWaitingPeriods(memberId: number, benefitId?: number) {
    const params = benefitId ? `?benefitId=${benefitId}` : '';
    return apiRequest(`/insurance/members/${memberId}/waiting-periods${params}`);
  },

  // Benefits
  async getBenefits(params: {
    page?: number;
    limit?: number;
    category?: string;
    planId?: number;
    activeOnly?: boolean;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/insurance/benefits?${searchParams}`);
  },

  async getBenefit(benefitId: number) {
    return apiRequest(`/insurance/benefits/${benefitId}`);
  },

  // Scheme Operations
  async approveScheme(schemeId: number) {
    return apiRequest(`/insurance/schemes/${schemeId}/approve`, {
      method: 'POST'
    });
  },

  async rejectScheme(schemeId: number) {
    return apiRequest(`/insurance/schemes/${schemeId}/reject`, {
      method: 'POST'
    });
  },

  async suspendScheme(schemeId: number) {
    return apiRequest(`/insurance/schemes/${schemeId}/suspend`, {
      method: 'POST'
    });
  },

  async activateScheme(schemeId: number) {
    return apiRequest(`/insurance/schemes/${schemeId}/activate`, {
      method: 'POST'
    });
  },

  async submitSchemeForApproval(schemeId: number) {
    return apiRequest(`/insurance/schemes/${schemeId}/submit`, {
      method: 'POST'
    });
  },

  // Scheme Utilization Alerts
  async getUtilizationAlerts() {
    return apiRequest('/insurance/schemes/alerts/utilization');
  }
};
