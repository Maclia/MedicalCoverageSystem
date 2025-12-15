import { Injectable, Inject } from '@nestjs/common';
import { DrizzlePool } from '../database/types';
import * as schema from '../shared/schema';
import { eq, and, desc, sql, lt, gte, between } from 'drizzle-orm';
import {
  Claim,
  ClaimStatus,
  ClaimPayment,
  ClaimPaymentStatus,
  ClaimPaymentType,
  ClaimApprovalWorkflow,
  ClaimApprovalStatus,
  ClaimFinancialTransaction,
  FinancialTransactionType,
  FinancialTransactionStatus
} from '../shared/schema';

@Injectable()
export class ClaimsPaymentService {
  constructor(@Inject('DATABASE') private db: DrizzlePool) {}

  /**
   * Create new claim payment request
   */
  async createPayment(request: {
    claimId: string;
    paymentType: ClaimPaymentType;
    amount: number;
    currency: string;
    description: string;
    payeeName: string;
    payeeType: 'MEMBER' | 'PROVIDER' | 'LAWYER' | 'OTHER';
    payeeReference?: string;
    dueDate: Date;
    requestedBy: string;
  }): Promise<ClaimPayment> {
    const claim = await this.db.select()
      .from(schema.claims)
      .where(eq(schema.claims.id, request.claimId))
      .limit(1);

    if (!claim[0]) {
      throw new Error('Claim not found');
    }

    if (claim[0].status !== ClaimStatus.APPROVED) {
      throw new Error('Claim must be approved before payment processing');
    }

    // Check available reserves
    const reserves = await this.db.select({
      totalReserve: sql<number>`SUM(CASE WHEN ${schema.claimReserves.reserveType} = 'INCURRED_LOSS' THEN ${schema.claimReserves.amount} ELSE 0 END)`
    })
      .from(schema.claimReserves)
      .where(eq(schema.claimReserves.claimId, request.claimId));

    const totalReserve = reserves[0]?.totalReserve || 0;

    // Get existing payments for this claim
    const existingPayments = await this.db.select({
      totalPaid: sql<number>`SUM(${schema.claimPayments.amount})`
    })
      .from(schema.claimPayments)
      .where(
        and(
          eq(schema.claimPayments.claimId, request.claimId),
          eq(schema.claimPayments.status, ClaimPaymentStatus.COMPLETED)
        )
      );

    const totalPaid = existingPayments[0]?.totalPaid || 0;

    if (totalPaid + request.amount > totalReserve) {
      throw new Error('Payment amount exceeds available reserves');
    }

    const payment = await this.db.insert(schema.claimPayments)
      .values({
        claimId: request.claimId,
        paymentType: request.paymentType,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        payeeName: request.payeeName,
        payeeType: request.payeeType,
        payeeReference: request.payeeReference,
        dueDate: request.dueDate,
        status: ClaimPaymentStatus.PENDING,
        requestedBy: request.requestedBy,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create approval workflow
    await this.db.insert(schema.claimApprovalWorkflows)
      .values({
        claimId: request.claimId,
        paymentId: payment[0].id,
        workflowType: 'PAYMENT_APPROVAL',
        currentStep: 1,
        status: ClaimApprovalStatus.PENDING,
        initiatorId: request.requestedBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });

    // Record financial transaction
    await this.db.insert(schema.claimFinancialTransactions)
      .values({
        claimId: request.claimId,
        transactionType: FinancialTransactionType.PAYMENT_REQUEST,
        amount: request.amount,
        currency: request.currency,
        status: FinancialTransactionStatus.PENDING,
        description: `Payment request: ${request.description}`,
        referenceId: payment[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

    return payment[0];
  }

  /**
   * Process payment approval
   */
  async processPaymentApproval(
    paymentId: string,
    approved: boolean,
    approverId: string,
    comments?: string
  ): Promise<ClaimPayment> {
    const payment = await this.db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.id, paymentId))
      .limit(1);

    if (!payment[0]) {
      throw new Error('Payment not found');
    }

    if (payment[0].status !== ClaimPaymentStatus.PENDING) {
      throw new Error('Payment is not in pending status');
    }

    const newStatus = approved ? ClaimPaymentStatus.APPROVED : ClaimPaymentStatus.REJECTED;

    // Update payment status
    const updatedPayment = await this.db.update(schema.claimPayments)
      .set({
        status: newStatus,
        approvedBy: approverId,
        approvedAt: approved ? new Date() : undefined,
        updatedAt: new Date()
      })
      .where(eq(schema.claimPayments.id, paymentId))
      .returning();

    // Update approval workflow
    const workflow = await this.db.select()
      .from(schema.claimApprovalWorkflows)
      .where(eq(schema.claimApprovalWorkflows.paymentId, paymentId))
      .limit(1);

    if (workflow[0]) {
      await this.db.update(schema.claimApprovalWorkflows)
        .set({
          currentStep: approved ? 2 : workflow[0].currentStep,
          status: approved ? ClaimApprovalStatus.APPROVED : ClaimApprovalStatus.REJECTED,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(schema.claimApprovalWorkflows.id, workflow[0].id));

      // Add approval step
      await this.db.insert(schema.claimApprovalSteps)
        .values({
          workflowId: workflow[0].id,
          stepNumber: workflow[0].currentStep,
          stepType: 'PAYMENT_APPROVAL',
          assignedTo: approverId,
          status: approved ? 'APPROVED' : 'REJECTED',
          decision: approved ? 'APPROVED' : 'REJECTED',
          comments,
          completedAt: new Date(),
          createdAt: new Date()
        });
    }

    // Update financial transaction
    await this.db.update(schema.claimFinancialTransactions)
      .set({
        status: approved ? FinancialTransactionStatus.APPROVED : FinancialTransactionStatus.REJECTED,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(schema.claimFinancialTransactions.referenceId, paymentId),
          eq(schema.claimFinancialTransactions.transactionType, FinancialTransactionType.PAYMENT_REQUEST)
        )
      );

    return updatedPayment[0];
  }

  /**
   * Execute payment
   */
  async executePayment(
    paymentId: string,
    paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'MOBILE_MONEY' | 'CREDIT_CARD',
    executionData: {
      referenceNumber?: string;
      accountNumber?: string;
      bankName?: string;
      checkNumber?: string;
      mobileNumber?: string;
    },
    executorId: string
  ): Promise<ClaimPayment> {
    const payment = await this.db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.id, paymentId))
      .limit(1);

    if (!payment[0]) {
      throw new Error('Payment not found');
    }

    if (payment[0].status !== ClaimPaymentStatus.APPROVED) {
      throw new Error('Payment must be approved before execution');
    }

    // Execute payment (integration with payment service would go here)
    const paymentReference = await this.processPaymentWithGateway(
      payment[0],
      paymentMethod,
      executionData
    );

    const updatedPayment = await this.db.update(schema.claimPayments)
      .set({
        status: ClaimPaymentStatus.PROCESSING,
        paymentMethod,
        paymentReference,
        executedBy: executorId,
        executedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.claimPayments.id, paymentId))
      .returning();

    // Record execution transaction
    await this.db.insert(schema.claimFinancialTransactions)
      .values({
        claimId: payment[0].claimId,
        transactionType: FinancialTransactionType.PAYMENT_EXECUTION,
        amount: payment[0].amount,
        currency: payment[0].currency,
        status: FinancialTransactionStatus.PROCESSING,
        description: `Payment execution via ${paymentMethod}`,
        referenceId: paymentId,
        paymentReference,
        createdAt: new Date(),
        updatedAt: new Date()
      });

    return updatedPayment[0];
  }

  /**
   * Confirm payment completion
   */
  async confirmPaymentCompletion(
    paymentId: string,
    confirmationData?: any,
    confirmedBy?: string
  ): Promise<ClaimPayment> {
    const payment = await this.db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.id, paymentId))
      .limit(1);

    if (!payment[0]) {
      throw new Error('Payment not found');
    }

    if (payment[0].status !== ClaimPaymentStatus.PROCESSING) {
      throw new Error('Payment is not in processing status');
    }

    const updatedPayment = await this.db.update(schema.claimPayments)
      .set({
        status: ClaimPaymentStatus.COMPLETED,
        completedAt: new Date(),
        confirmedBy,
        confirmationData,
        updatedAt: new Date()
      })
      .where(eq(schema.claimPayments.id, paymentId))
      .returning();

    // Update financial transaction
    await this.db.update(schema.claimFinancialTransactions)
      .set({
        status: FinancialTransactionStatus.POSTED,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(schema.claimFinancialTransactions.referenceId, paymentId),
          eq(schema.claimFinancialTransactions.transactionType, FinancialTransactionType.PAYMENT_EXECUTION)
        )
      );

    return updatedPayment[0];
  }

  /**
   * Process payment rejection/failure
   */
  async processPaymentFailure(
    paymentId: string,
    failureReason: string,
    failureCode?: string,
    processorId?: string
  ): Promise<ClaimPayment> {
    const payment = await this.db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.id, paymentId))
      .limit(1);

    if (!payment[0]) {
      throw new Error('Payment not found');
    }

    const updatedPayment = await this.db.update(schema.claimPayments)
      .set({
        status: ClaimPaymentStatus.FAILED,
        failureReason,
        failureCode,
        processedBy: processorId,
        updatedAt: new Date()
      })
      .where(eq(schema.claimPayments.id, paymentId))
      .returning();

    // Update financial transaction
    await this.db.update(schema.claimFinancialTransactions)
      .set({
        status: FinancialTransactionStatus.FAILED,
        description: `Payment failed: ${failureReason}`,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(schema.claimFinancialTransactions.referenceId, paymentId),
          eq(schema.claimFinancialTransactions.transactionType, FinancialTransactionType.PAYMENT_EXECUTION)
        )
      );

    return updatedPayment[0];
  }

  /**
   * Get payment with full details
   */
  async getPaymentDetails(paymentId: string): Promise<{
    payment: ClaimPayment;
    claim?: any;
    workflow?: any;
    transactions: ClaimFinancialTransaction[];
  }> {
    const payment = await this.db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.id, paymentId))
      .limit(1);

    if (!payment[0]) {
      throw new Error('Payment not found');
    }

    const [claim, workflow, transactions] = await Promise.all([
      this.db.select({
        claimNumber: schema.claims.claimNumber,
        policyNumber: schema.policies.policyNumber,
        clientName: schema.clients.name,
        memberName: schema.members.name
      })
        .from(schema.claims)
        .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
        .leftJoin(schema.clients, eq(schema.clients.id, schema.policies.clientId))
        .leftJoin(schema.members, eq(schema.members.id, schema.claims.memberId))
        .where(eq(schema.claims.id, payment[0].claimId))
        .limit(1),

      this.db.select()
        .from(schema.claimApprovalWorkflows)
        .where(eq(schema.claimApprovalWorkflows.paymentId, paymentId))
        .limit(1),

      this.db.select()
        .from(schema.claimFinancialTransactions)
        .where(eq(schema.claimFinancialTransactions.referenceId, paymentId))
        .orderBy(schema.claimFinancialTransactions.createdAt)
    ]);

    return {
      payment: payment[0],
      claim: claim[0],
      workflow: workflow[0],
      transactions
    };
  }

  /**
   * Get payments by claim
   */
  async getClaimPayments(claimId: string, status?: ClaimPaymentStatus): Promise<ClaimPayment[]> {
    let whereConditions = [eq(schema.claimPayments.claimId, claimId)];

    if (status) {
      whereConditions.push(eq(schema.claimPayments.status, status));
    }

    return await this.db.select()
      .from(schema.claimPayments)
      .where(whereConditions.length > 1 ? sql`${whereConditions.join(' AND ')}` : whereConditions[0])
      .orderBy(desc(schema.claimPayments.createdAt));
  }

  /**
   * Generate payment report
   */
  async generatePaymentReport(criteria: {
    dateFrom?: Date;
    dateTo?: Date;
    status?: ClaimPaymentStatus;
    paymentType?: ClaimPaymentType;
    payeeType?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<any[]> {
    let whereConditions: any[] = [];

    if (criteria.dateFrom && criteria.dateTo) {
      whereConditions.push(
        between(schema.claimPayments.createdAt, criteria.dateFrom, criteria.dateTo)
      );
    }

    if (criteria.status) {
      whereConditions.push(eq(schema.claimPayments.status, criteria.status));
    }

    if (criteria.paymentType) {
      whereConditions.push(eq(schema.claimPayments.paymentType, criteria.paymentType));
    }

    if (criteria.payeeType) {
      whereConditions.push(eq(schema.claimPayments.payeeType, criteria.payeeType));
    }

    if (criteria.minAmount) {
      whereConditions.push(gte(schema.claimPayments.amount, criteria.minAmount));
    }

    if (criteria.maxAmount) {
      whereConditions.push(sql`${schema.claimPayments.amount} <= ${criteria.maxAmount}`);
    }

    const payments = await this.db.select({
      id: schema.claimPayments.id,
      claimNumber: schema.claims.claimNumber,
      policyNumber: schema.policies.policyNumber,
      clientName: schema.clients.name,
      paymentType: schema.claimPayments.paymentType,
      amount: schema.claimPayments.amount,
      currency: schema.claimPayments.currency,
      status: schema.claimPayments.status,
      payeeName: schema.claimPayments.payeeName,
      payeeType: schema.claimPayments.payeeType,
      description: schema.claimPayments.description,
      dueDate: schema.claimPayments.dueDate,
      createdAt: schema.claimPayments.createdAt,
      approvedAt: schema.claimPayments.approvedAt,
      completedAt: schema.claimPayments.completedAt
    })
      .from(schema.claimPayments)
      .leftJoin(schema.claims, eq(schema.claims.id, schema.claimPayments.claimId))
      .leftJoin(schema.policies, eq(schema.policies.id, schema.claims.policyId))
      .leftJoin(schema.clients, eq(schema.clients.id, schema.policies.clientId))
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined)
      .orderBy(desc(schema.claimPayments.createdAt));

    return payments;
  }

  /**
   * Process overdue payments
   */
  async processOverduePayments(): Promise<{
    overdueCount: number;
    overdueAmount: number;
    processed: number;
  }> {
    const today = new Date();

    // Find overdue payments
    const overduePayments = await this.db.select()
      .from(schema.claimPayments)
      .where(
        and(
          lt(schema.claimPayments.dueDate, today),
          eq(schema.claimPayments.status, ClaimPaymentStatus.APPROVED)
        )
      );

    const overdueAmount = overduePayments.reduce((sum, payment) => sum + payment.amount, 0);
    let processed = 0;

    // Send reminders or escalate
    for (const payment of overduePayments) {
      // Check if escalation is needed (e.g., 30 days overdue)
      const daysOverdue = Math.floor((today.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue >= 30) {
        // Escalate to manager
        await this.db.update(schema.claimPayments)
          .set({
            status: ClaimPaymentStatus.ESCALATED,
            updatedAt: new Date()
          })
          .where(eq(schema.claimPayments.id, payment.id));
        processed++;
      }
    }

    return {
      overdueCount: overduePayments.length,
      overdueAmount,
      processed
    };
  }

  /**
   * Calculate payment statistics
   */
  async getPaymentStatistics(period: 'month' | 'quarter' | 'year', count: number = 12): Promise<{
    totalPayments: number;
    totalAmount: number;
    averageAmount: number;
    paymentBreakdown: any[];
    trends: any[];
  }> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - count);

    const [payments, breakdown] = await Promise.all([
      this.db.select({
        totalPayments: sql<number>`COUNT(*)`.as('totalPayments'),
        totalAmount: sql<number>`SUM(${schema.claimPayments.amount})`.as('totalAmount'),
        averageAmount: sql<number>`AVG(${schema.claimPayments.amount})`.as('averageAmount')
      })
        .from(schema.claimPayments)
        .where(
          and(
            gte(schema.claimPayments.createdAt, startDate),
            eq(schema.claimPayments.status, ClaimPaymentStatus.COMPLETED)
          )
        ),

      this.db.select({
        paymentType: schema.claimPayments.paymentType,
        count: sql<number>`COUNT(*)`.as('count'),
        amount: sql<number>`SUM(${schema.claimPayments.amount})`.as('amount')
      })
        .from(schema.claimPayments)
        .where(
          and(
            gte(schema.claimPayments.createdAt, startDate),
            eq(schema.claimPayments.status, ClaimPaymentStatus.COMPLETED)
          )
        )
        .groupBy(schema.claimPayments.paymentType)
    ]);

    // Get trends
    const dateFormat = period === 'month' ? 'YYYY-MM' : period === 'quarter' ? 'YYYY-"Q"Q' : 'YYYY';

    const trends = await this.db.select({
      period: sql<string>`TO_CHAR(${schema.claimPayments.createdAt}, '${dateFormat}')`.as('period'),
      count: sql<number>`COUNT(*)`.as('count'),
      amount: sql<number>`SUM(${schema.claimPayments.amount})`.as('amount')
    })
      .from(schema.claimPayments)
      .where(
        and(
          gte(schema.claimPayments.createdAt, startDate),
          eq(schema.claimPayments.status, ClaimPaymentStatus.COMPLETED)
        )
      )
      .groupBy(sql`TO_CHAR(${schema.claimPayments.createdAt}, '${dateFormat}')`)
      .orderBy(sql`period`)
      .limit(count);

    return {
      totalPayments: payments[0]?.totalPayments || 0,
      totalAmount: Number(payments[0]?.totalAmount || 0),
      averageAmount: Number(payments[0]?.averageAmount || 0),
      paymentBreakdown: breakdown,
      trends
    };
  }

  /**
   * Integration with payment gateway (placeholder)
   */
  private async processPaymentWithGateway(
    payment: ClaimPayment,
    method: string,
    data: any
  ): Promise<string> {
    // This would integrate with actual payment gateways
    // For now, return a mock reference
    return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Bulk payment processing
   */
  async processBulkPayments(paymentIds: string[], executorId: string): Promise<{
    success: string[];
    failed: { id: string; error: string }[];
  }> {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const paymentId of paymentIds) {
      try {
        const payment = await this.db.select()
          .from(schema.claimPayments)
          .where(eq(schema.claimPayments.id, paymentId))
          .limit(1);

        if (!payment[0] || payment[0].status !== ClaimPaymentStatus.APPROVED) {
          failed.push({ id: paymentId, error: 'Payment not approved' });
          continue;
        }

        await this.executePayment(
          paymentId,
          'BANK_TRANSFER',
          {
            referenceNumber: `BULK-${Date.now()}`,
            accountNumber: 'DEFAULT_ACCOUNT'
          },
          executorId
        );

        success.push(paymentId);
      } catch (error) {
        failed.push({
          id: paymentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { success, failed };
  }
}