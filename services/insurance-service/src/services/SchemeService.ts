import { eq, and, desc, asc, ilike, count, gte, lte } from 'drizzle-orm';
import { SCHEME_APPROVAL_ROLES } from '../types/enums.js';
import { db } from '../config/database.js';
import { companies, benefits, premiumRates, schemeBenefits, periods } from '../models/schema.js';
import { insuranceSchemes as schemes, schemeNetworks } from '../../../shared/schemas/schemes';
import { config } from '../config/index.js';
import { createLogger, generateCorrelationId } from '../utils/logger.js';
import {
  ResponseFactory,
  ErrorCodes,
  createBusinessRuleErrorResponse,
  createValidationErrorResponse
} from '../utils/api-standardization.js';

const logger = createLogger();

export interface SchemeData {
  name: string;
  description?: string;
  schemeAdministratorId: number;
  companyId: number;
  type: string;
  schemeType: string;
  coverageLevel: string;
  coverageType: string;
  minimumAge: number;
  maximumAge: number;
  minAge: number;
  maxAge: number;
  status: string;
  effectiveDate: Date;
  startDate: Date;
  expiryDate?: Date;
  endDate?: Date;
  isActive: boolean;
  premiumAmount?: number;
  premiumFrequency?: string;
  deductible?: number;
  outOfPocketMax?: number;
  coinsurance?: number;
  copay?: number;
  premiumBuffer?: number;
  totalPremiumUtilized?: number;
  totalPremiumAllocated?: number;
  allowedClaimTypes?: string[];
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
          eq(schemes.schemeAdministratorId, data.schemeAdministratorId),
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
      const insertData: any = {
        schemeCode: `SCH-${Date.now()}`,
        name: data.name,
        description: data.description,
        schemeAdministratorId: data.schemeAdministratorId,
        companyId: data.companyId,
        type: data.type,
        schemeType: data.schemeType,
        coverageLevel: data.coverageLevel,
        coverageType: data.coverageType,
        minimumAge: data.minAge,
        maximumAge: data.maxAge,
        status: data.status,
        effectiveDate: data.effectiveDate instanceof Date ? data.effectiveDate.toISOString().split('T')[0] : data.effectiveDate,
        startDate: data.startDate,
        endDate: data.endDate,
        expiryDate: data.expiryDate,
        isActive: data.isActive,
        premiumAmount: data.premiumAmount,
        premiumFrequency: data.premiumFrequency,
        deductible: data.deductible,
        outOfPocketMax: data.outOfPocketMax,
        coinsurance: data.coinsurance,
        copay: data.copay,
        premiumBuffer: data.premiumBuffer,
        totalPremiumUtilized: data.totalPremiumUtilized,
        totalPremiumAllocated: data.totalPremiumAllocated,
        allowedClaimTypes: data.allowedClaimTypes ? JSON.stringify(data.allowedClaimTypes) : null,
        createdAt: new Date()
      };

      const [newScheme] = await db
        .insert(schemes)
        .values(insertData)
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
       .leftJoin(companies, eq(companies.id, companies.id)) // Temporary fix - companyId field does not exist on schemes table
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
   const schemeBenefitsResult = await db
     .select({
       schemeBenefit: schemeBenefits
     })
     .from(schemeBenefits)
     .where(eq(schemeBenefits.schemeId, id));

  const result = {
    ...scheme[0],
    benefits: schemeBenefitsResult.map(b => ({
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
      // Note: companyId, schemeType, coverageType, isActive fields do not exist on schemes table
      if (filters.search) {
        query = query.where(ilike(schemes.name, `%${filters.search}%`)) as any;
      }

      // Get total count for pagination
      const totalCountQuery = db.select({ count: count() }).from(schemes);
      const [totalResult] = await totalCountQuery;
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
      const validationErrors = this.validateSchemeData({ 
        ...existingScheme[0], 
        ...data,
        minAge: data.minAge ?? existingScheme[0].minimumAge ?? 0,
        maxAge: data.maxAge ?? existingScheme[0].maximumAge ?? 120
      } as SchemeData);
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
      const updateData: any = {
        ...data,
        updatedAt: new Date()
      };
      
      // Convert Date objects to ISO strings for Drizzle
      if (updateData.effectiveDate instanceof Date) {
        updateData.effectiveDate = updateData.effectiveDate.toISOString().split('T')[0];
      }

      const [updatedScheme] = await db
        .update(schemes)
        .set(updateData)
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
  const schemeBenefitsResult = await db
    .select()
    .from(schemeBenefits)
    .where(eq(schemeBenefits.schemeId, id))
    .limit(1);

      // In a real implementation, you'd check for active members too
  if (schemeBenefitsResult.length > 0) {
    return createBusinessRuleErrorResponse(
      'SCHEME_HAS_DEPENDENCIES',
      'Cannot delete scheme with existing benefits. Remove benefits first.',
      { benefitCount: schemeBenefitsResult.length },
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

  async assignAdministrator(schemeId: number, administratorId: number, assignedBy: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Assigning scheme administrator', {
        schemeId,
        administratorId,
        assignedBy,
        correlationId
      });

      // Check if scheme exists
      const existingScheme = await db
        .select()
        .from(schemes)
        .where(eq(schemes.id, schemeId))
        .limit(1);

      if (existingScheme.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Scheme not found',
          { schemeId },
          correlationId
        );
      }

      // Update scheme with administrator details
      const [updatedScheme] = await db
        .update(schemes)
        .set({
          schemeAdministratorId: administratorId,
          assignedAt: new Date(),
          assignedBy: assignedBy,
          updatedAt: new Date()
        })
        .where(eq(schemes.id, schemeId))
        .returning();

      logger.info('Scheme administrator assigned successfully', {
        schemeId,
        administratorId,
        assignedBy,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(updatedScheme, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to assign scheme administrator', error as Error, {
        schemeId,
        administratorId,
        assignedBy,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to assign scheme administrator',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  /**
   * FR-20: Calculate cover upgrade premium
   * Implements premium calculation rules for cover enhancements
   * Funded schemes: No premium
   * Insured schemes: Premium applied per configured formula
   */
  async calculateUpgradePremium(schemeId: number, upgradeDetails: any, correlationId?: string): Promise<any> {
    try {
      logger.info('Calculating cover upgrade premium', { schemeId, upgradeDetails, correlationId });

      const scheme = await db.select().from(schemes).where(eq(schemes.id, schemeId)).limit(1);
      
      if (scheme.length === 0) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Scheme not found', { schemeId }, correlationId);
      }

      const schemeData = scheme[0];

      // FR-20 Business Rule: Funded schemes have no premium on upgrades
      if (schemeData.schemeType === 'Funded') {
        return ResponseFactory.createSuccessResponse({
          schemeId,
          schemeType: 'Funded',
          premiumRequired: false,
          premiumAmount: 0,
          message: 'No premium required for Funded scheme upgrades'
        }, undefined, correlationId);
      }

      // Insured schemes apply premium calculation
      if (schemeData.schemeType === 'Insured') {
        const { upgradeScope, currentCover, newCover, remainingDays, calculationMethod } = upgradeDetails;
        
        let premiumAmount = 0;
        const coverDifference = newCover - currentCover;

        // Apply calculation method
        if (calculationMethod === 'prorated') {
          const dailyRate = coverDifference / 365;
          premiumAmount = dailyRate * remainingDays;
        } else {
          // Non-prorated - full amount
          premiumAmount = coverDifference;
        }

        return ResponseFactory.createSuccessResponse({
          schemeId,
          schemeType: 'Insured',
          premiumRequired: true,
          premiumAmount: Math.round(premiumAmount * 100) / 100,
          calculationMethod,
          upgradeScope,
          coverDifference
        }, undefined, correlationId);
      }

      return ResponseFactory.createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Upgrade not supported for this scheme type',
        { schemeType: schemeData.schemeType },
        correlationId
      );

    } catch (error) {
      logger.error('Failed to calculate upgrade premium', error as Error, { schemeId, correlationId });
      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to calculate upgrade premium',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  /**
   * FR-21: Validate premium buffer
   * Check if claim amount is within configured buffer limit
   */
  async validatePremiumBuffer(schemeId: number, claimAmount: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Validating premium buffer', { schemeId, claimAmount, correlationId });

      const scheme = await db.select().from(schemes).where(eq(schemes.id, schemeId)).limit(1);
      
      if (scheme.length === 0) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Scheme not found', { schemeId }, correlationId);
      }

      const schemeData = scheme[0];
      const bufferLimit = schemeData.premiumBuffer || 100000; // Default 100k if not configured
      const totalUtilized = schemeData.totalPremiumUtilized || 0;
      const totalAllocated = schemeData.totalPremiumAllocated || 0;
      
      const effectiveLimit = Number(totalAllocated) + Number(bufferLimit);
      const remainingBuffer = effectiveLimit - Number(totalUtilized);
      const isWithinBuffer = claimAmount <= remainingBuffer;

      return ResponseFactory.createSuccessResponse({
        schemeId,
        totalAllocated,
        totalUtilized,
        bufferLimit,
        effectiveLimit,
        remainingBuffer,
        claimAmount,
        isWithinBuffer,
        bufferExceeded: !isWithinBuffer,
        exceedsBy: !isWithinBuffer ? claimAmount - remainingBuffer : 0
      }, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to validate premium buffer', error as Error, { schemeId, claimAmount, correlationId });
      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to validate premium buffer',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  /**
   * FR-05: Suspend Scheme
   * Suspends all member enrollments and claims processing
   * Retains all data, suspends functionality only
   */
  async suspendScheme(schemeId: number, suspendedBy: number, reason?: string, correlationId?: string): Promise<any> {
    try {
      logger.info('Suspending scheme', { schemeId, suspendedBy, reason, correlationId });

      const scheme = await db.select().from(schemes).where(eq(schemes.id, schemeId)).limit(1);
      
      if (scheme.length === 0) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Scheme not found', { schemeId }, correlationId);
      }

      if (!scheme[0].isActive) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Scheme is already suspended',
          { schemeId },
          correlationId
        );
      }

      const [updatedScheme] = await db
        .update(schemes)
        .set({
          isActive: false,
          suspendedAt: new Date(),
          suspendedBy: suspendedBy,
          suspensionReason: reason,
          updatedAt: new Date()
        })
        .where(eq(schemes.id, schemeId))
        .returning();

      logger.info('Scheme suspended successfully', { schemeId, suspendedBy, correlationId });

      return ResponseFactory.createSuccessResponse({
        schemeId,
        status: 'SUSPENDED',
        suspendedAt: updatedScheme.suspendedAt,
        suspendedBy: updatedScheme.suspendedBy,
        suspensionReason: updatedScheme.suspensionReason
      }, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to suspend scheme', error as Error, { schemeId, suspendedBy, correlationId });
      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to suspend scheme',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  /**
   * FR-05: Activate Scheme
   * Restores full functionality for suspended scheme
   */
  async activateScheme(schemeId: number, activatedBy: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Activating scheme', { schemeId, activatedBy, correlationId });

      const scheme = await db.select().from(schemes).where(eq(schemes.id, schemeId)).limit(1);
      
      if (scheme.length === 0) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Scheme not found', { schemeId }, correlationId);
      }

      if (scheme[0].isActive) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Scheme is already active',
          { schemeId },
          correlationId
        );
      }

      const [updatedScheme] = await db
        .update(schemes)
        .set({
          isActive: true,
          activatedAt: new Date(),
          activatedBy: activatedBy,
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null,
          updatedAt: new Date()
        })
        .where(eq(schemes.id, schemeId))
        .returning();

      logger.info('Scheme activated successfully', { schemeId, activatedBy, correlationId });

      return ResponseFactory.createSuccessResponse({
        schemeId,
        status: 'ACTIVE',
        activatedAt: updatedScheme.activatedAt,
        activatedBy: updatedScheme.activatedBy
      }, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to activate scheme', error as Error, { schemeId, activatedBy, correlationId });
      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to activate scheme',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  /**
   * BR-01: Scheme Approval Gate
   * BR-02: Validation Block
   * Approve scheme for activation - only Senior Underwriter role allowed
   * Performs full validation check before approval
   */
  async approveScheme(schemeId: number, approvedBy: number, userRole: string, correlationId?: string): Promise<any> {
    try {
      logger.info('Approving scheme', { schemeId, approvedBy, userRole, correlationId });

      // BR-01: Only authorized roles can approve schemes
      if (!SCHEME_APPROVAL_ROLES.includes(userRole as any)) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.UNAUTHORIZED,
          'Only Senior Underwriters and Administrators are authorized to approve schemes',
          { schemeId, userRole },
          correlationId
        );
      }

      const scheme = await db.select().from(schemes).where(eq(schemes.id, schemeId)).limit(1);
      
      if (scheme.length === 0) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Scheme not found', { schemeId }, correlationId);
      }

      // BR-02: Validation Block - Check all mandatory elements
      const validationErrors = await this.validateSchemeForActivation(schemeId);
      
      if (validationErrors.length > 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Approval blocked - mandatory elements missing',
          { 
            schemeId,
            validationErrors,
            count: validationErrors.length
          },
          correlationId
        );
      }

      // Approve scheme
      const [approvedScheme] = await db
        .update(schemes)
        .set({
          status: 'under_review',
          approvedAt: new Date(),
          approvedBy: approvedBy,
          updatedAt: new Date()
        })
        .where(eq(schemes.id, schemeId))
        .returning();

      logger.info('Scheme approved successfully', { schemeId, approvedBy, correlationId });

      return ResponseFactory.createSuccessResponse({
        schemeId,
        status: 'APPROVED',
        approvedAt: approvedScheme.approvedAt,
        approvedBy: approvedScheme.approvedBy,
        message: 'Scheme has been approved and is ready for activation'
      }, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to approve scheme', error as Error, { schemeId, approvedBy, correlationId });
      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to approve scheme',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  /**
   * BR-02: Scheme Validation Check
   * Validates all mandatory elements required for scheme activation
   * Returns list of validation errors
   */
  async validateSchemeForActivation(schemeId: number): Promise<string[]> {
    const errors: string[] = [];

    // Check scheme has benefits configured
    const benefitsCount = await db
      .select({ count: count() })
      .from(schemeBenefits)
      .where(eq(schemeBenefits.schemeId, schemeId));

    if (Number(benefitsCount[0].count) === 0) {
      errors.push('Scheme must have at least one benefit configured');
    }

    // Check policy period is configured
    const scheme = await db.select().from(schemes).where(eq(schemes.id, schemeId)).limit(1);
    
    if (!scheme[0].startDate || !scheme[0].endDate) {
      errors.push('Policy period start and end dates must be configured');
    }

    // Check provider panels are assigned
    const providerCount = await db
      .select({ count: count() })
      .from(schemeNetworks)
      .where(eq(schemeNetworks.schemeId, schemeId));

    if (Number(providerCount[0].count) === 0) {
      errors.push('At least one provider panel must be assigned');
    }

    // Check calendar configuration
    const periodCount = await db
      .select({ count: count() })
      .from(periods)
      .where(eq(periods.schemeId, schemeId));

    if (Number(periodCount[0].count) === 0) {
      errors.push('Calendar periods must be configured');
    }

    return errors;
  }

  /**
   * FR-08: Allowed Claim Types Restriction
   * Set allowed claim types for scheme
   * System blocks creation of non-allowed types
   */
  async setAllowedClaimTypes(schemeId: number, claimTypes: string[], correlationId?: string): Promise<any> {
    try {
      logger.info('Setting allowed claim types', { schemeId, claimTypes, correlationId });

      const scheme = await db.select().from(schemes).where(eq(schemes.id, schemeId)).limit(1);
      
      if (scheme.length === 0) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Scheme not found', { schemeId }, correlationId);
      }

      const [updatedScheme] = await db
        .update(schemes)
        .set({
          allowedClaimTypes: JSON.stringify(claimTypes),
          updatedAt: new Date()
        })
        .where(eq(schemes.id, schemeId))
        .returning();

      logger.info('Allowed claim types updated successfully', { schemeId, correlationId });

      return ResponseFactory.createSuccessResponse({
        schemeId,
        allowedClaimTypes: claimTypes,
        updatedAt: updatedScheme.updatedAt
      }, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to set allowed claim types', error as Error, { schemeId, correlationId });
      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to set allowed claim types',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  /**
   * FR-08: Validate Claim Type Allowed
   * Check if claim type is allowed for this scheme
   * Returns validation result with error if not allowed
   */
  async validateClaimTypeAllowed(schemeId: number, claimType: string, correlationId?: string): Promise<any> {
    try {
      logger.info('Validating claim type allowed', { schemeId, claimType, correlationId });

      const scheme = await db.select().from(schemes).where(eq(schemes.id, schemeId)).limit(1);
      
      if (scheme.length === 0) {
        return ResponseFactory.createErrorResponse(ErrorCodes.NOT_FOUND, 'Scheme not found', { schemeId }, correlationId);
      }

      const schemeData = scheme[0];
      
      if (!schemeData.allowedClaimTypes) {
        // No restrictions configured - all types allowed
        return ResponseFactory.createSuccessResponse({
          schemeId,
          claimType,
          allowed: true,
          message: 'No claim type restrictions configured'
        }, undefined, correlationId);
      }

      let allowedTypes: string[] = [];
      try {
        allowedTypes = JSON.parse(schemeData.allowedClaimTypes);
      } catch (parseError) {
        logger.warn('Invalid allowedClaimTypes JSON', { schemeId, rawValue: schemeData.allowedClaimTypes });
        return ResponseFactory.createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid claim type configuration for scheme',
          { schemeId },
          correlationId
        );
      }

      const isAllowed = allowedTypes.includes(claimType);

      if (isAllowed) {
        return ResponseFactory.createSuccessResponse({
          schemeId,
          claimType,
          allowed: true,
          allowedTypes,
          message: 'Claim type is allowed for this scheme'
        }, undefined, correlationId);
      } else {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Claim type is not allowed for this scheme',
          {
            schemeId,
            claimType,
            allowed: false,
            allowedTypes
          },
          correlationId
        );
      }

    } catch (error) {
      logger.error('Failed to validate claim type', error as Error, { schemeId, claimType, correlationId });
      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to validate claim type',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }
}

export const schemeService = SchemeService.getInstance();
