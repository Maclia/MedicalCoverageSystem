import { BaseServiceClient } from './BaseServiceClient';

export interface FraudRiskAssessment {
  transactionId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  fraudIndicators: string[];
  recommendations: string[];
  processedAt: Date;
}

export interface FraudTransactionEvent {
  transactionId: string;
  type: 'payment' | 'refund' | 'credit' | 'balance_adjustment';
  amount: number;
  currency: string;
  companyId: string;
  userId?: string;
  metadata: Record<string, unknown>;
  sourceIp?: string;
  userAgent?: string;
}

export class FraudDetectionServiceClient extends BaseServiceClient {
  protected readonly serviceUrl: string;

  constructor() {
    super('fraud-detection-service');
    this.serviceUrl = process.env.FRAUD_DETECTION_SERVICE_URL || 'http://localhost:3009';
  }

  /**
   * Submit a transaction for fraud risk analysis
   */
  async analyzeTransaction(event: FraudTransactionEvent): Promise<FraudRiskAssessment | null> {
    try {
      this.logger.debug('Submitting transaction for fraud analysis', { transactionId: event.transactionId });

      const response = await this.post<FraudRiskAssessment>('/api/fraud/analyze', event);

      this.logger.info('Fraud analysis completed', {
        transactionId: event.transactionId,
        riskScore: response.riskScore,
        riskLevel: response.riskLevel
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to submit transaction for fraud analysis', {
        transactionId: event.transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Graceful degradation - return null on service failure
      return null;
    }
  }

  /**
   * Get risk assessment for an existing transaction
   */
  async getTransactionRisk(transactionId: string): Promise<FraudRiskAssessment | null> {
    try {
      return await this.get<FraudRiskAssessment>(`/api/fraud/transactions/${transactionId}/risk`);
    } catch (error) {
      this.logger.error('Failed to get transaction risk assessment', {
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get company risk profile
   */
  async getCompanyRiskProfile(companyId: string): Promise<{
    companyId: string;
    overallRiskScore: number;
    suspiciousTransactionCount: number;
    lastFlaggedAt: Date | null;
  } | null> {
    try {
      return await this.get(`/api/fraud/companies/${companyId}/profile`);
    } catch (error) {
      this.logger.error('Failed to get company risk profile', {
        companyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Report confirmed fraudulent transaction
   */
  async reportFraudulentTransaction(transactionId: string, reason: string): Promise<boolean> {
    try {
      await this.post(`/api/fraud/transactions/${transactionId}/report`, { reason });
      this.logger.info('Reported fraudulent transaction', { transactionId, reason });
      return true;
    } catch (error) {
      this.logger.error('Failed to report fraudulent transaction', {
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

export const fraudDetectionServiceClient = new FraudDetectionServiceClient();