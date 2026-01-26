import { eq, and, desc, asc, count, gte, lte, sum } from 'drizzle-orm';
import { db } from '../config/database';
import {
  invoices,
  invoiceItems,
  payments,
  invoiceStatusEnum,
  paymentStatusEnum
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

export interface InvoiceItem {
  itemType: string; // 'service', 'product', 'consultation', 'procedure'
  itemCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  serviceDate?: Date;
  personnelId?: number;
  appointmentId?: number;
  insuranceCoverage?: number;
}

export interface InvoiceData {
  patientId: number;
  patientName: string;
  patientEmail?: string;
  patientPhone: string;
  institutionId?: number;
  institutionName?: string;
  description?: string;
  items: InvoiceItem[];
  issueDate?: Date;
  dueDate?: Date;
  notes?: string;
  metadata?: any;
  createdBy?: number;
}

export class InvoiceService {
  private static instance: InvoiceService;

  public static getInstance(): InvoiceService {
    if (!InvoiceService.instance) {
      InvoiceService.instance = new InvoiceService();
    }
    return InvoiceService.instance;
  }

  private generateInvoiceNumber(): string {
    const date = moment().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${date}-${random}`;
  }

  private validateInvoiceData(data: InvoiceData): string[] {
    const errors: string[] = [];

    if (!data.patientId || data.patientId <= 0) {
      errors.push('Valid patient ID is required');
    }

    if (!data.patientName || data.patientName.trim().length === 0) {
      errors.push('Patient name is required');
    }

    if (!data.patientPhone || data.patientPhone.trim().length === 0) {
      errors.push('Patient phone number is required');
    }

    if (!data.items || data.items.length === 0) {
      errors.push('At least one invoice item is required');
    }

    if (data.items) {
      data.items.forEach((item, index) => {
        if (!item.description || item.description.trim().length === 0) {
          errors.push(`Item ${index + 1}: Description is required`);
        }

        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }

        if (!item.unitPrice || item.unitPrice <= 0) {
          errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
        }

        if (!item.itemType) {
          errors.push(`Item ${index + 1}: Item type is required`);
        }

        // Check if total price matches calculated value
        const calculatedTotal = item.quantity * item.unitPrice;
        if (item.totalPrice !== calculatedTotal) {
          errors.push(`Item ${index + 1}: Total price must equal quantity × unit price`);
        }
      });
    }

    // Validate invoice totals
    if (data.items && data.items.length > 0) {
      const subtotal = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
      if (subtotal <= 0) {
        errors.push('Invoice subtotal must be greater than 0');
      }

      if (subtotal > config.billing.maxInvoiceAmount) {
        errors.push(`Invoice total cannot exceed ${config.billing.maxInvoiceAmount}`);
      }
    }

    return errors;
  }

  private calculateInvoiceTotals(items: InvoiceItem[]) {
    let subtotal = 0;
    let totalInsuranceCoverage = 0;

    items.forEach(item => {
      subtotal += item.totalPrice;
      totalInsuranceCoverage += item.insuranceCoverage || 0;
    });

    const taxAmount = subtotal * config.billing.taxRate;
    const totalAmount = subtotal + taxAmount;
    const patientResponsibility = totalAmount - totalInsuranceCoverage;

    return {
      subtotal,
      taxAmount,
      totalAmount,
      totalInsuranceCoverage,
      patientResponsibility
    };
  }

  async createInvoice(data: InvoiceData, correlationId?: string): Promise<any> {
    try {
      logger.info('Creating new invoice', {
        patientId: data.patientId,
        patientName: data.patientName,
        itemCount: data.items?.length,
        correlationId
      });

      // Validate invoice data
      const validationErrors = this.validateInvoiceData(data);
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Generate invoice number
      const invoiceNumber = this.generateInvoiceNumber();

      // Calculate totals
      const totals = this.calculateInvoiceTotals(data.items);

      // Set default dates
      const issueDate = data.issueDate || new Date();
      const dueDate = data.dueDate || moment(issueDate).add(config.billing.gracePeriodDays, 'days').toDate();

      // Create invoice
      const [newInvoice] = await db
        .insert(invoices)
        .values({
          invoiceNumber,
          patientId: data.patientId,
          patientName: data.patientName,
          patientEmail: data.patientEmail,
          patientPhone: data.patientPhone,
          institutionId: data.institutionId,
          institutionName: data.institutionName,
          description: data.description,
          items: data.items,
          subtotal: totals.subtotal.toString(),
          taxAmount: totals.taxAmount.toString(),
          discountAmount: '0.00',
          totalAmount: totals.totalAmount.toString(),
          paidAmount: '0.00',
          balanceAmount: totals.totalAmount.toString(),
          status: 'draft' as any,
          issueDate,
          dueDate,
          notes: data.notes,
          metadata: data.metadata,
          createdBy: data.createdBy,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Create invoice items
      const invoiceItemsToInsert = data.items.map(item => ({
        invoiceId: newInvoice.id,
        itemType: item.itemType,
        itemCode: item.itemCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        serviceDate: item.serviceDate,
        personnelId: item.personnelId,
        appointmentId: item.appointmentId,
        insuranceCoverage: (item.insuranceCoverage || 0).toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      if (invoiceItemsToInsert.length > 0) {
        await db.insert(invoiceItems).values(invoiceItemsToInsert);
      }

      logger.info('Invoice created successfully', {
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        patientId: data.patientId,
        totalAmount: totals.totalAmount,
        correlationId
      });

      // Return the complete invoice with items
      const completeInvoice = await this.getInvoice(newInvoice.id, correlationId);

      return completeInvoice;

    } catch (error) {
      logger.error('Failed to create invoice', error as Error, {
        patientId: data.patientId,
        itemCount: data.items?.length,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to create invoice',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getInvoice(id: number, correlationId?: string): Promise<any> {
    try {
      const invoice = await db
        .select({
          invoice: invoices,
          items: invoiceItems
        })
        .from(invoices)
        .leftJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
        .where(eq(invoices.id, id));

      if (invoice.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Invoice not found',
          { id },
          correlationId
        );
      }

      // Group items by invoice
      const invoiceData = invoice[0].invoice;
      const items = invoice
        .filter(row => row.items)
        .map(row => row.items!);

      const result = {
        ...invoiceData,
        items
      };

      logger.debug('Invoice retrieved', {
        invoiceId: id,
        invoiceNumber: invoiceData.invoiceNumber,
        status: invoiceData.status,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(result, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get invoice', error as Error, {
        invoiceId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve invoice',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getInvoices(
    filters: {
      patientId?: number;
      status?: string;
      dateRange?: { start?: Date; end?: Date };
      institutionId?: number;
    },
    pagination: {
      page: number;
      limit: number;
    },
    correlationId?: string
  ): Promise<any> {
    try {
      let query = db.select().from(invoices);

      // Apply filters
      if (filters.patientId) {
        query = query.where(eq(invoices.patientId, filters.patientId));
      }

      if (filters.status) {
        query = query.where(eq(invoices.status, filters.status as any));
      }

      if (filters.institutionId) {
        query = query.where(eq(invoices.institutionId, filters.institutionId));
      }

      if (filters.dateRange?.start) {
        query = query.where(gte(invoices.issueDate, filters.dateRange.start));
      }

      if (filters.dateRange?.end) {
        query = query.where(lte(invoices.issueDate, filters.dateRange.end));
      }

      // Get total count for pagination
      const totalCountQuery = query;
      const [totalResult] = await totalCountQuery.select({ count: count() });
      const total = totalResult.count;

      // Apply pagination and ordering
      const results = await query
        .orderBy(desc(invoices.issueDate))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit);

      logger.debug('Invoices retrieved', {
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
      logger.error('Failed to get invoices', error as Error, {
        filters,
        pagination,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve invoices',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async updateInvoice(id: number, data: Partial<InvoiceData>, correlationId?: string): Promise<any> {
    try {
      logger.info('Updating invoice', {
        invoiceId: id,
        updates: Object.keys(data),
        correlationId
      });

      // Check if invoice exists
      const existingInvoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);

      if (existingInvoice.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Invoice not found',
          { id },
          correlationId
        );
      }

      // Don't allow updates for paid invoices
      if (['paid', 'refunded'].includes(existingInvoice[0].status)) {
        return createBusinessRuleErrorResponse(
          'INVOICE_FINALIZED',
          'Cannot update invoice that has been paid or refunded',
          {
            currentStatus: existingInvoice[0].status,
            id
          },
          correlationId
        );
      }

      // Validate update data if items are being changed
      if (data.items) {
        const tempValidationErrors = this.validateInvoiceData({
          ...existingInvoice[0],
          ...data
        });

        if (tempValidationErrors.length > 0) {
          return createValidationErrorResponse(
            tempValidationErrors.map(error => ({ field: 'general', message: error })),
            correlationId
          );
        }

        // Recalculate totals if items changed
        const totals = this.calculateInvoiceTotals(data.items);
        (data as any).subtotal = totals.subtotal.toString();
        (data as any).taxAmount = totals.taxAmount.toString();
        (data as any).totalAmount = totals.totalAmount.toString();
        (data as any).balanceAmount = totals.totalAmount.toString();
      }

      // Update invoice
      const updateData: any = { ...data, updatedAt: new Date() };

      const [updatedInvoice] = await db
        .update(invoices)
        .set(updateData)
        .where(eq(invoices.id, id))
        .returning();

      // Update invoice items if provided
      if (data.items) {
        // Delete existing items
        await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

        // Insert new items
        const invoiceItemsToInsert = data.items.map(item => ({
          invoiceId: id,
          itemType: item.itemType,
          itemCode: item.itemCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
          serviceDate: item.serviceDate,
          personnelId: item.personnelId,
          appointmentId: item.appointmentId,
          insuranceCoverage: (item.insuranceCoverage || 0).toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        if (invoiceItemsToInsert.length > 0) {
          await db.insert(invoiceItems).values(invoiceItemsToInsert);
        }
      }

      logger.info('Invoice updated successfully', {
        invoiceId: id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        updates: Object.keys(updateData),
        correlationId
      });

      // Return the complete invoice with items
      const completeInvoice = await this.getInvoice(id, correlationId);

      return completeInvoice;

    } catch (error) {
      logger.error('Failed to update invoice', error as Error, {
        invoiceId: id,
        updates: data,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to update invoice',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async sendInvoice(id: number, correlationId?: string): Promise<any> {
    try {
      logger.info('Sending invoice', {
        invoiceId: id,
        correlationId
      });

      // Check if invoice exists
      const existingInvoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);

      if (existingInvoice.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Invoice not found',
          { id },
          correlationId
        );
      }

      // Only allow sending draft invoices
      if (existingInvoice[0].status !== 'draft') {
        return createBusinessRuleErrorResponse(
          'INVALID_INVOICE_STATUS',
          'Only draft invoices can be sent',
          {
            currentStatus: existingInvoice[0].status,
            id
          },
          correlationId
        );
      }

      // Update invoice status to sent
      const [sentInvoice] = await db
        .update(invoices)
        .set({
          status: 'sent' as any,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, id))
        .returning();

      // TODO: Implement actual sending logic (email, SMS, etc.)
      // This would integrate with an email/SMS service

      logger.info('Invoice sent successfully', {
        invoiceId: id,
        invoiceNumber: sentInvoice.invoiceNumber,
        patientEmail: sentInvoice.patientEmail,
        patientPhone: sentInvoice.patientPhone,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(
        sentInvoice,
        'Invoice sent successfully',
        correlationId
      );

    } catch (error) {
      logger.error('Failed to send invoice', error as Error, {
        invoiceId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to send invoice',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async cancelInvoice(id: number, reason?: string, correlationId?: string): Promise<any> {
    try {
      logger.info('Cancelling invoice', {
        invoiceId: id,
        reason,
        correlationId
      });

      // Check if invoice exists
      const existingInvoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);

      if (existingInvoice.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Invoice not found',
          { id },
          correlationId
        );
      }

      // Don't allow cancellation of paid invoices
      if (['paid', 'refunded'].includes(existingInvoice[0].status)) {
        return createBusinessRuleErrorResponse(
          'INVOICE_FINALIZED',
          'Cannot cancel invoice that has been paid or refunded',
          {
            currentStatus: existingInvoice[0].status,
            id
          },
          correlationId
        );
      }

      // Cancel invoice
      const [cancelledInvoice] = await db
        .update(invoices)
        .set({
          status: 'cancelled' as any,
          cancelledDate: new Date(),
          notes: reason || existingInvoice[0].notes,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, id))
        .returning();

      logger.info('Invoice cancelled successfully', {
        invoiceId: id,
        invoiceNumber: cancelledInvoice.invoiceNumber,
        reason,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(
        cancelledInvoice,
        'Invoice cancelled successfully',
        correlationId
      );

    } catch (error) {
      logger.error('Failed to cancel invoice', error as Error, {
        invoiceId: id,
        reason,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to cancel invoice',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getInvoiceStatistics(correlationId?: string): Promise<any> {
    try {
      // Get total invoices by status
      const statusStats = await db
        .select({
          status: invoices.status,
          count: count(invoices.id),
          totalAmount: sum(invoices.totalAmount).mapWith(Number)
        })
        .from(invoices)
        .groupBy(invoices.status);

      // Get revenue by period (last 30 days)
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

      const recentRevenue = await db
        .select({
          totalRevenue: sum(invoices.totalAmount).mapWith(Number),
          paidRevenue: sum(
            // Only count paid amounts
            invoices.paidAmount
          ).mapWith(Number),
          invoiceCount: count(invoices.id)
        })
        .from(invoices)
        .where(and(
          gte(invoices.issueDate, thirtyDaysAgo),
          eq(invoices.status, 'paid')
        ));

      // Get overdue invoices
      const overdueStats = await db
        .select({
          count: count(invoices.id),
          totalAmount: sum(invoices.balanceAmount).mapWith(Number)
        })
        .from(invoices)
        .where(and(
          eq(invoices.status, 'sent'),
          lte(invoices.dueDate, new Date())
        ));

      const statistics = {
        statusDistribution: statusStats,
        recentRevenue: recentRevenue[0] || { totalRevenue: 0, paidRevenue: 0, invoiceCount: 0 },
        overdueInvoices: overdueStats[0] || { count: 0, totalAmount: 0 },
        generatedAt: new Date().toISOString()
      };

      logger.info('Invoice statistics retrieved', {
        totalStatuses: statusStats.length,
        recentRevenue: statistics.recentRevenue.totalRevenue,
        overdueCount: statistics.overdueInvoices.count,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(statistics, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get invoice statistics', error as Error, {
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve invoice statistics',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }
}

export const invoiceService = InvoiceService.getInstance();