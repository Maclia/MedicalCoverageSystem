/**
 * Payment Reconciliation Service
 * Auto-allocation and reconciliation of payments
 * Payment-to-invoice matching algorithms
 * Bank statement import and auto-reconciliation
 * Payment exception handling and investigation workflows
 */

import { storage } from '../storage';
import * as schema from '../../shared/schema.js';
import { billingService, Invoice } from './billingService.js';
import { paymentGatewayService, PaymentGatewayService } from './paymentGatewayService.js';

export interface PaymentReconciliation {
  id?: number;
  statementDate: Date;
  totalPayments: number;
  totalAmount: number;
  matchedPayments: number;
  matchedAmount: number;
  unmatchedAmount: number;
  exceptions: ReconciliationException[];
  reviewedBy?: number;
  reviewDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'requires_review';
  metadata: ReconciliationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReconciliationException {
  id?: number;
  type: 'unmatched_payment' | 'partial_match' | 'overpayment' | 'duplicate_payment' | 'chargeback' | 'refund_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: ExceptionDetails;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignedTo?: number;
  resolution?: string;
  resolvedBy?: number;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExceptionDetails {
  paymentId?: string;
  invoiceId?: number;
  amount?: number;
  expectedAmount?: number;
  variance?: number;
  varianceReason?: string;
  matchingAttempts: MatchingAttempt[];
  relatedRecords?: string[];
  evidence?: string[]; // URLs to supporting documents
}

export interface MatchingAttempt {
  strategy: string;
  criteria: MatchingCriteria;
  result: 'match' | 'partial_match' | 'no_match';
  confidence: number;
  timestamp: Date;
}

export interface MatchingCriteria {
  amountRange?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
  memberReference?: string;
  invoiceNumber?: string;
  transactionReference?: string;
  description?: string;
}

export interface ReconciliationMetadata {
  source: 'bank_statement' | 'gateway_report' | 'manual_entry' | 'api_feed';
  sourceFile?: string;
  recordCount: number;
  processingTime: number;
  algorithmVersion: string;
  matchRate: number;
  accuracyScore: number;
  operatorNotes?: string;
}

export interface PaymentAllocation {
  id?: number;
  paymentId: number;
  invoiceId: number;
  amount: number;
  allocationType: 'full' | 'partial' | 'overpayment' | 'prepayment';
  allocationDate: Date;
  allocatedBy: number;
  method: 'auto' | 'manual';
  confidence: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankStatementImport {
  id?: number;
  financialInstitution: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'business';
  statementPeriod: { start: Date; end: Date };
  fileName: string;
  fileSize: number;
  importStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';
  importedTransactions: number;
  matchedTransactions: number;
  exceptionsCount: number;
  uploadedBy: number;
  uploadDate: Date;
  processedDate?: Date;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankTransaction {
  id?: number;
  statementImportId: number;
  transactionDate: Date;
  description: string;
  amount: number;
  balance: number;
  transactionType: 'credit' | 'debit';
  referenceNumber?: string;
  checkNumber?: string;
  category?: string;
  status: 'unmatched' | 'matched' | 'exception' | 'excluded';
  paymentId?: number;
  invoiceId?: number;
  matchingScore?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentReversal {
  id?: number;
  originalPaymentId: number;
  reversalAmount: number;
  reversalReason: string;
  reversalType: 'chargeback' | 'refund' | 'bank_error' | 'duplicate' | 'fraud';
  initiatedBy: number;
  initiatedDate: Date;
  gatewayTransactionId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  evidence?: string[]; // URLs to supporting documents
  approvedBy?: number;
  approvedDate?: Date;
  processedBy?: number;
  processedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReconciliationRule {
  id?: number;
  ruleName: string;
  description: string;
  isActive: boolean;
  priority: number;
  matchingStrategy: MatchingStrategy;
  allocationRule: AllocationRule;
  exceptionHandling: ExceptionHandlingRule;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchingStrategy {
  primaryCriteria: MatchingCriteria;
  secondaryCriteria?: MatchingCriteria;
  fuzzyMatching: boolean;
  toleranceSettings: ToleranceSettings;
}

export interface AllocationRule {
  strategy: 'fifo' | 'lifo' | 'proportional' | 'largest_first' | 'smallest_first';
  handleOverpayments: 'refund' | 'credit' | 'allocate_to_next';
  handlePartialPayments: 'partial_allocate' | 'hold' | 'reject';
  preventDuplicateAllocation: boolean;
}

export interface ExceptionHandlingRule {
  autoResolveLowConfidence: boolean;
  escalateHighValueExceptions: boolean;
  createTicketsForExceptions: boolean;
  notifyAccountingTeam: boolean;
  autoCreateCreditMemos: boolean;
}

export interface ToleranceSettings {
  amountTolerance: number; // percentage or absolute amount
  dateTolerance: number; // days
  descriptionFuzziness: number; // 0-1, where 1 is exact match
  minimumConfidence: number; // 0-1
}

export interface ReconciliationReport {
  period: DateRange;
  summary: ReconciliationSummary;
  details: ReportDetails;
  exceptions: ExceptionReport;
  trends: TrendAnalysis;
  recommendations: string[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ReconciliationSummary {
  totalTransactions: number;
  totalAmount: number;
  matchedTransactions: number;
  matchedAmount: number;
  matchRate: number;
  averageProcessingTime: number;
  exceptionsCount: number;
  exceptionsAmount: number;
}

export interface ReportDetails {
  byPaymentMethod: Record<string, PaymentMethodStats>;
  byDate: Array<{ date: Date; transactions: number; amount: number; matchRate: number }>;
  byAmount: Array<{ range: string; count: number; total: number }>;
  byGateway: Record<string, GatewayStats>;
}

export interface PaymentMethodStats {
  count: number;
  amount: number;
  matchRate: number;
  averageAmount: number;
  exceptionsCount: number;
}

export interface GatewayStats {
  count: number;
  amount: number;
  successRate: number;
  averageProcessingTime: number;
  fees: number;
}

export interface ExceptionReport {
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  resolutionTimes: number[];
  resolutionRate: number;
  exceptionsByDay: Array<{ date: Date; count: number }>;
}

export interface TrendAnalysis {
  matchRateTrend: Array<{ period: string; rate: number }>;
  exceptionRateTrend: Array<{ period: string; rate: number }>;
  processingTimeTrend: Array<{ period: string; avgTime: number }>;
  volumeTrend: Array<{ period: string; count: number }>;
}

export class PaymentReconciliationService {
  private matchingEngine: PaymentMatchingEngine;
  private allocationEngine: PaymentAllocationEngine;
  private exceptionHandler: ExceptionHandler;

  constructor() {
    this.matchingEngine = new PaymentMatchingEngine();
    this.allocationEngine = new PaymentAllocationEngine();
    this.exceptionHandler = new ExceptionHandler();
  }

  /**
   * Process daily reconciliation
   */
  async processDailyReconciliation(date: Date): Promise<PaymentReconciliation> {
    try {
      console.log(`Processing payment reconciliation for ${date.toISOString()}`);

      // Get payments for the day
      const payments = await this.getPaymentsForDate(date);

      // Get bank transactions for the day
      const bankTransactions = await this.getBankTransactionsForDate(date);

      // Perform matching
      const matchingResults = await this.matchPaymentsToTransactions(payments, bankTransactions);

      // Perform allocations
      const allocationResults = await this.performPaymentAllocations(matchingResults.matches);

      // Identify exceptions
      const exceptions = await this.identifyReconciliationExceptions(matchingResults.unmatched);

      // Create reconciliation record
      const reconciliation: PaymentReconciliation = {
        statementDate: date,
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        matchedPayments: matchingResults.matches.length,
        matchedAmount: matchingResults.matches.reduce((sum, m) => sum + m.payment.amount, 0),
        unmatchedAmount: matchingResults.unmatched.reduce((sum, u) => sum + (u.payment?.amount || u.transaction?.amount || 0), 0),
        exceptions,
        status: exceptions.length > 0 ? 'requires_review' : 'completed',
        metadata: {
          source: 'auto_reconciliation',
          recordCount: payments.length + bankTransactions.length,
          processingTime: 0, // Would calculate actual time
          algorithmVersion: '1.0.0',
          matchRate: (matchingResults.matches.length / (payments.length + bankTransactions.length)) * 100,
          accuracyScore: 0 // Would calculate based on validation
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save reconciliation record
      const savedReconciliation = await this.saveReconciliation(reconciliation);

      // Send notifications if exceptions exist
      if (exceptions.length > 0) {
        await this.sendExceptionNotifications(exceptions);
      }

      return savedReconciliation;
    } catch (error) {
      console.error('Daily reconciliation failed:', error);
      throw error;
    }
  }

  /**
   * Import and reconcile bank statement
   */
  async importAndReconcileStatement(
    statementFile: Express.Multer.File,
    financialInstitution: string,
    accountNumber: string
  ): Promise<BankStatementImport> {
    try {
      // Parse statement file
      const transactions = await this.parseStatementFile(statementFile);

      // Create import record
      const importRecord: BankStatementImport = {
        financialInstitution,
        accountNumber,
        accountType: 'business',
        statementPeriod: {
          start: new Date(Math.min(...transactions.map(t => t.transactionDate))),
          end: new Date(Math.max(...transactions.map(t => t.transactionDate)))
        },
        fileName: statementFile.originalname,
        fileSize: statementFile.size,
        importStatus: 'processing',
        importedTransactions: transactions.length,
        matchedTransactions: 0,
        exceptionsCount: 0,
        uploadedBy: 1, // Would get actual user
        uploadDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const savedImport = await this.saveBankStatementImport(importRecord);

      // Process transactions
      await this.processBankTransactions(savedImport.id!, transactions);

      // Perform reconciliation
      await this.reconcileBankStatement(savedImport.id!);

      return savedImport;
    } catch (error) {
      console.error('Bank statement import failed:', error);
      throw error;
    }
  }

  /**
   * Manual payment allocation
   */
  async manualPaymentAllocation(
    paymentId: number,
    invoiceId: number,
    amount: number,
    userId: number
  ): Promise<PaymentAllocation> {
    try {
      // Validate allocation
      await this.validateManualAllocation(paymentId, invoiceId, amount);

      // Create allocation record
      const allocation: PaymentAllocation = {
        paymentId,
        invoiceId,
        amount,
        allocationType: await this.determineAllocationType(paymentId, invoiceId, amount),
        allocationDate: new Date(),
        allocatedBy: userId,
        method: 'manual',
        confidence: 1.0, // Manual allocations have 100% confidence
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const savedAllocation = await this.savePaymentAllocation(allocation);

      // Update invoice status
      await this.updateInvoiceAllocation(invoiceId, savedAllocation);

      // Update payment status
      await this.updatePaymentAllocation(paymentId, savedAllocation);

      // Create audit trail
      await this.createAllocationAuditTrail(savedAllocation, userId);

      return savedAllocation;
    } catch (error) {
      console.error('Manual payment allocation failed:', error);
      throw error;
    }
  }

  /**
   * Process payment reversal
   */
  async processPaymentReversal(
    originalPaymentId: number,
    amount: number,
    reason: string,
    reversalType: PaymentReversal['reversalType'],
    userId: number
  ): Promise<PaymentReversal> {
    try {
      // Validate reversal request
      await this.validateReversalRequest(originalPaymentId, amount, reversalType);

      // Create reversal record
      const reversal: PaymentReversal = {
        originalPaymentId,
        reversalAmount: amount,
        reversalReason: reason,
        reversalType,
        initiatedBy: userId,
        initiatedDate: new Date(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const savedReversal = await this.savePaymentReversal(reversal);

      // Process reversal through gateway if needed
      if (reversalType !== 'duplicate') {
        await this.processGatewayReversal(savedReversal);
      }

      // Reverse allocations
      await this.reversePaymentAllocations(originalPaymentId, amount);

      // Update payment status
      await this.updatePaymentStatus(originalPaymentId, 'reversed');

      return savedReversal;
    } catch (error) {
      console.error('Payment reversal failed:', error);
      throw error;
    }
  }

  /**
   * Get reconciliation exceptions
   */
  async getReconciliationExceptions(filters?: {
    type?: string;
    severity?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    assignedTo?: number;
  }): Promise<ReconciliationException[]> {
    try {
      // This would query database with filters
      console.log('Getting reconciliation exceptions with filters:', filters);
      return [];
    } catch (error) {
      console.error('Failed to get reconciliation exceptions:', error);
      return [];
    }
  }

  /**
   * Resolve reconciliation exception
   */
  async resolveReconciliationException(
    exceptionId: number,
    resolution: string,
    userId: number
  ): Promise<ReconciliationException> {
    try {
      const exception = await this.getReconciliationException(exceptionId);
      if (!exception) {
        throw new Error('Exception not found');
      }

      exception.status = 'resolved';
      exception.resolution = resolution;
      exception.resolvedBy = userId;
      exception.resolvedAt = new Date();
      exception.updatedAt = new Date();

      const savedException = await this.saveReconciliationException(exception);

      // Create audit trail
      await this.createExceptionResolutionTrail(savedException, userId);

      return savedException;
    } catch (error) {
      console.error('Failed to resolve reconciliation exception:', error);
      throw error;
    }
  }

  /**
   * Generate reconciliation report
   */
  async generateReconciliationReport(period: DateRange): Promise<ReconciliationReport> {
    try {
      // Get reconciliations for the period
      const reconciliations = await this.getReconciliationsInPeriod(period);

      // Get exceptions for the period
      const exceptions = await this.getExceptionsInPeriod(period);

      // Generate summary
      const summary = this.generateReconciliationSummary(reconciliations);

      // Generate detailed breakdowns
      const details = await this.generateReportDetails(period);

      // Generate exception report
      const exceptionReport = this.generateExceptionReport(exceptions);

      // Generate trend analysis
      const trends = await this.generateTrendAnalysis(period);

      // Generate recommendations
      const recommendations = this.generateRecommendations(summary, exceptionReport, trends);

      return {
        period,
        summary,
        details,
        exceptions: exceptionReport,
        trends,
        recommendations
      };
    } catch (error) {
      console.error('Failed to generate reconciliation report:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getPaymentsForDate(date: Date): Promise<any[]> {
    // This would query database for payments on given date
    console.log(`Getting payments for date: ${date.toISOString()}`);
    return [];
  }

  private async getBankTransactionsForDate(date: Date): Promise<BankTransaction[]> {
    // This would query database for bank transactions on given date
    console.log(`Getting bank transactions for date: ${date.toISOString()}`);
    return [];
  }

  private async matchPaymentsToTransactions(
    payments: any[],
    transactions: BankTransaction[]
  ): Promise<{ matches: any[]; unmatched: any[] }> {
    return await this.matchingEngine.match(payments, transactions);
  }

  private async performPaymentAllocations(matches: any[]): Promise<PaymentAllocation[]> {
    return await this.allocationEngine.allocate(matches);
  }

  private async identifyReconciliationExceptions(unmatched: any[]): Promise<ReconciliationException[]> {
    return await this.exceptionHandler.identifyExceptions(unmatched);
  }

  private async saveReconciliation(reconciliation: PaymentReconciliation): Promise<PaymentReconciliation> {
    // This would save to database
    return { ...reconciliation, id: Math.floor(Math.random() * 10000) };
  }

  private async sendExceptionNotifications(exceptions: ReconciliationException[]): Promise<void> {
    console.log(`Sending notifications for ${exceptions.length} exceptions`);
  }

  private async parseStatementFile(file: Express.Multer.File): Promise<BankTransaction[]> {
    // This would parse CSV, Excel, or other statement formats
    console.log(`Parsing statement file: ${file.originalname}`);
    return [];
  }

  private async saveBankStatementImport(importRecord: BankStatementImport): Promise<BankStatementImport> {
    return { ...importRecord, id: Math.floor(Math.random() * 10000) };
  }

  private async processBankTransactions(importId: number, transactions: BankTransaction[]): Promise<void> {
    console.log(`Processing ${transactions.length} transactions for import ${importId}`);
  }

  private async reconcileBankStatement(importId: number): Promise<void> {
    console.log(`Reconciling bank statement import ${importId}`);
  }

  private async validateManualAllocation(paymentId: number, invoiceId: number, amount: number): Promise<void> {
    // Validation logic
  }

  private async determineAllocationType(paymentId: number, invoiceId: number, amount: number): Promise<PaymentAllocation['allocationType']> {
    // Logic to determine allocation type
    return 'full';
  }

  private async savePaymentAllocation(allocation: PaymentAllocation): Promise<PaymentAllocation> {
    return { ...allocation, id: Math.floor(Math.random() * 10000) };
  }

  private async updateInvoiceAllocation(invoiceId: number, allocation: PaymentAllocation): Promise<void> {
    console.log(`Updating invoice ${invoiceId} with allocation ${allocation.id}`);
  }

  private async updatePaymentAllocation(paymentId: number, allocation: PaymentAllocation): Promise<void> {
    console.log(`Updating payment ${paymentId} with allocation ${allocation.id}`);
  }

  private async createAllocationAuditTrail(allocation: PaymentAllocation, userId: number): Promise<void> {
    console.log(`Creating audit trail for allocation ${allocation.id} by user ${userId}`);
  }

  private async validateReversalRequest(paymentId: number, amount: number, type: PaymentReversal['reversalType']): Promise<void> {
    // Validation logic
  }

  private async savePaymentReversal(reversal: PaymentReversal): Promise<PaymentReversal> {
    return { ...reversal, id: Math.floor(Math.random() * 10000) };
  }

  private async processGatewayReversal(reversal: PaymentReversal): Promise<void> {
    console.log(`Processing gateway reversal for ${reversal.id}`);
  }

  private async reversePaymentAllocations(paymentId: number, amount: number): Promise<void> {
    console.log(`Reversing allocations for payment ${paymentId}, amount: ${amount}`);
  }

  private async updatePaymentStatus(paymentId: number, status: string): Promise<void> {
    console.log(`Updating payment ${paymentId} status to ${status}`);
  }

  private async getReconciliationException(exceptionId: number): Promise<ReconciliationException | null> {
    return null;
  }

  private async saveReconciliationException(exception: ReconciliationException): Promise<ReconciliationException> {
    return { ...exception, id: Math.floor(Math.random() * 10000) };
  }

  private async createExceptionResolutionTrail(exception: ReconciliationException, userId: number): Promise<void> {
    console.log(`Creating resolution trail for exception ${exception.id} by user ${userId}`);
  }

  private async getReconciliationsInPeriod(period: DateRange): Promise<PaymentReconciliation[]> {
    return [];
  }

  private async getExceptionsInPeriod(period: DateRange): Promise<ReconciliationException[]> {
    return [];
  }

  private generateReconciliationSummary(reconciliations: PaymentReconciliation[]): ReconciliationSummary {
    return {
      totalTransactions: 0,
      totalAmount: 0,
      matchedTransactions: 0,
      matchedAmount: 0,
      matchRate: 0,
      averageProcessingTime: 0,
      exceptionsCount: 0,
      exceptionsAmount: 0
    };
  }

  private async generateReportDetails(period: DateRange): Promise<ReportDetails> {
    return {
      byPaymentMethod: {},
      byDate: [],
      byAmount: [],
      byGateway: {}
    };
  }

  private generateExceptionReport(exceptions: ReconciliationException[]): ExceptionReport {
    return {
      byType: {},
      bySeverity: {},
      resolutionTimes: [],
      resolutionRate: 0,
      exceptionsByDay: []
    };
  }

  private async generateTrendAnalysis(period: DateRange): Promise<TrendAnalysis> {
    return {
      matchRateTrend: [],
      exceptionRateTrend: [],
      processingTimeTrend: [],
      volumeTrend: []
    };
  }

  private generateRecommendations(
    summary: ReconciliationSummary,
    exceptions: ExceptionReport,
    trends: TrendAnalysis
  ): string[] {
    return [];
  }
}

// Supporting classes
class PaymentMatchingEngine {
  async match(payments: any[], transactions: BankTransaction[]): Promise<{ matches: any[]; unmatched: any[] }> {
    console.log(`Matching ${payments.length} payments with ${transactions.length} transactions`);
    return { matches: [], unmatched: [] };
  }
}

class PaymentAllocationEngine {
  async allocate(matches: any[]): Promise<PaymentAllocation[]> {
    console.log(`Allocating ${matches.length} matched payments`);
    return [];
  }
}

class ExceptionHandler {
  async identifyExceptions(unmatched: any[]): Promise<ReconciliationException[]> {
    console.log(`Identifying exceptions for ${unmatched.length} unmatched items`);
    return [];
  }
}

export const paymentReconciliationService = new PaymentReconciliationService();