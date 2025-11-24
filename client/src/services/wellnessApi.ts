import { WellnessIntegration, HealthData, HealthMetrics, WellnessIncentive, WellnessReward, WellnessCoach, CoachingSession, AvailableSlot, WellnessStats } from '../../../shared/types/wellness';

const API_BASE = '/api/wellness';

class WellnessApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

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
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Wellness Integrations
  async getIntegrations(): Promise<WellnessIntegration[]> {
    return this.request('/integrations');
  }

  async connectDevice(provider: string, permissions: string[], settings: any): Promise<any> {
    return this.request('/integrations/connect', {
      method: 'POST',
      body: JSON.stringify({ provider, permissions, settings }),
    });
  }

  async completeDeviceConnection(provider: string, code: string, state: string): Promise<any> {
    return this.request(`/integrations/callback/${provider}`, {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }

  async disconnectDevice(integrationId: string): Promise<void> {
    return this.request(`/integrations/${integrationId}/disconnect`, {
      method: 'POST',
    });
  }

  async revokeDeviceAccess(integrationId: string): Promise<void> {
    return this.request(`/integrations/${integrationId}/revoke`, {
      method: 'POST',
    });
  }

  async refreshDeviceToken(integrationId: string): Promise<any> {
    return this.request(`/integrations/${integrationId}/refresh`, {
      method: 'POST',
    });
  }

  async syncDeviceData(integrationId: string, dataTypes: string[], dateRange?: { from: string; to: string }): Promise<any> {
    return this.request(`/integrations/${integrationId}/sync`, {
      method: 'POST',
      body: JSON.stringify({ dataTypes, dateRange }),
    });
  }

  // Health Data
  async getHealthData(options: {
    dataTypes?: string[];
    dateFrom?: string;
    dateTo?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: HealthData[]; total: number }> {
    const params = new URLSearchParams();

    if (options.dataTypes?.length) {
      options.dataTypes.forEach(type => params.append('dataTypes', type));
    }
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);
    if (options.source) params.append('source', options.source);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/health-data${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getHealthMetrics(period: string = '30d'): Promise<HealthMetrics> {
    return this.request(`/health-metrics?period=${period}`);
  }

  async addManualHealthData(healthData: {
    type: string;
    value: number;
    unit: string;
    timestamp?: Date;
    notes?: string;
  }): Promise<HealthData> {
    return this.request('/health-data/manual', {
      method: 'POST',
      body: JSON.stringify(healthData),
    });
  }

  async updateHealthGoals(goals: any): Promise<any> {
    return this.request('/health-goals', {
      method: 'PUT',
      body: JSON.stringify({ goals }),
    });
  }

  // Wellness Incentives
  async getIncentives(options: {
    category?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<WellnessIncentive[]> {
    const params = new URLSearchParams();

    if (options.category) params.append('category', options.category);
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/incentives${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  // Wellness Rewards
  async getRewards(options: {
    category?: string;
    available?: boolean;
    limit?: number;
  } = {}): Promise<WellnessReward[]> {
    const params = new URLSearchParams();

    if (options.category) params.append('category', options.category);
    if (options.available !== undefined) params.append('available', options.available.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/rewards${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async claimReward(rewardId: string): Promise<any> {
    return this.request(`/rewards/${rewardId}/claim`, {
      method: 'POST',
    });
  }

  // Wellness Coaching
  async getCoaches(options: {
    specialty?: string;
    language?: string;
    availability?: string;
    rating?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ coaches: WellnessCoach[]; total: number }> {
    const params = new URLSearchParams();

    if (options.specialty) params.append('specialty', options.specialty);
    if (options.language) params.append('language', options.language);
    if (options.availability) params.append('availability', options.availability);
    if (options.rating) params.append('rating', options.rating.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/coaches${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getAvailableSlots(coachId: string, dateFrom?: string, dateTo?: string): Promise<AvailableSlot[]> {
    const params = new URLSearchParams();

    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const queryString = params.toString();
    const endpoint = `/coaches/${coachId}/slots${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async bookCoachingSession(data: {
    coachId: string;
    slotId: string;
    type: string;
    notes?: string;
  }): Promise<CoachingSession> {
    return this.request('/coaching-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCoachingSessions(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ sessions: CoachingSession[]; total: number }> {
    const params = new URLSearchParams();

    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/coaching-sessions${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  // Wellness Statistics
  async getWellnessStats(period: string = '30d'): Promise<WellnessStats> {
    return this.request(`/stats?period=${period}`);
  }

  // Utility methods
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getIntegrations();
      return { success: true, message: 'Wellness API is connected' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Device-specific OAuth helpers
  getFitbitAuthUrl(): string {
    // In production, this would generate the proper OAuth URL
    return 'https://www.fitbit.com/oauth2/authorize?client_id=demo&redirect_uri=http://localhost:5000/api/wellness/integrations/callback/fitbit&response_type=code&scope=activity heartrate location nutrition profile settings sleep social weight&state=demo_state';
  }

  getGoogleFitAuthUrl(): string {
    // In production, this would generate the proper OAuth URL
    return 'https://accounts.google.com/o/oauth2/v2/auth?client_id=demo&redirect_uri=http://localhost:5000/api/wellness/integrations/callback/google_fit&response_type=code&scope=https://www.googleapis.com/auth/fitness.activity.read%20https://www.googleapis.com/auth/fitness.body.read%20https://www.googleapis.com/auth/fitness.heart_rate.read%20https://www.googleapis.com/auth/fitness.sleep.read&state=demo_state';
  }

  // Data export utilities
  async exportHealthData(options: {
    format: 'csv' | 'json';
    dataTypes?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();

    params.append('format', options.format);
    if (options.dataTypes?.length) {
      options.dataTypes.forEach(type => params.append('dataTypes', type));
    }
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);

    const response = await fetch(`${API_BASE}/health-data/export?${params}`);
    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Wellness analytics
  async getWellnessAnalytics(period: string = '30d'): Promise<any> {
    return this.request(`/analytics?period=${period}`);
  }

  // Leaderboard
  async getLeaderboard(options: {
    type?: 'steps' | 'points' | 'activities';
    period?: string;
    limit?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();

    if (options.type) params.append('type', options.type);
    if (options.period) params.append('period', options.period);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/leaderboard${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }
}

export const wellnessApi = new WellnessApiService();
export default wellnessApi;