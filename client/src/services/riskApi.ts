import {
  RiskAssessment,
  RiskCategoryScore,
  RiskFactor,
  RiskRecommendation,
  RiskTrendAnalysis,
  RiskActionItem,
  RiskAlert,
  RiskPrediction,
  RiskIntervention,
  RiskBenchmark,
  RiskAssessmentHistory,
  RiskDashboard,
  RiskInsight
} from '../../../shared/types/riskAssessment';

const API_BASE = '/api/risk';

class RiskApiService {
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

  // Risk Assessment
  async getCurrentRiskAssessment(memberId: string): Promise<RiskAssessment> {
    return this.request(`/assessment/current/${memberId}`);
  }

  async createRiskAssessment(memberId: string, assessmentData: any): Promise<RiskAssessment> {
    return this.request('/assessment', {
      method: 'POST',
      body: JSON.stringify({ memberId, assessmentData }),
    });
  }

  async updateRiskAssessment(assessmentId: string, updateData: any): Promise<RiskAssessment> {
    return this.request(`/assessment/${assessmentId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async getRiskAssessmentHistory(memberId: string, limit = 12, offset = 0): Promise<RiskAssessmentHistory[]> {
    return this.request(`/assessment/history/${memberId}?limit=${limit}&offset=${offset}`);
  }

  // Risk Recommendations
  async getRiskRecommendations(memberId: string, options: {
    category?: string;
    priority?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<RiskRecommendation[]> {
    const params = new URLSearchParams();
    if (options.category) params.append('category', options.category);
    if (options.priority) params.append('priority', options.priority);
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/recommendations/${memberId}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async updateRecommendationStatus(
    recommendationId: string,
    status: string,
    outcome?: string,
    notes?: string
  ): Promise<RiskRecommendation> {
    return this.request(`/recommendations/${recommendationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, outcome, notes }),
    });
  }

  // Risk Alerts
  async getRiskAlerts(memberId: string, options: {
    severity?: string;
    read?: boolean;
    acknowledged?: boolean;
    limit?: number;
  } = {}): Promise<RiskAlert[]> {
    const params = new URLSearchParams();
    if (options.severity) params.append('severity', options.severity);
    if (options.read !== undefined) params.append('read', options.read.toString());
    if (options.acknowledged !== undefined) params.append('acknowledged', options.acknowledged.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/alerts/${memberId}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async acknowledgeRiskAlert(alertId: string, notes?: string): Promise<RiskAlert> {
    return this.request(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  // Risk Predictions
  async getRiskPredictions(memberId: string, options: {
    type?: string;
    limit?: number;
  } = {}): Promise<RiskPrediction[]> {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/predictions/${memberId}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  // Risk Benchmarks
  async getRiskBenchmarks(options: {
    category?: string;
    metric?: string;
    population?: string;
  } = {}): Promise<RiskBenchmark[]> {
    const params = new URLSearchParams();
    if (options.category) params.append('category', options.category);
    if (options.metric) params.append('metric', options.metric);
    if (options.population) params.append('population', options.population);

    const queryString = params.toString();
    const endpoint = `/benchmarks${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  // Risk Action Items
  async getRiskActionItems(memberId: string, options: {
    status?: string;
    priority?: string;
    type?: string;
    limit?: number;
  } = {}): Promise<RiskActionItem[]> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.priority) params.append('priority', options.priority);
    if (options.type) params.append('type', options.type);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/action-items/${memberId}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async updateActionItemStatus(
    actionItemId: string,
    status: string,
    outcome?: string,
    notes?: string
  ): Promise<RiskActionItem> {
    return this.request(`/action-items/${actionItemId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, outcome, notes }),
    });
  }

  // Risk Dashboard
  async getRiskDashboard(memberId: string): Promise<RiskDashboard> {
    return this.request(`/dashboard/${memberId}`);
  }

  // Risk Reports
  async generateRiskReport(memberId: string, options: {
    format?: string;
    period?: string;
    includeHistory?: boolean;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (options.format) params.append('format', options.format);
    if (options.period) params.append('period', options.period);
    if (options.includeHistory !== undefined) params.append('includeHistory', options.includeHistory.toString());

    const queryString = params.toString();
    const endpoint = `/report/${memberId}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  // Risk Calculations
  async calculateRiskScores(memberId: string, categories?: string[], forceRecalculate = false): Promise<any> {
    return this.request(`/calculate/${memberId}`, {
      method: 'POST',
      body: JSON.stringify({ categories, forceRecalculate }),
    });
  }

  // Risk Factors
  async getRiskFactors(memberId: string, options: {
    category?: string;
    riskLevel?: string;
    limit?: number;
  } = {}): Promise<RiskFactor[]> {
    const params = new URLSearchParams();
    if (options.category) params.append('category', options.category);
    if (options.riskLevel) params.append('riskLevel', options.riskLevel);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/factors/${memberId}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async addRiskFactor(factorData: any): Promise<RiskFactor> {
    return this.request('/factors', {
      method: 'POST',
      body: JSON.stringify(factorData),
    });
  }

  async updateRiskFactor(factorId: string, updateData: any): Promise<RiskFactor> {
    return this.request(`/factors/${factorId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteRiskFactor(factorId: string): Promise<void> {
    return this.request(`/factors/${factorId}`, {
      method: 'DELETE',
    });
  }

  // Intervention Plans
  async getInterventionPlans(memberId: string, options: {
    status?: string;
    priority?: string;
    type?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.priority) params.append('priority', options.priority);
    if (options.type) params.append('type', options.type);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/interventions/${memberId}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async createInterventionPlan(interventionData: any): Promise<any> {
    return this.request('/interventions', {
      method: 'POST',
      body: JSON.stringify(interventionData),
    });
  }

  async updateInterventionPlan(interventionId: string, updateData: any): Promise<any> {
    return this.request(`/interventions/${interventionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Risk Configuration
  async getRiskConfig(memberId: string): Promise<any> {
    return this.request(`/config/${memberId}`);
  }

  async updateRiskConfig(memberId: string, configData: any): Promise<any> {
    return this.request(`/config/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  }

  // Utility Methods
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test with a simple benchmark call
      await this.getRiskBenchmarks({ limit: 1 });
      return { success: true, message: 'Risk API is connected' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Helper method to calculate risk level from score
  getRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
    if (score >= 90) return 'critical';
    if (score >= 75) return 'high';
    if (score >= 50) return 'moderate';
    return 'low';
  }

  // Helper method to get risk level color
  getRiskLevelColor(level: string): string {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  // Helper method to format risk score with level
  formatRiskScore(score: number): { score: number; level: string; color: string } {
    const level = this.getRiskLevel(score);
    return {
      score,
      level,
      color: this.getRiskLevelColor(level)
    };
  }

  // Export data for analysis
  async exportRiskData(memberId: string, options: {
    format?: 'csv' | 'json' | 'xlsx';
    includeHistory?: boolean;
    dateRange?: {
      from: string;
      to: string;
    };
  } = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (options.format) params.append('format', options.format);
    if (options.includeHistory !== undefined) params.append('includeHistory', options.includeHistory.toString());
    if (options.dateRange) {
      params.append('dateFrom', options.dateRange.from);
      params.append('dateTo', options.dateRange.to);
    }

    const response = await fetch(`${API_BASE}/export/${memberId}?${params}`);
    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Batch operations
  async batchUpdateRecommendations(updates: Array<{
    id: string;
    status: string;
    outcome?: string;
    notes?: string;
  }>): Promise<RiskRecommendation[]> {
    return this.request('/recommendations/batch', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  }

  async batchAcknowledgeAlerts(alertIds: string[]): Promise<RiskAlert[]> {
    return this.request('/alerts/batch/acknowledge', {
      method: 'POST',
      body: JSON.stringify({ alertIds }),
    });
  }

  // Analytics and insights
  async getRiskAnalytics(memberId: string, options: {
    period?: string;
    categories?: string[];
    includePredictions?: boolean;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.categories) options.categories.forEach(cat => params.append('categories', cat));
    if (options.includePredictions) params.append('includePredictions', 'true');

    const queryString = params.toString();
    const endpoint = `/analytics/${memberId}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  // Population comparison
  async compareWithPopulation(memberId: string, populationSegments: string[] = []): Promise<any> {
    return this.request('/population-comparison', {
      method: 'POST',
      body: JSON.stringify({ memberId, populationSegments }),
    });
  }
}

export const riskApi = new RiskApiService();
export default riskApi;