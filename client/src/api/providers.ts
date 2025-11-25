// Provider Network API Integration Layer
// Handles all API calls for provider network management

interface Provider {
  id: number;
  npiNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  specialties: string[];
  networkStatus: 'active' | 'pending' | 'inactive' | 'suspended';
  networkTier: 'tier1' | 'tier2' | 'tier3';
  participationLevel: 'full' | 'partial' | 'limited';
  locations: Array<{
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    fax?: string;
    isPrimary: boolean;
  }>;
  performanceMetrics: {
    totalClaims: number;
    averageProcessingTime: number;
    averageClaimAmount: number;
    satisfactionScore: number;
    qualityScore: number;
    complianceScore: number;
  };
  acceptanceStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface ProviderSearchFilters {
  query?: string;
  specialization?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  networkTier?: string;
  participationLevel?: string;
  networkStatus?: string;
  page?: number;
  limit?: number;
}

interface ProviderDirectoryResponse {
  providers: Provider[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreateProviderRequest {
  npiNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  specialties: string[];
  credentials: Array<{
    type: string;
    number: string;
    issuedBy: string;
    issuedDate: string;
    expiryDate: string;
  }>;
  locations: Array<{
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    fax?: string;
    isPrimary: boolean;
  }>;
  taxId: string;
  entityType: 'individual' | 'group' | 'facility';
  networkTier: 'tier1' | 'tier2' | 'tier3';
  participationLevel: 'full' | 'partial' | 'limited';
  acceptanceStatus: 'new' | 'medicare' | 'medicaid' | 'private' | 'combo';
}

interface UpdateProviderRequest {
  npiNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  specialties?: string[];
  networkTier?: 'tier1' | 'tier2' | 'tier3';
  participationLevel?: 'full' | 'partial' | 'limited';
  locations?: Array<{
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    fax?: string;
    isPrimary: boolean;
  }>;
}

interface ContractInfo {
  providerId: number;
  contractStatus: string;
  contractType: string;
  reimbursementMethod: string;
  reimbursementRate: number;
  capitationRate?: number;
  contractStartDate: string;
  contractEndDate: string;
  terms?: string;
}

interface CreateContractRequest {
  contractType: 'standard' | 'capitation' | 'bundled' | 'global';
  reimbursementMethod: 'fee_for_service' | 'capitation' | 'bundled' | 'value_based';
  standardRates?: Array<{
    serviceCode: string;
    serviceName: string;
    standardRate: number;
    contractedRate: number;
    effectiveDate: string;
  }>;
  capitationRate?: number;
  globalFee?: number;
  bundledServices?: string[];
  qualityMetrics?: Array<{
    metric: string;
    target: number;
    weight: number;
  }>;
  performanceBonuses?: Array<{
    metric: string;
    threshold: number;
    bonus: number;
  }>;
  startDate: string;
  endDate: string;
  terms: string;
  status?: 'draft' | 'pending_approval' | 'active' | 'expired' | 'terminated';
}

interface PerformanceMetrics {
  period: string;
  totalClaims: number;
  approvedClaims: number;
  deniedClaims: number;
  approvalRate: number;
  denialRate: number;
  totalReimbursed: number;
  averageClaimAmount: number;
  averageProcessingTime: number;
  qualityScores: {
    overall: number;
    satisfaction: number;
    compliance: number;
  };
  monthlyTrends: Array<{
    month: string;
    totalClaims: number;
    approvedClaims: number;
    deniedClaims: number;
    totalAmount: number;
  }>;
}

interface UtilizationData {
  period: string;
  totalServices: number;
  uniqueMembers: number;
  averageVisitsPerMember: number;
  serviceTypeBreakdown: Record<string, number>;
  topProcedures: Array<{
    procedureCode: string;
    count: number;
  }>;
  topMembers: Array<{
    memberId: number;
    name: string;
    visits: number;
    totalAmount: number;
  }>;
  revenueMetrics: {
    totalRevenue: number;
    averageRevenuePerService: number;
    revenueByServiceType: Record<string, number>;
  };
}

interface NetworkAnalysis {
  totalProviders: number;
  activeProviders: number;
  pendingProviders: number;
  inactiveProviders: number;
  providersByTier: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  providersBySpecialty: Array<{
    specialty: string;
    count: number;
    percentage: number;
  }>;
  providersByLocation: Array<{
    state: string;
    city: string;
    count: number;
  }>;
  networkUtilization: {
    averageClaimsPerProvider: number;
    topPerformingProviders: Array<{
      id: number;
      name: string;
      claims: number;
      satisfaction: number;
    }>;
    underutilizedProviders: Array<{
      id: number;
      name: string;
      claims: number;
      potential: number;
    }>;
  };
  networkGaps: Array<{
    specialty: string;
    location: string;
    severity: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

class ProvidersApi {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Provider Directory Operations
  async getProviders(filters: ProviderSearchFilters = {}): Promise<ProviderDirectoryResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/providers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request<ProviderDirectoryResponse>(endpoint);
    return response.data;
  }

  async getProviderById(id: number): Promise<Provider> {
    const response = await this.request<Provider>(`/providers/${id}`);
    return response.data;
  }

  async createProvider(providerData: CreateProviderRequest): Promise<Provider> {
    const response = await this.request<Provider>('/providers', {
      method: 'POST',
      body: JSON.stringify(providerData),
    });
    return response.data;
  }

  async updateProvider(id: number, updates: UpdateProviderRequest): Promise<Provider> {
    const response = await this.request<Provider>(`/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async deleteProvider(id: number): Promise<Provider> {
    const response = await this.request<Provider>(`/providers/${id}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  // Contract Management Operations
  async getProviderContracts(providerId: number): Promise<ContractInfo> {
    const response = await this.request<ContractInfo>(`/providers/${providerId}/contracts`);
    return response.data;
  }

  async createProviderContract(providerId: number, contractData: CreateContractRequest): Promise<ContractInfo> {
    const response = await this.request<ContractInfo>(`/providers/${providerId}/contracts`, {
      method: 'POST',
      body: JSON.stringify(contractData),
    });
    return response.data;
  }

  // Performance Analytics Operations
  async getProviderPerformance(providerId: number, period: string = '12months'): Promise<PerformanceMetrics> {
    const response = await this.request<PerformanceMetrics>(`/providers/${providerId}/performance?period=${period}`);
    return response.data;
  }

  async getProviderUtilization(providerId: number, period: string = '12months'): Promise<UtilizationData> {
    const response = await this.request<UtilizationData>(`/providers/${providerId}/utilization?period=${period}`);
    return response.data;
  }

  // Network Status Operations
  async updateProviderNetworkStatus(
    providerId: number,
    networkStatus: string,
    reason?: string,
    effectiveDate?: string
  ): Promise<Provider> {
    const response = await this.request<Provider>(`/providers/${providerId}/network-status`, {
      method: 'POST',
      body: JSON.stringify({
        networkStatus,
        reason,
        effectiveDate,
      }),
    });
    return response.data;
  }

  // Network Analytics Operations
  async getNetworkAnalysis(region?: string): Promise<NetworkAnalysis> {
    const endpoint = region ? `/analytics/network-analysis?region=${region}` : '/analytics/network-analysis';
    const response = await this.request<NetworkAnalysis>(endpoint);
    return response.data;
  }

  // Utility Methods
  async searchProviders(query: string, filters: Partial<ProviderSearchFilters> = {}): Promise<ProviderDirectoryResponse> {
    return this.getProviders({ ...filters, query });
  }

  async getProvidersBySpecialty(specialty: string, filters: Partial<ProviderSearchFilters> = {}): Promise<ProviderDirectoryResponse> {
    return this.getProviders({ ...filters, specialization: specialty });
  }

  async getProvidersByLocation(city: string, state: string, filters: Partial<ProviderSearchFilters> = {}): Promise<ProviderDirectoryResponse> {
    return this.getProviders({ ...filters, city, state });
  }

  async getProvidersByTier(tier: string, filters: Partial<ProviderSearchFilters> = {}): Promise<ProviderDirectoryResponse> {
    return this.getProviders({ ...filters, networkTier: tier });
  }

  async getActiveProviders(filters: Partial<ProviderSearchFilters> = {}): Promise<ProviderDirectoryResponse> {
    return this.getProviders({ ...filters, networkStatus: 'active' });
  }

  async getPendingProviders(filters: Partial<ProviderSearchFilters> = {}): Promise<ProviderDirectoryResponse> {
    return this.getProviders({ ...filters, networkStatus: 'pending' });
  }

  // Batch Operations
  async batchUpdateProviderStatus(updates: Array<{ id: number; networkStatus: string; reason?: string }>): Promise<Provider[]> {
    const promises = updates.map(({ id, networkStatus, reason }) =>
      this.updateProviderNetworkStatus(id, networkStatus, reason)
    );
    return Promise.all(promises);
  }

  async exportProviderData(format: 'csv' | 'excel' | 'pdf' = 'csv', filters: ProviderSearchFilters = {}): Promise<Blob> {
    const queryParams = new URLSearchParams({ ...filters, format });
    const response = await fetch(`${this.baseUrl}/providers/export?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // Validation Methods
  async validateNpiNumber(npiNumber: string): Promise<{ valid: boolean; provider?: Provider }> {
    const response = await this.request<{ valid: boolean; provider?: Provider }>(`/providers/validate-npi/${npiNumber}`);
    return response.data;
  }

  async validateProviderEmail(email: string, excludeId?: number): Promise<{ available: boolean }> {
    const queryParams = excludeId ? `?email=${email}&excludeId=${excludeId}` : `?email=${email}`;
    const response = await this.request<{ available: boolean }>(`/providers/validate-email${queryParams}`);
    return response.data;
  }

  // Statistics and Summary Methods
  async getProviderStatistics(): Promise<{
    total: number;
    active: number;
    pending: number;
    inactive: number;
    byTier: Record<string, number>;
    bySpecialty: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const response = await this.request<any>('/providers/statistics');
    return response.data;
  }

  async getNetworkHealthMetrics(): Promise<{
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    activationRate: number;
    averageSatisfaction: number;
    networkGaps: number;
    utilizationRate: number;
  }> {
    const response = await this.request<any>('/analytics/network-health');
    return response.data;
  }
}

// Create and export a singleton instance
export const providersApi = new ProvidersApi();

// Export types for use in components
export type {
  Provider,
  ProviderSearchFilters,
  ProviderDirectoryResponse,
  CreateProviderRequest,
  UpdateProviderRequest,
  ContractInfo,
  CreateContractRequest,
  PerformanceMetrics,
  UtilizationData,
  NetworkAnalysis,
  ApiResponse
};

// Export utility functions
export const createProviderFormData = (formData: any): CreateProviderRequest => ({
  npiNumber: formData.npiNumber,
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,
  phone: formData.phone,
  specialization: formData.specialization,
  specialties: formData.specialties || [],
  credentials: formData.credentials || [],
  locations: formData.locations || [],
  taxId: formData.taxId,
  entityType: formData.entityType,
  networkTier: formData.networkTier,
  participationLevel: formData.participationLevel,
  acceptanceStatus: formData.acceptanceStatus
});

export const createContractFormData = (formData: any): CreateContractRequest => ({
  contractType: formData.contractType,
  reimbursementMethod: formData.reimbursementMethod,
  standardRates: formData.standardRates || [],
  capitationRate: formData.capitationRate,
  globalFee: formData.globalFee,
  bundledServices: formData.bundledServices || [],
  qualityMetrics: formData.qualityMetrics || [],
  performanceBonuses: formData.performanceBonuses || [],
  startDate: formData.startDate,
  endDate: formData.endDate,
  terms: formData.terms,
  status: formData.status || 'draft'
});

// Error handling utility
export class ProviderApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ProviderApiError';
  }
}

// Response type guards
export const isProviderResponse = (data: any): data is ApiResponse<Provider> => {
  return data && typeof data === 'object' && 'success' in data && 'data' in data;
};

export const isProviderDirectoryResponse = (data: any): data is ApiResponse<ProviderDirectoryResponse> => {
  return data && typeof data === 'object' && 'success' in data && 'data' in data &&
         'providers' in data.data && 'pagination' in data.data;
};

export default providersApi;