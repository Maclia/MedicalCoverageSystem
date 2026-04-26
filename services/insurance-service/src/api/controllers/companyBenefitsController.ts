import { Request, Response } from 'express';
import { companyBenefitService } from '../services/CompanyBenefitService.js';
import { WinstonLogger } from '../utils/WinstonLogger.js';

const logger = new WinstonLogger('company-benefits-controller');

/**
 * Company Benefits Controller
 * Handles HTTP request/response formatting for company benefit operations
 * 
 * ✅ Architecture Compliance:
 * - No business logic implemented here
 * - All operations delegated to CompanyBenefitService
 * - Standard response formatting
 * - Proper error handling
 */
export class CompanyBenefitsController {
  /**
   * Get paginated list of company benefits
   */
  static async getCompanyBenefits(req: Request, res: Response) {
    try {
      const correlationId = (req as any).correlationId;
      const result = await companyBenefitService.listCompanyBenefits(req.query, correlationId);
      
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error retrieving company benefits', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve company benefits'
      });
    }
  }

  /**
   * Create new company benefit assignment
   */
  static async createCompanyBenefit(req: Request, res: Response) {
    try {
      const correlationId = (req as any).correlationId;
      const result = await companyBenefitService.createCompanyBenefit(req.body, correlationId);
      
      if (result.success) {
        return res.status(201).json(result);
      }
      
      return res.status(400).json(result);
    } catch (error) {
      logger.error('Error creating company benefit', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to create company benefit'
      });
    }
  }
}