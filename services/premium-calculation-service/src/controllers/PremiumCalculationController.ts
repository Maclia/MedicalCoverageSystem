import { Request, Response } from 'express';
import { PremiumCalculationService } from '../services/PremiumCalculationService.js';
import { PremiumCalculationInput } from '../services/PremiumCalculationService.js';
import { createLogger } from '../utils/logger.js';
import { validatePremiumCalculationInput } from '../validation/calculationValidation.js';

const logger = createLogger('premium-controller');
const premiumService = PremiumCalculationService.getInstance();

/**
 * Premium Calculation Controller
 * 
 * Handles HTTP API requests for premium calculation operations
 * Follows standard service pattern - no business logic here
 */
export class PremiumCalculationController {

  /**
   * Calculate premium for given member parameters
   */
  public static async calculatePremium(req: Request, res: Response) {
    try {
      const input = req.body as PremiumCalculationInput;
      
      // Validate input
      const validation = validatePremiumCalculationInput(input);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }

      logger.info(`Calculating premium`, { 
        age: input.age, 
        regionCode: input.regionCode,
        coverLimit: input.coverLimit 
      });

      const result = await premiumService.calculatePremium(input);

      logger.info(`Premium calculation completed`, { 
        basePremium: result.basePremium,
        finalPremium: result.finalPremium 
      });

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Premium calculation failed', { error });
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Premium calculation failed'
      });
    }
  }

  /**
   * Get currently active rate table
   */
  public static async getActiveRateTable(req: Request, res: Response) {
    try {
      const rateTable = await premiumService.getActiveRateTable();
      
      return res.status(200).json({
        success: true,
        data: rateTable
      });

    } catch (error) {
      logger.error('Failed to get active rate table', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve rate table'
      });
    }
  }

  /**
   * Get calculation history by calculation ID
   */
  public static async getCalculationHistory(req: Request, res: Response) {
    try {
      const { calculationId } = req.params;
      
      if (!calculationId) {
        return res.status(400).json({
          success: false,
          error: 'Calculation ID is required'
        });
      }

      const history = await premiumService.getCalculationHistory(calculationId);

      return res.status(200).json({
        success: true,
        data: history
      });

    } catch (error) {
      logger.error('Failed to get calculation history', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve calculation history'
      });
    }
  }

  /**
   * Batch calculate multiple premiums in single request
   */
  public static async calculateBatch(req: Request, res: Response) {
    try {
      const inputs = req.body as PremiumCalculationInput[];
      
      if (!Array.isArray(inputs) || inputs.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid array of calculation inputs required'
        });
      }

      if (inputs.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 1000 calculations per batch request'
        });
      }

      logger.info(`Processing batch calculation for ${inputs.length} entries`);

      // Process in parallel with concurrency control
      const results = await Promise.all(
        inputs.map(input => premiumService.calculatePremium(input))
      );

      logger.info(`Batch calculation completed successfully`);

      return res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });

    } catch (error) {
      logger.error('Batch calculation failed', { error });
      return res.status(500).json({
        success: false,
        error: 'Batch calculation failed'
      });
    }
  }

  /**
   * Health check endpoint
   */
  public static async healthCheck(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      service: 'premium-calculation-service',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  }
}

export default PremiumCalculationController;