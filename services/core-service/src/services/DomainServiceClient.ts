import { createLogger } from '../utils/logger.js';

const logger = createLogger('domain-service-client');

/**
 * Domain Service HTTP Client
 * Core Service acts as ORCHESTRATOR only - NO DIRECT DATABASE ACCESS
 * All data is retrieved from respective domain services via API
 * 
 * Reusable across all business rule modules
 */
export class DomainServiceClient {
  static async callService(serviceUrl: string, endpoint: string, data: any): Promise<any> {
    try {
      const response = await fetch(`${serviceUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'core-service'
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(3000)
      });

      return await response.json();
    } catch (error) {
      logger.warn(`Domain service ${serviceUrl} unavailable`, error);
      return { valid: true, fallback: true };
    }
  }

  static async getInsuranceService(): Promise<string> {
    return process.env.INSURANCE_SERVICE_URL || 'http://insurance-service:3002';
  }

  static async getMembershipService(): Promise<string> {
    return process.env.MEMBERSHIP_SERVICE_URL || 'http://membership-service:3003';
  }

  static async getFinanceService(): Promise<string> {
    return process.env.FINANCE_SERVICE_URL || 'http://finance-service:3007';
  }

  static async getBillingService(): Promise<string> {
    return process.env.BILLING_SERVICE_URL || 'http://billing-service:3004';
  }

  static async getClaimsService(): Promise<string> {
    return process.env.CLAIMS_SERVICE_URL || 'http://claims-service:3005';
  }
}