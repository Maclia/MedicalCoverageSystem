import {
  Communication,
  MessageThread,
  NotificationPreference,
  CommunicationTemplate,
  CommunicationCampaign,
  ChatSession,
  Announcement,
  Survey,
  CommunicationDashboard,
  DeliveryReceipt
} from '@shared/types/communication';

const API_BASE = '/api/communication';

class CommunicationApiService {
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

  // Communications
  async getCommunications(options: {
    memberId?: string;
    type?: string;
    status?: string;
    category?: string;
    priority?: string;
    channel?: string;
    direction?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tags?: string[];
  } = {}): Promise<{ data: Communication[]; total: number }> {
    const params = new URLSearchParams();

    if (options.memberId) params.append('memberId', options.memberId);
    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.category) params.append('category', options.category);
    if (options.priority) params.append('priority', options.priority);
    if (options.channel) params.append('channel', options.channel);
    if (options.direction) params.append('direction', options.direction);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options.search) params.append('search', options.search);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom.toISOString());
    if (options.dateTo) params.append('dateTo', options.dateTo.toISOString());
    if (options.tags) options.tags.forEach(tag => params.append('tags', tag));

    const queryString = params.toString();
    const endpoint = `/communications${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getCommunication(id: string): Promise<Communication> {
    return this.request(`/communications/${id}`);
  }

  async createCommunication(data: any): Promise<Communication> {
    return this.request('/communications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCommunication(id: string, updateData: any): Promise<Communication> {
    return this.request(`/communications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteCommunication(id: string): Promise<void> {
    return this.request(`/communications/${id}`, {
      method: 'DELETE',
    });
  }

  async sendCommunication(id: string, scheduledAt?: Date): Promise<any> {
    return this.request(`/communications/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    });
  }

  async scheduleCommunication(id: string, scheduledAt: Date): Promise<any> {
    return this.request(`/communications/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() }),
    });
  }

  // Message Threads
  async getThreads(options: {
    memberId?: string;
    status?: string;
    priority?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<MessageThread[]> {
    const params = new URLSearchParams();

    if (options.memberId) params.append('memberId', options.memberId);
    if (options.status) params.append('status', options.status);
    if (options.priority) params.append('priority', options.priority);
    if (options.category) params.append('category', options.category);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/threads${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getThreadMessages(threadId: string, limit = 50, offset = 0): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const queryString = params.toString();
    const endpoint = `/threads/${threadId}/messages${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async createThread(data: any): Promise<MessageThread> {
    return this.request('/threads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addMessageToThread(threadId: string, messageData: any): Promise<any> {
    return this.request(`/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async updateMessageReadStatus(threadId: string, messageId: string, read: boolean, userId: string): Promise<void> {
    return this.request(`/threads/${threadId}/read`, {
      method: 'PUT',
      body: JSON.stringify({ messageId, read, userId }),
    });
  }

  async getUnreadCount(memberId?: string): Promise<{ unreadCount: number }> {
    const params = new URLSearchParams();
    if (memberId) params.append('memberId', memberId);

    const queryString = params.toString();
    const endpoint = `/unread/count${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async markThreadAsRead(threadId: string, userId: string): Promise<void> {
    return this.request(`/threads/${threadId}/mark-read`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async markThreadAsUnread(threadId: string, userId: string): Promise<void> {
    return this.request(`/threads/${threadId}/mark-unread`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async archiveThread(threadId: string): Promise<void> {
    return this.request(`/threads/${threadId}/archive`, {
      method: 'POST',
    });
  }

  // Notification Preferences
  async getNotificationPreferences(memberId: string): Promise<NotificationPreference[]> {
    return this.request(`/notifications/preferences/${memberId}`);
  }

  async updateNotificationPreferences(memberId: string, preferences: any): Promise<NotificationPreference[]> {
    return this.request(`/notifications/preferences/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Templates
  async getTemplates(options: {
    category?: string;
    type?: string;
    language?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<CommunicationTemplate[]> {
    const params = new URLSearchParams();

    if (options.category) params.append('category', options.category);
    if (options.type) params.append('type', options.type);
    if (options.language) params.append('language', options.language);
    if (options.isActive !== undefined) params.append('isActive', options.isActive.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/templates${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getTemplate(id: string): Promise<CommunicationTemplate | null> {
    return this.request(`/templates/${id}`);
  }

  async createTemplate(data: any): Promise<CommunicationTemplate> {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: string, updateData: any): Promise<CommunicationTemplate> {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async previewTemplate(id: string, variables: Record<string, any>): Promise<any> {
    return this.request(`/templates/${id}/preview`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    });
  }

  // Campaigns
  async getCampaigns(options: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<CommunicationCampaign[]> {
    const params = new URLSearchParams();

    if (options.status) params.append('status', options.status);
    if (options.type) params.append('type', options.type);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/campaigns${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getCampaign(id: string): Promise<CommunicationCampaign | null> {
    return this.request(`/campaigns/${id}`);
  }

  async createCampaign(data: any): Promise<CommunicationCampaign> {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, updateData: any): Promise<CommunicationCampaign> {
    return this.request(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteCampaign(id: string): Promise<void> {
    return this.request(`/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  async launchCampaign(id: string): Promise<any> {
    return this.request(`/campaigns/${id}/launch`, {
      method: 'POST',
    });
  }

  async pauseCampaign(id: string): Promise<any> {
    return this.request(`/campaigns/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeCampaign(id: string): Promise<any> {
    return this.request(`/campaigns/${id}/resume`, {
      method: 'POST',
    });
  }

  async getCampaignMetrics(id: string): Promise<any> {
    return this.request(`/campaigns/${id}/metrics`);
  }

  // Chat Sessions
  async getChatSessions(options: {
    memberId?: string;
    type?: string;
    status?: string;
    priority?: string;
    department?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ChatSession[]> {
    const params = new URLSearchParams();

    if (options.memberId) params.append('memberId', options.memberId);
    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.priority) params.append('priority', options.priority);
    if (options.department) params.append('department', options.department);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/chat/sessions${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    return this.request(`/chat/sessions/${sessionId}`);
  }

  async createChatSession(data: any): Promise<ChatSession> {
    return this.request('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addChatMessage(sessionId: string, messageData: any): Promise<any> {
    return this.request(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async updateChatSession(sessionId: string, updateData: any): Promise<ChatSession> {
    return this.request(`/chat/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async assignChatSession(sessionId: string, assignedTo: string): Promise<ChatSession> {
    return this.request(`/chat/sessions/${sessionId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignedTo }),
    });
  }

  async closeChatSession(sessionId: string, resolution?: string, satisfactionRating?: number): Promise<ChatSession> {
    return this.request(`/chat/sessions/${sessionId}/close`, {
      method: 'POST',
      body: JSON.stringify({ resolution, satisfactionRating }),
    });
  }

  // Announcements
  async getAnnouncements(options: {
    type?: string;
    status?: string;
    visibility?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Announcement[]> {
    const params = new URLSearchParams();

    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.visibility) params.append('visibility', options.visibility);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/announcements${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getAnnouncement(id: string): Promise<Announcement | null> {
    return this.request(`/announcements/${id}`);
  }

  async createAnnouncement(data: any): Promise<Announcement> {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnnouncement(id: string, updateData: any): Promise<Announcement> {
    return this.request(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    return this.request(`/announcements/${id}`, {
      method: 'DELETE',
    });
  }

  async publishAnnouncement(id: string): Promise<any> {
    return this.request(`/announcements/${id}/publish`, {
      method: 'POST',
    });
  }

  // Surveys
  async getSurveys(options: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Survey[]> {
    const params = new URLSearchParams();

    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/surveys${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getSurvey(id: string): Promise<Survey | null> {
    return this.request(`/surveys/${id}`);
  }

  async createSurvey(data: any): Promise<Survey> {
    return this.request('/surveys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSurvey(id: string, updateData: any): Promise<Survey> {
    return this.request(`/surveys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteSurvey(id: string): Promise<void> {
    return this.request(`/surveys/${id}`, {
      method: 'DELETE',
    });
  }

  async launchSurvey(id: string): Promise<any> {
    return this.request(`/surveys/${id}/launch`, {
      method: 'POST',
    });
  }

  async getSurveyResponses(surveyId: string, limit = 50, offset = 0): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const queryString = params.toString();
    const endpoint = `/surveys/${surveyId}/responses${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async submitSurveyResponse(surveyId: string, responseData: any): Promise<any> {
    return this.request(`/surveys/${surveyId}/responses`, {
      method: 'POST',
      body: JSON.stringify(responseData),
    });
  }

  // Dashboard
  async getDashboard(memberId: string): Promise<CommunicationDashboard> {
    return this.request(`/dashboard/${memberId}`);
  }

  // Analytics
  async getAnalytics(options: {
    type?: string;
    period?: string;
    memberId?: string;
    limit?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();

    if (options.type) params.append('type', options.type);
    if (options.period) params.append('period', options.period);
    if (options.memberId) params.append('memberId', options.memberId);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/analytics${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async generateReport(type: string, filters: any, format: string): Promise<any> {
    return this.request('/report', {
      method: 'POST',
      body: JSON.stringify({ type, filters, format }),
    });
  }

  // Delivery Receipts
  async getDeliveryReceipts(communicationId: string): Promise<DeliveryReceipt[]> {
    return this.request(`/delivery-receipts/${communicationId}`);
  }

  async updateDeliveryStatus(receiptData: any): Promise<DeliveryReceipt> {
    return this.request('/delivery-receipts', {
      method: 'POST',
      body: JSON.stringify(receiptData),
    });
  }

  // File Attachments
  async uploadAttachment(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/attachments/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async downloadAttachment(id: string): Promise<any> {
    return this.request(`/attachments/${id}/download`);
  }

  // Settings
  async getSettings(): Promise<any> {
    return this.request('/settings');
  }

  async updateSettings(settingsData: any): Promise<any> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  // Utility Methods
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getSettings();
      return { success: true, message: 'Communication API is connected' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Helper methods for common operations
  getStatusColor(status: string): string {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-emerald-100 text-emerald-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'bounced': return 'bg-red-100 text-red-800';
      case 'spam': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getTypeIcon(type: string): string {
    const iconMap = {
      email: 'Mail',
      sms: 'Phone',
      push: 'Bell',
      in_app: 'Message',
      chat: 'ChatBubble',
      message: 'Message',
      announcement: 'Megaphone'
    };
    return iconMap[type] || 'Message';
  }

  // WebSocket connection for real-time messaging
  connectWebSocket(memberId: string, onMessage: (message: any) => void): WebSocket {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}${window.location.host}/ws/communication/${memberId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for communication');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }

  // Export data for offline use
  async exportCommunications(memberId: string, options: {
    format?: 'csv' | 'json' | 'pdf';
    dateRange?: {
      from: string;
      to: string;
    };
    categories?: string[];
  } = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (options.format) params.append('format', options.format);
    if (options.dateRange) {
      params.append('dateFrom', options.dateRange.from);
      params.append('dateTo', options.dateRange.to);
    }
    if (options.categories) {
      options.categories.forEach(cat => params.append('categories', cat));
    }

    const response = await fetch(`${API_BASE}/export/${memberId}?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Batch operations
  async batchMarkAsRead(threadIds: string[]): Promise<void> {
    return this.request('/threads/batch/mark-read', {
      method: 'POST',
      body: JSON.stringify({ threadIds }),
    });
  }

  async batchArchive(threadIds: string[]): Promise<void> {
    return this.request('/threads/batch/archive', {
      method: 'POST',
      body: JSON.stringify({ threadIds }),
    });
  }

  async batchDeleteCommunications(communicationIds: string[]): Promise<void> {
    return this.request('/communications/batch/delete', {
      method: 'POST',
      body: JSON.stringify({ communicationIds }),
    });
  }

  // Search and filtering
  async searchCommunications(query: string, filters?: any): Promise<{ data: Communication[]; total: number }> {
    const params = new URLSearchParams();
    params.append('search', query);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const endpoint = `/communications/search${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  // Notification helpers
  async sendNotification(memberId: string, notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    priority?: string;
    category?: string;
    channels?: string[];
    data?: any;
  }): Promise<void> {
    return this.request('/notifications/send', {
      method: 'POST',
      body: JSON.stringify({
        memberId,
        notification
      }),
    });
  }

  async sendBulkNotification(memberIds: string[], notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    priority?: string;
    category?: string;
    channels?: string[];
    data?: any;
  }): Promise<void> {
    return this.request('/notifications/bulk-send', {
      method: 'POST',
      body: JSON.stringify({
        memberIds,
        notification
      }),
    });
  }
}

export const communicationApi = new CommunicationApiService();
export default communicationApi;