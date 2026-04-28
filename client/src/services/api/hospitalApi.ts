// API service for hospital/provider backend integration

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

// Hospital Service API
export const hospitalApi = {
  // Hospital/Institution Management
  async getHospitals(params: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    search?: string;
    accreditationStatus?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/hospital/institutions?${searchParams}`);
  },

  async getHospital(hospitalId: number) {
    return apiRequest(`/hospital/institutions/${hospitalId}`);
  },

  async createHospital(hospitalData: any) {
    return apiRequest('/hospital/institutions', {
      method: 'POST',
      body: JSON.stringify(hospitalData),
    });
  },

  async updateHospital(hospitalId: number, hospitalData: any) {
    return apiRequest(`/hospital/institutions/${hospitalId}`, {
      method: 'PUT',
      body: JSON.stringify(hospitalData),
    });
  },

  async verifyHospital(hospitalId: number, verificationData: {
    verifiedBy: string;
    verificationNotes?: string;
    accreditationLevel?: string;
  }) {
    return apiRequest(`/hospital/institutions/${hospitalId}/verify`, {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  },

  // Medical Personnel
  async getMedicalPersonnel(params: {
    page?: number;
    limit?: number;
    institutionId?: number;
    specialization?: string;
    status?: string;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/hospital/personnel?${searchParams}`);
  },

  async getPersonnel(personnelId: number) {
    return apiRequest(`/hospital/personnel/${personnelId}`);
  },

  async addMedicalPersonnel(personnelData: any) {
    return apiRequest('/hospital/personnel', {
      method: 'POST',
      body: JSON.stringify(personnelData),
    });
  },

  async verifyPersonnel(personnelId: number, verificationData: {
    verifiedBy: string;
    licenseVerified?: boolean;
    verificationNotes?: string;
  }) {
    return apiRequest(`/hospital/personnel/${personnelId}/verify`, {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  },

  // Providers & Network
  async getProviders(params: {
    page?: number;
    limit?: number;
    networkStatus?: 'in_network' | 'out_of_network' | 'pending';
    specialization?: string;
    region?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/hospital/providers?${searchParams}`);
  },

  async getProvider(providerId: number) {
    return apiRequest(`/hospital/providers/${providerId}`);
  },

  async addProviderToNetwork(providerId: number, networkData: {
    contractId: number;
    effectiveDate: string;
    negotiatedRates?: any;
  }) {
    return apiRequest(`/hospital/providers/${providerId}/add-to-network`, {
      method: 'POST',
      body: JSON.stringify(networkData),
    });
  },

  // Departments
  async getHospitalDepartments(hospitalId: number) {
    return apiRequest(`/hospital/institutions/${hospitalId}/departments`);
  },

  // Appointments
  async getAppointments(params: {
    institutionId?: number;
    memberId?: number;
    personnelId?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/hospital/appointments?${searchParams}`);
  },

  async createAppointment(appointmentData: {
    memberId: number;
    institutionId: number;
    personnelId: number;
    appointmentDate: string;
    appointmentTime: string;
    reason?: string;
  }) {
    return apiRequest('/hospital/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  },

  async cancelAppointment(appointmentId: number, cancelReason?: string) {
    return apiRequest(`/hospital/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: cancelReason }),
    });
  },

  // Provider Performance
  async getProviderPerformance(providerId: number, period?: string) {
    const params = period ? `?period=${period}` : '';
    return apiRequest(`/hospital/providers/${providerId}/performance${params}`);
  },

  async getNetworkAnalytics(params: {
    startDate?: string;
    endDate?: string;
    region?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/hospital/analytics/network?${searchParams}`);
  },

  // Medical Procedures
  async getMedicalProcedures(params: {
    search?: string;
    category?: string;
    activeOnly?: boolean;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/hospital/procedures?${searchParams}`);
  },

  // Provider Networks Management
  async getProviderNetworks(params: {
    page?: number;
    limit?: number;
    tier?: string;
    activeOnly?: boolean;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/hospital/provider-networks?${searchParams}`);
  },

  async getProviderNetwork(networkId: number) {
    return apiRequest(`/hospital/provider-networks/${networkId}`);
  },

  async createProviderNetwork(networkData: any) {
    return apiRequest('/hospital/provider-networks', {
      method: 'POST',
      body: JSON.stringify(networkData),
    });
  },

  async updateProviderNetwork(networkId: number, networkData: any) {
    return apiRequest(`/hospital/provider-networks/${networkId}`, {
      method: 'PUT',
      body: JSON.stringify(networkData),
    });
  },

  async deleteProviderNetwork(networkId: number) {
    return apiRequest(`/hospital/provider-networks/${networkId}`, {
      method: 'DELETE',
    });
  },

  async getNetworkProviders(networkId: number) {
    return apiRequest(`/hospital/provider-networks/${networkId}/providers`);
  },

  async assignProviderToNetwork(networkId: number, assignmentData: any) {
    return apiRequest(`/hospital/provider-networks/${networkId}/providers`, {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  },

  async removeProviderFromNetwork(networkId: number, institutionId: number) {
    return apiRequest(`/hospital/provider-networks/${networkId}/providers/${institutionId}`, {
      method: 'DELETE',
    });
  },

  // Current Provider Session
  async getCurrentProvider() {
    return apiRequest('/hospital/providers/current');
  },

  // Provider Notifications
  async getProviderNotifications(params: number | {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    providerId?: number;
  } = {}) {
    // Support backwards compatibility for when providerId is passed directly
    const actualParams = typeof params === 'number' ? { providerId: params } : params;
    
    const searchParams = new URLSearchParams();
    Object.entries(actualParams).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return apiRequest(`/hospital/providers/notifications?${searchParams}`);
  },

  // Provider Dashboard
  async getProviderDashboard() {
    return apiRequest('/hospital/providers/dashboard');
  },

  // Institution Dashboard
  async getInstitutionDashboard() {
    return apiRequest('/hospital/institutions/dashboard');
  }
};
