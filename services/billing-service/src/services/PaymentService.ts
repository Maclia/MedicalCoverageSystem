import { eq, and, desc, asc, count, gte, lte, sum } from 'drizzle-orm';
import { db } from '../config/database';
import {
  payments,
  invoices,
  paymentRefunds,
  paymentStatusEnum,
  paymentMethodEnum
} from '../models/schema';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse,
  createBusinessRuleErrorResponse
} from '../utils/api-standardization';
import crypto from 'crypto';

const logger = createLogger();

export interface PaymentData {
  invoiceId: number;
  patientId: number;
  patientName: string;
  amount: number;
  paymentMethod: string;
  methodDetails?: any;
  notes?: string;
  metadata?: any;
  processedBy?: number;
}

export interface MpesaPaymentDetails {
  phoneNumber: string;
  shortCode: string;
  accountReference: string;
  transactionDesc: string;
}

export interface CardPaymentDetails {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
  billingAddress?: any;
}

export interface BankTransferDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  routingNumber?: string;
  transactionReference: string;
}

export class PaymentService {
  private static instance: PaymentService;

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  private generatePaymentReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAY-${timestamp}-${random}`;
  }

  private validatePaymentData(data: PaymentData): string[] {
    const errors: string[] = [];

    if (!data.invoiceId || data.invoiceId <= 0) {
      errors.push('Valid invoice ID is required');
    }

    if (!data.patientId || data.patientId <= 0) {
      errors.push('Valid patient ID is required');
    }

    if (!data.patientName || data.patientName.trim().length === 0) {
      errors.push('Patient name is required');
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (data.amount < config.billing.minPaymentAmount) {
      errors.push(`Minimum payment amount is ${config.billing.minPaymentAmount}`);
    }

    if (!data.paymentMethod) {
      errors.push('Payment method is required');
    }

    const validPaymentMethods = ['cash', 'mpesa', 'card', 'bank_transfer', 'insurance', 'mobile_money'];
    if (!validPaymentMethods.includes(data.paymentMethod)) {
      errors.push(`Payment method must be one of: ${validPaymentMethods.join(', ')}`);
    }

    return errors;
  }

  private async validateInvoiceForPayment(invoiceId: number): Promise<any> {
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (invoice.length === 0) {
      return {
        valid: false,
        error: 'Invoice not found'
      };
    }

    const invoiceData = invoice[0];

    if (['draft', 'cancelled'].includes(invoiceData.status)) {
      return {
        valid: false,
        error: 'Cannot make payment on draft or cancelled invoice'
      };
    }

    const balance = parseFloat(invoiceData.balanceAmount.toString());
    if (balance <= 0) {
      return {
        valid: false,
        error: 'Invoice is already fully paid'
      };
    }

    return {
      valid: true,
      invoice: invoiceData,
      balance
    };
  }

  async processPayment(data: PaymentData, correlationId?: string): Promise<any> {
    try {
      logger.info('Processing payment', {
        invoiceId: data.invoiceId,
        patientId: data.patientId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        correlationId
      });

      // Validate payment data
      const validationErrors = this.validatePaymentData(data);
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Validate invoice for payment
      const invoiceValidation = await this.validateInvoiceForPayment(data.invoiceId);
      if (!invoiceValidation.valid) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.BUSINESS_RULE_VIOLATION,
          invoiceValidation.error,
          { invoiceId: data.invoiceId },
          correlationId
        );
      }

      const invoice = invoiceValidation.invoice;
      const balance = invoiceValidation.balance;

      // Check if payment amount exceeds balance
      if (data.amount > balance) {
        return createBusinessRuleErrorResponse(
          'PAYMENT_EXCEEDS_BALANCE',
          'Payment amount exceeds invoice balance',
          {
            paymentAmount: data.amount,
            balanceAmount: balance,
            invoiceId: data.invoiceId
          },
          correlationId
        );
      }

      // Generate payment reference
      const paymentReference = this.generatePaymentReference();

      // Process payment based on method
      let gatewayResponse = null;
      let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';

      switch (data.paymentMethod) {
        case 'cash':
          status = 'completed';
          gatewayResponse = {
            method: 'cash',
            processedAt: new Date(),
            verifiedBy: data.processedBy
          };
          break;

        case 'mpesa':
          const mpesaResult = await this.processMpesaPayment(data, paymentReference, correlationId);
          gatewayResponse = mpesaResult.response;
          status = mpesaResult.status;
          break;

        case 'card':
          const cardResult = await this.processCardPayment(data, paymentReference, correlationId);
          gatewayResponse = cardResult.response;
          status = cardResult.status;
          break;

        case 'bank_transfer':
          status = 'pending';
          gatewayResponse = {
            method: 'bank_transfer',
            note: 'Waiting for bank confirmation',
            details: data.methodDetails
          };
          break;

        case 'insurance':
          status = 'completed';
          gatewayResponse = {
            method: 'insurance',
            processedAt: new Date(),
            policyNumber: data.methodDetails?.policyNumber
          };
          break;

        default:
          status = 'completed';
          gatewayResponse = {
            method: data.paymentMethod,
            processedAt: new Date()
          };
      }

      // Create payment record
      const [newPayment] = await db
        .insert(payments)
        .values({
          paymentReference,
          invoiceId: data.invoiceId,
          patientId: data.patientId,
          patientName: data.patientName,
          amount: data.amount.toString(),
          paymentMethod: data.paymentMethod as any,
          methodDetails: data.methodDetails,
          status: status as any,
          gatewayResponse,
          paymentDate: new Date(),
          processedDate: status === 'completed' ? new Date() : null,
          notes: data.notes,
          metadata: data.metadata,
          processedBy: data.processedBy,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Update invoice payment status
      await this.updateInvoicePaymentStatus(data.invoiceId, correlationId);

      logger.info('Payment processed successfully', {
        paymentId: newPayment.id,
        paymentReference: newPayment.paymentReference,
        invoiceId: data.invoiceId,
        amount: data.amount,
        status: status,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(
        newPayment,
        status === 'completed' ? 'Payment processed successfully' : 'Payment initiated successfully',
        correlationId
      );

    } catch (error) {
      logger.error('Failed to process payment', error as Error, {
        invoiceId: data.invoiceId,
        amount: data.amount,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to process payment',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  private async processMpesaPayment(data: PaymentData, paymentReference: string, correlationId?: string): Promise<{ response: any; status: string }> {
    try {
      const mpesaDetails = data.methodDetails as MpesaPaymentDetails;

      // Simulate M-Pesa API call
      // In production, this would integrate with actual M-Pesa API
      const mpesaResponse = {
        transactionId: `MPESA-${Date.now()}`,
        phoneNumber: mpesaDetails.phoneNumber,
        amount: data.amount,
        shortCode: mpesaDetails.shortCode,
        accountReference: mpesaDetails.accountReference,
        transactionDesc: mpesaDetails.transactionDesc,
        status: 'success',
        timestamp: new Date()
      };

      logger.info('M-Pesa payment initiated', {
        paymentReference,
        phoneNumber: mpesaDetails.phoneNumber,
        amount: data.amount,
        correlationId
      });

      return {
        response: mpesaResponse,
        status: 'processing' // M-Pesa payments need confirmation callback
      };
    } catch (error) {
      logger.error('M-Pesa payment failed', error as Error, { paymentReference, correlationId });
      return {
        response: { error: (error as Error).message },
        status: 'failed'
      };
    }
  }

  private async processCardPayment(data: PaymentData, paymentReference: string, correlationId?: string): Promise<{ response: any; status: string }> {
    try {
      const cardDetails = data.methodDetails as CardPaymentDetails;

      // Simulate card processing API call
      // In production, this would integrate with payment gateway like Stripe
      const cardResponse = {
        transactionId: `CARD-${Date.now()}`,
        last4: cardDetails.cardNumber.slice(-4),
        brand: this.getCardBrand(cardDetails.cardNumber),
        authCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: 'success',
        timestamp: new Date()
      };

      logger.info('Card payment processed', {
        paymentReference,
        last4: cardResponse.last4,
        brand: cardResponse.brand,
        amount: data.amount,
        correlationId
      });

      return {
        response: cardResponse,
        status: 'completed'
      };
    } catch (error) {
      logger.error('Card payment failed', error as Error, { paymentReference, correlationId });
      return {
        response: { error: (error as Error).message },
        status: 'failed'
      };
    }
  }

  private getCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\s/g, '');

    if (number.startsWith('4')) return 'visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'mastercard';
    if (number.startsWith('3')) return 'amex';

    return 'unknown';
  }

  private async updateInvoicePaymentStatus(invoiceId: number, correlationId?: string): Promise<void> {
    try {
      // Get all payments for the invoice
      const invoicePayments = await db
        .select({
          amount: payments.amount,
          status: payments.status
        })
        .from(payments)
        .where(and(
          eq(payments.invoiceId, invoiceId),
          eq(payments.status, 'completed')
        ));

      // Calculate total paid amount
      const totalPaid = invoicePayments.reduce((sum, payment) =>
        sum + parseFloat(payment.amount.toString()), 0);

      // Get invoice details
      const [invoice] = await db
        .select({
          totalAmount: invoices.totalAmount,
          status: invoices.status
        })
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!invoice) return;

      const totalAmount = parseFloat(invoice.totalAmount.toString());
      const balance = totalAmount - totalPaid;
      let newStatus = invoice.status;

      // Update invoice status based on payment status
      if (balance <= 0) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      }

      // Update invoice
      await db
        .update(invoices)
        .set({
          paidAmount: totalPaid.toString(),
          balanceAmount: balance.toString(),
          status: newStatus as any,
          paidDate: newStatus === 'paid' ? new Date() : invoice.paidDate,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, invoiceId));

      logger.debug('Invoice payment status updated', {
        invoiceId,
        totalPaid,
        balance,
        newStatus,
        correlationId
      });

    } catch (error) {
      logger.error('Failed to update invoice payment status', error as Error, {
        invoiceId,
        correlationId
      });
    }
  }

  async getPayment(id: number, correlationId?: string): Promise<any> {
    try {
      const payment = await db
        .select({
          payment: payments,
          invoice: {
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            totalAmount: invoices.totalAmount,
            balanceAmount: invoices.balanceAmount,
            status: invoices.status
          }
        })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .where(eq(payments.id, id))
        .limit(1);

      if (payment.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Payment not found',
          { id },
          correlationId
        );
      }

      logger.debug('Payment retrieved', {
        paymentId: id,
        paymentReference: payment[0].payment.paymentReference,
        status: payment[0].payment.status,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(payment[0], undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get payment', error as Error, {
        paymentId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve payment',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getPayments(
    filters: {
      invoiceId?: number;
      patientId?: number;
      status?: string;
      paymentMethod?: string;
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
        payment: payments,
        invoice: {
          invoiceNumber: invoices.invoiceNumber
        }
      })
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id));

      // Apply filters
      if (filters.invoiceId) {
        query = query.where(eq(payments.invoiceId, filters.invoiceId));
      }

      if (filters.patientId) {
        query = query.where(eq(payments.patientId, filters.patientId));
      }

      if (filters.status) {
        query = query.where(eq(payments.status, filters.status as any));
      }

      if (filters.paymentMethod) {
        query = query.where(eq(payments.paymentMethod, filters.paymentMethod as any));
      }

      if (filters.dateRange?.start) {
        query = query.where(gte(payments.paymentDate, filters.dateRange.start));
      }

      if (filters.dateRange?.end) {
        query = query.where(lte(payments.paymentDate, filters.dateRange.end));
      }

      // Get total count for pagination
      const totalCountQuery = query;
      const [totalResult] = await totalCountQuery.select({ count: count() });
      const total = totalResult.count;

      // Apply pagination and ordering
      const results = await query
        .orderBy(desc(payments.paymentDate))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit);

      logger.debug('Payments retrieved', {
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
      logger.error('Failed to get payments', error as Error, {
        filters,
        pagination,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve payments',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async refundPayment(paymentId: number, amount: number, reason: string, correlationId?: string): Promise<any> {
    try {
      logger.info('Processing payment refund', {
        paymentId,
        amount,
        reason,
        correlationId
      });

      // Check if payment exists
      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (existingPayment.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Payment not found',
          { paymentId },
          correlationId
        );
      }

      const payment = existingPayment[0];

      // Check if payment can be refunded
      if (payment.status !== 'completed') {
        return createBusinessRuleErrorResponse(
          'PAYMENT_NOT_REFUNDABLE',
          'Only completed payments can be refunded',
          {
            paymentId,
            currentStatus: payment.status
          },
          correlationId
        );
      }

      const paymentAmount = parseFloat(payment.amount.toString());
      if (amount > paymentAmount) {
        return createBusinessRuleErrorResponse(
          'REFUND_EXCEEDS_PAYMENT',
          'Refund amount cannot exceed payment amount',
          {
            refundAmount: amount,
            paymentAmount,
            paymentId
          },
          correlationId
        );
      }

      // Generate refund reference
      const refundReference = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Process refund with payment gateway
      let gatewayResponse = null;
      let refundStatus: 'pending' | 'completed' | 'failed' = 'completed';

      try {
        // Simulate refund processing
        gatewayResponse = {
          originalTransactionId: payment.transactionId,
          refundTransactionId: `REFUND-${Date.now()}`,
          refundAmount: amount,
          status: 'success',
          processedAt: new Date()
        };
      } catch (error) {
        logger.error('Refund processing failed', error as Error, { paymentId, amount, correlationId });
        refundStatus = 'failed';
        gatewayResponse = { error: (error as Error).message };
      }

      // Create refund record
      const [newRefund] = await db
        .insert(paymentRefunds)
        .values({
          paymentId,
          refundReference,
          amount: amount.toString(),
          reason,
          status: refundStatus as any,
          refundTransactionId: gatewayResponse?.refundTransactionId,
          gatewayResponse,
          refundDate: new Date(),
          processedDate: refundStatus === 'completed' ? new Date() : null,
          createdAt: new Date()
        })
        .returning();

      // Update payment status if full refund
      let paymentStatus = payment.status;
      if (amount >= paymentAmount && refundStatus === 'completed') {
        paymentStatus = 'refunded';
        await db
          .update(payments)
          .set({
            status: paymentStatus as any,
            refundedDate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(payments.id, paymentId));

        // Update invoice payment status
        await this.updateInvoicePaymentStatus(payment.invoiceId, correlationId);
      }

      logger.info('Refund processed successfully', {
        refundId: newRefund.id,
        refundReference: newRefund.refundReference,
        paymentId,
        amount,
        status: refundStatus,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(
        {
          refund: newRefund,
          payment: {
            id: payment.id,
            status: paymentStatus,
            refundDate: newRefund.refundDate
          }
        },
        refundStatus === 'completed' ? 'Refund processed successfully' : 'Refund initiated successfully',
        correlationId
      );

    } catch (error) {
      logger.error('Failed to process refund', error as Error, {
        paymentId,
        amount,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to process refund',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getPaymentStatistics(correlationId?: string): Promise<any> {
    try {
      // Get total payments by status
      const statusStats = await db
        .select({
          status: payments.status,
          count: count(payments.id),
          totalAmount: sum(payments.amount).mapWith(Number)
        })
        .from(payments)
        .groupBy(payments.status);

      // Get payments by method
      const methodStats = await db
        .select({
          method: payments.paymentMethod,
          count: count(payments.id),
          totalAmount: sum(payments.amount).mapWith(Number)
        })
        .from(payments)
        .where(eq(payments.status, 'completed'))
        .groupBy(payments.paymentMethod);

      // Get recent revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRevenue = await db
        .select({
          totalRevenue: sum(payments.amount).mapWith(Number),
          paymentCount: count(payments.id),
          averagePayment: sum(payments.amount).mapWith(Number) / count(payments.id)
        })
        .from(payments)
        .where(and(
          gte(payments.paymentDate, thirtyDaysAgo),
          eq(payments.status, 'completed')
        ));

      const statistics = {
        statusDistribution: statusStats,
        methodDistribution: methodStats,
        recentRevenue: recentRevenue[0] || { totalRevenue: 0, paymentCount: 0, averagePayment: 0 },
        generatedAt: new Date().toISOString()
      };

      logger.info('Payment statistics retrieved', {
        totalStatuses: statusStats.length,
        totalMethods: methodStats.length,
        recentRevenue: statistics.recentRevenue.totalRevenue,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(statistics, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get payment statistics', error as Error, {
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve payment statistics',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }
}

export const paymentService = PaymentService.getInstance();