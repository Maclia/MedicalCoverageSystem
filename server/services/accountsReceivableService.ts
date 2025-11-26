/**
 * Accounts Receivable Service
 * Tracks aging invoices, overdue accounts, and collection management
 * Manages credit limits, payment holds, and collection workflows
 */

import { storage } from '../storage';
import * as schema from '../../shared/schema.js';
import { billingService, Invoice } from './billingService.js';

export interface AccountsReceivable {
  id?: number;
  memberId?: number;
  companyId?: number;
  currentBalance: number;
  aging0Days: number;    // Current
  aging30Days: number;   // 0-30 days overdue
  aging60Days: number;   // 31-60 days overdue
  aging90Days: number;   // 61-90 days overdue
  aging90PlusDays: number; // 90+ days overdue
  creditLimit: number;
  accountStatus: 'active' | 'suspended' | 'terminated' | 'collection' | 'write_off';
  lastPaymentDate?: Date;
  suspensionDate?: Date;
  collectionStatus: 'none' | 'reminder' | 'demand' | 'agency' | 'legal';
  badDebtReserve: number;
  writeOffAmount: number;
  totalPaid: number;
  totalBilled: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgingBucket {
  daysMin: number;
  daysMax: number;
  label: string;
  amount: number;
  invoiceCount: number;
  percentage: number;
}

export interface CollectionWorkflow {
  id?: number;
  arRecordId: number;
  workflowType: 'reminder' | 'suspension' | 'termination' | 'collection_agency' | 'legal_action';
  triggerCondition: string;
  triggerDays: number;
  isActive: boolean;
  templateId?: number;
  escalationRules: EscalationRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationRule {
  condition: string;
  action: string;
  delayDays: number;
  responsibleParty: string;
}

export interface DunningRule {
  id?: number;
  ruleName: string;
  agingThreshold: number;
  actionType: 'email' | 'sms' | 'letter' | 'phone' | 'suspend' | 'terminate';
  templateId?: number;
  isActive: boolean;
  priority: number;
  frequency: 'once' | 'weekly' | 'monthly';
}

export interface CollectionAction {
  id?: number;
  arRecordId: number;
  actionType: 'contact_attempt' | 'payment_arrangement' | 'suspension' | 'referral' | 'write_off';
 actionDate: Date;
  outcome: string;
  nextActionDate?: Date;
  notes?: string;
  userId: number;
  createdAt: Date;
}

export interface CreditLimitRequest {
  arRecordId: number;
  requestedLimit: number;
  reason: string;
  requestedBy: number;
  riskAssessment: CreditRiskAssessment;
}

export interface CreditRiskAssessment {
  paymentHistory: number; // 0-100 score
  debtToIncomeRatio: number;
  accountAge: number; // months
  recentDelinquencies: number;
  creditScore?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  recommendedLimit: number;
}

export class AccountsReceivableService {

  /**
   * Update accounts receivable records for all entities
   */
  async updateAccountsReceivable(): Promise<{ updated: number; created: number }> {
    try {
      let updated = 0;
      let created = 0;

      // Get all active members
      const members = await storage.getMembers();

      for (const member of members) {
        const result = await this.updateMemberAccountsReceivable(member.id);
        if (result.created) created++;
        else if (result.updated) updated++;
      }

      // Get all active companies
      const companies = await storage.getCompanies();

      for (const company of companies) {
        const result = await this.updateCompanyAccountsReceivable(company.id);
        if (result.created) created++;
        else if (result.updated) updated++;
      }

      return { updated, created };
    } catch (error) {
      console.error('Failed to update accounts receivable:', error);
      throw error;
    }
  }

  /**
   * Update accounts receivable for a specific member
   */
  async updateMemberAccountsReceivable(memberId: number): Promise<{ updated: boolean; created: boolean }> {
    const member = await storage.getMember(memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }

    // Get all invoices for this member
    const invoices = await billingService.getInvoices({
      memberId,
      dateFrom: new Date(new Date().getFullYear() - 2, 0, 1) // Last 2 years
    });

    return await this.calculateAndUpdateAR(memberId, undefined, invoices);
  }

  /**
   * Update accounts receivable for a specific company
   */
  async updateCompanyAccountsReceivable(companyId: number): Promise<{ updated: boolean; created: boolean }> {
    const company = await storage.getCompany(companyId);
    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    // Get all invoices for this company
    const invoices = await billingService.getInvoices({
      companyId,
      dateFrom: new Date(new Date().getFullYear() - 2, 0, 1) // Last 2 years
    });

    return await this.calculateAndUpdateAR(undefined, companyId, invoices);
  }

  /**
   * Calculate and update AR record
   */
  private async calculateAndUpdateAR(
    memberId?: number,
    companyId?: number,
    invoices: Invoice[]
  ): Promise<{ updated: boolean; created: boolean }> {
    const today = new Date();

    // Initialize aging buckets
    let aging0Days = 0;
    let aging30Days = 0;
    let aging60Days = 0;
    let aging90Days = 0;
    let aging90PlusDays = 0;

    let totalBilled = 0;
    let totalPaid = 0;
    let lastPaymentDate: Date | undefined;

    // Calculate aging from invoices
    for (const invoice of invoices) {
      if (invoice.status === 'cancelled') continue;

      const outstandingAmount = invoice.totalAmount - invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);

      if (outstandingAmount > 0) {
        totalBilled += invoice.totalAmount;

        const daysOverdue = Math.max(0, Math.floor((today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        // Bucket the outstanding amount
        if (daysOverdue === 0) {
          aging0Days += outstandingAmount;
        } else if (daysOverdue <= 30) {
          aging30Days += outstandingAmount;
        } else if (daysOverdue <= 60) {
          aging60Days += outstandingAmount;
        } else if (daysOverdue <= 90) {
          aging90Days += outstandingAmount;
        } else {
          aging90PlusDays += outstandingAmount;
        }
      }

      // Track payments
      totalPaid += invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);

      // Find last payment date
      for (const payment of invoice.payments) {
        if (!lastPaymentDate || payment.allocationDate > lastPaymentDate) {
          lastPaymentDate = payment.allocationDate;
        }
      }
    }

    const currentBalance = aging0Days + aging30Days + aging60Days + aging90Days + aging90PlusDays;

    // Get existing AR record
    let arRecord: AccountsReceivable | null = null;
    if (memberId) {
      arRecord = await this.getMemberAR(memberId);
    } else if (companyId) {
      arRecord = await this.getCompanyAR(companyId);
    }

    const creditLimit = this.calculateCreditLimit(memberId, companyId, totalBilled, totalPaid);
    const accountStatus = this.determineAccountStatus(currentBalance, aging90PlusDays, creditLimit);
    const collectionStatus = this.determineCollectionStatus(aging90PlusDays, accountStatus);
    const badDebtReserve = this.calculateBadDebtReserve(aging90PlusDays, currentBalance);

    const arData: Partial<AccountsReceivable> = {
      currentBalance,
      aging0Days,
      aging30Days,
      aging60Days,
      aging90Days,
      aging90PlusDays,
      creditLimit,
      accountStatus,
      lastPaymentDate,
      collectionStatus,
      badDebtReserve,
      totalPaid,
      totalBilled,
      updatedAt: new Date()
    };

    if (arRecord) {
      // Update existing record
      Object.assign(arRecord, arData);
      await this.saveARRecord(arRecord);
      return { updated: true, created: false };
    } else {
      // Create new record
      const newARRecord: AccountsReceivable = {
        ...arData,
        id: Math.floor(Math.random() * 10000),
        memberId,
        companyId,
        writeOffAmount: 0,
        createdAt: new Date()
      } as AccountsReceivable;

      await this.saveARRecord(newARRecord);
      return { updated: false, created: true };
    }
  }

  /**
   * Get aging report
   */
  async getAgingReport(filters?: {
    memberId?: number;
    companyId?: number;
    dateAsOf?: Date;
  }): Promise<AgingBucket[]> {
    const dateAsOf = filters?.dateAsOf || new Date();
    const agingBuckets: AgingBucket[] = [
      { daysMin: 0, daysMax: 0, label: 'Current', amount: 0, invoiceCount: 0, percentage: 0 },
      { daysMin: 1, daysMax: 30, label: '1-30 Days', amount: 0, invoiceCount: 0, percentage: 0 },
      { daysMin: 31, daysMax: 60, label: '31-60 Days', amount: 0, invoiceCount: 0, percentage: 0 },
      { daysMin: 61, daysMax: 90, label: '61-90 Days', amount: 0, invoiceCount: 0, percentage: 0 },
      { daysMin: 91, daysMax: 999, label: '90+ Days', amount: 0, invoiceCount: 0, percentage: 0 }
    ];

    let totalAmount = 0;
    let totalInvoices = 0;

    // Get relevant invoices
    const invoices = await billingService.getInvoices(filters);

    for (const invoice of invoices) {
      if (invoice.status === 'cancelled' || invoice.status === 'written_off') continue;

      const outstandingAmount = invoice.totalAmount - invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);

      if (outstandingAmount > 0) {
        const daysOverdue = Math.max(0, Math.floor((dateAsOf.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        // Find appropriate bucket
        const bucket = agingBuckets.find(b => daysOverdue >= b.daysMin && daysOverdue <= b.daysMax);
        if (bucket) {
          bucket.amount += outstandingAmount;
          bucket.invoiceCount++;
        }

        totalAmount += outstandingAmount;
        totalInvoices++;
      }
    }

    // Calculate percentages
    for (const bucket of agingBuckets) {
      bucket.percentage = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0;
    }

    return agingBuckets;
  }

  /**
   * Process collection workflows
   */
  async processCollectionWorkflows(): Promise<{ processed: number; actions: number }> {
    const arRecords = await this.getOverdueAccounts();
    let processed = 0;
    let actions = 0;

    for (const arRecord of arRecords) {
      try {
        const workflowActions = await this.evaluateCollectionWorkflow(arRecord);
        for (const action of workflowActions) {
          await this.executeCollectionAction(arRecord, action);
          actions++;
        }
        processed++;
      } catch (error) {
        console.error(`Failed to process collection workflow for AR record ${arRecord.id}:`, error);
      }
    }

    return { processed, actions };
  }

  /**
   * Evaluate collection workflow for an overdue account
   */
  private async evaluateCollectionWorkflow(arRecord: AccountsReceivable): Promise<string[]> {
    const actions: string[] = [];

    // Get overdue days
    const overdueDays = this.calculateOverdueDays(arRecord);

    // Determine actions based on aging
    if (overdueDays >= 15 && overdueDays < 30) {
      actions.push('send_reminder');
    } else if (overdueDays >= 30 && overdueDays < 60) {
      actions.push('send_second_notice');
    } else if (overdueDays >= 60 && overdueDays < 90) {
      actions.push('send_demand_letter');
      if (arRecord.accountStatus === 'active') {
        actions.push('consider_suspension');
      }
    } else if (overdueDays >= 90) {
      actions.push('suspend_coverage');
      if (overdueDays >= 120) {
        actions.push('terminate_coverage');
      }
      if (overdueDays >= 180) {
        actions.push('refer_to_collection_agency');
      }
    }

    return actions;
  }

  /**
   * Execute collection action
   */
  private async executeCollectionAction(arRecord: AccountsReceivable, action: string): Promise<void> {
    const collectionAction: CollectionAction = {
      arRecordId: arRecord.id!,
      actionType: 'contact_attempt',
      actionDate: new Date(),
      outcome: action,
      userId: 1, // System user
      createdAt: new Date()
    };

    // This would save the action and trigger appropriate workflows
    console.log(`Executing collection action ${action} for AR record ${arRecord.id}`);
  }

  /**
   * Calculate overdue days for AR record
   */
  private calculateOverdueDays(arRecord: AccountsReceivable): number {
    // Find the oldest overdue invoice
    // This is simplified - would need to query actual invoice dates
    if (arRecord.aging90PlusDays > 0) return 90;
    if (arRecord.aging90Days > 0) return 60;
    if (arRecord.aging60Days > 0) return 30;
    if (arRecord.aging30Days > 0) return 15;
    return 0;
  }

  /**
   * Calculate credit limit
   */
  private calculateCreditLimit(memberId?: number, companyId?: number, totalBilled?: number, totalPaid?: number): number {
    // Simplified credit limit calculation
    if (companyId) {
      // Corporate credit limits are higher
      return 50000; // $50,000 default for companies
    } else {
      // Individual credit limits based on payment history
      const paymentRatio = totalPaid && totalBilled ? totalPaid / totalBilled : 1;
      const baseLimit = 5000; // $5,000 base limit
      return baseLimit * (paymentRatio > 0.95 ? 1.5 : paymentRatio > 0.8 ? 1.2 : 1.0);
    }
  }

  /**
   * Determine account status
   */
  private determineAccountStatus(balance: number, aging90Plus: number, creditLimit: number): AccountsReceivable['accountStatus'] {
    if (aging90Plus > creditLimit * 0.5) {
      return 'collection';
    } else if (aging90Plus > 0) {
      return 'suspended';
    } else if (balance > creditLimit) {
      return 'suspended';
    }
    return 'active';
  }

  /**
   * Determine collection status
   */
  private determineCollectionStatus(aging90Plus: number, accountStatus: AccountsReceivable['accountStatus']): AccountsReceivable['collectionStatus'] {
    if (accountStatus === 'collection') return 'agency';
    if (aging90Plus > 0) return 'demand';
    if (accountStatus === 'suspended') return 'reminder';
    return 'none';
  }

  /**
   * Calculate bad debt reserve
   */
  private calculateBadDebtReserve(aging90Plus: number, balance: number): number {
    // Reserve percentage based on aging
    if (aging90Plus > balance * 0.5) return balance * 0.5; // 50% reserve
    if (aging90Plus > 0) return aging90Plus * 0.3; // 30% of 90+ day amounts
    return 0;
  }

  /**
   * Get overdue accounts
   */
  private async getOverdueAccounts(): Promise<AccountsReceivable[]> {
    // This would query database for records with overdue amounts
    return [];
  }

  /**
   * Get member AR record
   */
  private async getMemberAR(memberId: number): Promise<AccountsReceivable | null> {
    // This would query database
    return null;
  }

  /**
   * Get company AR record
   */
  private async getCompanyAR(companyId: number): Promise<AccountsReceivable | null> {
    // This would query database
    return null;
  }

  /**
   * Save AR record
   */
  private async saveARRecord(arRecord: AccountsReceivable): Promise<void> {
    // This would save to database
    console.log(`Saving AR record for ${arRecord.memberId ? 'member' : 'company'} ${arRecord.memberId || arRecord.companyId}`);
  }

  /**
   * Write off bad debt
   */
  async writeOffBadDebt(arRecordId: number, amount: number, reason: string): Promise<void> {
    const arRecord = await this.getARRecord(arRecordId);
    if (!arRecord) {
      throw new Error(`AR record not found: ${arRecordId}`);
    }

    if (amount > arRecord.currentBalance) {
      throw new Error('Write-off amount cannot exceed current balance');
    }

    // Update write-off amount and balance
    arRecord.writeOffAmount += amount;
    arRecord.currentBalance -= amount;

    // Adjust aging buckets proportionally
    const totalAging = arRecord.aging0Days + arRecord.aging30Days + arRecord.aging60Days + arRecord.aging90Days + arRecord.aging90PlusDays;
    if (totalAging > 0) {
      const reductionFactor = amount / totalAging;
      arRecord.aging90PlusDays -= arRecord.aging90PlusDays * reductionFactor;
      arRecord.aging90Days -= arRecord.aging90Days * reductionFactor;
      arRecord.aging60Days -= arRecord.aging60Days * reductionFactor;
      arRecord.aging30Days -= arRecord.aging30Days * reductionFactor;
      arRecord.aging0Days -= arRecord.aging0Days * reductionFactor;
    }

    await this.saveARRecord(arRecord);

    // Create audit log
    await this.createAuditLog('bad_debt_write_off', arRecordId, { amount, reason });
  }

  /**
   * Get AR record by ID
   */
  private async getARRecord(arRecordId: number): Promise<AccountsReceivable | null> {
    // This would query database
    return null;
  }

  /**
   * Create audit log
   */
  private async createAuditLog(action: string, arRecordId: number, details: any): Promise<void> {
    // This would create an audit log entry
    console.log(`Audit log: ${action} for AR record ${arRecordId}`, details);
  }

  /**
   * Generate collections report
   */
  async generateCollectionsReport(dateFrom: Date, dateTo: Date): Promise<{
    totalCollected: number;
    totalWrittenOff: number;
    accountsReferred: number;
    recoveryRate: number;
    agingTrend: AgingBucket[];
  }> {
    // This would generate comprehensive collections report
    return {
      totalCollected: 0,
      totalWrittenOff: 0,
      accountsReferred: 0,
      recoveryRate: 0,
      agingTrend: []
    };
  }

  /**
   * Update credit limit
   */
  async updateCreditLimit(request: CreditLimitRequest): Promise<{ approved: boolean; newLimit: number; reason?: string }> {
    const arRecord = await this.getARRecord(request.arRecordId);
    if (!arRecord) {
      throw new Error(`AR record not found: ${request.arRecordId}`);
    }

    // Evaluate credit request
    const riskAssessment = request.riskAssessment;
    let approved = false;
    let newLimit = arRecord.creditLimit;
    let reason = '';

    if (riskAssessment.riskLevel === 'low' && request.requestedLimit <= riskAssessment.recommendedLimit * 1.2) {
      approved = true;
      newLimit = request.requestedLimit;
    } else if (riskAssessment.riskLevel === 'medium' && request.requestedLimit <= riskAssessment.recommendedLimit) {
      approved = true;
      newLimit = request.requestedLimit;
    } else {
      approved = false;
      reason = `Risk level ${riskAssessment.riskLevel} does not support requested limit`;
    }

    if (approved) {
      arRecord.creditLimit = newLimit;
      await this.saveARRecord(arRecord);
      await this.createAuditLog('credit_limit_update', request.arRecordId, {
        oldLimit: arRecord.creditLimit,
        newLimit,
        requestedBy: request.requestedBy,
        reason: request.reason
      });
    }

    return { approved, newLimit, reason: approved ? undefined : reason };
  }
}

export const accountsReceivableService = new AccountsReceivableService();