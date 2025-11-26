/**
 * Premium Billing & Invoicing Service
 * Generates and manages premium invoices for individuals and corporate clients
 * Supports multiple billing cycles and prorated calculations
 */

import { storage } from '../storage';
import * as schema from '../../shared/schema.js';
import { calculateRiskAdjustedPremium } from '../../server/utils/enhancedPremiumCalculator.js';

export interface InvoiceGenerationRequest {
  memberId?: number;
  companyId?: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  invoiceType: 'individual' | 'corporate' | 'group';
  generateLineItems: boolean;
  applyProration: boolean;
}

export interface InvoiceLineItem {
  id?: number;
  invoiceId: number;
  itemType: 'base_premium' | 'dependent' | 'adjustment' | 'tax' | 'discount';
  description: string;
  quantity: number;
  unitRate: number;
  amount: number;
  prorationFactor?: number;
  memberId?: number;
  benefitId?: number;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  memberId?: number;
  companyId?: number;
  invoiceType: 'individual' | 'corporate' | 'group';
  issueDate: Date;
  dueDate: Date;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'written_off' | 'cancelled';
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  paidAt?: Date;
  overdueAt?: Date;
}

export interface InvoicePayment {
  id?: number;
  invoiceId: number;
  paymentId: number;
  amount: number;
  allocationDate: Date;
  allocatedBy: number;
}

export interface BillingCycleConfig {
  cycleType: 'monthly' | 'quarterly' | 'annual' | 'pro_rata';
  dayOfMonth?: number;
  monthOffset?: number;
  prorationMethod: 'daily' | 'monthly' | 'hybrid';
}

export interface PremiumCalculationContext {
  memberId: number;
  companyId: number;
  benefitId: number;
  periodStart: Date;
  periodEnd: Date;
  basePremium: number;
  adjustments: PremiumAdjustment[];
  finalPremium: number;
}

export interface PremiumAdjustment {
  type: 'wellness_discount' | 'group_discount' | 'experience_rating' | 'age_adjustment' | 'geographic';
  amount: number;
  percentage?: number;
  description: string;
  metadata?: Record<string, any>;
}

export class BillingService {
  private invoiceSequence = 1000;

  /**
   * Generate invoices for specified criteria
   */
  async generateInvoices(request: InvoiceGenerationRequest): Promise<Invoice[]> {
    try {
      const invoices: Invoice[] = [];

      if (request.memberId) {
        // Generate individual member invoice
        const invoice = await this.generateMemberInvoice(request);
        invoices.push(invoice);
      } else if (request.companyId) {
        // Generate corporate client invoices (all members or specific group)
        const companyInvoices = await this.generateCompanyInvoices(request);
        invoices.push(...companyInvoices);
      }

      return invoices;
    } catch (error) {
      console.error('Invoice generation failed:', error);
      throw new Error(`Invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate invoice for individual member
   */
  private async generateMemberInvoice(request: InvoiceGenerationRequest): Promise<Invoice> {
    if (!request.memberId) {
      throw new Error('Member ID required for individual invoice generation');
    }

    const member = await storage.getMember(request.memberId);
    if (!member) {
      throw new Error(`Member not found: ${request.memberId}`);
    }

    const company = await storage.getCompany(member.companyId);
    if (!company) {
      throw new Error(`Company not found: ${member.companyId}`);
    }

    // Get member's benefits and calculate premiums
    const companyBenefits = await storage.getCompanyBenefitsByCompany(member.companyId);
    const memberBenefits = await storage.getMemberBenefitsByMember(request.memberId);

    const lineItems: InvoiceLineItem[] = [];
    let subtotal = 0;

    // Generate line items for each benefit
    for (const memberBenefit of memberBenefits) {
      const companyBenefit = companyBenefits.find(cb => cb.benefitId === memberBenefit.benefitId);
      const benefit = await storage.getBenefit(memberBenefit.benefitId);

      if (companyBenefit && benefit && memberBenefit.status === 'active') {
        const premiumContext = await this.calculateMemberPremium(
          request.memberId,
          memberBenefit.benefitId,
          request.billingPeriodStart,
          request.billingPeriodEnd,
          request.applyProration
        );

        const prorationFactor = premiumContext.adjustments.find(adj => adj.type === 'age_adjustment')?.percentage || 1;

        // Base premium line item
        lineItems.push({
          invoiceId: 0, // Will be set when invoice is created
          itemType: 'base_premium',
          description: `${benefit.name} Premium - ${request.billingPeriodStart.toLocaleDateString()} to ${request.billingPeriodEnd.toLocaleDateString()}`,
          quantity: 1,
          unitRate: premiumContext.basePremium,
          amount: premiumContext.finalPremium,
          prorationFactor,
          memberId: request.memberId,
          benefitId: memberBenefit.benefitId,
          metadata: {
            premiumContext,
            billingPeriod: {
              start: request.billingPeriodStart,
              end: request.billingPeriodEnd
            }
          }
        });

        subtotal += premiumContext.finalPremium;
      }
    }

    // Calculate tax and discounts
    const taxAmount = this.calculateTax(subtotal, company);
    const discountAmount = 0; // Would calculate based on promotional discounts
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Generate invoice number
    const invoiceNumber = this.generateInvoiceNumber('IND');

    // Calculate due date based on company billing terms
    const dueDate = this.calculateDueDate(request.billingPeriodEnd, company.billingTerms || 'NET_30');

    const invoice: Invoice = {
      invoiceNumber,
      memberId: request.memberId,
      companyId: member.companyId,
      invoiceType: 'individual',
      issueDate: new Date(),
      dueDate,
      billingPeriodStart: request.billingPeriodStart,
      billingPeriodEnd: request.billingPeriodEnd,
      status: 'draft',
      totalAmount,
      subtotal,
      taxAmount,
      discountAmount,
      lineItems,
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save invoice to database
    const savedInvoice = await this.saveInvoice(invoice);
    return savedInvoice;
  }

  /**
   * Generate invoices for all members in a company
   */
  private async generateCompanyInvoices(request: InvoiceGenerationRequest): Promise<Invoice[]> {
    if (!request.companyId) {
      throw new Error('Company ID required for corporate invoice generation');
    }

    const company = await storage.getCompany(request.companyId);
    if (!company) {
      throw new Error(`Company not found: ${request.companyId}`);
    }

    // Get all active members for the company
    const members = await storage.getMembersByCompany(request.companyId);
    const activeMembers = members.filter(member => member.status === 'active');

    const invoices: Invoice[] = [];

    if (request.invoiceType === 'corporate') {
      // Generate single consolidated invoice for the company
      const consolidatedInvoice = await this.generateConsolidatedInvoice(request, activeMembers);
      invoices.push(consolidatedInvoice);
    } else {
      // Generate individual invoices for each member
      for (const member of activeMembers) {
        const memberRequest = { ...request, memberId: member.id, invoiceType: 'individual' as const };
        const memberInvoice = await this.generateMemberInvoice(memberRequest);
        invoices.push(memberInvoice);
      }
    }

    return invoices;
  }

  /**
   * Generate consolidated invoice for corporate client
   */
  private async generateConsolidatedInvoice(request: InvoiceGenerationRequest, members: any[]): Promise<Invoice> {
    const lineItems: InvoiceLineItem[] = [];
    let subtotal = 0;

    // Group by benefit type for consolidation
    const benefitGroups = new Map<number, { count: number; totalPremium: number; members: number[] }>();

    for (const member of members) {
      const memberBenefits = await storage.getMemberBenefitsByMember(member.id);
      const companyBenefits = await storage.getCompanyBenefitsByCompany(member.companyId);

      for (const memberBenefit of memberBenefits) {
        if (memberBenefit.status !== 'active') continue;

        const premiumContext = await this.calculateMemberPremium(
          member.id,
          memberBenefit.benefitId,
          request.billingPeriodStart,
          request.billingPeriodEnd,
          request.applyProration
        );

        if (!benefitGroups.has(memberBenefit.benefitId)) {
          benefitGroups.set(memberBenefit.benefitId, { count: 0, totalPremium: 0, members: [] });
        }

        const group = benefitGroups.get(memberBenefit.benefitId)!;
        group.count++;
        group.totalPremium += premiumContext.finalPremium;
        group.members.push(member.id);
      }
    }

    // Create consolidated line items
    for (const [benefitId, group] of benefitGroups) {
      const benefit = await storage.getBenefit(benefitId);
      if (!benefit) continue;

      lineItems.push({
        invoiceId: 0,
        itemType: 'base_premium',
        description: `${benefit.name} - ${group.count} members`,
        quantity: group.count,
        unitRate: group.totalPremium / group.count,
        amount: group.totalPremium,
        memberId: undefined,
        benefitId,
        metadata: {
          memberCount: group.count,
          memberIds: group.members,
          benefitType: benefit.category
        }
      });

      subtotal += group.totalPremium;
    }

    const company = await storage.getCompany(request.companyId!);
    const taxAmount = this.calculateTax(subtotal, company!);
    const discountAmount = this.calculateCorporateDiscount(subtotal, members.length);
    const totalAmount = subtotal + taxAmount - discountAmount;

    const invoiceNumber = this.generateInvoiceNumber('CORP');
    const dueDate = this.calculateDueDate(request.billingPeriodEnd, company!.billingTerms || 'NET_30');

    const invoice: Invoice = {
      invoiceNumber,
      companyId: request.companyId,
      invoiceType: 'corporate',
      issueDate: new Date(),
      dueDate,
      billingPeriodStart: request.billingPeriodStart,
      billingPeriodEnd: request.billingPeriodEnd,
      status: 'draft',
      totalAmount,
      subtotal,
      taxAmount,
      discountAmount,
      lineItems,
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.saveInvoice(invoice);
  }

  /**
   * Calculate premium for a specific member and benefit
   */
  private async calculateMemberPremium(
    memberId: number,
    benefitId: number,
    periodStart: Date,
    periodEnd: Date,
    applyProration: boolean
  ): Promise<PremiumCalculationContext> {
    const member = await storage.getMember(memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }

    // Use enhanced premium calculator
    const premiumResult = await calculateRiskAdjustedPremium(storage, {
      companyId: member.companyId,
      memberId,
      includeRiskAdjustment: true,
      familyComposition: this.getFamilyComposition(member),
      demographics: await this.getMemberDemographics(memberId)
    });

    let finalPremium = premiumResult.adjustedPremium;

    // Apply proration if needed
    let prorationFactor = 1;
    if (applyProration) {
      prorationFactor = this.calculateProrationFactor(member, periodStart, periodEnd);
      finalPremium *= prorationFactor;
    }

    const adjustments: PremiumAdjustment[] = [
      {
        type: 'age_adjustment',
        amount: finalPremium - premiumResult.adjustedPremium,
        percentage: prorationFactor,
        description: applyProration ? `Prorated coverage (${Math.round(prorationFactor * 100)}%)` : 'Full period coverage'
      },
      ...premiumResult.breakdown.wellnessDiscount > 0 ? [{
        type: 'wellness_discount' as const,
        amount: premiumResult.breakdown.wellnessDiscount * premiumResult.baseRate,
        percentage: premiumResult.breakdown.wellnessDiscount * 100,
        description: 'Wellness program discount'
      }] : []
    ];

    return {
      memberId,
      companyId: member.companyId,
      benefitId,
      periodStart,
      periodEnd,
      basePremium: premiumResult.basePremium,
      adjustments,
      finalPremium
    };
  }

  /**
   * Calculate proration factor for partial coverage periods
   */
  private calculateProrationFactor(member: any, periodStart: Date, periodEnd: Date): number {
    const memberEnrollmentDate = member.enrollmentDate ? new Date(member.enrollmentDate) : periodStart;
    const memberTerminationDate = member.terminationDate ? new Date(member.terminationDate) : periodEnd;

    // Calculate actual coverage days within the billing period
    const coverageStart = new Date(Math.max(periodStart.getTime(), memberEnrollmentDate.getTime()));
    const coverageEnd = new Date(Math.min(periodEnd.getTime(), memberTerminationDate.getTime()));

    if (coverageStart >= coverageEnd) {
      return 0; // No coverage during this period
    }

    const totalPeriodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const coverageDays = Math.ceil((coverageEnd.getTime() - coverageStart.getTime()) / (1000 * 60 * 60 * 24));

    return coverageDays / totalPeriodDays;
  }

  /**
   * Calculate tax amount for invoice
   */
  private calculateTax(subtotal: number, company: any): number {
    const taxRate = company.taxRate || 0.08; // Default 8% tax rate
    return subtotal * taxRate;
  }

  /**
   * Calculate corporate discount based on group size
   */
  private calculateCorporateDiscount(subtotal: number, memberCount: number): number {
    let discountRate = 0;

    if (memberCount >= 1000) discountRate = 0.15;      // 15% for large groups
    else if (memberCount >= 500) discountRate = 0.10;  // 10% for medium-large groups
    else if (memberCount >= 100) discountRate = 0.05;  // 5% for medium groups
    else if (memberCount >= 50) discountRate = 0.025;  // 2.5% for small-medium groups

    return subtotal * discountRate;
  }

  /**
   * Generate unique invoice number
   */
  private generateInvoiceNumber(prefix: string): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = this.invoiceSequence++;
    return `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Calculate due date based on billing terms
   */
  private calculateDueDate(issueDate: Date, billingTerms: string): Date {
    const dueDate = new Date(issueDate);

    switch (billingTerms) {
      case 'NET_15':
        dueDate.setDate(dueDate.getDate() + 15);
        break;
      case 'NET_30':
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      case 'NET_45':
        dueDate.setDate(dueDate.getDate() + 45);
        break;
      case 'NET_60':
        dueDate.setDate(dueDate.getDate() + 60);
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 30); // Default to NET_30
    }

    return dueDate;
  }

  /**
   * Save invoice to database
   */
  private async saveInvoice(invoice: Invoice): Promise<Invoice> {
    // This would save to database using storage interface
    // For now, return the invoice with an ID
    const savedInvoice = { ...invoice, id: Math.floor(Math.random() * 10000) };
    return savedInvoice;
  }

  /**
   * Get family composition for premium calculation
   */
  private getFamilyComposition(member: any): any {
    // Simplified - would get from dependents table
    return {
      familySize: 1,
      hasSpouse: false,
      childCount: 0,
      specialNeedsCount: 0
    };
  }

  /**
   * Get member demographics for premium calculation
   */
  private async getMemberDemographics(memberId: number): Promise<any> {
    const member = await storage.getMember(memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }

    return {
      averageAge: this.calculateAge(member.dateOfBirth),
      ageDistribution: this.getAgeDistribution(member.dateOfBirth),
      location: {
        state: member.state || 'CA',
        costIndex: 1.0
      },
      industryRisk: 'medium',
      groupSize: 1
    };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - new Date(dateOfBirth).getFullYear();
    const monthDiff = today.getMonth() - new Date(dateOfBirth).getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < new Date(dateOfBirth).getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Get age distribution for single member
   */
  private getAgeDistribution(dateOfBirth: Date): any {
    const age = this.calculateAge(dateOfBirth);

    // Map age to age band
    let ageBand = '26-35'; // default
    if (age <= 17) ageBand = '0-17';
    else if (age <= 25) ageBand = '18-25';
    else if (age <= 35) ageBand = '26-35';
    else if (age <= 45) ageBand = '36-45';
    else if (age <= 55) ageBand = '46-55';
    else if (age <= 65) ageBand = '56-65';
    else ageBand = '65+';

    return {
      '0-17': ageBand === '0-17' ? 1 : 0,
      '18-25': ageBand === '18-25' ? 1 : 0,
      '26-35': ageBand === '26-35' ? 1 : 0,
      '36-45': ageBand === '36-45' ? 1 : 0,
      '46-55': ageBand === '46-55' ? 1 : 0,
      '56-65': ageBand === '56-65' ? 1 : 0,
      '65+': ageBand === '65+' ? 1 : 0
    };
  }

  /**
   * Process billing cycle for all active companies
   */
  async processBillingCycle(cycleDate: Date): Promise<{ processed: number; failed: number; errors: string[] }> {
    const companies = await storage.getCompanies();
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const company of companies) {
      try {
        if (company.status !== 'active') continue;

        // Determine if company needs billing based on frequency
        if (!this.shouldBillCompany(company, cycleDate)) continue;

        // Calculate billing period based on company frequency
        const billingPeriod = this.calculateBillingPeriod(company, cycleDate);

        // Generate invoices for the company
        const invoices = await this.generateInvoices({
          companyId: company.id,
          billingPeriodStart: billingPeriod.start,
          billingPeriodEnd: billingPeriod.end,
          invoiceType: company.billingType === 'consolidated' ? 'corporate' : 'individual',
          generateLineItems: true,
          applyProration: true
        });

        // Update invoice status to 'sent'
        for (const invoice of invoices) {
          await this.updateInvoiceStatus(invoice.id!, 'sent');
        }

        processed++;
      } catch (error) {
        failed++;
        errors.push(`Company ${company.id} (${company.name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { processed, failed, errors };
  }

  /**
   * Determine if company should be billed on given date
   */
  private shouldBillCompany(company: any, cycleDate: Date): boolean {
    const today = new Date(cycleDate);

    switch (company.billingFrequency) {
      case 'monthly':
        return today.getDate() === 1; // Bill on 1st of each month
      case 'quarterly':
        return today.getDate() === 1 && today.getMonth() % 3 === 0; // Bill on 1st of quarter
      case 'annual':
        return today.getDate() === 1 && today.getMonth() === 0; // Bill on Jan 1st
      case 'pro_rata':
        return true; // Bill as needed for mid-period changes
      default:
        return false;
    }
  }

  /**
   * Calculate billing period for company
   */
  private calculateBillingPeriod(company: any, cycleDate: Date): { start: Date; end: Date } {
    const today = new Date(cycleDate);
    let start = new Date(today);
    let end = new Date(today);

    switch (company.billingFrequency) {
      case 'monthly':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case 'quarterly':
        const quarterStart = Math.floor(today.getMonth() / 3) * 3;
        start.setMonth(quarterStart, 1);
        end.setMonth(quarterStart + 3, 0);
        break;
      case 'annual':
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
      default:
        // Default to current month
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
    }

    return { start, end };
  }

  /**
   * Update invoice status
   */
  private async updateInvoiceStatus(invoiceId: number, status: Invoice['status']): Promise<void> {
    // This would update the database
    console.log(`Updating invoice ${invoiceId} status to ${status}`);
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: number): Promise<Invoice | null> {
    // This would retrieve from database
    return null;
  }

  /**
   * Get invoices for member or company
   */
  async getInvoices(filters: {
    memberId?: number;
    companyId?: number;
    status?: Invoice['status'];
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Invoice[]> {
    // This would retrieve from database with filters
    return [];
  }

  /**
   * Void invoice
   */
  async voidInvoice(invoiceId: number, reason: string): Promise<void> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot void paid invoice');
    }

    await this.updateInvoiceStatus(invoiceId, 'cancelled');
    // Would log void reason and create audit trail
  }
}

export const billingService = new BillingService();