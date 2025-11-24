// API service for claims processing backend integration

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

// Claims Processing API
export const claimsApi = {
  // Process a single claim through workflow
  async processClaimWorkflow(claimId: number, options: {
    workflowType?: 'standard' | 'expedited' | 'manual_review' | 'investigation';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    processingMode?: 'automatic' | 'manual';
    initiatedBy?: string;
  } = {}) {
    return apiRequest(`/claims/${claimId}/workflow`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  // Process claim eligibility
  async processEligibility(claimId: number) {
    return apiRequest(`/claims/${claimId}/eligibility`, {
      method: 'POST',
    });
  },

  // Detect fraud for a claim
  async detectFraud(claimId: number) {
    return apiRequest(`/claims/${claimId}/fraud-detection`, {
      method: 'POST',
    });
  },

  // Validate medical necessity
  async validateMedicalNecessity(claimId: number, diagnosisCode: string) {
    return apiRequest(`/claims/${claimId}/medical-necessity`, {
      method: 'POST',
      body: JSON.stringify({ diagnosisCode }),
    });
  },

  // Calculate financial responsibility
  async calculateFinancials(claimId: number) {
    return apiRequest(`/claims/${claimId}/financial-calculation`, {
      method: 'POST',
    });
  },

  // Generate EOB for a claim
  async generateEOB(claimId: number, format: 'html' | 'pdf' | 'text' = 'html') {
    return apiRequest(`/claims/${claimId}/eob?format=${format}`);
  },

  // Get claim analytics
  async getClaimAnalytics(claimId: number) {
    return apiRequest(`/claims/${claimId}/analytics`);
  },

  // Get claim adjudication results
  async getAdjudicationResults(claimId: number) {
    return apiRequest(`/claims/${claimId}/adjudication`);
  },

  // Get fraud alerts for a claim
  async getFraudAlerts(claimId: number) {
    return apiRequest(`/claims/${claimId}/fraud-alerts`);
  },

  // Get medical necessity validations for a claim
  async getMedicalNecessityValidations(claimId: number) {
    return apiRequest(`/claims/${claimId}/medical-necessity-validations`);
  },

  // Calculate MLR impact
  async calculateMLRImpact(claimId: number) {
    return apiRequest(`/claims/${claimId}/mlr-impact`);
  },
};

// Workflow Management API
export const workflowApi = {
  // Get workflow status
  async getWorkflowStatus(workflowId: string) {
    return apiRequest(`/workflows/${workflowId}/status`);
  },

  // Cancel workflow
  async cancelWorkflow(workflowId: string) {
    return apiRequest(`/workflows/${workflowId}/cancel`, {
      method: 'POST',
    });
  },

  // Get active workflows
  async getActiveWorkflows() {
    return apiRequest('/workflows/active');
  },

  // Get workflow history for a claim
  async getWorkflowHistory(claimId: number) {
    return apiRequest(`/claims/${claimId}/workflow-history`);
  },

  // Update workflow configuration
  async updateWorkflowConfiguration(configuration: any) {
    return apiRequest('/workflows/configuration', {
      method: 'PUT',
      body: JSON.stringify(configuration),
    });
  },

  // Get workflow performance analytics
  async getWorkflowPerformance(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiRequest(`/analytics/workflow-performance?${params}`);
  },
};

// Batch Processing API
export const batchApi = {
  // Create new batch job
  async createBatchJob(data: {
    name: string;
    description: string;
    claimIds?: number[];
    filters?: any;
    configuration?: any;
    metadata?: any;
    createdBy?: string;
  }) {
    return apiRequest('/batch-jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get all batch jobs
  async getBatchJobs() {
    return apiRequest('/batch-jobs');
  },

  // Get specific batch job
  async getBatchJob(batchId: string) {
    return apiRequest(`/batch-jobs/${batchId}`);
  },

  // Start batch job
  async startBatchJob(batchId: string) {
    return apiRequest(`/batch-jobs/${batchId}/start`, {
      method: 'POST',
    });
  },

  // Cancel batch job
  async cancelBatchJob(batchId: string) {
    return apiRequest(`/batch-jobs/${batchId}/cancel`, {
      method: 'POST',
    });
  },

  // Pause batch job
  async pauseBatchJob(batchId: string) {
    return apiRequest(`/batch-jobs/${batchId}/pause`, {
      method: 'POST',
    });
  },

  // Resume batch job
  async resumeBatchJob(batchId: string) {
    return apiRequest(`/batch-jobs/${batchId}/resume`, {
      method: 'POST',
    });
  },

  // Get batch job claims
  async getBatchJobClaims(batchId: string) {
    return apiRequest(`/batch-jobs/${batchId}/claims`);
  },

  // Get batch job errors
  async getBatchJobErrors(batchId: string) {
    return apiRequest(`/batch-jobs/${batchId}/errors`);
  },

  // Get batch performance analytics
  async getBatchAnalytics(days: number = 30) {
    return apiRequest(`/analytics/batch-performance?days=${days}`);
  },

  // Get batch job templates
  async getBatchJobTemplates() {
    return apiRequest('/batch-jobs/templates');
  },
};

// Analytics API
export const analyticsApi = {
  // Generate comprehensive claims analytics
  async generateClaimsAnalytics(data: {
    startDate?: string;
    endDate?: string;
    filters?: any;
  }) {
    return apiRequest('/analytics/claims', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Calculate MLR
  async calculateMLR(data: {
    startDate?: string;
    endDate?: string;
    projectionMonths?: number;
  }) {
    return apiRequest('/analytics/mlr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Generate trend analysis
  async generateTrendAnalysis(data: {
    startDate?: string;
    endDate?: string;
  }) {
    return apiRequest('/analytics/trends', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get performance dashboard
  async getPerformanceDashboard() {
    return apiRequest('/analytics/dashboard');
  },

  // Get volume metrics
  async getVolumeMetrics(params: {
    startDate?: string;
    endDate?: string;
    memberId?: number;
    institutionId?: number;
    benefitId?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });

    return apiRequest(`/analytics/volume?${searchParams}`);
  },

  // Get financial analytics
  async getFinancialAnalytics(params: {
    startDate?: string;
    endDate?: string;
    memberId?: number;
    institutionId?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });

    return apiRequest(`/analytics/financial?${searchParams}`);
  },

  // Get processing analytics
  async getProcessingAnalytics(params: {
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });

    return apiRequest(`/analytics/processing?${searchParams}`);
  },

  // Get member analytics
  async getMemberAnalytics(params: {
    startDate?: string;
    endDate?: string;
    memberId?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });

    return apiRequest(`/analytics/members?${searchParams}`);
  },

  // Get provider analytics
  async getProviderAnalytics(params: {
    startDate?: string;
    endDate?: string;
    institutionId?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });

    return apiRequest(`/analytics/providers?${searchParams}`);
  },

  // Get benefit utilization analytics
  async getBenefitAnalytics(params: {
    startDate?: string;
    endDate?: string;
    benefitId?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });

    return apiRequest(`/analytics/benefits?${searchParams}`);
  },

  // Get comprehensive report
  async getComprehensiveReport(data: {
    startDate?: string;
    endDate?: string;
    includeMLR?: boolean;
    includeTrends?: boolean;
    includeDashboard?: boolean;
    filters?: any;
  }) {
    return apiRequest('/analytics/comprehensive-report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get real-time analytics
  async getRealTimeAnalytics() {
    return apiRequest('/analytics/realtime');
  },

  // Export analytics data
  async exportAnalytics(data: {
    startDate?: string;
    endDate?: string;
    format?: 'json' | 'csv' | 'excel' | 'pdf';
    sections?: string[];
    filters?: any;
  }) {
    return apiRequest('/analytics/export', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Notification API
export const notificationApi = {
  // Send direct notification
  async sendNotification(data: {
    type: 'email' | 'sms' | 'push' | 'in_app' | 'webhook';
    recipient: string;
    recipientType: 'member' | 'provider' | 'administrator' | 'system';
    subject: string;
    message: string;
    data?: any;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    scheduledAt?: string;
  }) {
    return apiRequest('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Send template-based notification
  async sendTemplateNotification(data: {
    templateId: string;
    recipient: string;
    recipientType: 'member' | 'provider' | 'administrator' | 'system';
    variables: any;
    scheduledAt?: string;
  }) {
    return apiRequest('/notifications/send-template', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get notification by ID
  async getNotification(notificationId: string) {
    return apiRequest(`/notifications/${notificationId}`);
  },

  // Get notifications for recipient
  async getNotifications(params: {
    recipient: string;
    recipientType: 'member' | 'provider' | 'administrator' | 'system';
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });

    return apiRequest(`/notifications?${searchParams}`);
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    return apiRequest(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  // Update notification preferences
  async updateNotificationPreferences(userId: number, preferences: any) {
    return apiRequest(`/notifications/preferences/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  },

  // Get notification preferences
  async getNotificationPreferences(userId: number) {
    return apiRequest(`/notifications/preferences/${userId}`);
  },

  // Send claim status update notification
  async sendClaimStatusNotification(claimId: number, oldStatus: string, newStatus: string) {
    return apiRequest(`/notifications/claim-status/${claimId}`, {
      method: 'POST',
      body: JSON.stringify({ oldStatus, newStatus }),
    });
  },

  // Send payment notification
  async sendPaymentNotification(claimId: number, paymentAmount: number, paymentDate: string) {
    return apiRequest(`/notifications/payment/${claimId}`, {
      method: 'POST',
      body: JSON.stringify({ paymentAmount, paymentDate }),
    });
  },

  // Send fraud alert notification
  async sendFraudAlert(claimId: number, riskLevel: string, indicators: string[]) {
    return apiRequest(`/notifications/fraud-alert/${claimId}`, {
      method: 'POST',
      body: JSON.stringify({ riskLevel, indicators }),
    });
  },

  // Get notification analytics
  async getNotificationAnalytics(params: {
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });

    return apiRequest(`/notifications/analytics?${searchParams}`);
  },

  // Get notification templates
  async getNotificationTemplates() {
    return apiRequest('/notifications/templates');
  },

  // Get notification queue status
  async getNotificationQueueStatus() {
    return apiRequest('/notifications/queue-status');
  },

  // Batch send notifications
  async batchSendNotifications(data: {
    notifications?: any[];
    templateId?: string;
    recipients?: any[];
    variables?: any;
    scheduledAt?: string;
  }) {
    return apiRequest('/notifications/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Base Claims API (for CRUD operations)
export const baseClaimsApi = {
  // Get all claims
  async getClaims() {
    return apiRequest('/claims');
  },

  // Get claim by ID
  async getClaim(claimId: number) {
    return apiRequest(`/claims/${claimId}`);
  },

  // Create new claim
  async createClaim(claimData: any) {
    return apiRequest('/claims', {
      method: 'POST',
      body: JSON.stringify(claimData),
    });
  },

  // Update claim
  async updateClaim(claimId: number, claimData: any) {
    return apiRequest(`/claims/${claimId}`, {
      method: 'PUT',
      body: JSON.stringify(claimData),
    });
  },

  // Delete claim
  async deleteClaim(claimId: number) {
    return apiRequest(`/claims/${claimId}`, {
      method: 'DELETE',
    });
  },
};