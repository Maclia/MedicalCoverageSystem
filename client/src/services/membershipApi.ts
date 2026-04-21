// API service for membership backend integration

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

// Membership Service API
export const membershipApi = {
  // Member Management
  async getMembers(params: {
    page?: number;
    limit?: number;
    status?: string;
    companyId?: number;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/membership/members?${searchParams}`);
  },

  async getMember(memberId: number) {
    return apiRequest(`/membership/members/${memberId}`);
  },

  async createMember(memberData: any) {
    return apiRequest('/membership/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  },

  async updateMember(memberId: number, memberData: any) {
    return apiRequest(`/membership/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  },

  async activateMember(memberId: number) {
    return apiRequest(`/membership/members/${memberId}/activate`, {
      method: 'POST',
    });
  },

  async deactivateMember(memberId: number, reason?: string) {
    return apiRequest(`/membership/members/${memberId}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Membership Enrollments
  async getEnrollments(memberId?: number) {
    const params = memberId ? `?memberId=${memberId}` : '';
    return apiRequest(`/membership/enrollments${params}`);
  },

  async createEnrollment(enrollmentData: {
    memberId: number;
    planId: number;
    effectiveDate: string;
    terminationDate?: string;
    coverageLevel?: string;
  }) {
    return apiRequest('/membership/enrollments', {
      method: 'POST',
      body: JSON.stringify(enrollmentData),
    });
  },

  async terminateEnrollment(enrollmentId: number, terminationData: {
    terminationDate: string;
    reason: string;
  }) {
    return apiRequest(`/membership/enrollments/${enrollmentId}/terminate`, {
      method: 'POST',
      body: JSON.stringify(terminationData),
    });
  },

  // Card Management
  async getMemberCards(memberId: number) {
    return apiRequest(`/membership/members/${memberId}/cards`);
  },

  async generateCard(memberId: number, cardData: {
    cardType: string;
    validFrom: string;
    validTo: string;
  }) {
    return apiRequest(`/membership/members/${memberId}/cards`, {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  },

  async suspendCard(cardId: number, reason?: string) {
    return apiRequest(`/membership/cards/${cardId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async reactivateCard(cardId: number) {
    return apiRequest(`/membership/cards/${cardId}/reactivate`, {
      method: 'POST',
    });
  },

  // Renewals
  async getUpcomingRenewals(days: number = 30) {
    return apiRequest(`/membership/renewals/upcoming?days=${days}`);
  },

  async processRenewal(enrollmentId: number, renewalData: {
    renewForMonths: number;
    newPremium?: number;
  }) {
    return apiRequest(`/membership/enrollments/${enrollmentId}/renew`, {
      method: 'POST',
      body: JSON.stringify(renewalData),
    });
  },

  // Eligibility Checks
  async checkEligibility(eligibilityCheck: {
    memberId: number;
    benefitId?: number;
    serviceDate?: string;
    amount?: number;
  }) {
    return apiRequest('/membership/eligibility/check', {
      method: 'POST',
      body: JSON.stringify(eligibilityCheck),
    });
  },

  // Dependents
  async getMemberDependents(memberId: number) {
    return apiRequest(`/membership/members/${memberId}/dependents`);
  },

  async addDependent(memberId: number, dependentData: any) {
    return apiRequest(`/membership/members/${memberId}/dependents`, {
      method: 'POST',
      body: JSON.stringify(dependentData),
    });
  },

  async removeDependent(dependentId: number) {
    return apiRequest(`/membership/dependents/${dependentId}`, {
      method: 'DELETE',
    });
  },

  // Membership Reports
  async getMembershipStats(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'status' | 'plan' | 'company';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/membership/reports/stats?${searchParams}`);
  },
};