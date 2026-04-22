// API service for CRM backend integration

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

// CRM Service API
export const crmApi = {
  // Leads Management
  async getLeads(params: {
    page?: number;
    limit?: number;
    status?: string;
    source?: string;
    agentId?: number;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/crm/leads?${searchParams}`);
  },

  async getLead(leadId: number) {
    return apiRequest(`/crm/leads/${leadId}`);
  },

  async createLead(leadData: any) {
    return apiRequest('/crm/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  },

  async updateLead(leadId: number, leadData: any) {
    return apiRequest(`/crm/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(leadData),
    });
  },

  async convertLead(leadId: number, conversionData: {
    convertedBy: string;
    memberId?: number;
    notes?: string;
  }) {
    return apiRequest(`/crm/leads/${leadId}/convert`, {
      method: 'POST',
      body: JSON.stringify(conversionData),
    });
  },

  // Agents Management
  async getAgents(params: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/crm/agents?${searchParams}`);
  },

  async getAgent(agentId: number) {
    return apiRequest(`/crm/agents/${agentId}`);
  },

  async createAgent(agentData: any) {
    return apiRequest('/crm/agents', {
      method: 'POST',
      body: JSON.stringify(agentData),
    });
  },

  async getAgentPerformance(agentId: number, period?: string) {
    const params = period ? `?period=${period}` : '';
    return apiRequest(`/crm/agents/${agentId}/performance${params}`);
  },

  // Commissions
  async getAgentCommissions(agentId: number, params: {
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/crm/agents/${agentId}/commissions?${searchParams}`);
  },

  async processCommission(commissionData: {
    agentId: number;
    claimId: number;
    amount: number;
    commissionRate: number;
    processedBy?: string;
  }) {
    return apiRequest('/crm/commissions/process', {
      method: 'POST',
      body: JSON.stringify(commissionData),
    });
  },

  // Contacts & Communications
  async getContacts(params: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/crm/contacts?${searchParams}`);
  },

  async logInteraction(interactionData: {
    contactId: number;
    interactionType: 'call' | 'email' | 'meeting' | 'note';
    subject: string;
    description?: string;
    handledBy?: string;
  }) {
    return apiRequest('/crm/interactions', {
      method: 'POST',
      body: JSON.stringify(interactionData),
    });
  },

  // Campaign Management
  async getCampaigns(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/crm/campaigns?${searchParams}`);
  },

  async getCampaignStats(campaignId: number) {
    return apiRequest(`/crm/campaigns/${campaignId}/stats`);
  },

  // CRM Analytics
  async getPipelineMetrics(params: {
    startDate?: string;
    endDate?: string;
    agentId?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/crm/analytics/pipeline?${searchParams}`);
  },

  async getConversionRates(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'source' | 'agent' | 'month';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/crm/analytics/conversion-rates?${searchParams}`);
  },

  // Communication History
  async getCommunicationHistory(entityType: 'lead' | 'member' | 'agent', entityId: number) {
    return apiRequest(`/crm/communications/${entityType}/${entityId}`);
  },

  async sendCommunication(communicationData: {
    recipientType: string;
    recipientId: number;
    communicationType: 'email' | 'sms' | 'notification';
    templateId?: string;
    subject?: string;
    message?: string;
    sentBy?: string;
  }) {
    return apiRequest('/crm/communications/send', {
      method: 'POST',
      body: JSON.stringify(communicationData),
    });
  },
};