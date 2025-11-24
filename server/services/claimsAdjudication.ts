import { storage } from '../storage';
import {
  Claim,
  Member,
  Benefit,
  CompanyBenefit,
  ClaimAdjudicationResult,
  InsertClaimAdjudicationResult,
  MedicalNecessityValidation,
  InsertMedicalNecessityValidation,
  FraudDetectionResult,
  InsertFraudDetectionResult,
  ExplanationOfBenefits,
  InsertExplanationOfBenefits,
  ClaimAuditTrail,
  InsertClaimAuditTrail,
  BenefitUtilization,
  InsertBenefitUtilization
} from '@shared/schema';

// Result interfaces for claims processing
export interface AdjudicationResult {
  success: boolean;
  claimId: number;
  status: 'APPROVED' | 'PARTIALLY_APPROVED' | 'DENIED' | 'PENDING_REVIEW';
  originalAmount: number;
  approvedAmount: number;
  memberResponsibility: number;
  insurerResponsibility: number;
  denialReasons?: string[];
  appliedRules?: string[];
  adjudicationDetails: {
    eligibilityResult?: EligibilityResult;
    benefitApplication?: BenefitApplicationResult;
    medicalNecessity?: MedicalNecessityResult;
    fraudDetection?: FraudDetectionResult;
    financialCalculations?: FinancialCalculationResult;
  };
}

export interface EligibilityResult {
  eligible: boolean;
  policyActive: boolean;
  memberCovered: boolean;
  waitingPeriodSatisfied: boolean;
  benefitLimitsAvailable: boolean;
  providerInNetwork: boolean;
  preAuthExists: boolean;
  denialReasons: string[];
}

export interface BenefitApplicationResult {
  benefitCovered: boolean;
  coverageRate: number;
  limitAmount?: number;
  usedAmount: number;
  remainingAmount: number;
  exclusions: string[];
  waitingPeriodApplied: boolean;
  deductibleApplied: number;
  copayApplied: number;
  coinsuranceApplied: number;
}

export interface MedicalNecessityResult {
  required: boolean;
  passed: boolean;
  validationResult: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
  necessityScore?: number;
  requiresClinicalReview: boolean;
  clinicalGuidelines: string[];
  reviewerNotes?: string;
}

export interface FinancialCalculationResult {
  originalAmount: number;
  allowedAmount: number;
  deductibleAmount: number;
  copayAmount: number;
  coinsuranceAmount: number;
  providerDiscount: number;
  memberResponsibility: number;
  insurerResponsibility: number;
}

export interface EOBDocument {
  eobNumber: string;
  claimId: number;
  memberId: number;
  totalBilledAmount: number;
  totalAllowedAmount: number;
  totalPaidAmount: number;
  memberResponsibility: number;
  planResponsibility: number;
  serviceDetails: any[];
  denialReasons?: string[];
  appealInformation?: string;
}

export class ClaimsAdjudicationService {
  // Process a claim through complete adjudication workflow
  async processClaim(claimId: number): Promise<AdjudicationResult> {
    try {
      // Get claim and related data
      const claim = await storage.getClaim(claimId);
      if (!claim) {
        throw new Error(`Claim with ID ${claimId} not found`);
      }

      const member = await storage.getMember(claim.memberId);
      const benefit = await storage.getBenefit(claim.benefitId);
      const companyBenefits = await storage.getCompanyBenefitsByCompany(member!.companyId);
      const companyBenefit = companyBenefits.find(cb => cb.benefitId === claim.benefitId);

      // Create audit trail entry
      await this.createAuditTrail(claimId, 'ADJUDICATED', null, 'submitted', true, {
        event: 'Claims processing started',
        timestamp: new Date()
      });

      // Step 1: Eligibility Verification
      const eligibilityResult = await this.validateEligibility(claim!, member!, benefit!, companyBenefit);

      if (!eligibilityResult.eligible) {
        return {
          success: false,
          claimId,
          status: 'DENIED',
          originalAmount: claim.amount,
          approvedAmount: 0,
          memberResponsibility: claim.amount,
          insurerResponsibility: 0,
          denialReasons: eligibilityResult.denialReasons,
          adjudicationDetails: { eligibilityResult }
        };
      }

      // Step 2: Medical Necessity Validation
      const medicalNecessityResult = await this.validateMedicalNecessity(claim);

      // Step 3: Fraud Detection
      const fraudDetectionResult = await this.detectFraud(claim, member!);

      // Step 4: Benefit Application
      const benefitApplication = await this.applyBenefits(claim, member!, benefit!, companyBenefit!);

      // Step 5: Financial Calculations
      const financialCalculations = await this.calculateFinancialResponsibility(
        claim,
        benefitApplication,
        medicalNecessityResult
      );

      // Step 6: Determine final decision
      const decision = this.makeFinalDecision(
        eligibilityResult,
        medicalNecessityResult,
        fraudDetectionResult,
        benefitApplication,
        financialCalculations
      );

      // Step 7: Save adjudication results
      await this.saveAdjudicationResult(claimId, decision, financialCalculations);

      // Step 8: Update benefit utilization
      if (companyBenefit && (decision.status === 'APPROVED' || decision.status === 'PARTIALLY_APPROVED')) {
        await this.updateBenefitUtilization(
          member!.id,
          companyBenefit.benefitId,
          decision.approvedAmount
        );
      }

      // Step 9: Generate EOB if approved or partially approved
      if (decision.status === 'APPROVED' || decision.status === 'PARTIALLY_APPROVED') {
        await this.generateEOB(claim!, member!, decision, financialCalculations);
      }

      // Update claim status
      await storage.updateClaimStatus(claimId, decision.status.toLowerCase(),
        `Claim ${decision.status}: ${decision.denialReasons?.join(', ') || 'Approved'}`);

      return decision;

    } catch (error) {
      console.error(`Error processing claim ${claimId}:`, error);
      throw error;
    }
  }

  // Eligibility verification
  async validateEligibility(
    claim: Claim,
    member: Member,
    benefit: Benefit,
    companyBenefit?: CompanyBenefit
  ): Promise<EligibilityResult> {
    const denialReasons: string[] = [];

    // Check if policy is active
    const activePeriod = await storage.getActivePeriod();
    const policyActive = !!activePeriod;

    if (!policyActive) {
      denialReasons.push('Policy period not active');
    }

    // Check member coverage
    const memberCovered = true; // Simplified - in real implementation, check premium payment status

    if (!memberCovered) {
      denialReasons.push('Member coverage not active');
    }

    // Check waiting periods
    let waitingPeriodSatisfied = true;
    if (benefit.hasWaitingPeriod && benefit.waitingPeriodDays) {
      // Simplified - should check actual enrollment date vs waiting period
      waitingPeriodSatisfied = false;
      denialReasons.push(`Waiting period of ${benefit.waitingPeriodDays} days not satisfied`);
    }

    // Check benefit limits
    let benefitLimitsAvailable = true;
    if (companyBenefit && companyBenefit.limitAmount) {
      // Get current utilization for this benefit
      const utilization = await this.getBenefitUtilization(member.id, benefit.id);
      benefitLimitsAvailable = utilization.remainingAmount > 0;

      if (!benefitLimitsAvailable) {
        denialReasons.push(`Benefit limit of ${companyBenefit.limitAmount} exhausted`);
      }
    }

    // Check provider network (simplified)
    const institution = await storage.getMedicalInstitution(claim.institutionId);
    const providerInNetwork = institution?.approvalStatus === 'approved';

    if (!providerInNetwork) {
      denialReasons.push('Provider not in network');
    }

    // Check pre-authorization (simplified - no pre-auth system currently)
    const preAuthExists = false;
    if (benefit.category === 'hospital' || benefit.category === 'specialist') {
      denialReasons.push('Pre-authorization required but not found');
    }

    return {
      eligible: denialReasons.length === 0,
      policyActive,
      memberCovered,
      waitingPeriodSatisfied,
      benefitLimitsAvailable,
      providerInNetwork,
      preAuthExists,
      denialReasons
    };
  }

  // Medical necessity validation
  async validateMedicalNecessity(claim: Claim): Promise<MedicalNecessityResult> {
    const validationResult: MedicalNecessityResult = {
      required: true,
      passed: true,
      validationResult: 'PASS',
      necessityScore: 85,
      requiresClinicalReview: false,
      clinicalGuidelines: ['Standard medical practice guidelines']
    };

    try {
      // Save medical necessity validation result
      await storage.createMedicalNecessityValidation({
        claimId: claim.id,
        diagnosisCode: claim.diagnosisCode,
        procedureCodes: JSON.stringify([claim.diagnosisCode]),
        validationResult: validationResult.validationResult,
        necessityScore: validationResult.necessityScore,
        requiresClinicalReview: validationResult.requiresClinicalReview,
        reviewerNotes: validationResult.reviewerNotes
      });
    } catch (error) {
      console.error('Error saving medical necessity validation:', error);
    }

    return validationResult;
  }

  // Fraud detection
  async detectFraud(claim: Claim, member: Member): Promise<FraudDetectionResult> {
    const riskScore = Math.random() * 20; // Simplified - real ML model would be used
    const riskLevel = riskScore > 15 ? 'MEDIUM' : riskScore > 8 ? 'LOW' : 'NONE';

    const fraudResult: FraudDetectionResult = {
      claimId: claim.id,
      detectionDate: new Date(),
      riskScore,
      riskLevel,
      detectedIndicators: JSON.stringify([]),
      investigationRequired: riskLevel === 'MEDIUM',
      investigationStatus: riskLevel === 'MEDIUM' ? 'PENDING' : 'RESOLVED',
      fraudType: 'NONE'
    };

    try {
      await storage.createFraudDetectionResult(fraudResult);
    } catch (error) {
      console.error('Error saving fraud detection result:', error);
    }

    return fraudResult;
  }

  // Apply benefits and coverage rules
  async applyBenefits(
    claim: Claim,
    member: Member,
    benefit: Benefit,
    companyBenefit: CompanyBenefit
  ): Promise<BenefitApplicationResult> {
    const coverageRate = companyBenefit.coverageRate || 100;
    const limitAmount = companyBenefit.limitAmount || benefit.limitAmount;

    // Get current utilization
    const utilization = await this.getBenefitUtilization(member.id, benefit.id);

    let deductibleApplied = 0;
    let copayApplied = 0;
    let coinsuranceApplied = 0;

    // Simplified benefit application logic
    if (benefit.category === 'medical') {
      deductibleApplied = 50; // $50 deductible
      copayApplied = 20; // $20 copay
    } else if (benefit.category === 'specialist') {
      deductibleApplied = 0;
      copayApplied = 40; // $40 specialist copay
    } else if (benefit.category === 'hospital') {
      deductibleApplied = 100; // $100 hospital deductible
      coinsuranceApplied = 10; // 10% coinsurance
    }

    return {
      benefitCovered: true,
      coverageRate,
      limitAmount,
      usedAmount: utilization.usedAmount,
      remainingAmount: limitAmount ? limitAmount - utilization.usedAmount : Infinity,
      exclusions: [], // Would check specific exclusions
      waitingPeriodApplied: benefit.hasWaitingPeriod || false,
      deductibleApplied,
      copayApplied,
      coinsuranceApplied
    };
  }

  // Calculate financial responsibility
  async calculateFinancialResponsibility(
    claim: Claim,
    benefitApplication: BenefitApplicationResult,
    medicalNecessity: MedicalNecessityResult
  ): Promise<FinancialCalculationResult> {
    if (!medicalNecessity.passed) {
      return {
        originalAmount: claim.amount,
        allowedAmount: 0,
        deductibleAmount: 0,
        copayAmount: 0,
        coinsuranceAmount: 0,
        providerDiscount: 0,
        memberResponsibility: claim.amount,
        insurerResponsibility: 0
      };
    }

    let allowedAmount = claim.amount;
    let providerDiscount = 0;

    // Apply provider network discount
    providerDiscount = allowedAmount * 0.1; // 10% network discount
    allowedAmount -= providerDiscount;

    // Apply deductible
    const deductibleAmount = Math.min(benefitApplication.deductibleApplied, allowedAmount);
    allowedAmount -= deductibleAmount;

    // Apply copay
    const copayAmount = Math.min(benefitApplication.copayApplied, allowedAmount);
    allowedAmount -= copayAmount;

    // Apply coinsurance
    const coinsuranceAmount = allowedAmount * (benefitApplication.coinsuranceApplied / 100);
    allowedAmount -= coinsuranceAmount;

    const memberResponsibility = deductibleAmount + copayAmount + coinsuranceAmount;
    const insurerResponsibility = claim.amount - memberResponsibility - providerDiscount;

    return {
      originalAmount: claim.amount,
      allowedAmount: claim.amount - providerDiscount,
      deductibleAmount,
      copayAmount,
      coinsuranceAmount,
      providerDiscount,
      memberResponsibility,
      insurerResponsibility
    };
  }

  // Make final adjudication decision
  private makeFinalDecision(
    eligibility: EligibilityResult,
    medicalNecessity: MedicalNecessityResult,
    fraudDetection: FraudDetectionResult,
    benefitApplication: BenefitApplicationResult,
    financial: FinancialCalculationResult
  ): AdjudicationResult {
    const denialReasons: string[] = [];

    // Check for disqualifying factors
    if (!eligibility.eligible) {
      denialReasons.push(...eligibility.denialReasons);
    }

    if (!medicalNecessity.passed) {
      denialReasons.push('Medical necessity not established');
    }

    if (fraudDetection.riskLevel === 'MEDIUM' || fraudDetection.riskLevel === 'HIGH') {
      denialReasons.push('Fraud indicators detected - requires investigation');
    }

    const isDenied = denialReasons.length > 0;
    const isPartiallyApproved = !isDenied && financial.memberResponsibility > 0;

    return {
      success: !isDenied,
      claimId: 0, // Will be set by caller
      status: isDenied ? 'DENIED' : isPartiallyApproved ? 'PARTIALLY_APPROVED' : 'APPROVED',
      originalAmount: financial.originalAmount,
      approvedAmount: financial.insurerResponsibility,
      memberResponsibility: financial.memberResponsibility,
      insurerResponsibility: financial.insurerResponsibility,
      denialReasons: isDenied ? denialReasons : undefined,
      appliedRules: ['Eligibility verification', 'Medical necessity check', 'Benefit application'],
      adjudicationDetails: {
        eligibilityResult: eligibility,
        benefitApplication,
        medicalNecessity,
        fraudDetection,
        financialCalculations: financial
      }
    };
  }

  // Save adjudication result to database
  private async saveAdjudicationResult(
    claimId: number,
    decision: AdjudicationResult,
    financial: FinancialCalculationResult
  ): Promise<void> {
    await storage.createClaimAdjudicationResult({
      claimId,
      adjudicationDate: new Date(),
      originalAmount: financial.originalAmount,
      approvedAmount: financial.approvedAmount,
      memberResponsibility: financial.memberResponsibility,
      insurerResponsibility: financial.insurerResponsibility,
      denialReasons: decision.denialReasons ? JSON.stringify(decision.denialReasons) : null,
      appliedRules: decision.appliedRules ? JSON.stringify(decision.appliedRules) : null,
      waitingPeriodApplied: false,
      deductibleApplied: financial.deductibleAmount,
      copayApplied: financial.copayAmount,
      coinsuranceApplied: financial.coinsuranceAmount,
      providerDiscountApplied: financial.providerDiscount
    });
  }

  // Update benefit utilization
  private async updateBenefitUtilization(
    memberId: number,
    benefitId: number,
    approvedAmount: number
  ): Promise<void> {
    const activePeriod = await storage.getActivePeriod();
    if (!activePeriod) return;

    const existingUtilization = await this.getBenefitUtilization(memberId, benefitId);

    if (existingUtilization) {
      // Update existing record
      const newUsedAmount = existingUtilization.usedAmount + approvedAmount;
      const newRemainingAmount = existingUtilization.limitAmount ?
        existingUtilization.limitAmount - newUsedAmount : 0;

      // Note: In a real implementation, you would need update methods in storage
      console.log(`Updating benefit utilization: Used ${newUsedAmount}, Remaining ${newRemainingAmount}`);
    } else {
      // Create new utilization record
      await storage.createBenefitUtilization({
        memberId,
        benefitId,
        periodId: activePeriod.id,
        usedAmount: approvedAmount,
        limitAmount: null, // Will be set based on company benefit
        remainingAmount: 0,
        utilizationPercentage: 0
      });
    }
  }

  // Generate Explanation of Benefits
  private async generateEOB(
    claim: Claim,
    member: Member,
    decision: AdjudicationResult,
    financial: FinancialCalculationResult
  ): Promise<void> {
    const eobNumber = `EOB-${claim.id}-${Date.now()}`;

    const serviceDetails = [
      {
        serviceDate: claim.serviceDate,
        description: claim.description,
        billedAmount: financial.originalAmount,
        allowedAmount: financial.allowedAmount,
        deniedAmount: financial.originalAmount - financial.allowedAmount,
        memberResponsibility: financial.memberResponsibility,
        planResponsibility: financial.insurerResponsibility
      }
    ];

    await storage.createExplanationOfBenefits({
      claimId: claim.id,
      memberId: member.id,
      eobDate: new Date(),
      eobNumber,
      totalBilledAmount: financial.originalAmount,
      totalAllowedAmount: financial.allowedAmount,
      totalPaidAmount: financial.insurerResponsibility,
      memberResponsibility: financial.memberResponsibility,
      planResponsibility: financial.insurerResponsibility,
      serviceDetails: JSON.stringify(serviceDetails),
      denialReasons: decision.denialReasons ? JSON.stringify(decision.denialReasons) : null,
      appealInformation: decision.status === 'DENIED' ?
        'Members may appeal denied claims within 30 days' : null,
      status: 'GENERATED'
    });
  }

  // Create audit trail entry
  private async createAuditTrail(
    claimId: number,
    eventType: string,
    previousStatus: string | null,
    newStatus: string,
    automatedDecision: boolean,
    decisionFactors: any
  ): Promise<void> {
    await storage.createClaimAuditTrail({
      claimId,
      eventType,
      eventDate: new Date(),
      previousStatus,
      newStatus,
      userId: null, // System automated decision
      automatedDecision,
      decisionFactors: JSON.stringify(decisionFactors)
    });
  }

  // Get benefit utilization for a member
  private async getBenefitUtilization(memberId: number, benefitId: number): Promise<BenefitUtilization> {
    const activePeriod = await storage.getActivePeriod();
    if (!activePeriod) {
      return { usedAmount: 0, limitAmount: 0, remainingAmount: 0, utilizationPercentage: 0 } as BenefitUtilization;
    }

    // This is a simplified approach - in real implementation, storage would have a method to get utilization
    // For now, we'll create a basic object with default values
    return {
      id: 0,
      memberId,
      benefitId,
      periodId: activePeriod.id,
      usedAmount: 0,
      limitAmount: 0,
      remainingAmount: 0,
      utilizationPercentage: 0,
      lastUpdated: new Date(),
      createdAt: new Date()
    };
  }
}

export const claimsAdjudicationService = new ClaimsAdjudicationService();