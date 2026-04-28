import { BaseServiceClient } from './BaseServiceClient.js';

export interface PremiumScheme {
  id: string;
  name: string;
  premiumAmount: number;
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  coverageDetails: any;
  status: string;
}

export interface PremiumCollection {
  id: string;
  schemeId: string;
  memberId: string;
  amount: number;
  collectionDate: string;
  status: 'collected' | 'pending' | 'failed';
  transactionId?: string;
}

export interface SchemePremiumStats {
  schemeId: string;
  schemeName: string;
  totalPremiumCollected: number;
  totalMembers: number;
  pendingCollections: number;
  collectionRate: number;
}

class InsuranceServiceClient extends BaseServiceClient {
  protected readonly serviceUrl = process.env.INSURANCE_SERVICE_URL || 'http://localhost:3002';

  constructor() {
    super('insurance-service');
  }

  async getPremiumSchemes(): Promise<PremiumScheme[]> {
    return this.get('/api/schemes');
  }

  async getPremiumCollections(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    schemeId?: string;
  }): Promise<PremiumCollection[]> {
    const queryParams = new URLSearchParams(filters as any).toString();
    return this.get(`/api/premiums/collections${queryParams ? `?${queryParams}` : ''}`);
  }

  async getPremiumStats(dateRange?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalPremiumExpected: number;
    totalPremiumCollected: number;
    collectionRate: number;
    overdueAmount: number;
    activeSchemes: number;
  }> {
    const queryParams = new URLSearchParams(dateRange as any).toString();
    return this.get(`/api/premiums/stats${queryParams ? `?${queryParams}` : ''}`);
  }

  async getSchemePremiumStats(schemeId?: string): Promise<SchemePremiumStats[]> {
    const path = schemeId ? `/api/schemes/${schemeId}/premium-stats` : '/api/schemes/premium-stats';
    return this.get(path);
  }

  async getDailyPremiumSummary(date: string): Promise<{
    date: string;
    expectedCollections: number;
    actualCollections: number;
    totalAmount: number;
    successRate: number;
  }> {
    return this.get(`/api/premiums/summary/${date}`);
  }

  async getCompanyPremiumStats(companyId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalPremiumAllocated: number;
    totalPremiumUtilized: number;
    allocatedPremium: number;
    utilizedPremium: number;
    membersEnrolled: number;
  }> {
    const queryParams = new URLSearchParams(filters as any).toString();
    return this.get(`/api/companies/${companyId}/premium-stats${queryParams ? `?${queryParams}` : ''}`);
  }

  async getCompanySchemeBreakdown(companyId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    schemeId: string;
    schemeName: string;
    allocated: number;
    utilized: number;
    utilizationRate: number;
  }>> {
    const queryParams = new URLSearchParams(filters as any).toString();
    return this.get(`/api/companies/${companyId}/scheme-breakdown${queryParams ? `?${queryParams}` : ''}`);
  }

  async getSchemeDetails(schemeId: string): Promise<any> {
    return this.get(`/api/schemes/${schemeId}`);
  }

  async getSchemeUtilizationBreakdown(schemeId: string): Promise<Array<any>> {
    return this.get(`/api/schemes/${schemeId}/utilization-breakdown`);
  }

  async updateSchemeSetting(schemeId: string, settingKey: string, value: any, userId: number): Promise<boolean> {
    return this.put(`/api/schemes/${schemeId}/settings`, {
      settingKey,
      value,
      userId
    });
  }
}

export const insuranceServiceClient = new InsuranceServiceClient();
export default insuranceServiceClient;