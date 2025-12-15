import { storage } from '../storage';
import {
  Claim,
  Member,
  Benefit,
  CompanyBenefit,
  MedicalProcedure,
  ProviderProcedureRate
} from '../../shared/schema.js';

export interface FinancialCalculationRequest {
  claimId: number;
  originalAmount: number;
  memberId: number;
  benefitId: number;
  institutionId: number;
  procedureItems?: {
    procedureId: number;
    quantity: number;
    unitRate: number;
    totalAmount: number;
  }[];
}

export interface FinancialCalculationResult {
  claimId: number;
  calculations: {
    originalAmount: number;
    allowedAmount: number;
    deductibleAmount: number;
    copayAmount: number;
    coinsuranceAmount: number;
    providerDiscountAmount: number;
    memberResponsibility: number;
    insurerResponsibility: number;
    networkSavings: number;
  };
  breakdown: {
    deductible: DeductibleBreakdown;
    copay: CopayBreakdown;
    coinsurance: CoinsuranceBreakdown;
    providerDiscount: ProviderDiscountBreakdown;
    outOfPocketMaximum: OutOfPocketBreakdown;
  };
  rateDetails: {
    standardRates: ProcedureRateDetail[];
    negotiatedRates: ProcedureRateDetail[];
    appliedRates: ProcedureRateDetail[];
    rateSavings: number;
  };
  limitations: {
    benefitLimits: LimitationBreakdown;
    annualLimits: LimitationBreakdown;
    lifetimeLimits: LimitationBreakdown;
  };
  compliance: {
    billingCompliance: boolean;
    codingCompliance: boolean;
    rateCompliance: boolean;
    issues: string[];
  };
  summary: {
    totalSavings: number;
    memberPaidPercentage: number;
    insurerPaidPercentage: number;
    effectiveRate: number;
  };
}

export interface DeductibleBreakdown {
  deductibleType: 'individual' | 'family';
  annualDeductible: number;
  remainingDeductible: number;
  appliedAmount: number;
  deductibleMet: boolean;
}

export interface CopayBreakdown {
  copayType: 'flat' | 'percentage' | 'tiered';
  copayAmount: number;
  appliedAmount: number;
  waived: boolean;
  waiverReason?: string;
}

export interface CoinsuranceBreakdown {
  coinsuranceRate: number;
  appliedToAmount: number;
  coinsuranceAmount: number;
  remainingResponsibility: number;
}

export interface ProviderDiscountBreakdown {
  discountType: 'percentage' | 'fixed' | 'negotiated';
  standardAmount: number;
  discountedAmount: number;
  discountAmount: number;
  discountRate: number;
}

export interface OutOfPocketBreakdown {
  annualMaximum: number;
  currentTotal: number;
  appliedAmount: number;
  remainingAmount: number;
  maximumMet: boolean;
}

export interface ProcedureRateDetail {
  procedureId: number;
  procedureName: string;
  procedureCode: string;
  quantity: number;
  standardRate: number;
  negotiatedRate: number;
  appliedRate: number;
  varianceReason: string;
}

export interface LimitationBreakdown {
  limitType: 'visit' | 'dollar' | 'service';
  limitAmount: number;
  usedAmount: number;
  remainingAmount: number;
  appliedLimit: boolean;
}

export class FinancialCalculationService {
  // Calculate financial responsibility for a claim
  async calculateFinancialResponsibility(request: FinancialCalculationRequest): Promise<FinancialCalculationResult> {
    try {
      // Get required data
      const member = await storage.getMember(request.memberId);
      const benefit = await storage.getBenefit(request.benefitId);
      const companyBenefits = await storage.getCompanyBenefitsByCompany(member!.companyId);
      const companyBenefit = companyBenefits.find(cb => cb.benefitId === request.benefitId);

      if (!member || !benefit || !companyBenefit) {
        throw new Error('Required data not found for financial calculation');
      }

      // Get procedure details
      let procedureItems = request.procedureItems || [];
      if (procedureItems.length === 0) {
        // Create a single procedure item for simple claims
        procedureItems = [{
          procedureId: 0,
          quantity: 1,
          unitRate: request.originalAmount,
          totalAmount: request.originalAmount
        }];
      }

      // Get negotiated rates
      const rateDetails = await this.getRateDetails(request.institutionId, procedureItems);

      // Calculate deductible
      const deductible = await this.calculateDeductible(member!, benefit!, companyBenefit!, request.originalAmount);

      // Calculate copay
      const copay = await this.calculateCopay(benefit!, companyBenefit!, request.originalAmount, deductible.appliedAmount);

      // Calculate coinsurance
      const coinsurance = await this.calculateCoinsurance(
        benefit!,
        companyBenefit!,
        request.originalAmount,
        deductible.appliedAmount,
        copay.appliedAmount,
        rateDetails.appliedRates
      );

      // Calculate provider discount
      const providerDiscount = await this.calculateProviderDiscount(
        rateDetails.standardRates,
        rateDetails.appliedRates,
        procedureItems
      );

      // Calculate out-of-pocket maximum
      const outOfPocketMaximum = await this.calculateOutOfPocketMaximum(member!, companyBenefit!,
        deductible.appliedAmount, copay.appliedAmount, coinsurance.coinsuranceAmount);

      // Determine final amounts
      const allowedAmount = rateDetails.appliedRates.reduce((sum, rate) => sum + (rate.appliedRate * rate.quantity), 0);
      const memberResponsibility = Math.min(
        deductible.appliedAmount + copay.appliedAmount + coinsurance.coinsuranceAmount,
        outOfPocketMaximum.finalAmount
      );
      const insurerResponsibility = Math.max(0, allowedAmount - memberResponsibility);

      // Build result
      const result: FinancialCalculationResult = {
        claimId: request.claimId,
        calculations: {
          originalAmount: request.originalAmount,
          allowedAmount,
          deductibleAmount: deductible.appliedAmount,
          copayAmount: copay.appliedAmount,
          coinsuranceAmount: coinsurance.coinsuranceAmount,
          providerDiscountAmount: providerDiscount.discountAmount,
          memberResponsibility,
          insurerResponsibility,
          networkSavings: providerDiscount.discountAmount
        },
        breakdown: {
          deductible,
          copay,
          coinsurance,
          providerDiscount,
          outOfPocketMaximum: outOfPocketMaximum
        },
        rateDetails,
        limitations: {
          benefitLimits: await this.getBenefitLimitations(member!, benefit!, companyBenefit!),
          annualLimits: await this.getAnnualLimitations(member!, benefit!, companyBenefit!),
          lifetimeLimits: await this.getLifetimeLimitations(member!, benefit!, companyBenefit!)
        },
        compliance: {
          billingCompliance: await this.checkBillingCompliance(request, rateDetails),
          codingCompliance: await this.checkCodingCompliance(request),
          rateCompliance: rateDetails.complianceScore >= 90,
          issues: this.getComplianceIssues(request, rateDetails)
        },
        summary: {
          totalSavings: providerDiscount.discountAmount,
          memberPaidPercentage: (memberResponsibility / request.originalAmount) * 100,
          insurerPaidPercentage: (insurerResponsibility / request.originalAmount) * 100,
          effectiveRate: memberResponsibility > 0 ? (memberResponsibility / request.originalAmount) * 100 : 0
        }
      };

      return result;

    } catch (error) {
      console.error('Error calculating financial responsibility:', error);
      throw error;
    }
  }

  // Get rate details for procedures
  private async getRateDetails(institutionId: number, procedureItems: any[]): Promise<{
    standardRates: ProcedureRateDetail[];
    negotiatedRates: ProcedureRateDetail[];
    appliedRates: ProcedureRateDetail[];
    complianceScore: number;
    rateSavings: number;
  }> {
    const standardRates: ProcedureRateDetail[] = [];
    const negotiatedRates: ProcedureRateDetail[] = [];
    const appliedRates: ProcedureRateDetail[] = [];
    let totalStandardAmount = 0;
    let totalNegotiatedAmount = 0;

    for (const item of procedureItems) {
      let procedure = null;
      if (item.procedureId > 0) {
        procedure = await storage.getMedicalProcedure(item.procedureId);
      }

      // Create rate detail
      const standardRate = item.unitRate || item.totalAmount / item.quantity;
      let negotiatedRate = standardRate;

      // Get provider-specific rates
      if (item.procedureId > 0) {
        const providerRates = await storage.getProviderProcedureRatesByInstitution(institutionId);
        const providerRate = providerRates.find(pr => pr.procedureId === item.procedureId);
        if (providerRate && providerRate.active) {
          negotiatedRate = providerRate.agreedRate;
        }
      }

      const rateDetail: ProcedureRateDetail = {
        procedureId: item.procedureId,
        procedureName: procedure ? procedure.name : 'Unknown Service',
        procedureCode: procedure ? procedure.code : 'UNKNOWN',
        quantity: item.quantity,
        standardRate,
        negotiatedRate,
        appliedRate: negotiatedRate,
        varianceReason: negotiatedRate < standardRate ? 'Network Discount' : 'Standard Rate'
      };

      standardRates.push(rateDetail);
      negotiatedRates.push({ ...rateDetail, appliedRate: negotiatedRate });
      appliedRates.push(rateDetail);

      totalStandardAmount += standardRate * item.quantity;
      totalNegotiatedAmount += negotiatedRate * item.quantity;
    }

    const complianceScore = this.calculateRateCompliance(standardRates, negotiatedRates);
    const rateSavings = totalStandardAmount - totalNegotiatedAmount;

    return {
      standardRates,
      negotiatedRates,
      appliedRates,
      complianceScore,
      rateSavings
    };
  }

  // Calculate deductible
  private async calculateDeductible(
    member: Member,
    benefit: Benefit,
    companyBenefit: CompanyBenefit,
    claimAmount: number
  ): Promise<DeductibleBreakdown> {
    // Simplified deductible calculation
    const annualDeductible = 500; // Would get from plan configuration
    const remainingDeductible = Math.max(0, annualDeductible - 100); // Simplified
    const appliedAmount = Math.min(claimAmount, remainingDeductible);
    const deductibleMet = remainingDeductible <= 0;

    return {
      deductibleType: 'individual',
      annualDeductible,
      remainingDeductible,
      appliedAmount,
      deductibleMet
    };
  }

  // Calculate copay
  private async calculateCopay(
    benefit: Benefit,
    companyBenefit: CompanyBenefit,
    claimAmount: number,
    deductibleApplied: number
  ): Promise<CopayBreakdown> {
    // Simplified copay calculation based on benefit category
    let copayAmount = 0;
    let copayType: 'flat' | 'percentage' | 'tiered' = 'flat';

    if (benefit.category === 'medical') {
      copayAmount = 20;
    } else if (benefit.category === 'specialist') {
      copayAmount = 40;
    } else if (benefit.category === 'hospital') {
      copayAmount = 100;
    } else if (benefit.category === 'prescription') {
      copayAmount = 10;
    } else if (benefit.category === 'emergency') {
      copayAmount = 150;
    }

    // Apply remaining claim amount after deductible
    const remainingAmount = Math.max(0, claimAmount - deductibleApplied);
    const appliedAmount = Math.min(copayAmount, remainingAmount);
    const waived = remainingAmount <= 0;

    return {
      copayType,
      copayAmount,
      appliedAmount,
      waived,
      waiverReason: waived ? 'No remaining amount after deductible' : undefined
    };
  }

  // Calculate coinsurance
  private async calculateCoinsurance(
    benefit: Benefit,
    companyBenefit: CompanyBenefit,
    claimAmount: number,
    deductibleApplied: number,
    copayApplied: number,
    appliedRates: ProcedureRateDetail[]
  ): Promise<CoinsuranceBreakdown> {
    // Simplified coinsurance calculation
    let coinsuranceRate = 20; // 20% coinsurance

    if (benefit.category === 'hospital') {
      coinsuranceRate = 10; // 10% for hospital
    } else if (benefit.category === 'prescription') {
      coinsuranceRate = 0; // 0% for prescription (copay only)
    }

    const remainingAmount = Math.max(0, claimAmount - deductibleApplied - copayApplied);
    const coinsuranceAmount = (remainingAmount * coinsuranceRate) / 100;
    const remainingResponsibility = remainingAmount - coinsuranceAmount;

    return {
      coinsuranceRate,
      appliedToAmount: remainingAmount,
      coinsuranceAmount,
      remainingResponsibility
    };
  }

  // Calculate provider discount
  private async calculateProviderDiscount(
    standardRates: ProcedureRateDetail[],
    appliedRates: ProcedureRateDetail[],
    procedureItems: any[]
  ): Promise<ProviderDiscountBreakdown> {
    const totalStandardAmount = standardRates.reduce((sum, rate) =>
      sum + (rate.standardRate * rate.quantity), 0);
    const totalDiscountedAmount = appliedRates.reduce((sum, rate) =>
      sum + (rate.appliedRate * rate.quantity), 0);
    const discountAmount = totalStandardAmount - totalDiscountedAmount;
    const discountRate = totalStandardAmount > 0 ? (discountAmount / totalStandardAmount) * 100 : 0;

    return {
      discountType: discountRate > 0 ? 'negotiated' : 'fixed',
      standardAmount: totalStandardAmount,
      discountedAmount: totalDiscountedAmount,
      discountAmount,
      discountRate
    };
  }

  // Calculate out-of-pocket maximum
  private async calculateOutOfPocketMaximum(
    member: Member,
    companyBenefit: CompanyBenefit,
    deductibleApplied: number,
    copayApplied: number,
    coinsuranceAmount: number
  ): Promise<OutOfPocketBreakdown> {
    // Simplified out-of-pocket maximum calculation
    const annualMaximum = 5000; // Would get from plan configuration
    const currentTotal = 1000; // Simplified - would track actual year-to-date
    const appliedAmount = deductibleApplied + copayApplied + coinsuranceAmount;
    const finalAmount = Math.min(annualMaximum, currentTotal + appliedAmount);
    const remainingAmount = Math.max(0, annualMaximum - finalAmount);
    const maximumMet = remainingAmount <= 0;

    return {
      annualMaximum,
      currentTotal,
      appliedAmount,
      remainingAmount,
      maximumMet
    };
  }

  // Get benefit limitations
  private async getBenefitLimitations(
    member: Member,
    benefit: Benefit,
    companyBenefit: CompanyBenefit
  ): Promise<LimitationBreakdown> {
    // Simplified benefit limitations
    const limitAmount = companyBenefit.limitAmount || benefit.limitAmount || 0;
    const usedAmount = 500; // Simplified - would get from utilization tracking
    const remainingAmount = Math.max(0, limitAmount - usedAmount);
    const appliedLimit = limitAmount > 0;

    return {
      limitType: 'dollar',
      limitAmount,
      usedAmount,
      remainingAmount,
      appliedLimit
    };
  }

  // Get annual limitations
  private async getAnnualLimitations(
    member: Member,
    benefit: Benefit,
    companyBenefit: CompanyBenefit
  ): Promise<LimitationBreakdown> {
    return this.getBenefitLimitations(member, benefit, companyBenefit);
  }

  // Get lifetime limitations
  private async getLifetimeLimitations(
    member: Member,
    benefit: Benefit,
    companyBenefit: CompanyBenefit
  ): Promise<LimitationBreakdown> {
    // Simplified lifetime limitations (higher amounts)
    const limitAmount = (companyBenefit.limitAmount || benefit.limitAmount || 0) * 5;
    const usedAmount = 2000; // Simplified
    const remainingAmount = Math.max(0, limitAmount - usedAmount);
    const appliedLimit = limitAmount > 0;

    return {
      limitType: 'dollar',
      limitAmount,
      usedAmount,
      remainingAmount,
      appliedLimit
    };
  }

  // Check billing compliance
  private async checkBillingCompliance(request: FinancialCalculationRequest, rateDetails: any): Promise<boolean> {
    // Simplified billing compliance check
    return rateDetails.complianceScore >= 80;
  }

  // Check coding compliance
  private async checkCodingCompliance(request: FinancialCalculationRequest): Promise<boolean> {
    // Simplified coding compliance check
    return true; // Would implement actual coding validation
  }

  // Calculate rate compliance score
  private calculateRateCompliance(standardRates: ProcedureRateDetail[], negotiatedRates: ProcedureRateDetail[]): number {
    if (standardRates.length === 0) return 100;

    let complianceScore = 0;
    let totalWeight = 0;

    standardRates.forEach((standardRate, index) => {
      const negotiatedRate = negotiatedRates[index];
      const weight = standardRate.standardRate * standardRate.quantity;
      totalWeight += weight;

      if (negotiatedRate.appliedRate <= standardRate.standardRate) {
        const discountPercentage = ((standardRate.standardRate - negotiatedRate.appliedRate) / standardRate.standardRate) * 100;
        complianceScore += weight * Math.min(discountPercentage, 50); // Cap at 50% discount score
      }
    });

    return totalWeight > 0 ? (complianceScore / totalWeight) * 2 : 100; // Scale to 0-100
  }

  // Get compliance issues
  private getComplianceIssues(request: FinancialCalculationRequest, rateDetails: any): string[] {
    const issues: string[] = [];

    if (rateDetails.complianceScore < 80) {
      issues.push('Low rate compliance score');
    }

    if (request.originalAmount > 10000) {
      issues.push('High-value claim requires additional documentation');
    }

    return issues;
  }

  // Estimate claim payment timing
  async estimatePaymentTiming(claimAmount: number, riskLevel: string): Promise<number> {
    // Estimated days to payment
    let baseDays = 14;

    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      baseDays = 45;
    } else if (riskLevel === 'MEDIUM') {
      baseDays = 30;
    } else if (claimAmount > 10000) {
      baseDays = 21;
    }

    return baseDays;
  }

  // Calculate MLR impact
  async calculateMLRImpact(
    insurerResponsibility: number,
    memberResponsibility: number,
    premiumAmount: number
  ): Promise<{
      currentMLR: number;
      projectedMLR: number;
      impact: 'positive' | 'negative' | 'neutral';
      recommendation: string;
    }> {
    const totalClaims = insurerResponsibility + memberResponsibility;
    const currentMLR = (insurerResponsibility / totalClaims) * 100;
    const projectedMLR = (insurerResponsibility / premiumAmount) * 100;

    let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
    let recommendation = '';

    if (projectedMLR > 85) {
      impact = 'negative';
      recommendation = 'Review premium rates or benefit designs';
    } else if (projectedMLR < 65) {
      impact = 'positive';
      recommendation = 'Consider premium reductions for members';
    }

    return {
      currentMLR,
      projectedMLR,
      impact,
      recommendation
    };
  }
}

export const financialCalculationService = new FinancialCalculationService();