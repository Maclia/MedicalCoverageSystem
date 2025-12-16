import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import {
  invoices,
  payments,
  commissions,
  expenses,
  budgets,
  financialReports,
  transactionLogs
} from '../models/schema';
import {
  Invoice,
  Payment,
  Commission,
  Expense,
  Budget,
  FinancialReport,
  TransactionLog,
  NewInvoice,
  NewPayment,
  NewCommission,
  NewExpense,
  NewBudget,
  NewFinancialReport,
  NewTransactionLog
} from '../models/schema';
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
  InvoiceStatusError,
  PaymentStatusError,
  PaymentGatewayError,
  CommissionCalculationError,
  BudgetExceededError,
  DataIntegrityError
} from '../utils/CustomErrors';
import {
  eq,
  sql,
  and,
  or,
  desc,
  asc,
  inArray,
  like,
  gte,
  lte,
  ilike,
  count,
  sum
} from 'drizzle-orm';

export class FinanceService {
  private readonly db: Database;
  private readonly logger: WinstonLogger;

  constructor() {
    this.db = Database.getInstance();
    this.logger = new WinstonLogger('finance-service');
  }

  // Invoice Management Methods

  /**
   * Create a new invoice
   */
  async createInvoice(invoiceData: NewInvoice, context: any): Promise<Invoice> {
    const db = this.db.getDb();
    const transaction = await db.beginTransaction();

    try {
      this.logger.info('Creating new invoice', {
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount.toString(),
        memberId: invoiceData.memberId,
        companyId: invoiceData.companyId
      });

      // Validate business rules
      await this.validateInvoiceRules(invoiceData);

      // Generate unique invoice number if not provided
      if (!invoiceData.invoiceNumber) {
        invoiceData.invoiceNumber = await this.generateInvoiceNumber(invoiceData.companyId);
      }

      // Check for duplicates
      await this.checkForDuplicateInvoice(invoiceData);

      // Calculate totals
      const totalAmount = parseFloat(invoiceData.amount.toString()) +
                         parseFloat(invoiceData.taxAmount?.toString() || '0') +
                         parseFloat(invoiceData.penaltyAmount?.toString() || '0') -
                         parseFloat(invoiceData.discountAmount?.toString() || '0');

      const invoiceRecord = {
        ...invoiceData,
        totalAmount,
        balanceAmount: totalAmount,
        paidAmount: 0,
        paymentStatus: 'unpaid',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const invoice = await transaction.insert(invoices).values(invoiceRecord).returning();

      // Log transaction for audit
      await this.logTransaction({
        transactionId: invoice[0].invoiceNumber,
        transactionType: 'invoice',
        entityId: invoice[0].id,
        action: 'create',
        newValues: invoice[0],
        amount: invoice[0].amount.toString(),
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }, transaction);

      await transaction.commit();

      this.logger.logInvoiceCreated(
        invoice[0].id,
        invoice[0].invoiceNumber,
        parseFloat(invoice[0].amount.toString()),
        invoice[0].memberId
      );

      return invoice[0];

    } catch (error) {
      await transaction.rollback();
      this.logger.error('Failed to create invoice', { error, invoiceData });
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: number): Promise<Invoice> {
    const db = this.db.getDb();

    try {
      const invoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (invoice.length === 0) {
        throw new NotFoundError('Invoice');
      }

      return invoice[0];

    } catch (error) {
      this.logger.error('Failed to get invoice', { error, invoiceId });
      throw error;
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId: number, status: string, context: any): Promise<Invoice> {
    const db = this.db.getDb();
    const transaction = await db.beginTransaction();

    try {
      const existingInvoice = await this.getInvoiceById(invoiceId);

      // Validate status transition
      this.validateInvoiceStatusTransition(existingInvoice.status, status);

      const updatedInvoice = await transaction
        .update(invoices)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, invoiceId))
        .returning();

      // Log transaction
      await this.logTransaction({
        transactionId: updatedInvoice[0].invoiceNumber,
        transactionType: 'invoice',
        entityId: invoiceId,
        action: 'status_update',
        oldValues: { status: existingInvoice.status },
        newValues: { status },
        amount: updatedInvoice[0].amount.toString(),
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        reason: context.reason
      }, transaction);

      await transaction.commit();

      this.logger.info('Invoice status updated', {
        invoiceId,
        oldStatus: existingInvoice.status,
        newStatus: status,
        updatedBy: context.userId
      });

      return updatedInvoice[0];

    } catch (error) {
      await transaction.rollback();
      this.logger.error('Failed to update invoice status', { error, invoiceId, status });
      throw error;
    }
  }

  // Payment Processing Methods

  /**
   * Process a payment
   */
  async processPayment(paymentData: NewPayment, context: any): Promise<Payment> {
    const db = this.db.getDb();
    const transaction = await db.beginTransaction();

    try {
      this.logger.info('Processing payment', {
        invoiceId: paymentData.invoiceId,
        amount: paymentData.amount.toString(),
        paymentMethod: paymentData.paymentMethod
      });

      // Validate payment rules
      await this.validatePaymentRules(paymentData);

      // Generate unique payment number
      if (!paymentData.paymentNumber) {
        paymentData.paymentNumber = await this.generatePaymentNumber();
      }

      // Get invoice details
      const invoice = await this.getInvoiceById(paymentData.invoiceId);

      // Check if payment amount exceeds balance
      const currentBalance = parseFloat(invoice.balanceAmount.toString());
      const paymentAmount = parseFloat(paymentData.amount.toString());

      if (paymentAmount > currentBalance) {
        throw new BusinessRuleError(`Payment amount (${paymentAmount}) exceeds invoice balance (${currentBalance})`);
      }

      // Calculate net amount (subtract processing fee)
      const processingFee = parseFloat(paymentData.processingFee?.toString() || '0');
      const taxAmount = parseFloat(paymentData.taxAmount?.toString() || '0');
      const netAmount = paymentAmount - processingFee - taxAmount;

      const paymentRecord = {
        ...paymentData,
        netAmount,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const payment = await transaction.insert(payments).values(paymentRecord).returning();

      // Update invoice balance and paid amount
      const newPaidAmount = parseFloat(invoice.paidAmount.toString()) + paymentAmount;
      const newBalanceAmount = currentBalance - paymentAmount;
      const newPaymentStatus = newBalanceAmount === 0 ? 'paid' : newBalanceAmount < paymentAmount ? 'partially_paid' : 'unpaid';

      await transaction
        .update(invoices)
        .set({
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          paymentStatus: newPaymentStatus,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, paymentData.invoiceId));

      // Log transaction
      await this.logTransaction({
        transactionId: payment[0].paymentNumber,
        transactionType: 'payment',
        entityId: payment[0].id,
        action: 'create',
        newValues: payment[0],
        amount: payment[0].amount.toString(),
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }, transaction);

      await transaction.commit();

      // Update payment status to completed
      await this.updatePaymentStatus(payment[0].id, 'completed', context);

      this.logger.logInvoicePaid(
        invoice.id,
        payment[0].id,
        paymentAmount,
        paymentData.paymentMethod
      );

      return payment[0];

    } catch (error) {
      await transaction.rollback();
      this.logger.error('Failed to process payment', { error, paymentData });
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId: number, status: string, context: any): Promise<Payment> {
    const db = this.db.getDb();
    const transaction = await db.beginTransaction();

    try {
      const existingPayment = await this.getPaymentById(paymentId);

      // Validate status transition
      this.validatePaymentStatusTransition(existingPayment.status, status);

      const updatedPayment = await transaction
        .update(payments)
        .set({
          status,
          updatedAt: new Date(),
          paymentDate: status === 'completed' ? new Date() : existingPayment.paymentDate,
          failureReason: status === 'failed' ? context.failureReason : null
        })
        .where(eq(payments.id, paymentId))
        .returning();

      // Log transaction
      await this.logTransaction({
        transactionId: updatedPayment[0].paymentNumber,
        transactionType: 'payment',
        entityId: paymentId,
        action: 'status_update',
        oldValues: { status: existingPayment.status },
        newValues: { status },
        amount: updatedPayment[0].amount.toString(),
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        reason: context.reason
      }, transaction);

      await transaction.commit();

      this.logger.info('Payment status updated', {
        paymentId,
        oldStatus: existingPayment.status,
        newStatus: status,
        updatedBy: context.userId
      });

      return updatedPayment[0];

    } catch (error) {
      await transaction.rollback();
      this.logger.error('Failed to update payment status', { error, paymentId, status });
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: number): Promise<Payment> {
    const db = this.db.getDb();

    try {
      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (payment.length === 0) {
        throw new NotFoundError('Payment');
      }

      return payment[0];

    } catch (error) {
      this.logger.error('Failed to get payment', { error, paymentId });
      throw error;
    }
  }

  // Commission Management Methods

  /**
   * Calculate commission
   */
  async calculateCommission(commissionData: NewCommission, context: any): Promise<Commission> {
    const db = this.db.getDb();
    const transaction = await db.beginTransaction();

    try {
      this.logger.info('Calculating commission', {
        agentId: commissionData.agentId,
        transactionType: commissionData.transactionType,
        baseAmount: commissionData.baseAmount.toString(),
        percentage: commissionData.percentage.toString()
      });

      // Validate commission rules
      await this.validateCommissionRules(commissionData);

      // Generate unique commission number
      if (!commissionData.commissionNumber) {
        commissionData.commissionNumber = await this.generateCommissionNumber();
      }

      // Calculate commission amount
      const baseAmount = parseFloat(commissionData.baseAmount.toString());
      const percentage = parseFloat(commissionData.percentage.toString());
      const commissionAmount = baseAmount * (percentage / 100);

      const commissionRecord = {
        ...commissionData,
        amount: commissionAmount,
        status: 'calculated',
        calculationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const commission = await transaction.insert(commissions).values(commissionRecord).returning();

      // Log transaction
      await this.logTransaction({
        transactionId: commission[0].commissionNumber,
        transactionType: 'commission',
        entityId: commission[0].id,
        action: 'calculate',
        newValues: commission[0],
        amount: commission[0].amount.toString(),
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }, transaction);

      await transaction.commit();

      this.logger.logCommissionCalculated(
        commission[0].id,
        commission[0].agentId,
        commissionAmount,
        commission[0].transactionType
      );

      return commission[0];

    } catch (error) {
      await transaction.rollback();
      this.logger.error('Failed to calculate commission', { error, commissionData });
      throw error;
    }
  }

  /**
   * Get commission by ID
   */
  async getCommissionById(commissionId: number): Promise<Commission> {
    const db = this.db.getDb();

    try {
      const commission = await db
        .select()
        .from(commissions)
        .where(eq(commissions.id, commissionId))
        .limit(1);

      if (commission.length === 0) {
        throw new NotFoundError('Commission');
      }

      return commission[0];

    } catch (error) {
      this.logger.error('Failed to get commission', { error, commissionId });
      throw error;
    }
  }

  // Financial Analytics Methods

  /**
   * Get financial dashboard metrics
   */
  async getFinancialDashboardMetrics(filters: any): Promise<any> {
    const db = this.db.getDb();

    try {
      // Get invoice metrics
      const invoiceMetrics = await db
        .select({
          total: count(),
          totalAmount: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
          paidAmount: sql<number>`COALESCE(SUM(${invoices.paidAmount}), 0)`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'pending' THEN ${invoices.totalAmount} END), 0)`,
          overdueAmount: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'overdue' THEN ${invoices.totalAmount} END), 0)`,
          draftCount: sql<number>`COUNT(CASE WHEN ${invoices.status} = 'draft' THEN 1 END)`,
          sentCount: sql<number>`COUNT(CASE WHEN ${invoices.status} = 'sent' THEN 1 END)`,
          paidCount: sql<number>`COUNT(CASE WHEN ${invoices.status} = 'paid' THEN 1 END)`,
          overdueCount: sql<number>`COUNT(CASE WHEN ${invoices.status} = 'overdue' THEN 1 END)`
        })
        .from(invoices);

      // Get payment metrics
      const paymentMetrics = await db
        .select({
          total: count(),
          totalAmount: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
          completedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} END), 0)`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'pending' THEN ${payments.amount} END), 0)`,
          failedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'failed' THEN ${payments.amount} END), 0)`,
          mpesaAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentMethod} = 'mpesa' AND ${payments.status} = 'completed' THEN ${payments.amount} END), 0)`,
          cardAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentMethod} = 'card' AND ${payments.status} = 'completed' THEN ${payments.amount} END), 0)`,
          bankAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentMethod} = 'bank' AND ${payments.status} = 'completed' THEN ${payments.amount} END), 0)`
        })
        .from(payments);

      // Get commission metrics
      const commissionMetrics = await db
        .select({
          total: count(),
          totalAmount: sql<number>`COALESCE(SUM(${commissions.amount}), 0)`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${commissions.status} = 'pending' THEN ${commissions.amount} END), 0)`,
          calculatedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${commissions.status} = 'calculated' THEN ${commissions.amount} END), 0)`,
          paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${commissions.status} = 'paid' THEN ${commissions.amount} END), 0)`
        })
        .from(commissions);

      // Calculate financial ratios
      const totalInvoiced = invoiceMetrics[0]?.totalAmount || 0;
      const totalPaid = paymentMetrics[0]?.completedAmount || 0;
      const totalOverdue = invoiceMetrics[0]?.overdueAmount || 0;
      const totalPending = invoiceMetrics[0]?.pendingAmount || 0;

      return {
        invoices: {
          total: invoiceMetrics[0]?.total || 0,
          totalAmount: totalInvoiced,
          paidAmount: invoiceMetrics[0]?.paidAmount || 0,
          pendingAmount: totalPending,
          overdueAmount: totalOverdue,
          draftCount: invoiceMetrics[0]?.draftCount || 0,
          sentCount: invoiceMetrics[0]?.sentCount || 0,
          paidCount: invoiceMetrics[0]?.paidCount || 0,
          overdueCount: invoiceMetrics[0]?.overdueCount || 0
        },
        payments: {
          total: paymentMetrics[0]?.total || 0,
          totalAmount: paymentMetrics[0]?.totalAmount || 0,
          completedAmount: paymentMetrics[0]?.completedAmount || 0,
          pendingAmount: paymentMetrics[0]?.pendingAmount || 0,
          failedAmount: paymentMetrics[0]?.failedAmount || 0,
          mpesaAmount: paymentMetrics[0]?.mpesaAmount || 0,
          cardAmount: paymentMetrics[0]?.cardAmount || 0,
          bankAmount: paymentMetrics[0]?.bankAmount || 0
        },
        commissions: {
          total: commissionMetrics[0]?.total || 0,
          totalAmount: commissionMetrics[0]?.totalAmount || 0,
          pendingAmount: commissionMetrics[0]?.pendingAmount || 0,
          calculatedAmount: commissionMetrics[0]?.calculatedAmount || 0,
          paidAmount: commissionMetrics[0]?.paidAmount || 0
        },
        ratios: {
          collectionRate: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
          overdueRate: totalInvoiced > 0 ? (totalOverdue / totalInvoiced) * 100 : 0,
          paymentSuccessRate: paymentMetrics[0]?.total > 0 ? ((paymentMetrics[0]?.completedAmount || 0) / (paymentMetrics[0]?.totalAmount || 1)) * 100 : 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to get financial dashboard metrics', { error, filters });
      throw error;
    }
  }

  // Private helper methods

  private async validateInvoiceRules(invoiceData: NewInvoice): Promise<void> {
    // Validate amounts
    if (parseFloat(invoiceData.amount.toString()) <= 0) {
      throw new ValidationError('Invoice amount must be greater than 0');
    }

    // Validate dates
    if (new Date(invoiceData.dueDate) <= new Date(invoiceData.issueDate)) {
      throw new ValidationError('Due date must be after issue date');
    }

    // Validate currency
    const validCurrencies = ['KES', 'USD', 'EUR', 'GBP'];
    if (!validCurrencies.includes(invoiceData.currency)) {
      throw new ValidationError('Invalid currency');
    }
  }

  private async validatePaymentRules(paymentData: NewPayment): Promise<void> {
    // Validate amount
    if (parseFloat(paymentData.amount.toString()) <= 0) {
      throw new ValidationError('Payment amount must be greater than 0');
    }

    // Validate payment method
    const validPaymentMethods = ['mpesa', 'card', 'bank', 'cash', 'mobile'];
    if (!validPaymentMethods.includes(paymentData.paymentMethod)) {
      throw new ValidationError('Invalid payment method');
    }

    // Validate currency
    const validCurrencies = ['KES', 'USD', 'EUR', 'GBP'];
    if (!validCurrencies.includes(paymentData.currency)) {
      throw new ValidationError('Invalid currency');
    }
  }

  private async validateCommissionRules(commissionData: NewCommission): Promise<void> {
    // Validate amounts
    if (parseFloat(commissionData.baseAmount.toString()) <= 0) {
      throw new ValidationError('Base amount must be greater than 0');
    }

    // Validate percentage
    const percentage = parseFloat(commissionData.percentage.toString());
    if (percentage < 0 || percentage > 100) {
      throw new ValidationError('Commission percentage must be between 0 and 100');
    }

    // Validate commission type
    const validTypes = ['percentage', 'fixed', 'tiered'];
    if (!validTypes.includes(commissionData.commissionType)) {
      throw new ValidationError('Invalid commission type');
    }
  }

  private validateInvoiceStatusTransition(currentStatus: string, newStatus: string): void {
    const allowedTransitions: Record<string, string[]> = {
      'draft': ['sent', 'cancelled'],
      'sent': ['paid', 'overdue', 'cancelled'],
      'paid': ['refunded'],
      'overdue': ['paid', 'cancelled'],
      'cancelled': []
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new InvoiceStatusError(currentStatus, newStatus, `Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private validatePaymentStatusTransition(currentStatus: string, newStatus: string): void {
    const allowedTransitions: Record<string, string[]> = {
      'pending': ['completed', 'failed', 'cancelled'],
      'completed': ['refunded'],
      'failed': ['pending', 'cancelled'],
      'refunded': [],
      'cancelled': []
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new PaymentStatusError(currentStatus, newStatus, `Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private async checkForDuplicateInvoice(invoiceData: NewInvoice): Promise<void> {
    const db = this.db.getDb();

    const existingInvoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, invoiceData.invoiceNumber!))
      .limit(1);

    if (existingInvoice.length > 0) {
      throw new ValidationError('Invoice number already exists');
    }
  }

  private async generateInvoiceNumber(companyId: number): Promise<string> {
    const db = this.db.getDb();

    const prefix = `INV-${companyId.toString().padStart(3, '0')}`;

    const lastInvoice = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(sql`${invoices.invoiceNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(invoices.invoiceNumber))
      .limit(1);

    let nextNumber = 1;
    if (lastInvoice.length > 0) {
      const lastInvoiceNumber = lastInvoice[0].invoiceNumber;
      const lastNumber = parseInt(lastInvoiceNumber.replace(prefix, '')) || 0;
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  private async generatePaymentNumber(): Promise<string> {
    const db = this.db.getDb();

    const prefix = `PAY`;

    const lastPayment = await db
      .select({ paymentNumber: payments.paymentNumber })
      .from(payments)
      .where(sql`${payments.paymentNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(payments.paymentNumber))
      .limit(1);

    let nextNumber = 1;
    if (lastPayment.length > 0) {
      const lastPaymentNumber = lastPayment[0].paymentNumber;
      const lastNumber = parseInt(lastPaymentNumber.replace(prefix, '')) || 0;
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(8, '0')}`;
  }

  private async generateCommissionNumber(): Promise<string> {
    const db = this.db.getDb();

    const prefix = `COM`;

    const lastCommission = await db
      .select({ commissionNumber: commissions.commissionNumber })
      .from(commissions)
      .where(sql`${commissions.commissionNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(commissions.commissionNumber))
      .limit(1);

    let nextNumber = 1;
    if (lastCommission.length > 0) {
      const lastCommissionNumber = lastCommission[0].commissionNumber;
      const lastNumber = parseInt(lastCommissionNumber.replace(prefix, '')) || 0;
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(8, '0')}`;
  }

  private async logTransaction(transactionData: any, transaction: any): Promise<void> {
    const logRecord: NewTransactionLog = {
      transactionId: transactionData.transactionId,
      transactionType: transactionData.transactionType,
      entityId: transactionData.entityId,
      action: transactionData.action,
      oldValues: transactionData.oldValues,
      newValues: transactionData.newValues,
      amount: transactionData.amount ? parseFloat(transactionData.amount) : undefined,
      currency: transactionData.currency || 'KES',
      userId: transactionData.userId,
      ipAddress: transactionData.ipAddress,
      userAgent: transactionData.userAgent,
      sessionId: transactionData.sessionId,
      reason: transactionData.reason,
      status: 'completed',
      metadata: transactionData.metadata || {},
      createdAt: new Date()
    };

    await transaction.insert(transactionLogs).values(logRecord);
  }
}