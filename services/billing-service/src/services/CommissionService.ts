import { eq, and, desc, asc, count, gte, lte, sum } from 'drizzle-orm';
import { db } from '../config/database';
import {
  commissions,
  invoices,
  payments,
  commissionTypeEnum,
  commissionStatusEnum
} from '../models/schema';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse,
  createBusinessRuleErrorResponse
} from '../utils/api-standardization';
import moment from 'moment';

const logger = createLogger();

export interface CommissionData {
  personnelId: number;
  invoiceId?: number;
  paymentId?: number;
  commissionType: string;
  baseAmount: number;
  commissionRate?: number;
  description?: string;
  calculationDetails?: any;
  notes?: string;
  approvedBy?: number;
  paidBy?: number;
}

export interface CommissionCalculationRule {
  type: string;
  rate: number;
  conditions?: {
    serviceTypes?: string[];
    minAmount?: number;
    maxAmount?: number;
    patientTypes?: string[];
  };
}

export class CommissionService {
  private static instance: CommissionService;

  public static getInstance(): CommissionService {
    if (!CommissionService.instance) {
      CommissionService.instance = new CommissionService();
    }
    return CommissionService.instance;
  }

  private generateCommissionReference(): string {
    const date = moment().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `COM-${date}-${random}`;
  }

  private validateCommissionData(data: CommissionData): string[] {
    const errors: string[] = [];

    if (!data.personnelId || data.personnelId <= 0) {
      errors.push('Valid personnel ID is required');
    }

    if (!data.baseAmount || data.baseAmount <= 0) {
      errors.push('Base amount must be greater than 0');
    }

    if (!data.commissionType) {
      errors.push('Commission type is required');
    }

    const validTypes = ['referral', 'service', 'performance', 'bonus'];
    if (!validTypes.includes(data.commissionType)) {
      errors.push(`Commission type must be one of: ${validTypes.join(', ')}`);
    }

    if (data.commissionRate) {
      if (data.commissionRate < 0 || data.commissionRate > 1) {
        errors.push('Commission rate must be between 0 and 1 (e.g., 0.10 for 10%)');
      }

      if (data.commissionRate > config.commission.maxCommissionRate) {
        errors.push(`Commission rate cannot exceed ${config.commission.maxCommissionRate}`);
      }
    }

    return errors;
  }

  private calculateCommissionAmount(baseAmount: number, rate: number): number {
    const amount = baseAmount * rate;
    return Math.max(amount, config.commission.minCommissionAmount);
  }

  private async validateCommissionCalculation(data: CommissionData): Promise<{ valid: boolean; error?: string; details?: any }> {
    // Validate invoice exists if provided
    if (data.invoiceId) {
      const invoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, data.invoiceId))
        .limit(1);

      if (invoice.length === 0) {
        return {
          valid: false,
          error: 'Invoice not found'
        };
      }

      // Only allow commission on paid invoices
      if (invoice[0].status !== 'paid') {
        return {
          valid: false,
          error: 'Commission can only be calculated on paid invoices'
        };
      }
    }

    // Validate payment exists if provided
    if (data.paymentId) {
      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, data.paymentId))
        .limit(1);

      if (payment.length === 0) {
        return {
          valid: false,
          error: 'Payment not found'
        };
      }

      // Only allow commission on completed payments
      if (payment[0].status !== 'completed') {
        return {
          valid: false,
          error: 'Commission can only be calculated on completed payments'
        };
      }
    }

    return { valid: true };
  }

  async calculateCommission(data: CommissionData, correlationId?: string): Promise<any> {
    try {
      logger.info('Calculating commission', {
        personnelId: data.personnelId,
        commissionType: data.commissionType,
        baseAmount: data.baseAmount,
        correlationId
      });

      // Validate commission data
      const validationErrors = this.validateCommissionData(data);
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Validate calculation context
      const calculationValidation = await this.validateCommissionCalculation(data);
      if (!calculationValidation.valid) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.BUSINESS_RULE_VIOLATION,
          calculationValidation.error!,
          { personnelId: data.personnelId },
          correlationId
        );
      }

      // Determine commission rate based on type and rules
      let commissionRate = data.commissionRate || this.getDefaultCommissionRate(data.commissionType);

      // Apply business rules for rate determination
      commissionRate = await this.applyCommissionRateRules(data, commissionRate);

      // Calculate commission amount
      const commissionAmount = this.calculateCommissionAmount(data.baseAmount, commissionRate);

      // Generate commission reference
      const commissionReference = this.generateCommissionReference();

      // Create commission record
      const [newCommission] = await db
        .insert(commissions)
        .values({
          commissionReference,
          personnelId: data.personnelId,
          invoiceId: data.invoiceId,
          paymentId: data.paymentId,
          commissionType: data.commissionType as any,
          baseAmount: data.baseAmount.toString(),
          commissionRate: commissionRate.toString(),
          commissionAmount: commissionAmount.toString(),
          status: 'pending' as any,
          calculationDate: new Date(),
          description: data.description,
          calculationDetails: data.calculationDetails,
          notes: data.notes,
          approvedBy: data.approvedBy,
          paidBy: data.paidBy,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      logger.info('Commission calculated successfully', {
        commissionId: newCommission.id,
        commissionReference: newCommission.commissionReference,
        personnelId: data.personnelId,
        commissionAmount,
        rate: commissionRate,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(
        newCommission,
        'Commission calculated successfully',
        correlationId
      );

    } catch (error) {
      logger.error('Failed to calculate commission', error as Error, {
        personnelId: data.personnelId,
        baseAmount: data.baseAmount,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to calculate commission',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  private getDefaultCommissionRate(type: string): number {
    switch (type) {
      case 'referral':
        return config.commission.referralBonus;
      case 'performance':
        return config.commission.performanceBonus;
      case 'service':
      default:
        return config.commission.defaultRate;
    }
  }

  private async applyCommissionRateRules(data: CommissionData, baseRate: number): Promise<number> {
    let finalRate = baseRate;

    // Apply volume-based rate adjustments
    if (data.baseAmount > 10000) {
      finalRate = Math.min(finalRate + 0.02, config.commission.maxCommissionRate); // Add 2% for large amounts
    }

    // Apply performance-based adjustments
    const performanceBonus = await this.calculatePerformanceBonus(data.personnelId);
    finalRate = Math.min(finalRate + performanceBonus, config.commission.maxCommissionRate);

    // Apply special rates for certain service types
    if (data.calculationDetails?.serviceType === 'emergency') {
      finalRate = Math.min(finalRate + 0.01, config.commission.maxCommissionRate); // Add 1% for emergency services
    }

    return finalRate;
  }

  private async calculatePerformanceBonus(personnelId: number): Promise<number> {
    try {
      // Get performance metrics for the last 30 days
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

      const performanceMetrics = await db
        .select({
          totalRevenue: sum(invoices.totalAmount).mapWith(Number),
          patientCount: count(invoices.patientId)
        })
        .from(commissions)
        .leftJoin(invoices, eq(commissions.invoiceId, invoices.id))
        .where(and(
          eq(commissions.personnelId, personnelId),
          eq(commissions.status, 'paid'),
          gte(commissions.calculationDate, thirtyDaysAgo)
        ));

      if (performanceMetrics.length === 0) {
        return 0;
      }

      const metrics = performanceMetrics[0];
      const totalRevenue = metrics.totalRevenue || 0;
      const patientCount = metrics.patientCount || 0;

      // Apply performance bonus rules
      let bonus = 0;
      if (totalRevenue > 50000) bonus += 0.01; // 1% bonus for high revenue
      if (patientCount > 100) bonus += 0.01; // 1% bonus for high patient count
      if (totalRevenue > 100000 && patientCount > 150) bonus += 0.01; // Additional 1% for exceptional performance

      return Math.min(bonus, 0.05); // Cap performance bonus at 5%

    } catch (error) {
      logger.error('Failed to calculate performance bonus', error as Error, { personnelId });
      return 0;
    }
  }

  async getCommission(id: number, correlationId?: string): Promise<any> {
    try {
      const commission = await db
        .select({
          commission: commissions,
          invoice: {
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            totalAmount: invoices.totalAmount
          },
          payment: {
            id: payments.id,
            paymentReference: payments.paymentReference,
            amount: payments.amount
          }
        })
        .from(commissions)
        .leftJoin(invoices, eq(commissions.invoiceId, invoices.id))
        .leftJoin(payments, eq(commissions.paymentId, payments.id))
        .where(eq(commissions.id, id))
        .limit(1);

      if (commission.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Commission not found',
          { id },
          correlationId
        );
      }

      logger.debug('Commission retrieved', {
        commissionId: id,
        commissionReference: commission[0].commission.commissionReference,
        status: commission[0].commission.status,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(commission[0], undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get commission', error as Error, {
        commissionId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve commission',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getCommissions(
    filters: {
      personnelId?: number;
      status?: string;
      commissionType?: string;
      dateRange?: { start?: Date; end?: Date };
    },
    pagination: {
      page: number;
      limit: number;
    },
    correlationId?: string
  ): Promise<any> {
    try {
      let query = db.select({
        commission: commissions,
        invoice: {
          invoiceNumber: invoices.invoiceNumber
        },
        payment: {
          paymentReference: payments.paymentReference
        }
      })
      .from(commissions)
      .leftJoin(invoices, eq(commissions.invoiceId, invoices.id))
      .leftJoin(payments, eq(commissions.paymentId, payments.id));

      // Apply filters
      if (filters.personnelId) {
        query = query.where(eq(commissions.personnelId, filters.personnelId));
      }

      if (filters.status) {
        query = query.where(eq(commissions.status, filters.status as any));
      }

      if (filters.commissionType) {
        query = query.where(eq(commissions.commissionType, filters.commissionType as any));
      }

      if (filters.dateRange?.start) {
        query = query.where(gte(commissions.calculationDate, filters.dateRange.start));
      }

      if (filters.dateRange?.end) {
        query = query.where(lte(commissions.calculationDate, filters.dateRange.end));
      }

      // Get total count for pagination
      const totalCountQuery = query;
      const [totalResult] = await totalCountQuery.select({ count: count() });
      const total = totalResult.count;

      // Apply pagination and ordering
      const results = await query
        .orderBy(desc(commissions.calculationDate))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit);

      logger.debug('Commissions retrieved', {
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
      logger.error('Failed to get commissions', error as Error, {
        filters,
        pagination,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve commissions',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async approveCommission(id: number, approvedBy: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Approving commission', {
        commissionId: id,
        approvedBy,
        correlationId
      });

      // Check if commission exists and can be approved
      const existingCommission = await db
        .select()
        .from(commissions)
        .where(eq(commissions.id, id))
        .limit(1);

      if (existingCommission.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Commission not found',
          { id },
          correlationId
        );
      }

      const commission = existingCommission[0];

      if (commission.status !== 'pending') {
        return createBusinessRuleErrorResponse(
          'INVALID_COMMISSION_STATUS',
          'Only pending commissions can be approved',
          {
            commissionId: id,
            currentStatus: commission.status
          },
          correlationId
        );
      }

      // Approve commission
      const [approvedCommission] = await db
        .update(commissions)
        .set({
          status: 'approved' as any,
          approvalDate: new Date(),
          approvedBy,
          updatedAt: new Date()
        })
        .where(eq(commissions.id, id))
        .returning();

      logger.info('Commission approved successfully', {
        commissionId: id,
        commissionReference: approvedCommission.commissionReference,
        approvedBy,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(
        approvedCommission,
        'Commission approved successfully',
        correlationId
      );

    } catch (error) {
      logger.error('Failed to approve commission', error as Error, {
        commissionId: id,
        approvedBy,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to approve commission',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async payCommission(id: number, paidBy: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Paying commission', {
        commissionId: id,
        paidBy,
        correlationId
      });

      // Check if commission exists and can be paid
      const existingCommission = await db
        .select()
        .from(commissions)
        .where(eq(commissions.id, id))
        .limit(1);

      if (existingCommission.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Commission not found',
          { id },
          correlationId
        );
      }

      const commission = existingCommission[0];

      if (commission.status !== 'approved') {
        return createBusinessRuleErrorResponse(
          'INVALID_COMMISSION_STATUS',
          'Only approved commissions can be paid',
          {
            commissionId: id,
            currentStatus: commission.status
          },
          correlationId
        );
      }

      // Mark commission as paid
      const [paidCommission] = await db
        .update(commissions)
        .set({
          status: 'paid' as any,
          paymentDate: new Date(),
          paidBy,
          updatedAt: new Date()
        })
        .where(eq(commissions.id, id))
        .returning();

      logger.info('Commission paid successfully', {
        commissionId: id,
        commissionReference: paidCommission.commissionReference,
        commissionAmount: paidCommission.commissionAmount,
        paidBy,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(
        paidCommission,
        'Commission paid successfully',
        correlationId
      );

    } catch (error) {
      logger.error('Failed to pay commission', error as Error, {
        commissionId: id,
        paidBy,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to pay commission',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async rejectCommission(id: number, reason: string, rejectedBy: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Rejecting commission', {
        commissionId: id,
        reason,
        rejectedBy,
        correlationId
      });

      // Check if commission exists and can be rejected
      const existingCommission = await db
        .select()
        .from(commissions)
        .where(eq(commissions.id, id))
        .limit(1);

      if (existingCommission.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Commission not found',
          { id },
          correlationId
        );
      }

      const commission = existingCommission[0];

      if (commission.status !== 'pending') {
        return createBusinessRuleErrorResponse(
          'INVALID_COMMISSION_STATUS',
          'Only pending commissions can be rejected',
          {
            commissionId: id,
            currentStatus: commission.status
          },
          correlationId
        );
      }

      // Reject commission
      const [rejectedCommission] = await db
        .update(commissions)
        .set({
          status: 'rejected' as any,
          notes: `${commission.notes || ''}\nRejected: ${reason}`,
          updatedAt: new Date()
        })
        .where(eq(commissions.id, id))
        .returning();

      logger.info('Commission rejected successfully', {
        commissionId: id,
        commissionReference: rejectedCommission.commissionReference,
        reason,
        rejectedBy,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(
        rejectedCommission,
        'Commission rejected successfully',
        correlationId
      );

    } catch (error) {
      logger.error('Failed to reject commission', error as Error, {
        commissionId: id,
        reason,
        rejectedBy,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to reject commission',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getCommissionStatistics(correlationId?: string): Promise<any> {
    try {
      // Get commissions by status
      const statusStats = await db
        .select({
          status: commissions.status,
          count: count(commissions.id),
          totalAmount: sum(commissions.commissionAmount).mapWith(Number)
        })
        .from(commissions)
        .groupBy(commissions.status);

      // Get commissions by type
      const typeStats = await db
        .select({
          type: commissions.commissionType,
          count: count(commissions.id),
          totalAmount: sum(commissions.commissionAmount).mapWith(Number)
        })
        .from(commissions)
        .groupBy(commissions.commissionType);

      // Get recent commissions (last 30 days)
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

      const recentCommissions = await db
        .select({
          totalAmount: sum(commissions.commissionAmount).mapWith(Number),
          commissionCount: count(commissions.id),
          averageCommission: sum(commissions.commissionAmount).mapWith(Number) / count(commissions.id)
        })
        .from(commissions)
        .where(gte(commissions.calculationDate, thirtyDaysAgo));

      // Get top performers
      const topPerformers = await db
        .select({
          personnelId: commissions.personnelId,
          totalCommission: sum(commissions.commissionAmount).mapWith(Number),
          commissionCount: count(commissions.id)
        })
        .from(commissions)
        .where(eq(commissions.status, 'paid'))
        .groupBy(commissions.personnelId)
        .orderBy({ totalCommission: 'desc' })
        .limit(10);

      const statistics = {
        statusDistribution: statusStats,
        typeDistribution: typeStats,
        recentCommissions: recentCommissions[0] || { totalAmount: 0, commissionCount: 0, averageCommission: 0 },
        topPerformers,
        generatedAt: new Date().toISOString()
      };

      logger.info('Commission statistics retrieved', {
        totalStatuses: statusStats.length,
        totalTypes: typeStats.length,
        totalAmount: statistics.recentCommissions.totalAmount,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(statistics, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get commission statistics', error as Error, {
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve commission statistics',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }
}

export const commissionService = CommissionService.getInstance();