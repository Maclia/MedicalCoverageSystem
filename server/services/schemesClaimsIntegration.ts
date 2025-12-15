/**
 * Integration service connecting Schemes & Benefits module with Claims system
 * Handles enhanced claims adjudication, benefit application, limit validation, and rules execution
 */

import { IStorage } from '../storage';
import { EnhancedClaimsAdjudicationService } from './enhancedClaimsAdjudication';
import * as schema from '../../shared/schema.js';

export interface ClaimProcessingRequest {
  claimId: number;
  memberId: number;
  providerId: number;
  claimAmount: number;
  serviceCategory: string;
  serviceCode?: string;
  diagnosisCodes?: string[];
  submissionDate: Date;
  serviceDate: Date;
  isPreAuthorized?: boolean;
  preAuthNumber?: string;
  referralRequired?: boolean;
  referralNumber?: string;
}

export interface EnhancedClaimProcessingResult {
  claimId: number;
  memberId: number;
  adjudicationDate: Date;
  originalAmount: number;
  approvedAmount: number;
  deniedAmount: number;
  memberResponsibility: number;
  insurerResponsibility: number;
  networkDiscountApplied: number;
  adjudicationDecision: 'APPROVED' | 'PARTIALLY_APPROVED' | 'DENIED' | 'REQUIRES_REVIEW';
  denialReasons: string[];
  benefitApplications: {
    benefitId: number;
    benefitName: string;
    coveragePercentage: number;
    limitApplied: number;
    limitRemaining: number;
    waitingPeriodApplied: boolean;
  }[];
  ruleExecutions: {
    ruleId: number;
    ruleName: string;
    result: 'PASS' | 'FAIL' | 'SKIP';
    impact: string;
    executionTime: number;
  }[];
  costSharingBreakdown: {
    deductible: number;
    copay: number;
    coinsurance: number;
    totalMemberResponsibility: number;
  };
  processingMetrics: {
    totalProcessingTime: number;
    rulesEngineTime: number;
    benefitValidationTime: number;
    limitCheckTime: number;
  };
  requiresManualReview: boolean;
  reviewReasons: string[];
  nextSteps: string[];
}

export interface BatchClaimProcessingRequest {
  claimIds: number[];
  processingOptions?: {
    parallelProcessing?: boolean;
    skipManualReview?: boolean;
    applyNetworkDiscounts?: boolean;
  };
}

export interface BatchClaimProcessingResult {
  totalClaims: number;
  processedClaims: number;
  approvedClaims: number;
  partiallyApprovedClaims: number;
  deniedClaims: number;
  requiresReviewClaims: number;
  totalApprovedAmount: number;
  totalDeniedAmount: number;
  totalMemberResponsibility: number;
  processingTime: number;
  claimResults: EnhancedClaimProcessingResult[];
  errors: string[];
}

export interface ClaimAnalytics {
  timeframe: { startDate: Date; endDate: Date };
  schemeId?: number;
  planTierId?: number;
  totalClaims: number;
  totalClaimAmount: number;
  averageClaimAmount: number;
  adjudicationResults: {
    approved: { count: number; amount: number; percentage: number };
    partiallyApproved: { count: number; amount: number; percentage: number };
    denied: { count: number; amount: number; percentage: number };
    requiresReview: { count: number; amount: number; percentage: number };
  };
  benefitUtilization: {
    benefitCategory: string;
    claimsCount: number;
    totalAmount: number;
    utilizationPercentage: number;
  }[];
  providerAnalysis: {
    providerId: number;
    providerName: string;
    claimsCount: number;
    totalAmount: number;
    averageProcessingTime: number;
    denialRate: number;
  }[];
  costSharingAnalysis: {
    totalMemberResponsibility: number;
    totalInsurerResponsibility: number;
    averageMemberResponsibilityPercentage: number;
    networkDiscountsApplied: number;
  };
}

export class SchemesClaimsIntegrationService {
  constructor(
    private storage: IStorage,
    private enhancedAdjudicationService: EnhancedClaimsAdjudicationService
  ) {}

  /**
   * Process individual claim with enhanced adjudication
   */
  async processClaim(claimRequest: ClaimProcessingRequest): Promise<EnhancedClaimProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate claim request
      const validation = await this.validateClaimRequest(claimRequest);
      if (!validation.isValid) {
        return this.createErrorResult(claimRequest, validation.errors);
      }

      // Get claim details
      const claim = await this.storage.getClaim(claimRequest.claimId);
      if (!claim) {
        return this.createErrorResult(claimRequest, ['Claim not found']);
      }

      // Run enhanced claims adjudication
      const adjudicationResult = await this.enhancedAdjudicationService.adjudicateClaim(
        claimRequest.claimId,
        1 // System user ID
      );

      // Convert adjudication result to enhanced processing result
      const processingResult = await this.convertAdjudicationResult(
        adjudicationResult,
        claimRequest
      );

      // Add processing metrics
      processingResult.processingMetrics = {
        totalProcessingTime: Date.now() - startTime,
        rulesEngineTime: this.extractRulesEngineTime(adjudicationResult),
        benefitValidationTime: this.extractBenefitValidationTime(adjudicationResult),
        limitCheckTime: this.extractLimitCheckTime(adjudicationResult)
      };

      // Determine if manual review is required
      processingResult.requiresManualReview = await this.determineManualReviewRequirement(
        processingResult,
        claimRequest
      );

      if (processingResult.requiresManualReview) {
        processingResult.reviewReasons = await this.getManualReviewReasons(processingResult);
        processingResult.nextSteps = [
          'Assign to claims reviewer',
          'Verify supporting documentation',
          'Contact provider if needed',
          'Make final adjudication decision'
        ];
      } else {
        // Auto-approve and update claim status
        await this.updateClaimStatus(claimRequest.claimId, processingResult);
        processingResult.nextSteps = [
          'Process payment to provider',
          'Send EOB to member',
          'Update benefit utilization',
          'Archive claim documentation'
        ];
      }

      // Log claim processing
      await this.logClaimProcessing(claimRequest, processingResult);

      return processingResult;
    } catch (error) {
      console.error('Error processing claim:', error);
      return this.createErrorResult(claimRequest, [`Processing failed: ${error.message}`]);
    }
  }

  /**
   * Process batch of claims with enhanced adjudication
   */
  async processBatchClaims(
    batchRequest: BatchClaimProcessingRequest
  ): Promise<BatchClaimProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const claimResults: EnhancedClaimProcessingResult[] = [];

    let processedClaims = 0;
    let approvedClaims = 0;
    let partiallyApprovedClaims = 0;
    let deniedClaims = 0;
    let requiresReviewClaims = 0;
    let totalApprovedAmount = 0;
    let totalDeniedAmount = 0;
    let totalMemberResponsibility = 0;

    try {
      // Get all claim details
      const claims = await Promise.all(
        batchRequest.claimIds.map(id => this.storage.getClaim(id))
      );

      // Validate all claims
      const validClaims: { claim: any; id: number }[] = [];
      for (let i = 0; i < batchRequest.claimIds.length; i++) {
        const claim = claims[i];
        const claimId = batchRequest.claimIds[i];

        if (!claim) {
          errors.push(`Claim ${claimId} not found`);
          continue;
        }

        const claimRequest = await this.createClaimRequestFromClaim(claim);
        const validation = await this.validateClaimRequest(claimRequest);

        if (validation.isValid) {
          validClaims.push({ claim, id: claimId });
        } else {
          errors.push(`Claim ${claimId}: ${validation.errors.join(', ')}`);
        }
      }

      // Process claims
      if (batchRequest.processingOptions?.parallelProcessing) {
        // Parallel processing
        const batchSize = 10;
        for (let i = 0; i < validClaims.length; i += batchSize) {
          const batch = validClaims.slice(i, i + batchSize);
          const batchPromises = batch.map(async ({ claim, id }) => {
            try {
              const claimRequest = await this.createClaimRequestFromClaim(claim);
              const result = await this.processClaim(claimRequest);
              return { success: true, result, claimId: id };
            } catch (error) {
              return { success: false, error: error.message, claimId: id };
            }
          });

          const batchResults = await Promise.all(batchPromises);

          batchResults.forEach(({ success, result, error, claimId }) => {
            if (success) {
              claimResults.push(result);
              this.updateBatchCounters(result, {
                processedClaims,
                approvedClaims,
                partiallyApprovedClaims,
                deniedClaims,
                requiresReviewClaims,
                totalApprovedAmount,
                totalDeniedAmount,
                totalMemberResponsibility
              });
            } else {
              errors.push(`Claim ${claimId}: ${error}`);
            }
          });
        }
      } else {
        // Sequential processing
        for (const { claim, id } of validClaims) {
          try {
            const claimRequest = await this.createClaimRequestFromClaim(claim);
            const result = await this.processClaim(claimRequest);
            claimResults.push(result);

            this.updateBatchCounters(result, {
              processedClaims,
              approvedClaims,
              partiallyApprovedClaims,
              deniedClaims,
              requiresReviewClaims,
              totalApprovedAmount,
              totalDeniedAmount,
              totalMemberResponsibility
            });
          } catch (error) {
            errors.push(`Claim ${id}: ${error.message}`);
          }
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        totalClaims: batchRequest.claimIds.length,
        processedClaims,
        approvedClaims,
        partiallyApprovedClaims,
        deniedClaims,
        requiresReviewClaims,
        totalApprovedAmount,
        totalDeniedAmount,
        totalMemberResponsibility,
        processingTime,
        claimResults,
        errors
      };
    } catch (error) {
      console.error('Error processing batch claims:', error);
      errors.push(`Batch processing failed: ${error.message}`);

      return {
        totalClaims: batchRequest.claimIds.length,
        processedClaims,
        approvedClaims,
        partiallyApprovedClaims,
        deniedClaims,
        requiresReviewClaims,
        totalApprovedAmount,
        totalDeniedAmount,
        totalMemberResponsibility,
        processingTime: Date.now() - startTime,
        claimResults,
        errors
      };
    }
  }

  /**
   * Generate comprehensive claims analytics
   */
  async generateClaimsAnalytics(
    timeframe: { startDate: Date; endDate: Date },
    schemeId?: number,
    planTierId?: number
  ): Promise<ClaimAnalytics> {
    try {
      // Get claims within timeframe
      const claims = await this.getClaimsByTimeframe(timeframe.startDate, timeframe.endDate, schemeId, planTierId);

      const totalClaims = claims.length;
      const totalClaimAmount = claims.reduce((sum, claim) => sum + (claim.amount || 0), 0);
      const averageClaimAmount = totalClaims > 0 ? totalClaimAmount / totalClaims : 0;

      // Calculate adjudication results
      const adjudicationResults = this.calculateAdjudicationResults(claims);

      // Analyze benefit utilization
      const benefitUtilization = await this.analyzeBenefitUtilization(claims);

      // Analyze provider performance
      const providerAnalysis = await this.analyzeProviderPerformance(claims);

      // Analyze cost sharing
      const costSharingAnalysis = await this.analyzeCostSharing(claims);

      return {
        timeframe,
        schemeId,
        planTierId,
        totalClaims,
        totalClaimAmount,
        averageClaimAmount,
        adjudicationResults,
        benefitUtilization,
        providerAnalysis,
        costSharingAnalysis
      };
    } catch (error) {
      console.error('Error generating claims analytics:', error);
      throw new Error(`Failed to generate claims analytics: ${error.message}`);
    }
  }

  /**
   * Get claims requiring manual review
   */
  async getClaimsRequiringReview(
    filters?: {
      priority?: 'high' | 'medium' | 'low';
      schemeId?: number;
      dateRange?: { startDate: Date; endDate: Date };
    }
  ): Promise<any[]> {
    try {
      // Get claims that require manual review
      const reviewClaims = await this.storage.getClaimsRequiringReview(filters);

      // Enrich with additional information
      const enrichedClaims = await Promise.all(
        reviewClaims.map(async (claim) => {
          const member = await this.storage.getMember(claim.memberId);
          const provider = await this.storage.getMedicalInstitution(claim.institutionId);
          const ruleResults = await this.storage.getClaimRuleResults(claim.id);

          return {
            ...claim,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
            providerName: provider?.name || 'Unknown',
            ruleFailures: ruleResults.filter(r => r.result === 'FAIL'),
            priority: await this.calculateReviewPriority(claim, ruleResults),
            timeInQueue: this.calculateTimeInQueue(claim.createdAt)
          };
        })
      );

      // Sort by priority and time in queue
      return enrichedClaims.sort((a, b) => {
        if (a.priority !== b.priority) {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.timeInQueue - a.timeInQueue;
      });
    } catch (error) {
      console.error('Error getting claims requiring review:', error);
      throw new Error(`Failed to get claims requiring review: ${error.message}`);
    }
  }

  // Private helper methods

  private async validateClaimRequest(request: ClaimProcessingRequest): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validate required fields
    if (!request.claimId) errors.push('Claim ID is required');
    if (!request.memberId) errors.push('Member ID is required');
    if (!request.providerId) errors.push('Provider ID is required');
    if (!request.claimAmount || request.claimAmount <= 0) errors.push('Valid claim amount is required');

    // Validate member exists
    if (request.memberId) {
      const member = await this.storage.getMember(request.memberId);
      if (!member) errors.push('Member not found');
    }

    // Validate provider exists
    if (request.providerId) {
      const provider = await this.storage.getMedicalInstitution(request.providerId);
      if (!provider) errors.push('Provider not found');
    }

    // Validate claim exists
    if (request.claimId) {
      const claim = await this.storage.getClaim(request.claimId);
      if (!claim) errors.push('Claim not found');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private createErrorResult(request: ClaimProcessingRequest, errors: string[]): EnhancedClaimProcessingResult {
    return {
      claimId: request.claimId,
      memberId: request.memberId,
      adjudicationDate: new Date(),
      originalAmount: request.claimAmount,
      approvedAmount: 0,
      deniedAmount: request.claimAmount,
      memberResponsibility: request.claimAmount,
      insurerResponsibility: 0,
      networkDiscountApplied: 0,
      adjudicationDecision: 'DENIED',
      denialReasons: errors,
      benefitApplications: [],
      ruleExecutions: [],
      costSharingBreakdown: {
        deductible: 0,
        copay: 0,
        coinsurance: 0,
        totalMemberResponsibility: request.claimAmount
      },
      processingMetrics: {
        totalProcessingTime: 0,
        rulesEngineTime: 0,
        benefitValidationTime: 0,
        limitCheckTime: 0
      },
      requiresManualReview: false,
      reviewReasons: [],
      nextSteps: ['Contact submitter for corrections', 'Resubmit corrected claim']
    };
  }

  private async convertAdjudicationResult(
    adjudicationResult: any,
    claimRequest: ClaimProcessingRequest
  ): Promise<EnhancedClaimProcessingResult> {
    // Convert from adjudication service format to claims integration format
    return {
      claimId: claimRequest.claimId,
      memberId: claimRequest.memberId,
      adjudicationDate: adjudicationResult.adjudicationDate,
      originalAmount: adjudicationResult.originalAmount,
      approvedAmount: adjudicationResult.approvedAmount,
      deniedAmount: adjudicationResult.originalAmount - adjudicationResult.approvedAmount,
      memberResponsibility: adjudicationResult.memberResponsibility,
      insurerResponsibility: adjudicationResult.insurerResponsibility,
      networkDiscountApplied: adjudicationResult.providerDiscountApplied,
      adjudicationDecision: adjudicationResult.overallDecision as any,
      denialReasons: adjudicationResult.denialReasons,
      benefitApplications: adjudicationResult.benefitApplicationDetails.map((app: any) => ({
        benefitId: app.benefitId,
        benefitName: app.benefitName,
        coveragePercentage: app.coveragePercentage,
        limitApplied: app.annualLimit || 0,
        limitRemaining: app.remainingLimit || 0,
        waitingPeriodApplied: adjudicationResult.waitingPeriodApplied
      })),
      ruleExecutions: adjudicationResult.appliedRules.map((rule: any) => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        result: rule.result,
        impact: rule.impact,
        executionTime: rule.executionTime
      })),
      costSharingBreakdown: {
        deductible: adjudicationResult.deductibleApplied,
        copay: adjudicationResult.copayApplied,
        coinsurance: adjudicationResult.coinsuranceApplied,
        totalMemberResponsibility: adjudicationResult.costSharingBreakdown.totalMemberResponsibility
      },
      processingMetrics: {
        totalProcessingTime: 0,
        rulesEngineTime: 0,
        benefitValidationTime: 0,
        limitCheckTime: 0
      },
      requiresManualReview: adjudicationResult.requiresManualReview,
      reviewReasons: [],
      nextSteps: adjudicationResult.nextSteps
    };
  }

  private extractRulesEngineTime(result: any): number {
    // Extract rules engine execution time from result
    return result.ruleExecutionLogs?.reduce((total: number, log: any) => total + (log.executionTime || 0), 0) || 0;
  }

  private extractBenefitValidationTime(result: any): number {
    // Extract benefit validation time from result
    return 0; // Would be tracked in real implementation
  }

  private extractLimitCheckTime(result: any): number {
    // Extract limit check time from result
    return 0; // Would be tracked in real implementation
  }

  private async determineManualReviewRequirement(
    result: EnhancedClaimProcessingResult,
    request: ClaimProcessingRequest
  ): Promise<boolean> {
    // Determine if manual review is required
    return result.requiresManualReview ||
           result.adjudicationDecision === 'REQUIRES_REVIEW' ||
           request.claimAmount > 10000 || // High-value claims
           result.ruleExecutions.some(r => r.result === 'FAIL' && r.ruleName.includes('mandatory'));
  }

  private async getManualReviewReasons(result: EnhancedClaimProcessingResult): Promise<string[]> {
    const reasons: string[] = [];

    if (result.adjudicationDecision === 'REQUIRES_REVIEW') {
      reasons.push('Adjudication requires review');
    }

    if (result.ruleExecutions.some(r => r.result === 'FAIL')) {
      reasons.push('Rules engine failures detected');
    }

    if (result.denialReasons.length > 0) {
      reasons.push('Claim has denial reasons');
    }

    if (result.originalAmount > 10000) {
      reasons.push('High-value claim');
    }

    return reasons;
  }

  private async updateClaimStatus(claimId: number, result: EnhancedClaimProcessingResult): Promise<void> {
    // Update claim status in database based on adjudication result
    const status = result.adjudicationDecision === 'APPROVED' ? 'approved' :
                  result.adjudicationDecision === 'PARTIALLY_APPROVED' ? 'partially_approved' :
                  result.adjudicationDecision === 'DENIED' ? 'denied' : 'pending_review';

    // await this.storage.updateClaimStatus(claimId, status, {
    //   approvedAmount: result.approvedAmount,
    //   memberResponsibility: result.memberResponsibility,
    //   insurerResponsibility: result.insurerResponsibility,
    //   adjudicationDate: result.adjudicationDate,
    //   denialReasons: result.denialReasons
    // });
  }

  private async logClaimProcessing(request: ClaimProcessingRequest, result: EnhancedClaimProcessingResult): Promise<void> {
    // Log claim processing for audit trail
    console.log(`Claim ${request.claimId} processed: ${result.adjudicationDecision}, Amount: ${result.approvedAmount}`);
  }

  private async createClaimRequestFromClaim(claim: any): Promise<ClaimProcessingRequest> {
    return {
      claimId: claim.id,
      memberId: claim.memberId,
      providerId: claim.institutionId,
      claimAmount: claim.amount || 0,
      serviceCategory: claim.serviceCategory || 'general',
      serviceCode: claim.serviceCode,
      diagnosisCodes: claim.diagnosisCodes,
      submissionDate: claim.submissionDate || new Date(),
      serviceDate: claim.serviceDate || new Date(),
      isPreAuthorized: claim.isPreAuthorized,
      preAuthNumber: claim.preAuthNumber,
      referralRequired: claim.referralRequired,
      referralNumber: claim.referralNumber
    };
  }

  private updateBatchCounters(
    result: EnhancedClaimProcessingResult,
    counters: {
      processedClaims: number;
      approvedClaims: number;
      partiallyApprovedClaims: number;
      deniedClaims: number;
      requiresReviewClaims: number;
      totalApprovedAmount: number;
      totalDeniedAmount: number;
      totalMemberResponsibility: number;
    }
  ): void {
    counters.processedClaims++;

    switch (result.adjudicationDecision) {
      case 'APPROVED':
        counters.approvedClaims++;
        counters.totalApprovedAmount += result.approvedAmount;
        break;
      case 'PARTIALLY_APPROVED':
        counters.partiallyApprovedClaims++;
        counters.totalApprovedAmount += result.approvedAmount;
        counters.totalDeniedAmount += result.deniedAmount;
        break;
      case 'DENIED':
        counters.deniedClaims++;
        counters.totalDeniedAmount += result.deniedAmount;
        break;
      case 'REQUIRES_REVIEW':
        counters.requiresReviewClaims++;
        break;
    }

    counters.totalMemberResponsibility += result.memberResponsibility;
  }

  private calculateAdjudicationResults(claims: any[]): any {
    // Calculate adjudication result statistics
    const results = {
      approved: { count: 0, amount: 0, percentage: 0 },
      partiallyApproved: { count: 0, amount: 0, percentage: 0 },
      denied: { count: 0, amount: 0, percentage: 0 },
      requiresReview: { count: 0, amount: 0, percentage: 0 }
    };

    const totalClaims = claims.length;

    claims.forEach(claim => {
      const status = claim.status || 'pending';
      const amount = claim.amount || 0;

      switch (status) {
        case 'approved':
          results.approved.count++;
          results.approved.amount += amount;
          break;
        case 'partially_approved':
          results.partiallyApproved.count++;
          results.partiallyApproved.amount += amount;
          break;
        case 'denied':
          results.denied.count++;
          results.denied.amount += amount;
          break;
        case 'pending_review':
          results.requiresReview.count++;
          results.requiresReview.amount += amount;
          break;
      }
    });

    // Calculate percentages
    if (totalClaims > 0) {
      results.approved.percentage = (results.approved.count / totalClaims) * 100;
      results.partiallyApproved.percentage = (results.partiallyApproved.count / totalClaims) * 100;
      results.denied.percentage = (results.denied.count / totalClaims) * 100;
      results.requiresReview.percentage = (results.requiresReview.count / totalClaims) * 100;
    }

    return results;
  }

  private async analyzeBenefitUtilization(claims: any[]): Promise<any[]> {
    // Analyze benefit utilization from claims
    const utilization = new Map();

    claims.forEach(claim => {
      const category = claim.serviceCategory || 'general';
      const amount = claim.amount || 0;

      if (!utilization.has(category)) {
        utilization.set(category, {
          benefitCategory: category,
          claimsCount: 0,
          totalAmount: 0,
          utilizationPercentage: 0
        });
      }

      const util = utilization.get(category);
      util.claimsCount++;
      util.totalAmount += amount;
    });

    return Array.from(utilization.values());
  }

  private async analyzeProviderPerformance(claims: any[]): Promise<any[]> {
    // Analyze provider performance from claims
    const providers = new Map();

    claims.forEach(claim => {
      const providerId = claim.institutionId;
      const amount = claim.amount || 0;

      if (!providers.has(providerId)) {
        providers.set(providerId, {
          providerId,
          providerName: '',
          claimsCount: 0,
          totalAmount: 0,
          averageProcessingTime: 0,
          denialRate: 0
        });
      }

      const provider = providers.get(providerId);
      provider.claimsCount++;
      provider.totalAmount += amount;
    });

    return Array.from(providers.values());
  }

  private async analyzeCostSharing(claims: any[]): Promise<any> {
    // Analyze cost sharing from claims
    return {
      totalMemberResponsibility: 0,
      totalInsurerResponsibility: 0,
      averageMemberResponsibilityPercentage: 0,
      networkDiscountsApplied: 0
    };
  }

  private async getClaimsByTimeframe(
    startDate: Date,
    endDate: Date,
    schemeId?: number,
    planTierId?: number
  ): Promise<any[]> {
    // Get claims by timeframe with optional scheme/plan tier filtering
    return [];
  }

  private async calculateReviewPriority(claim: any, ruleResults: any[]): Promise<'high' | 'medium' | 'low'> {
    // Calculate review priority based on claim characteristics
    if (claim.amount > 10000) return 'high';
    if (ruleResults.some(r => r.result === 'FAIL')) return 'high';
    if (claim.amount > 5000) return 'medium';
    return 'low';
  }

  private calculateTimeInQueue(createdAt: Date): number {
    return Date.now() - createdAt.getTime();
  }
}

export default SchemesClaimsIntegrationService;