import { BaseServiceClient } from './BaseServiceClient.js';
import { CardTransaction, CardTransactionSummary } from '../types/index.js';

class CoreServiceClient extends BaseServiceClient {
  protected readonly serviceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3001';

  constructor() {
    super('core-service');
  }

  async getCardTransactions(filters?: {
    companyId?: string;
    cardId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    transactionType?: string;
  }): Promise<CardTransaction[]> {
    const queryParams = new URLSearchParams(filters as any).toString();
    return this.get(`/api/cards/transactions${queryParams ? `?${queryParams}` : ''}`);
  }

  async getCardTransactionSummary(filters?: {
    companyId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CardTransactionSummary> {
    const queryParams = new URLSearchParams(filters as any).toString();
    return this.get(`/api/cards/transactions/summary${queryParams ? `?${queryParams}` : ''}`);
  }

  async getCompanyCardStats(companyId: string): Promise<{
    activeCards: number;
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
  }> {
    return this.get(`/api/cards/companies/${companyId}/stats`);
  }
}

export const coreServiceClient = new CoreServiceClient();
export default coreServiceClient;