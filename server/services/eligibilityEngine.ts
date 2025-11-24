import { storage } from '../storage';
import {
  Member,
  Company,
  Period,
  Premium,
  Benefit,
  CompanyBenefit,
  MedicalInstitution,
  PremiumPayment,
  Claim
} from '@shared/schema';

export interface EligibilityCheckRequest {
  memberId: number;
  benefitId: number;
  institutionId: number;
  serviceDate?: Date;
  claimAmount?: number;
}

export interface EligibilityCheckResponse {
  eligible: boolean;
  memberId: number;
  memberInfo: {
    name: string;
    memberType: string;
    dateOfBirth: string;
    employerName: string;
  };
  policyInfo: {
    policyActive: boolean;
    activePeriod: string;
    premiumStatus: 'current' | 'overdue' | 'unpaid';
    coverageType: string;
  };
  benefitInfo: {
    benefitName: string;
    benefitCategory: string;
    coverageDetails: string;
    coverageRate: number;
    limitAmount?: number;
    waitingPeriodApplied: boolean;
    waitingPeriodDays?: number;
  };
  providerInfo: {
    providerName: string;
    providerType: string;
    inNetwork: boolean;
    networkStatus: string;
  };
  restrictions: {
    waitingPeriodSatisfied: boolean;
    benefitLimitsAvailable: boolean;
    preAuthRequired: boolean;
    preAuthExists: boolean;
    utilizationStatus: {
      usedAmount: number;
      limitAmount?: number;
      remainingAmount: number;
      utilizationPercentage: number;
    };
  };
  denialReasons: string[];
  recommendations: string[];
  nextSteps: string[];
  validUntil: Date;
}

export interface EligibilitySummary {
  totalMembers: number;
  activeMembers: number;
  membersWithDelinquentPremiums: number;
  benefitsActive: number;
  providerNetworkCoverage: number;
}

export class EligibilityVerificationEngine {
  // Check eligibility for a specific member and benefit
  async checkEligibility(request: EligibilityCheckRequest): Promise<EligibilityCheckResponse> {
    try {
      // Get member information
      const member = await storage.getMember(request.memberId);
      if (!member) {
        throw new Error(`Member with ID ${request.memberId} not found`);
      }

      // Get company information
      const company = await storage.getCompany(member.companyId);
      if (!company) {
        throw new Error(`Company with ID ${member.companyId} not found`);
      }

      // Get active period
      const activePeriod = await storage.getActivePeriod();
      if (!activePeriod) {
        throw new Error('No active policy period found');
      }

      // Get benefit information
      const benefit = await storage.getBenefit(request.benefitId);
      if (!benefit) {
        throw new Error(`Benefit with ID ${request.benefitId} not found`);
      }

      // Get company benefit configuration
      const companyBenefits = await storage.getCompanyBenefitsByCompany(member.companyId);
      const companyBenefit = companyBenefits.find(cb => cb.benefitId === request.benefitId);

      if (!companyBenefit) {
        throw new Error(`Benefit ${request.benefitId} not configured for company ${member.companyId}`);
      }

      // Get provider information
      const institution = await storage.getMedicalInstitution(request.institutionId);
      if (!institution) {
        throw new Error(`Medical institution with ID ${request.institutionId} not found`);
      }

      // Check premium payment status
      const premiumStatus = await this.checkPremiumStatus(member.companyId, activePeriod.id);

      // Check waiting periods
      const waitingPeriodResult = await this.checkWaitingPeriods(member, companyBenefit, benefit);

      // Check benefit utilization
      const utilizationStatus = await this.checkBenefitUtilization(
        member.id,
        benefit.id,
        activePeriod.id,
        companyBenefit
      );

      // Check pre-authorization requirements
      const preAuthStatus = await this.checkPreAuthorization(
        benefit,
        request.serviceDate || new Date(),
        request.claimAmount
      );

      // Determine network status
      const inNetwork = institution.approvalStatus === 'approved';

      // Compile denial reasons
      const denialReasons: string[] = [];

      if (premiumStatus !== 'current') {
        denialReasons.push(`Premium payments are ${premiumStatus}`);
      }

      if (!waitingPeriodResult.satisfied) {
        denialReasons.push(`Waiting period of ${waitingPeriodResult.requiredDays} days not satisfied`);
      }

      if (!utilizationStatus.available) {
        denialReasons.push(`Benefit limit exhausted or exceeded`);
      }

      if (preAuthStatus.required && !preAuthStatus.exists) {
        denialReasons.push('Pre-authorization required but not found');
      }

      if (!inNetwork) {
        denialReasons.push('Provider not in network');
      }

      const eligible = denialReasons.length === 0;

      // Generate recommendations
      const recommendations: string[] = [];

      if (premiumStatus !== 'current') {
        recommendations.push('Contact employer to resolve premium payment issues');
      }

      if (!waitingPeriodResult.satisfied) {
        recommendations.push(`Wait ${waitingPeriodResult.remainingDays} more days for waiting period to expire`);
      }

      if (!utilizationStatus.available) {
        recommendations.push('Consider alternative treatment options or contact benefits administrator');
      }

      if (preAuthStatus.required && !preAuthStatus.exists) {
        recommendations.push('Submit pre-authorization request before receiving services');
      }

      if (!inNetwork) {
        recommendations.push('Consider using in-network providers for better coverage');
      }

      // Determine next steps
      const nextSteps: string[] = [];

      if (eligible) {
        nextSteps.push('Proceed with treatment at in-network provider');
        nextSteps.push('Keep all receipts and documentation');
        nextSteps.push('Submit claim within required timeframe');
      } else {
        nextSteps.push('Address denial reasons before proceeding');
        nextSteps.push('Contact benefits administrator for clarification');
        nextSteps.push('Consider appeal process if applicable');
      }

      const response: EligibilityCheckResponse = {
        eligible,
        memberId: member.id,
        memberInfo: {
          name: `${member.firstName} ${member.lastName}`,
          memberType: member.memberType,
          dateOfBirth: member.dateOfBirth,
          employerName: company.name
        },
        policyInfo: {
          policyActive: premiumStatus === 'current',
          activePeriod: `${activePeriod.startDate} to ${activePeriod.endDate}`,
          premiumStatus,
          coverageType: benefit.category
        },
        benefitInfo: {
          benefitName: benefit.name,
          benefitCategory: benefit.category,
          coverageDetails: benefit.coverageDetails,
          coverageRate: companyBenefit.coverageRate,
          limitAmount: companyBenefit.limitAmount || benefit.limitAmount,
          waitingPeriodApplied: benefit.hasWaitingPeriod || false,
          waitingPeriodDays: benefit.waitingPeriodDays
        },
        providerInfo: {
          providerName: institution.name,
          providerType: institution.type,
          inNetwork,
          networkStatus: institution.approvalStatus
        },
        restrictions: {
          waitingPeriodSatisfied: waitingPeriodResult.satisfied,
          benefitLimitsAvailable: utilizationStatus.available,
          preAuthRequired: preAuthStatus.required,
          preAuthExists: preAuthStatus.exists,
          utilizationStatus
        },
        denialReasons,
        recommendations,
        nextSteps,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      };

      return response;

    } catch (error) {
      console.error('Error checking eligibility:', error);
      throw error;
    }
  }

  // Check premium payment status for a company
  private async checkPremiumStatus(companyId: number, periodId: number): Promise<'current' | 'overdue' | 'unpaid'> {
    try {
      const premiums = await storage.getPremiumsByCompany(companyId);
      const activePremium = premiums.find(p => p.periodId === periodId);

      if (!activePremium) {
        return 'unpaid';
      }

      const premiumPayments = await storage.getPremiumPaymentsByPremium(activePremium.id);
      const hasPayment = premiumPayments.length > 0;

      if (!hasPayment) {
        return 'unpaid';
      }

      // Check if payment is overdue (simplified logic)
      const now = new Date();
      const premiumDate = new Date(activePremium.issuedDate);
      const daysSincePremium = Math.floor((now.getTime() - premiumDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSincePremium > 30) {
        return 'overdue';
      }

      return 'current';

    } catch (error) {
      console.error('Error checking premium status:', error);
      return 'unpaid';
    }
  }

  // Check waiting periods for benefits
  private async checkWaitingPeriods(
    member: Member,
    companyBenefit: CompanyBenefit,
    benefit: Benefit
  ): Promise<{ satisfied: boolean; requiredDays: number; remainingDays: number }> {
    const satisfied = true; // Simplified - should check actual enrollment date
    const requiredDays = benefit.waitingPeriodDays || 0;
    const remainingDays = Math.max(0, requiredDays - 0); // Simplified

    return {
      satisfied,
      requiredDays,
      remainingDays
    };
  }

  // Check benefit utilization and limits
  private async checkBenefitUtilization(
    memberId: number,
    benefitId: number,
    periodId: number,
    companyBenefit: CompanyBenefit
  ): Promise<{
    available: boolean;
    usedAmount: number;
    limitAmount?: number;
    remainingAmount: number;
    utilizationPercentage: number;
  }> {
    try {
      // Get current utilization (simplified approach)
      const utilization = await storage.getBenefitUtilizationByMemberAndBenefit(memberId, benefitId);

      const usedAmount = utilization?.usedAmount || 0;
      const limitAmount = companyBenefit.limitAmount;

      if (!limitAmount) {
        return {
          available: true,
          usedAmount,
          limitAmount,
          remainingAmount: Infinity,
          utilizationPercentage: 0
        };
      }

      const remainingAmount = Math.max(0, limitAmount - usedAmount);
      const utilizationPercentage = (usedAmount / limitAmount) * 100;

      return {
        available: remainingAmount > 0,
        usedAmount,
        limitAmount,
        remainingAmount,
        utilizationPercentage
      };

    } catch (error) {
      console.error('Error checking benefit utilization:', error);
      return {
        available: true,
        usedAmount: 0,
        limitAmount: 0,
        remainingAmount: 0,
        utilizationPercentage: 0
      };
    }
  }

  // Check pre-authorization requirements
  private async checkPreAuthorization(
    benefit: Benefit,
    serviceDate: Date,
    claimAmount?: number
  ): Promise<{ required: boolean; exists: boolean }> {
    // Determine if pre-authorization is required
    const required = this.isPreAuthRequired(benefit, claimAmount);

    // In a real implementation, you would check if pre-authorization exists
    // For now, we'll assume no pre-authorization exists
    const exists = false;

    return { required, exists };
  }

  // Determine if pre-authorization is required
  private isPreAuthRequired(benefit: Benefit, claimAmount?: number): boolean {
    // Pre-authorization typically required for:
    // - Hospital admissions
    // - High-cost procedures (over $1000)
    // - Certain specialist services
    // - Mental health services
    // - Durable medical equipment

    if (benefit.category === 'hospital') {
      return true;
    }

    if (claimAmount && claimAmount > 1000) {
      return true;
    }

    if (benefit.category === 'specialist' || benefit.category === 'mental_health') {
      return true;
    }

    return false;
  }

  // Get eligibility summary for a company
  async getEligibilitySummary(companyId?: number): Promise<EligibilitySummary> {
    try {
      let members: Member[];

      if (companyId) {
        members = await storage.getMembersByCompany(companyId);
      } else {
        members = await storage.getMembers();
      }

      const activePeriod = await storage.getActivePeriod();
      const totalMembers = members.length;
      let activeMembers = 0;
      let membersWithDelinquentPremiums = 0;

      // Check each member's status
      for (const member of members) {
        if (activePeriod) {
          const premiumStatus = await this.checkPremiumStatus(member.companyId, activePeriod.id);
          if (premiumStatus === 'current') {
            activeMembers++;
          } else {
            membersWithDelinquentPremiums++;
          }
        } else {
          membersWithDelinquentPremiums++;
        }
      }

      // Count active benefits (simplified)
      const benefits = await storage.getBenefits();
      const benefitsActive = benefits.filter(b => b.isActive).length;

      // Provider network coverage (simplified)
      const institutions = await storage.getMedicalInstitutions();
      const providerNetworkCoverage = institutions.filter(inst => inst.approvalStatus === 'approved').length;

      return {
        totalMembers,
        activeMembers,
        membersWithDelinquentPremiums,
        benefitsActive,
        providerNetworkCoverage
      };

    } catch (error) {
      console.error('Error getting eligibility summary:', error);
      throw error;
    }
  }

  // Validate member eligibility in real-time
  async validateMemberEligibility(memberId: number): Promise<boolean> {
    try {
      const member = await storage.getMember(memberId);
      if (!member) {
        return false;
      }

      const activePeriod = await storage.getActivePeriod();
      if (!activePeriod) {
        return false;
      }

      const premiumStatus = await this.checkPremiumStatus(member.companyId, activePeriod.id);
      return premiumStatus === 'current';

    } catch (error) {
      console.error('Error validating member eligibility:', error);
      return false;
    }
  }

  // Check benefit coverage for a specific service
  async checkBenefitCoverage(
    memberId: number,
    benefitId: number,
    serviceAmount: number
  ): Promise<{ covered: boolean; coverageRate: number; coveredAmount: number }> {
    try {
      const eligibilityCheck = await this.checkEligibility({
        memberId,
        benefitId,
        institutionId: 1, // Default institution
        claimAmount: serviceAmount
      });

      if (!eligibilityCheck.eligible) {
        return {
          covered: false,
          coverageRate: 0,
          coveredAmount: 0
        };
      }

      const coverageRate = eligibilityCheck.benefitInfo.coverageRate;
      const coveredAmount = serviceAmount * (coverageRate / 100);

      return {
        covered: coveredAmount > 0,
        coverageRate,
        coveredAmount
      };

    } catch (error) {
      console.error('Error checking benefit coverage:', error);
      return {
        covered: false,
        coverageRate: 0,
        coveredAmount: 0
      };
    }
  }
}

export const eligibilityEngine = new EligibilityVerificationEngine();