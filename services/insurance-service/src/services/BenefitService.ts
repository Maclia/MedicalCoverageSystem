import { eq, and, desc, asc, ilike, count, inArray } from 'drizzle-orm';
import { db } from '../config/database';
import { benefits, schemeBenefits, premiumRates, benefitCategoryEnum } from '../models/schema';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse
} from '../utils/api-standardization';

const logger = createLogger();

export interface BenefitData {
  name: string;
  description?: string;
  category: string;
  coverageType?: string;
  isActive: boolean;
  standardLimit?: number;
  standardWaitingPeriod?: number;
  standardCopayment?: number;
  standardDeductible?: number;
  coveragePercentage?: number;
  requiresPreauthorization?: boolean;
  documentationRequired?: string[];
}

export class BenefitService {
  private static instance: BenefitService;

  public static getInstance(): BenefitService {
    if (!BenefitService.instance) {
      BenefitService.instance = new BenefitService();
    }
    return BenefitService.instance;
  }

  private validateBenefitData(data: BenefitData): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Benefit name is required');
    }

    if (data.name.length > config.validation.benefitNameMaxLength) {
      errors.push(`Benefit name cannot exceed ${config.validation.benefitNameMaxLength} characters`);
    }

    if (!data.category) {
      errors.push('Benefit category is required');
    }

    // Validate category is one of the enum values
    const validCategories = [
      'medical', 'dental', 'vision', 'wellness', 'hospital',
      'prescription', 'emergency', 'maternity', 'specialist', 'other'
    ];
    if (!validCategories.includes(data.category)) {
      errors.push(`Invalid benefit category. Must be one of: ${validCategories.join(', ')}`);
    }

    if (data.standardLimit && data.standardLimit < 0) {
      errors.push('Standard limit must be a positive number');
    }

    if (data.standardWaitingPeriod && data.standardWaitingPeriod < 0) {
      errors.push('Standard waiting period must be a positive number');
    }

    if (data.standardCopayment && (data.standardCopayment < 0 || data.standardCopayment > 100)) {
      errors.push('Standard copayment must be between 0 and 100');
    }

    if (data.standardDeductible && data.standardDeductible < 0) {
      errors.push('Standard deductible must be a positive number');
    }

    if (data.coveragePercentage && (data.coveragePercentage < 0 || data.coveragePercentage > 100)) {
      errors.push('Coverage percentage must be between 0 and 100');
    }

    return errors;
  }

  async createBenefit(data: BenefitData, correlationId?: string): Promise<any> {
    try {
      logger.info('Creating new benefit', {
        name: data.name,
        category: data.category,
        correlationId
      });

      // Validate benefit data
      const validationErrors = this.validateBenefitData(data);
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Check for duplicate benefit name
      const existingBenefit = await db
        .select()
        .from(benefits)
        .where(ilike(benefits.name, data.name))
        .limit(1);

      if (existingBenefit.length > 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.CONFLICT,
          'A benefit with this name already exists',
          { name: data.name },
          correlationId
        );
      }

      // Create benefit
      const [newBenefit] = await db
        .insert(benefits)
        .values({
          name: data.name,
          description: data.description,
          category: data.category as any,
          coverageType: data.coverageType,
          isActive: data.isActive,
          standardLimit: data.standardLimit,
          standardWaitingPeriod: data.standardWaitingPeriod,
          standardCopayment: data.standardCopayment,
          standardDeductible: data.standardDeductible,
          coveragePercentage: data.coveragePercentage,
          requiresPreauthorization: data.requiresPreauthorization || false,
          documentationRequired: data.documentationRequired || [],
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      logger.info('Benefit created successfully', {
        benefitId: newBenefit.id,
        name: newBenefit.name,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(newBenefit, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to create benefit', error as Error, {
        benefitName: data.name,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to create benefit',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getBenefit(id: number, correlationId?: string): Promise<any> {
    try {
      const benefit = await db
        .select()
        .from(benefits)
        .where(eq(benefits.id, id))
        .limit(1);

      if (benefit.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Benefit not found',
          { id },
          correlationId
        );
      }

      logger.debug('Benefit retrieved', {
        benefitId: id,
        name: benefit[0].name,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(benefit[0], undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get benefit', error as Error, {
        benefitId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve benefit',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getBenefits(
    filters: {
      category?: string;
      coverageType?: string;
      isActive?: boolean;
      requiresPreauthorization?: boolean;
      search?: string;
    },
    pagination: {
      page: number;
      limit: number;
    },
    correlationId?: string
  ): Promise<any> {
    try {
      let query = db.select().from(benefits);

      // Apply filters
      if (filters.category) {
        query = query.where(eq(benefits.category, filters.category as any));
      }

      if (filters.coverageType) {
        query = query.where(eq(benefits.coverageType, filters.coverageType));
      }

      if (filters.isActive !== undefined) {
        query = query.where(eq(benefits.isActive, filters.isActive));
      }

      if (filters.requiresPreauthorization !== undefined) {
        query = query.where(eq(benefits.requiresPreauthorization, filters.requiresPreauthorization));
      }

      if (filters.search) {
        query = query.where(
          ilike(benefits.name, `%${filters.search}%`)
        );
      }

      // Get total count for pagination
      const totalCountQuery = query;
      const [totalResult] = await totalCountQuery.select({ count: count() });
      const total = totalResult.count;

      // Apply pagination and ordering
      const results = await query
        .orderBy(desc(benefits.createdAt))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit);

      logger.debug('Benefits retrieved', {
        filters,
        pagination,
        total,
        correlationId
      });

      return ResponseFactory.createPaginatedResponse(
        results,
        pagination.page,
        pagination.limit,
        total,
        correlationId
      );

    } catch (error) {
      logger.error('Failed to get benefits', error as Error, {
        filters,
        pagination,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve benefits',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async updateBenefit(id: number, data: Partial<BenefitData>, correlationId?: string): Promise<any> {
    try {
      logger.info('Updating benefit', {
        benefitId: id,
        updates: Object.keys(data),
        correlationId
      });

      // Check if benefit exists
      const existingBenefit = await db
        .select()
        .from(benefits)
        .where(eq(benefits.id, id))
        .limit(1);

      if (existingBenefit.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Benefit not found',
          { id },
          correlationId
        );
      }

      // Validate update data
      const validationErrors = this.validateBenefitData({ ...existingBenefit[0], ...data });
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Check for duplicate benefit name (if name is being changed)
      if (data.name && data.name !== existingBenefit[0].name) {
        const duplicateBenefit = await db
          .select()
          .from(benefits)
          .where(and(
            ilike(benefits.name, data.name),
            // Exclude current benefit from check
          ))
          .limit(1);

        if (duplicateBenefit.length > 0) {
          return ResponseFactory.createErrorResponse(
            ErrorCodes.CONFLICT,
            'A benefit with this name already exists',
            { name: data.name },
            correlationId
          );
        }
      }

      // Update benefit
      const updateData: any = { ...data, updatedAt: new Date() };
      if (data.category) {
        updateData.category = data.category as any;
      }

      const [updatedBenefit] = await db
        .update(benefits)
        .set(updateData)
        .where(eq(benefits.id, id))
        .returning();

      logger.info('Benefit updated successfully', {
        benefitId: id,
        name: updatedBenefit.name,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(updatedBenefit, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to update benefit', error as Error, {
        benefitId: id,
        updates: data,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to update benefit',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async deleteBenefit(id: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Deleting benefit', { benefitId: id, correlationId });

      // Check if benefit exists
      const existingBenefit = await db
        .select()
        .from(benefits)
        .where(eq(benefits.id, id))
        .limit(1);

      if (existingBenefit.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Benefit not found',
          { id },
          correlationId
        );
      }

      // Check if benefit is used in any schemes
      const schemeBenefits = await db
        .select()
        .from(schemeBenefits)
        .where(eq(schemeBenefits.benefitId, id))
        .limit(1);

      if (schemeBenefits.length > 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.CONFLICT,
          'Cannot delete benefit that is used in schemes. Remove from schemes first.',
          { benefitId: id, schemeCount: schemeBenefits.length },
          correlationId
        );
      }

      // Delete benefit
      await db.delete(benefits).where(eq(benefits.id, id));

      logger.info('Benefit deleted successfully', { benefitId: id, correlationId });

      return ResponseFactory.createNoContentResponse(correlationId);

    } catch (error) {
      logger.error('Failed to delete benefit', error as Error, {
        benefitId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to delete benefit',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getBenefitCategories(correlationId?: string): Promise<any> {
    try {
      const categories = [
        { value: 'medical', label: 'Medical' },
        { value: 'dental', label: 'Dental' },
        { value: 'vision', label: 'Vision' },
        { value: 'wellness', label: 'Wellness' },
        { value: 'hospital', label: 'Hospital' },
        { value: 'prescription', label: 'Prescription' },
        { value: 'emergency', label: 'Emergency' },
        { value: 'maternity', label: 'Maternity' },
        { value: 'specialist', label: 'Specialist' },
        { value: 'other', label: 'Other' }
      ];

      // Get usage statistics for each category
      const categoryStats = await db
        .select({
          category: benefits.category,
          count: count(benefits.id)
        })
        .from(benefits)
        .where(eq(benefits.isActive, true))
        .groupBy(benefits.category);

      const result = categories.map(category => ({
        ...category,
        count: categoryStats.find(stat => stat.category === category.value)?.count || 0
      }));

      return ResponseFactory.createSuccessResponse(result, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get benefit categories', error as Error, {
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve benefit categories',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getPopularBenefits(limit: number = 10, correlationId?: string): Promise<any> {
    try {
      // Get benefits most used in schemes
      const popularBenefits = await db
        .select({
          benefit: benefits,
          usageCount: count(schemeBenefits.schemeId)
        })
        .from(benefits)
        .leftJoin(schemeBenefits, eq(benefits.id, schemeBenefits.benefitId))
        .where(eq(benefits.isActive, true))
        .groupBy(benefits.id)
        .orderBy(desc(count(schemeBenefits.schemeId)))
        .limit(limit);

      const result = popularBenefits.map(item => ({
        ...item.benefit,
        usageCount: item.usageCount
      }));

      return ResponseFactory.createSuccessResponse(result, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get popular benefits', error as Error, {
        limit,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve popular benefits',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }
}

export const benefitService = BenefitService.getInstance();