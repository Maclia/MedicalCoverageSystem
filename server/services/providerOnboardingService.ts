// Provider Onboarding Service
// Placeholder implementation to allow server startup

export const providerOnboardingService = {
  async createApplication(data: any) {
    return { success: true, applicationId: Date.now() };
  },

  async getApplication(id: number) {
    return { id, status: 'pending' };
  },

  async updateApplicationStatus(id: number, status: string) {
    return { success: true };
  },

  async getApplications(filters: any) {
    return [];
  },

  async verifyDocument(applicationId: number, documentType: string) {
    return { success: true };
  },

  // New methods for onboarding workflow
  async initiateOnboarding(data: any) {
    return {
      id: Date.now(),
      status: 'in_progress',
      ...data
    };
  },

  async getOnboardingStatus(id: number) {
    return {
      id,
      status: 'in_progress',
      providerName: 'Sample Provider',
      providerType: 'individual',
      contactEmail: 'provider@example.com',
      createdAt: new Date().toISOString()
    };
  },

  async updateOnboarding(id: number, updates: any) {
    return {
      id,
      ...updates
    };
  },

  async completeOnboarding(id: number, data: { completedBy: string; notes: string }) {
    return {
      id,
      status: 'completed',
      completedBy: data.completedBy,
      notes: data.notes,
      completedAt: new Date().toISOString()
    };
  },

  async getPendingOnboarding(filters: {
    providerType?: string;
    status: string;
    limit: number;
    offset: number;
  }) {
    return {
      onboarding: [],
      total: 0,
      limit: filters.limit,
      offset: filters.offset
    };
  },

  async uploadDocument(data: {
    onboardingId: number;
    documentType: string;
    fileName?: string;
    fileUrl: string;
    uploadedBy?: string;
  }) {
    return {
      id: Date.now(),
      ...data,
      uploadedAt: new Date().toISOString(),
      verified: false
    };
  },

  async getOnboardingDocuments(onboardingId: number) {
    return [];
  },

  async getOnboardingChecklist(onboardingId: number) {
    return [];
  },

  async updateChecklistItem(onboardingId: number, itemId: number, data: {
    completed: boolean;
    completedBy?: string;
    notes?: string;
  }) {
    return {
      id: itemId,
      onboardingId,
      ...data,
      updatedAt: new Date().toISOString()
    };
  }
};