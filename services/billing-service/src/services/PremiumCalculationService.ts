import { createLogger } from '../utils/logger.js';
import { httpClient } from '../../../shared/service-communication/src/HttpClient.js';

const logger = createLogger('premium-calculation');

export interface PremiumCalculationInput {
  age: number;
  gender: 'MALE' | 'FEMALE';
  regionCode: string;
  coverLimit: number;
  coverType: string;
  riskCode: string;
  lifestyleCode: string;
  familySize: number;
  outpatientLimit?: number;
  schemeId?: string;
}

export interface CalculationStep {
  step: string;
  description: string;
  value: number;
  factor?: number;
  result: number;
}

export interface PremiumCalculationResult {
  basePremium: number;
  finalPremium: number;
  breakdown: CalculationStep[];
  rateTableId: string;
  calculationDate: Date;
}

/**
 * Premium Calculation Service Client Adapter
 * 
 * Delegates all premium calculation logic to the standalone premium-calculation-service
 * Maintains backwards compatible interface for existing billing service usage
 * Implements circuit breaker, retries and proper error handling
 */
export class PremiumCalculationService {
  private static instance: PremiumCalculationService;
  private readonly httpClient: typeof httpClient;
  private readonly serviceUrl: string;
  
  // Premium buffer percentages by risk tier (maintained for backward compatibility)
  private readonly PREMIUM_BUFFERS = {
    LOW: 0.05,      // 5% buffer
    MEDIUM: 0.10,    // 10% buffer
    HIGH: 0.15,      // 15% buffer
    CRITICAL: 0.25   // 25% buffer
  };

  // Excluded procedures that do not attract premium loading
  private readonly EXCLUDED_PROCEDURES = [
    'PREVENTIVE_CARE',
    'VACCINATION',
    'SCREENING',
    'ANNUAL_CHECKUP',
    'MATERNITY_BASIC'
  ];

  private constructor() {
    this.httpClient = httpClient;
  }

  public static getInstance(): PremiumCalculationService {
    if (!PremiumCalculationService.instance) {
      PremiumCalculationService.instance = new PremiumCalculationService();
    }
    return PremiumCalculationService.instance;
  }

  /**
   * Calculate final premium by calling standalone premium calculation service
   */
  public async calculatePremium(input: PremiumCalculationInput): Promise<PremiumCalculationResult> {
    try {
      logger.info(`Calling premium calculation service`, { 
        age: input.age, 
        regionCode: input.regionCode,
        coverLimit: input.coverLimit 
      });

      const response = await this.httpClient.post<PremiumCalculationResult>('premium-calculation-service', '/calculate', input, {
        timeout: 5000,
        retries: 3
      });

      logger.info(`Premium calculation succeeded: ${response.data.basePremium} -> ${response.data.finalPremium}`);
      return response.data;

    } catch (error) {
      logger.error('Premium calculation service call failed', { error, input });
      throw new Error(`Premium calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * @deprecated Use calculatePremium() with full input parameters
   * Legacy method maintained for backward compatibility
   */
  public calculatePremiumLegacy(basePremium: number, riskTier: string, claimHistory: any[]): number {
    try {
      let premium = basePremium;
      
      // Apply risk tier buffer
      const buffer = this.PREMIUM_BUFFERS[riskTier as keyof typeof this.PREMIUM_BUFFERS] || 0.10;
      premium = premium * (1 + buffer);

      // Apply claim history loading
      const claimCount = claimHistory.length;
      if (claimCount > 3) {
        premium = premium * (1 + (claimCount * 0.02)); // 2% per additional claim
      }

      logger.info(`Legacy premium calculated: ${basePremium} -> ${premium} (risk: ${riskTier})`);
      return Math.round(premium * 100) / 100;

    } catch (error) {
      logger.error('Legacy premium calculation failed', { error });
      throw error;
    }
  }

  /**
   * Check if procedure is excluded from premium loading
   */
  public isProcedureExcluded(procedureType: string): boolean {
    return this.EXCLUDED_PROCEDURES.includes(procedureType);
  }

  /**
   * Calculate prorated premium for mid-term additions
   */
  public calculateProratedPremium(fullPremium: number, remainingDays: number, totalDays: number): number {
    const ratio = remainingDays / totalDays;
    return Math.round(fullPremium * ratio * 100) / 100;
  }

  /**
   * Get current active rate table version
   */
  public async getActiveRateTable(): Promise<any> {
    const response = await this.httpClient.get('premium-calculation-service', '/rate-table/active');
    return response.data;
  }

  /**
   * Get calculation history for audit
   */
  public async getCalculationHistory(calculationId: string): Promise<PremiumCalculationResult> {
    const response = await this.httpClient.get<PremiumCalculationResult>('premium-calculation-service', `/history/${calculationId}`);
    return response.data;
  }
}

export default PremiumCalculationService.getInstance();