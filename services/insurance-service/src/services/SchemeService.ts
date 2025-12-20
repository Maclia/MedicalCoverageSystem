import { eq, and, desc, asc, ilike, count, gte, lte } from 'drizzle-orm';
import { db } from '../config/database';
import { companies, schemes, schemeBenefits, benefits, premiumRates } from '../models/schema';
import { config } from '../config';
import { createLogger, generateCorrelationId } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createBusinessRuleErrorResponse,
  createValidationErrorResponse
} from '../utils/api-standardization';

const logger = createLogger();

export interface SchemeData {
  name: string;
  description?: string;
  companyId: number;
  schemeType: string;
  coverageType: string;
  minAge: number;
  maxAge: number;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  premiumCalculationMethod?: string;
  customRules?: Record<string, any>;
}

export interface SchemeBenefitData {
  schemeId: number;
  benefitId: number;
  coverageLimit?: number;
  waitingPeriod?: number;
  copayment?: number;
  deductible?: number;
  coveragePercentage?: number;
  annualLimit?: number;
  isActive: boolean;
}

export class SchemeService {
  private static instance: SchemeService;

  public static getInstance(): SchemeService {
    if (!SchemeService.instance) {
      SchemeService.instance = new SchemeService();
    }
    return SchemeService.instance;
  }

  private async validateCompanyExists(companyId: number): Promise<boolean> {
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    return company.length > 0;
  }

  private validateSchemeData(data: SchemeData): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Scheme name is required');
    }

    if (data.name.length > config.validation.schemeNameMaxLength) {
      errors.push(`Scheme name cannot exceed ${config.validation.schemeNameMaxLength} characters`);
    }

    if (data.description && data.description.length > config.validation.schemeDescriptionMaxLength) {
      errors.push(`Scheme description cannot exceed ${config.validation.schemeDescriptionMaxLength} characters`);
    }

    if (data.minAge < 0 || data.minAge > 120) {
      errors.push('Minimum age must be between 0 and 120');
    }

    if (data.maxAge < 0 || data.maxAge > 120) {
      errors.push('Maximum age must be between 0 and 120');
    }

    if (data.minAge >= data.maxAge) {
      errors.push('Minimum age must be less than maximum age');
    }

    if (data.startDate >= (data.endDate || new Date('2099-12-31'))) {
      errors.push('Start date must be before end date');
    }

    if (new Date(data.startDate) < new Date()) {
      errors.push('Start date cannot be in the past');
    }

    return errors;
  }

  async createScheme(data: SchemeData, correlationId?: string): Promise<any> {
    try {
      logger.info('Creating new scheme', {
        name: data.name,
        companyId: data.companyId,
        correlationId
      });

      // Validate company exists
      const companyExists = await this.validateCompanyExists(data.companyId);
      if (!companyExists) {
        throw new Error(`Company with ID ${data.companyId} does not exist`);
      }

      // Validate scheme data
      const validationErrors = this.validateSchemeData(data);
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Check for duplicate scheme name within company
      const existingScheme = await db
        .select()
        .from(schemes)
        .where(and(
          eq(schemes.companyId, data.companyId),
          ilike(schemes.name, data.name)
        ))
        .limit(1);

      if (existingScheme.length > 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.CONFLICT,
          'A scheme with this name already exists for this company',
          { name: data.name, companyId: data.companyId },
          correlationId
        );
      }

      // Create scheme
      const [newScheme] = await db
        .insert(schemes)
        .values({
          name: data.name,
          description: data.description,
          companyId: data.companyId,
          schemeType: data.schemeType,
          coverageType: data.coverageType,
          minAge: data.minAge,
          maxAge: data.maxAge,
          isActive: data.isActive,
          startDate: data.startDate,
          endDate: data.endDate,
          premiumCalculationMethod: data.premiumCalculationMethod,
          customRules: data.customRules,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      logger.info('Scheme created successfully', {
        schemeId: newScheme.id,
        name: newScheme.name,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(newScheme, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to create scheme', error as Error, {
        schemeName: data.name,
        companyId: data.companyId,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to create scheme',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getScheme(id: number, correlationId?: string): Promise<any> {
    try {
      const scheme = await db
        .select({
          scheme: schemes,
          company: {
            id: companies.id,
            name: companies.name,
            registrationNumber: companies.registrationNumber
          }
        })
        .from(schemes)
        .leftJoin(companies, eq(schemes.companyId, companies.id))
        .where(eq(schemes.id, id))
        .limit(1);

      if (scheme.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Scheme not found',
          { id },
          correlationId
        );
      }

      // Get scheme benefits
      const benefits = await db
        .select({
          benefit: benefits,
          schemeBenefit: schemeBenefits
        })
        .from(schemeBenefits)
        .leftJoin(benefits, eq(schemeBenefits.benefitId, benefits.id))
        .where(eq(schemeBenefits.schemeId, id));

      const result = {
        ...scheme[0],
        benefits: benefits.map(b => ({
          ...b.benefit,
          ...b.schemeBenefit
        }))
      };

      logger.debug('Scheme retrieved', {
        schemeId: id,
        name: result.scheme.name,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(result, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get scheme', error as Error, {
        schemeId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve scheme',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getSchemes(
    filters: {
      companyId?: number;
      schemeType?: string;
      coverageType?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination: {
      page: number;
      limit: number;
    },
    correlationId?: string
  ): Promise<any> {
    try {
      let query = db
        .select({
          scheme: schemes,
          company: {
            id: companies.id,
            name: companies.name
          }
        })
        .from(schemes)
        .leftJoin(companies, eq(schemes.companyId, companies.id));

      // Apply filters
      if (filters.companyId) {
        query = query.where(eq(schemes.companyId, filters.companyId));
      }

      if (filters.schemeType) {
        query = query.where(eq(schemes.schemeType, filters.schemeType));
      }

      if (filters.coverageType) {
        query = query.where(eq(schemes.coverageType, filters.coverageType));
      }

      if (filters.isActive !== undefined) {
        query = query.where(eq(schemes.isActive, filters.isActive));
      }

      if (filters.search) {
        query = query.where(ilike(schemes.name, `%${filters.search}%`));
      }

      // Get total count for pagination
      const totalCountQuery = query;
      const [totalResult] = await totalCountQuery.select({ count: count() });
      const total = totalResult.count;

      // Apply pagination and ordering
      const results = await query
        .orderBy(desc(schemes.createdAt))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit);

      logger.debug('Schemes retrieved', {
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
      logger.error('Failed to get schemes', error as Error, {
        filters,
        pagination,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve schemes',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async updateScheme(id: number, data: Partial<SchemeData>, correlationId?: string): Promise<any> {
    try {
      logger.info('Updating scheme', {
        schemeId: id,
        updates: Object.keys(data),
        correlationId
      });

      // Check if scheme exists
      const existingScheme = await db
        .select()
        .from(schemes)
        .where(eq(schemes.id, id))
        .limit(1);

      if (existingScheme.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Scheme not found',
          { id },
          correlationId
        );
      }

      // Validate update data
      const validationErrors = this.validateSchemeData({ ...existingScheme[0], ...data });
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Check for duplicate scheme name (if name is being changed)
      if (data.name && data.name !== existingScheme[0].name) {
        const duplicateScheme = await db
          .select()
          .from(schemes)
          .where(and(
            eq(schemes.companyId, existingScheme[0].companyId),
            eq(schemes.name, data.name),
            // Exclude current scheme from check
            // This would need to be adjusted based on your database
          ))
          .limit(1);

        if (duplicateScheme.length > 0) {
          return ResponseFactory.createErrorResponse(
            ErrorCodes.CONFLICT,
            'A scheme with this name already exists for this company',
            { name: data.name },
            correlationId
          );
        }
      }

      // Update scheme
      const [updatedScheme] = await db
        .update(schemes)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(schemes.id, id))
        .returning();

      logger.info('Scheme updated successfully', {
        schemeId: id,
        name: updatedScheme.name,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(updatedScheme, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to update scheme', error as Error, {
        schemeId: id,
        updates: data,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to update scheme',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async deleteScheme(id: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Deleting scheme', { schemeId: id, correlationId });

      // Check if scheme exists
      const existingScheme = await db
        .select()
        .from(schemes)
        .where(eq(schemes.id, id))
        .limit(1);

      if (existingScheme.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Scheme not found',
          { id },
          correlationId
        );
      }

      // Check if scheme has active members or dependencies
      const schemeBenefits = await db
        .select()
        .from(schemeBenefits)
        .where(eq(schemeBenefits.schemeId, id))
        .limit(1);

      // In a real implementation, you'd check for active members too
      if (schemeBenefits.length > 0) {
        return createBusinessRuleErrorResponse(
          'SCHEME_HAS_DEPENDENCIES',
          'Cannot delete scheme with existing benefits. Remove benefits first.',
          { benefitCount: schemeBenefits.length },
          correlationId
        );
      }

      // Delete scheme
      await db.delete(schemes).where(eq(schemes.id, id));

      logger.info('Scheme deleted successfully', { schemeId: id, correlationId });

      return ResponseFactory.createNoContentResponse(correlationId);

    } catch (error) {
      logger.error('Failed to delete scheme', error as Error, {
        schemeId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to delete scheme',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async addBenefitToScheme(schemeId: number, benefitData: SchemeBenefitData, correlationId?: string): Promise<any> {
    try {
      logger.info('Adding benefit to scheme', {
        schemeId,
        benefitId: benefitData.benefitId,
        correlationId
      });

      // Validate scheme exists
      const scheme = await db
        .select()
        .from(schemes)
        .where(eq(schemes.id, schemeId))
        .limit(1);

      if (scheme.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Scheme not found',
          { schemeId },
          correlationId
        );
      }

      // Validate benefit exists
      const benefit = await db
        .select()
        .from(benefits)
        .where(eq(benefits.id, benefitData.benefitId))
        .limit(1);

      if (benefit.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Benefit not found',
          { benefitId: benefitData.benefitId },
          correlationId
        );
      }

      // Check if benefit already exists in scheme
      const existingMapping = await db
        .select()
        .from(schemeBenefits)
        .where(and(
          eq(schemeBenefits.schemeId, schemeId),
          eq(schemeBenefits.benefitId, benefitData.benefitId)
        ))
        .limit(1);

      if (existingMapping.length > 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.CONFLICT,
          'Benefit already exists in scheme',
          { schemeId, benefitId: benefitData.benefitId },
          correlationId
        );
      }

      // Add benefit to scheme
      const [schemeBenefit] = await db
        .insert(schemeBenefits)
        .values({
          schemeId,
          benefitId: benefitData.benefitId,
          coverageLimit: benefitData.coverageLimit,
          waitingPeriod: benefitData.waitingPeriod,
          copayment: benefitData.copayment,
          deductible: benefitData.deductible,
          coveragePercentage: benefitData.coveragePercentage,
          annualLimit: benefitData.annualLimit,
          isActive: benefitData.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      logger.info('Benefit added to scheme successfully', {
        schemeId,
        benefitId: benefitData.benefitId,
        mappingId: schemeBenefit.id,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(schemeBenefit, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to add benefit to scheme', error as Error, {
        schemeId,
        benefitId: benefitData.benefitId,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to add benefit to scheme',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async removeBenefitFromScheme(schemeId: number, benefitId: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Removing benefit from scheme', {
        schemeId,
        benefitId,
        correlationId
      });

      // Check if mapping exists
      const existingMapping = await db
        .select()
        .from(schemeBenefits)
        .where(and(
          eq(schemeBenefits.schemeId, schemeId),
          eq(schemeBenefits.benefitId, benefitId)
        ))
        .limit(1);

      if (existingMapping.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Benefit not found in scheme',
          { schemeId, benefitId },
          correlationId
        );
      }

      // Remove benefit from scheme
      await db
        .delete(schemeBenefits)
        .where(and(
          eq(schemeBenefits.schemeId, schemeId),
          eq(schemeBenefits.benefitId, benefitId)
        ));

      logger.info('Benefit removed from scheme successfully', {
        schemeId,
        benefitId,
        correlationId
      });

      return ResponseFactory.createNoContentResponse(correlationId);

    } catch (error) {
      logger.error('Failed to remove benefit from scheme', error as Error, {
        schemeId,
        benefitId,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to remove benefit from scheme',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }
}

export const schemeService = SchemeService.getInstance();