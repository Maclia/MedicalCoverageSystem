import { and, desc, eq } from 'drizzle-orm';
import { db } from '../config/database';
import { benefits, companies, companyBenefits, premiums } from '../models/schema';
import { ResponseFactory, ErrorCodes } from '../utils/api-standardization';
import { createLogger } from '../utils/logger';

const logger = createLogger();

export interface CompanyBenefitData {
  companyId: number;
  benefitId: number;
  premiumId: number;
  isActive?: boolean;
  additionalCoverage?: boolean;
  additionalCoverageDetails?: string;
  limitAmount?: number;
  limitClause?: string;
  coverageRate?: number;
}

class CompanyBenefitService {
  async listCompanyBenefits(
    filters: { companyId?: number; premiumId?: number; activeOnly?: boolean },
    correlationId?: string
  ) {
    try {
      const rows = await db
        .select({
          id: companyBenefits.id,
          companyId: companyBenefits.companyId,
          benefitId: companyBenefits.benefitId,
          premiumId: companyBenefits.premiumId,
          isActive: companyBenefits.isActive,
          additionalCoverage: companyBenefits.additionalCoverage,
          additionalCoverageDetails: companyBenefits.additionalCoverageDetails,
          limitAmount: companyBenefits.limitAmount,
          limitClause: companyBenefits.limitClause,
          coverageRate: companyBenefits.coverageRate,
          createdAt: companyBenefits.createdAt,
          companyName: companies.name,
          benefitName: benefits.name,
          benefitCategory: benefits.category,
        })
        .from(companyBenefits)
        .leftJoin(companies, eq(companyBenefits.companyId, companies.id))
        .leftJoin(benefits, eq(companyBenefits.benefitId, benefits.id))
        .where(
          and(
            filters.companyId ? eq(companyBenefits.companyId, filters.companyId) : undefined,
            filters.premiumId ? eq(companyBenefits.premiumId, filters.premiumId) : undefined,
            filters.activeOnly ? eq(companyBenefits.isActive, true) : undefined
          )
        )
        .orderBy(desc(companyBenefits.createdAt));

      return ResponseFactory.createSuccessResponse(rows, undefined, correlationId);
    } catch (error) {
      logger.error('Failed to list company benefits', error as Error, {
        filters,
        correlationId,
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve company benefits',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async createCompanyBenefit(data: CompanyBenefitData, correlationId?: string) {
    try {
      const [company, benefit, premium] = await Promise.all([
        db.select().from(companies).where(eq(companies.id, data.companyId)).limit(1),
        db.select().from(benefits).where(eq(benefits.id, data.benefitId)).limit(1),
        db.select().from(premiums).where(eq(premiums.id, data.premiumId)).limit(1),
      ]);

      if (!company.length || !benefit.length || !premium.length) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.REFERENCED_RESOURCE_NOT_FOUND,
          'Company, benefit, or premium was not found',
          {
            companyId: data.companyId,
            benefitId: data.benefitId,
            premiumId: data.premiumId,
          },
          correlationId
        );
      }

      const duplicate = await db
        .select()
        .from(companyBenefits)
        .where(
          and(
            eq(companyBenefits.companyId, data.companyId),
            eq(companyBenefits.benefitId, data.benefitId),
            eq(companyBenefits.premiumId, data.premiumId)
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.CONFLICT,
          'This company benefit already exists for the selected premium',
          data,
          correlationId
        );
      }

      const [created] = await db
        .insert(companyBenefits)
        .values({
          companyId: data.companyId,
          benefitId: data.benefitId,
          premiumId: data.premiumId,
          isActive: data.isActive ?? true,
          additionalCoverage: data.additionalCoverage ?? false,
          additionalCoverageDetails: data.additionalCoverageDetails,
          limitAmount: data.limitAmount,
          limitClause: data.limitClause,
          coverageRate: data.coverageRate ?? 100,
          createdAt: new Date(),
        })
        .returning();

      return ResponseFactory.createCreatedResponse(created, correlationId);
    } catch (error) {
      logger.error('Failed to create company benefit', error as Error, {
        data,
        correlationId,
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to create company benefit',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }
}

export const companyBenefitService = new CompanyBenefitService();
