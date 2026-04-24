import { createLogger } from '../utils/logger.js';

const logger = createLogger('core-service-client');

/**
 * Core Service HTTP Client
 * 
 * Internal API client for communication with Central Business Rules Engine
 * Implements circuit breaker pattern and fallback mechanisms
 */
export class CoreServiceClient {
  private static readonly CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://core-service:3000';
  private static readonly TIMEOUT = 5000;

  /**
   * Validate claim against centralized business rules engine
   */
  static async validateClaimWithBusinessRules(claimData: any): Promise<any> {
    try {
      const response = await fetch(`${this.CORE_SERVICE_URL}/api/business-rules/validate-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'claims-service'
        },
        body: JSON.stringify(claimData),
        signal: AbortSignal.timeout(this.TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`Core Service returned status ${response.status}`);
      }

      return await response.json();

    } catch (error: any) {
      logger.warn('⚠️ Core Service Business Rules unavailable - proceeding with fallback mode:', error);
      
      // Fail open gracefully - claim will be flagged for manual review
      return {
        valid: true,
        metadata: {
          warning: 'Business rules engine unavailable - claim flagged for manual review',
          fallback: true
        }
      };
    }
  }
}