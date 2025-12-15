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
  }
};