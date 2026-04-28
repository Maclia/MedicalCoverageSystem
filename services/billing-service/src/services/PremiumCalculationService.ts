import { createLogger } from '../utils/logger.js';

const logger = createLogger('premium-calculation');

/**
 * FR-21: Premium Buffer & Exclusions Logic
 * Implements premium calculation with safety buffers and exclusion rules
 */
export class PremiumCalculationService {
  private static instance: PremiumCalculationService;
  
  // Premium buffer percentages by risk tier
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

  public static getInstance(): PremiumCalculationService {
    if (!PremiumCalculationService.instance) {
      PremiumCalculationService.instance = new PremiumCalculationService();
    }
    return PremiumCalculationService.instance;
  }

  /**
   * Calculate final premium with applicable buffer
   */
  public calculatePremium(basePremium: number, riskTier: string, claimHistory: any[]): number {
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

      logger.info(`Premium calculated: ${basePremium} -> ${premium} (risk: ${riskTier})`);
      return Math.round(premium * 100) / 100;

    } catch (error) {
      logger.error('Premium calculation failed', { error });
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
}

export default PremiumCalculationService.getInstance();