/**
 * Premium Calculation Service - Business Logic Layer
 * Provides high-level premium calculation operations with business rules and validation
 */

import { IStorage } from '../storage';
import * as schema from '@shared/schema';
import {
  calculatePremium,
  calculateEnhancedPremium,
  calculateIndividualPremium,
  calculateMixedModelPremium,
  PremiumCalculationOptions,
  getPricingMethodology
} from '../utils/premiumCalculator';
import {
  calculateActuarialRates,
  generatePricingCertification,
  calculateLossRatioTargets,
  determineExpenseLoadings,
  calculateProfitMargins,
  applyRegulatoryConstraints,
  ActuarialRateInput,
  ActuarialRateResult
} from '../utils/actuarialRateEngine';
import {
  optimizePremiumStructure,
  analyzePriceElasticity,
  segmentPricingAnalysis,
  competitorRateComparison,
  PremiumOptimizationInput,
  PremiumOptimizationResult
} from '../utils/premiumOptimization';
import {
  calculateRiskAdjustedPremium,
  PremiumCalculationInput as EnhancedInput,
  PremiumResult
} from '../utils/enhancedPremiumCalculator';

// Service layer interfaces
export interface MemberPremiumRequest {
  memberId: number;
  calculationOptions?: PremiumCalculationOptions;
  breakdown?: boolean;
  projections?: boolean;
}

export interface GroupPremiumRequest {
  companyId: number;
  periodId?: number;
  memberIds?: number[];
  calculationOptions?: PremiumCalculationOptions;
  breakdown?: boolean;
  projections?: boolean;
}

export interface PremiumQuoteRequest {
  prospectData: ProspectData;
  benefitDesign: BenefitDesignRequest;
  geographicInfo: GeographicInfo;
  timeframe: QuoteTimeframe;
}

export interface ProspectData {
  individualCount: number;
  familyStructure: FamilyStructureData;
  demographics: ProspectDemographics;
  industryType: string;
  riskFactors?: string[];
}

export interface FamilyStructureData {
  individual: number;
  couple: number;
  singleParentOneChild: number;
  singleParentMultipleChildren: number;
  family: number;
}

export interface ProspectDemographics {
  averageAge: number;
  ageDistribution: Record<string, number>;
  location: string;
  businessSize: string;
}

export interface BenefitDesignRequest {
  deductibleLevel: 'low' | 'medium' | 'high';
  coinsuranceLevel: number;
  networkType: 'HMO' | 'PPO' | 'POS' | 'EPO';
  benefitRichness: 'basic' | 'standard' | 'comprehensive';
  wellnessIncentives: boolean;
}

export interface GeographicInfo {
  state: string;
  county?: string;
  city?: string;
  zipCode?: string;
}

export interface QuoteTimeframe {
  effectiveDate: Date;
  coverageDuration: number; // months
  quoteValidUntil: Date;
}

export interface PremiumCalculationResult {
  premium: schema.InsertPremium | PremiumResult;
  methodology: string;
  breakdown?: PremiumBreakdown;
  projections?: PremiumProjection[];
  assumptions: string[];
  confidence: number;
  auditTrail: AuditTrailEntry[];
  businessRules: BusinessRuleValidation[];
}

export interface PremiumBreakdown {
  baseRate: number;
  demographicAdjustments: Record<string, number>;
  riskAdjustments: Record<string, number>;
  geographicAdjustments: Record<string, number>;
  benefitDesignAdjustments: Record<string, number>;
  loadings: LoadingBreakdown;
  taxes: number;
  totalAdjustments: number;
}

export interface LoadingBreakdown {
  administrative: number;
  profit: number;
  riskCharge: number;
  commission: number;
  reinsurance: number;
  total: number;
}

export interface PremiumProjection {
  year: number;
  projectedPremium: number;
  assumptions: string[];
  confidence: number;
  factors: ProjectionFactors;
}

export interface ProjectionFactors {
  inflationRate: number;
  utilizationTrend: number;
  demographicChanges: number;
  marketConditions: string;
}

export interface AuditTrailEntry {
  timestamp: Date;
  action: string;
  parameters: Record<string, any>;
  result: any;
  userId?: string;
  ip?: string;
}

export interface BusinessRuleValidation {
  rule: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  impact: string;
}

export interface PremiumQuoteResult {
  quoteId: string;
  prospectData: ProspectData;
  calculatedRates: QuoteRates;
  methodology: string;
  assumptions: string[];
  validUntil: Date;
  businessRules: BusinessRuleValidation[];
  nextSteps: string[];
  agentNotes?: string;
}

export interface QuoteRates {
  standard: QuoteRateDetail;
  enhanced: QuoteRateDetail;
  optimized: QuoteRateDetail;
}

export interface QuoteRateDetail {
  methodology: string;
  monthlyPremium: number;
  annualPremium: number;
  breakdown: PremiumBreakdown;
  confidence: number;
  competitivePositioning: 'premium' | 'competitive' | 'discount';
}

export interface BatchPremiumRequest {
  companyId: number;
  memberIds: number[];
  calculationOptions: PremiumCalculationOptions;
  parallelProcessing?: boolean;
}

export interface BatchPremiumResult {
  totalMembers: number;
  processedMembers: number;
  failedMembers: FailedMemberCalculation[];
  aggregatedResults: AggregatedPremiumResults;
  processingTime: number;
  errors: string[];
}

export interface FailedMemberCalculation {
  memberId: number;
  error: string;
  originalRequest: any;
}

export interface AggregatedPremiumResults {
  totalStandardPremium: number;
  totalEnhancedPremium: number;
  averageDifference: number;
  memberDistribution: MemberDistribution;
  riskScoreDistribution: RiskScoreDistribution;
}

export interface MemberDistribution {
  lowRisk: number;
  moderateRisk: number;
  highRisk: number;
  criticalRisk: number;
}

export interface RiskScoreDistribution {
  average: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
}

export interface PremiumValidationRequest {
  premiumData: schema.InsertPremium;
  validationRules: ValidationRule[];
  businessContext: BusinessContext;
}

export interface ValidationRule {
  ruleId: string;
  ruleType: 'regulatory' | 'business' | 'actuarial' | 'system';
  description: string;
  parameters: Record<string, any>;
  severity: 'error' | 'warning' | 'info';
}

export interface BusinessContext {
  marketSegment: string;
  geographicRegion: string;
  productType: string;
  effectiveDate: Date;
  businessPurpose: string;
}

export interface PremiumValidationResult {
  isValid: boolean;
  validations: ValidationResult[];
  overallScore: number;
  recommendations: ValidationRecommendation[];
  auditRequired: boolean;
  complianceStatus: ComplianceStatus;
}

export interface ValidationResult {
  ruleId: string;
  ruleType: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details: Record<string, any>;
  impact: string;
  remediation?: string;
}

export interface ValidationRecommendation {
  category: string;
  recommendation: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  expectedImpact: string;
  implementationCost?: number;
}

export interface ComplianceStatus {
  federalCompliance: boolean;
  stateCompliance: boolean;
  regulatoryViolations: RegulatoryViolation[];
  requiredFilings: string[];
  approvalStatus: string;
}

export interface RegulatoryViolation {
  regulation: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  impact: string;
  remediationRequired: boolean;
  timeline?: string;
}

// Business rules engine configuration
const BUSINESS_RULES = {
  minimumPremium: {
    individual: 50,
    family: 150
  },
  maximumPremium: {
    individual: 2000,
    family: 6000
  },
  profitMargins: {
    minimum: 0.02,
    maximum: 0.15,
    target: 0.05
  },
  lossRatios: {
    minimum: 0.70,
    maximum: 0.95,
    target: 0.82
  },
  rateChangeLimits: {
    maximumIncrease: 0.20,
    maximumDecrease: 0.15,
    notificationThreshold: 0.05
  },
  demographicLimits: {
    ageRatingRatio: 3.0,
    geographicVariance: 1.5,
    tobaccoRatingRatio: 1.5
  },
  confidenceThresholds: {
    minimum: 60,
    target: 80,
    highQuality: 90
  }
};

/**
 * Main premium calculation service class
 */
export class PremiumCalculationService {
  constructor(private storage: IStorage) {}

  /**
   * Calculate premium for individual member with comprehensive business logic
   */
  async calculateMemberPremium(request: MemberPremiumRequest): Promise<PremiumCalculationResult> {
    const auditTrail: AuditTrailEntry[] = [];
    const businessRules: BusinessRuleValidation[] = [];

    try {
      // Log calculation start
      auditTrail.push({
        timestamp: new Date(),
        action: 'member_premium_calculation_started',
        parameters: { memberId: request.memberId, options: request.calculationOptions },
        result: null
      });

      // Validate business rules
      const member = await this.storage.getMember(request.memberId);
      if (!member) {
        throw new Error(`Member with ID ${request.memberId} not found`);
      }

      // Apply business rule validations
      await this.validateBusinessRules(member, request.calculationOptions, businessRules);

      // Calculate premium using enhanced method if requested
      let premiumResult: schema.InsertPremium | PremiumResult;
      let methodology: string;

      if (request.calculationOptions?.includeRiskAdjustment) {
        premiumResult = await calculateIndividualPremium(this.storage, request.memberId, request.calculationOptions);
        methodology = 'risk-adjusted';
      } else {
        premiumResult = await calculatePremium(this.storage, member.companyId, undefined, request.calculationOptions);
        methodology = 'standard';
      }

      // Validate calculation results
      await this.validateCalculationResults(premiumResult, businessRules);

      // Generate projections if requested
      let projections: PremiumProjection[] = [];
      if (request.projections) {
        projections = await this.generatePremiumProjections(premiumResult, request.memberId);
      }

      // Generate breakdown if requested
      let breakdown: PremiumBreakdown | undefined;
      if (request.breakdown && 'adjustedPremium' in premiumResult) {
        breakdown = this.generatePremiumBreakdown(premiumResult as PremiumResult);
      }

      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(premiumResult, request.calculationOptions);

      auditTrail.push({
        timestamp: new Date(),
        action: 'member_premium_calculation_completed',
        parameters: { memberId: request.memberId },
        result: { methodology, premium: 'total' in premiumResult ? premiumResult.total : premiumResult.adjustedPremium }
      });

      return {
        premium: premiumResult,
        methodology,
        breakdown,
        projections,
        assumptions: this.generateAssumptions(methodology, request.calculationOptions),
        confidence,
        auditTrail,
        businessRules
      };
    } catch (error) {
      auditTrail.push({
        timestamp: new Date(),
        action: 'member_premium_calculation_failed',
        parameters: { memberId: request.memberId },
        result: { error: error.message }
      });
      throw error;
    }
  }

  /**
   * Calculate premium for company/group with comprehensive business logic
   */
  async calculateGroupPremium(request: GroupPremiumRequest): Promise<PremiumCalculationResult> {
    const auditTrail: AuditTrailEntry[] = [];
    const businessRules: BusinessRuleValidation[] = [];

    try {
      auditTrail.push({
        timestamp: new Date(),
        action: 'group_premium_calculation_started',
        parameters: { companyId: request.companyId, periodId: request.periodId, memberIds: request.memberIds },
        result: null
      });

      // Validate company and business rules
      const company = await this.storage.getCompany(request.companyId);
      if (!company) {
        throw new Error(`Company with ID ${request.companyId} not found`);
      }

      await this.validateGroupBusinessRules(company, request, businessRules);

      // Calculate group premium
      let premiumResult: schema.InsertPremium | PremiumResult;
      let methodology: string;

      const options = {
        ...request.calculationOptions,
        // Add group-specific member IDs if not provided
        memberIds: request.memberIds || await this.getCompanyMemberIds(request.companyId)
      };

      if (request.calculationOptions?.includeRiskAdjustment) {
        const enhancedInput: EnhancedInput = {
          companyId: request.companyId,
          periodId: request.periodId,
          memberIds: options.memberIds,
          includeRiskAdjustment: true,
          geographicRegion: request.calculationOptions?.geographicRegion,
          projectionYear: request.calculationOptions?.projectionYear,
          dataQuality: request.calculationOptions?.dataQuality || 85
        };
        premiumResult = await calculateRiskAdjustedPremium(this.storage, enhancedInput);
        methodology = 'risk-adjusted';
      } else {
        premiumResult = await calculatePremium(this.storage, request.companyId, request.periodId, request.calculationOptions);
        methodology = 'standard';
      }

      // Validate calculation results
      await this.validateCalculationResults(premiumResult, businessRules);

      // Generate projections if requested
      let projections: PremiumProjection[] = [];
      if (request.projections) {
        projections = await this.generateGroupPremiumProjections(premiumResult, request.companyId);
      }

      // Generate breakdown if requested
      let breakdown: PremiumBreakdown | undefined;
      if (request.breakdown && 'adjustedPremium' in premiumResult) {
        breakdown = this.generatePremiumBreakdown(premiumResult as PremiumResult);
      }

      const confidence = this.calculateConfidenceScore(premiumResult, request.calculationOptions);

      auditTrail.push({
        timestamp: new Date(),
        action: 'group_premium_calculation_completed',
        parameters: { companyId: request.companyId },
        result: { methodology, premium: 'total' in premiumResult ? premiumResult.total : premiumResult.adjustedPremium }
      });

      return {
        premium: premiumResult,
        methodology,
        breakdown,
        projections,
        assumptions: this.generateAssumptions(methodology, request.calculationOptions),
        confidence,
        auditTrail,
        businessRules
      };
    } catch (error) {
      auditTrail.push({
        timestamp: new Date(),
        action: 'group_premium_calculation_failed',
        parameters: { companyId: request.companyId },
        result: { error: error.message }
      });
      throw error;
    }
  }

  /**
   * Generate premium quote for prospective customers
   */
  async generatePremiumQuote(request: PremiumQuoteRequest): Promise<PremiumQuoteResult> {
    const quoteId = `QUOTE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const businessRules: BusinessRuleValidation[] = [];

    try {
      // Validate quote request
      await this.validateQuoteRequest(request, businessRules);

      // Generate quote rates using different methodologies
      const standardRate = await this.calculateStandardQuote(request);
      const enhancedRate = await this.calculateEnhancedQuote(request);
      const optimizedRate = await this.calculateOptimizedQuote(request);

      // Determine competitive positioning
      const competitivePositioning = await this.analyzeCompetitivePositioning(standardRate, enhancedRate);

      return {
        quoteId,
        prospectData: request.prospectData,
        calculatedRates: {
          standard: {
            ...standardRate,
            competitivePositioning: competitivePositioning.standard
          },
          enhanced: {
            ...enhancedRate,
            competitivePositioning: competitivePositioning.enhanced
          },
          optimized: {
            ...optimizedRate,
            competitivePositioning: competitivePositioning.optimized
          }
        },
        methodology: 'comprehensive_multi_methodology',
        assumptions: [
          'Based on current market data and trends',
          'Subject to underwriting review',
          'Rates may vary based on final member composition'
        ],
        validUntil: request.quoteTimeframe.quoteValidUntil,
        businessRules,
        nextSteps: [
          'Complete underwriting process',
          'Provide member roster',
          'Select final benefit design',
          'Schedule implementation'
        ]
      };
    } catch (error) {
      throw new Error(`Quote generation failed: ${error.message}`);
    }
  }

  /**
   * Process batch premium calculations for efficiency
   */
  async processBatchPremiumCalculations(request: BatchPremiumRequest): Promise<BatchPremiumResult> {
    const startTime = Date.now();
    const failedMembers: FailedMemberCalculation[] = [];
    const errors: string[] = [];

    try {
      const memberPremiums: (schema.InsertPremium | PremiumResult)[] = [];
      let processedCount = 0;

      // Process members in parallel if requested
      if (request.parallelProcessing) {
        const batchSize = 10; // Process 10 members at a time
        for (let i = 0; i < request.memberIds.length; i += batchSize) {
          const batch = request.memberIds.slice(i, i + batchSize);
          const batchPromises = batch.map(async (memberId) => {
            try {
              const result = request.calculationOptions?.includeRiskAdjustment
                ? await calculateIndividualPremium(this.storage, memberId, request.calculationOptions)
                : await calculatePremium(this.storage, request.companyId, undefined, request.calculationOptions);
              return { memberId, result, success: true };
            } catch (error) {
              return {
                memberId,
                success: false,
                error: error.message,
                originalRequest: { memberId, options: request.calculationOptions }
              };
            }
          });

          const batchResults = await Promise.all(batchPromises);

          batchResults.forEach(result => {
            if (result.success) {
              memberPremiums.push(result.result);
              processedCount++;
            } else {
              failedMembers.push({
                memberId: result.memberId,
                error: result.error,
                originalRequest: result.originalRequest
              });
            }
          });
        }
      } else {
        // Sequential processing
        for (const memberId of request.memberIds) {
          try {
            const result = request.calculationOptions?.includeRiskAdjustment
              ? await calculateIndividualPremium(this.storage, memberId, request.calculationOptions)
              : await calculatePremium(this.storage, request.companyId, undefined, request.calculationOptions);
            memberPremiums.push(result);
            processedCount++;
          } catch (error) {
            failedMembers.push({
              memberId,
              error: error.message,
              originalRequest: { memberId, options: request.calculationOptions }
            });
          }
        }
      }

      // Aggregate results
      const aggregatedResults = await this.aggregatePremiumResults(memberPremiums);

      const processingTime = Date.now() - startTime;

      return {
        totalMembers: request.memberIds.length,
        processedMembers: processedCount,
        failedMembers,
        aggregatedResults,
        processingTime,
        errors
      };
    } catch (error) {
      errors.push(`Batch processing failed: ${error.message}`);
      return {
        totalMembers: request.memberIds.length,
        processedMembers: 0,
        failedMembers,
        aggregatedResults: {
          totalStandardPremium: 0,
          totalEnhancedPremium: 0,
          averageDifference: 0,
          memberDistribution: { lowRisk: 0, moderateRisk: 0, highRisk: 0, criticalRisk: 0 },
          riskScoreDistribution: { average: 0, median: 0, min: 0, max: 0, standardDeviation: 0 }
        },
        processingTime: Date.now() - startTime,
        errors
      };
    }
  }

  /**
   * Validate premium calculations against business rules
   */
  async validatePricingRules(request: PremiumValidationRequest): Promise<PremiumValidationResult> {
    const validations: ValidationResult[] = [];
    const recommendations: ValidationRecommendation[] = [];

    try {
      // Apply validation rules
      for (const rule of request.validationRules) {
        const validation = await this.applyValidationRule(rule, request.premiumData, request.businessContext);
        validations.push(validation);

        if (validation.status === 'failed' || validation.status === 'warning') {
          recommendations.push({
            category: rule.ruleType,
            recommendation: validation.remediation || 'Address the validation issue',
            priority: this.determinePriority(rule.severity, validation.status),
            expectedImpact: validation.impact
          });
        }
      }

      // Check regulatory compliance
      const complianceStatus = await this.checkRegulatoryCompliance(request.premiumData, request.businessContext);

      // Calculate overall score
      const overallScore = this.calculateValidationScore(validations);

      const isValid = validations.every(v => v.status !== 'failed') && complianceStatus.federalCompliance && complianceStatus.stateCompliance;
      const auditRequired = validations.some(v => v.status === 'failed') || !complianceStatus.federalCompliance || !complianceStatus.stateCompliance;

      return {
        isValid,
        validations,
        overallScore,
        recommendations,
        auditRequired,
        complianceStatus
      };
    } catch (error) {
      throw new Error(`Premium validation failed: ${error.message}`);
    }
  }

  /**
   * Generate audit trail for premium calculations
   */
  async auditPremiumCalculation(
    premiumId: number,
    action: string,
    userId?: string,
    details?: Record<string, any>
  ): Promise<AuditTrailEntry> {
    const auditEntry: AuditTrailEntry = {
      timestamp: new Date(),
      action,
      parameters: { premiumId, ...details },
      result: null,
      userId,
      ip: details?.ip
    };

    // In a real implementation, this would be stored in an audit log database
    console.log('Premium audit trail:', auditEntry);

    return auditEntry;
  }

  // Private helper methods

  private async validateBusinessRules(
    member: schema.Member,
    options?: PremiumCalculationOptions,
    businessRules: BusinessRuleValidation[]
  ): Promise<void> {
    // Validate member eligibility
    if (member.memberType !== 'principal' && !member.principalId) {
      businessRules.push({
        rule: 'dependent_without_principal',
        status: 'failed',
        message: 'Dependent member must have a principal member assigned',
        impact: 'Cannot calculate premium for unassigned dependent'
      });
    }

    // Validate calculation options
    if (options?.includeRiskAdjustment && !options.dataQuality) {
      businessRules.push({
        rule: 'risk_adjustment_without_data_quality',
        status: 'warning',
        message: 'Risk adjustment requested without data quality specification',
        impact: 'Using default data quality assumptions'
      });
    }
  }

  private async validateGroupBusinessRules(
    company: schema.Company,
    request: GroupPremiumRequest,
    businessRules: BusinessRuleValidation[]
  ): Promise<void> {
    // Validate company status
    if (!company.createdAt) {
      businessRules.push({
        rule: 'company_not_active',
        status: 'failed',
        message: 'Company is not properly activated',
        impact: 'Cannot calculate premium for inactive company'
      });
    }

    // Validate member count requirements
    if (request.memberIds && request.memberIds.length === 0) {
      businessRules.push({
        rule: 'empty_member_list',
        status: 'warning',
        message: 'No member IDs provided for group calculation',
        impact: 'Will calculate based on all company members'
      });
    }
  }

  private async validateCalculationResults(
    premium: schema.InsertPremium | PremiumResult,
    businessRules: BusinessRuleValidation[]
  ): Promise<void> {
    const total = 'total' in premium ? premium.total : premium.adjustedPremium;

    // Validate minimum premium requirements
    if (total < BUSINESS_RULES.minimumPremium.individual) {
      businessRules.push({
        rule: 'premium_below_minimum',
        status: 'failed',
        message: `Premium ${total} is below minimum requirement ${BUSINESS_RULES.minimumPremium.individual}`,
        impact: 'Premium does not meet minimum business requirements'
      });
    }

    // Validate maximum premium limits
    if (total > BUSINESS_RULES.maximumPremium.individual) {
      businessRules.push({
        rule: 'premium_above_maximum',
        status: 'warning',
        message: `Premium ${total} is above typical maximum ${BUSINESS_RULES.maximumPremium.individual}`,
        impact: 'Premium may not be competitive in market'
      });
    }
  }

  private async generatePremiumProjections(
    premium: schema.InsertPremium | PremiumResult,
    memberId: number
  ): Promise<PremiumProjection[]> {
    const projections: PremiumProjection[] = [];
    const basePremium = 'total' in premium ? premium.total : premium.adjustedPremium;

    for (let year = 1; year <= 5; year++) {
      const inflationRate = 0.064; // 6.4% healthcare inflation
      const utilizationTrend = 0.02; // 2% utilization increase
      const projectedPremium = basePremium * Math.pow(1 + inflationRate + utilizationTrend, year);

      projections.push({
        year,
        projectedPremium: Math.round(projectedPremium * 100) / 100,
        assumptions: [
          `${(inflationRate * 100).toFixed(1)}% annual healthcare inflation`,
          `${(utilizationTrend * 100).toFixed(1)}% annual utilization trend`,
          'No major regulatory changes',
          'Stable member health status'
        ],
        confidence: Math.max(60, 90 - (year * 5)), // Decreasing confidence over time
        factors: {
          inflationRate,
          utilizationTrend,
          demographicChanges: 0,
          marketConditions: 'stable'
        }
      });
    }

    return projections;
  }

  private async generateGroupPremiumProjections(
    premium: schema.InsertPremium | PremiumResult,
    companyId: number
  ): Promise<PremiumProjection[]> {
    // Similar to individual projections but with group-specific factors
    return this.generatePremiumProjections(premium, 0); // Reuse individual logic
  }

  private generatePremiumBreakdown(premiumResult: PremiumResult): PremiumBreakdown {
    return {
      baseRate: premiumResult.basePremium,
      demographicAdjustments: {
        age: premiumResult.breakdown.demographicAdjustment - 1,
        family: premiumResult.breakdown.familyAdjustment - 1,
        geographic: premiumResult.breakdown.geographicAdjustment - 1
      },
      riskAdjustments: {
        overallRisk: premiumResult.breakdown.riskAdjustment - 1,
        individualFactors: 0 // Would be broken down further in real implementation
      },
      geographicAdjustments: {
        region: premiumResult.breakdown.geographicAdjustment - 1,
        costIndex: 0
      },
      benefitDesignAdjustments: {
        network: 0,
        deductible: 0,
        coinsurance: 0
      },
      loadings: {
        administrative: 0.12,
        profit: 0.05,
        riskCharge: 0.05,
        commission: 0.04,
        reinsurance: 0.015,
        total: 0.275
      },
      taxes: premiumResult.breakdown.taxAdjustment,
      totalAdjustments: premiumResult.adjustedPremium - premiumResult.basePremium
    };
  }

  private calculateConfidenceScore(
    premium: schema.InsertPremium | PremiumResult,
    options?: PremiumCalculationOptions
  ): number {
    if ('confidence' in premium) {
      return premium.confidence;
    }

    // Standard calculation confidence
    let confidence = 95; // High confidence in standard calculations

    // Adjust based on options
    if (options?.dataQuality) {
      confidence = Math.min(confidence, options.dataQuality);
    }

    if (options?.includeRiskAdjustment) {
      confidence -= 10; // Risk adjustment adds uncertainty
    }

    return Math.max(60, confidence);
  }

  private generateAssumptions(methodology: string, options?: PremiumCalculationOptions): string[] {
    const assumptions = [
      'Premium rates based on current actuarial assumptions',
      'Healthcare cost trends aligned with CMS projections',
      'Regulatory compliance maintained'
    ];

    if (methodology === 'risk-adjusted') {
      assumptions.push(
        'Individual risk scores incorporated into pricing',
        'Risk adjustment factors applied according to actuarial standards'
      );
    }

    if (options?.dataQuality) {
      assumptions.push(`Data quality score: ${options.dataQuality}%`);
    }

    return assumptions;
  }

  private async getCompanyMemberIds(companyId: number): Promise<number[]> {
    const members = await this.storage.getMembersByCompany(companyId);
    return members.map(member => member.id);
  }

  private async validateQuoteRequest(request: PremiumQuoteRequest, businessRules: BusinessRuleValidation[]): Promise<void> {
    // Validate effective date
    if (request.quoteTimeframe.effectiveDate < new Date()) {
      businessRules.push({
        rule: 'past_effective_date',
        status: 'warning',
        message: 'Quote effective date is in the past',
        impact: 'Quote may not be valid for requested timeframe'
      });
    }

    // Validate prospect data completeness
    if (!request.prospectData.individualCount || request.prospectData.individualCount <= 0) {
      businessRules.push({
        rule: 'invalid_member_count',
        status: 'failed',
        message: 'Invalid or missing member count',
        impact: 'Cannot generate accurate quote'
      });
    }
  }

  private async calculateStandardQuote(request: PremiumQuoteRequest): Promise<QuoteRateDetail> {
    // Simplified quote calculation - would use full premium calculator in real implementation
    const baseRate = 450; // Base monthly premium
    const monthlyPremium = baseRate * request.prospectData.individualCount;
    const annualPremium = monthlyPremium * 12;

    return {
      methodology: 'standard',
      monthlyPremium: Math.round(monthlyPremium * 100) / 100,
      annualPremium: Math.round(annualPremium * 100) / 100,
      breakdown: this.generateQuoteBreakdown(monthlyPremium),
      confidence: 90,
      competitivePositioning: 'competitive'
    };
  }

  private async calculateEnhancedQuote(request: PremiumQuoteRequest): Promise<QuoteRateDetail> {
    // Enhanced quote calculation with risk factors
    const baseRate = 450;
    let riskAdjustment = 1.0;

    if (request.prospectData.riskFactors?.includes('high_industry_risk')) {
      riskAdjustment *= 1.15;
    }

    const monthlyPremium = baseRate * request.prospectData.individualCount * riskAdjustment;
    const annualPremium = monthlyPremium * 12;

    return {
      methodology: 'risk-adjusted',
      monthlyPremium: Math.round(monthlyPremium * 100) / 100,
      annualPremium: Math.round(annualPremium * 100) / 100,
      breakdown: this.generateQuoteBreakdown(monthlyPremium),
      confidence: 80,
      competitivePositioning: 'premium'
    };
  }

  private async calculateOptimizedQuote(request: PremiumQuoteRequest): Promise<QuoteRateDetail> {
    // Optimized quote calculation
    const baseRate = 450;
    let optimizationFactor = 0.95; // 5% optimization

    if (request.prospectData.individualCount > 50) {
      optimizationFactor = 0.92; // Larger group gets better rates
    }

    const monthlyPremium = baseRate * request.prospectData.individualCount * optimizationFactor;
    const annualPremium = monthlyPremium * 12;

    return {
      methodology: 'optimized',
      monthlyPremium: Math.round(monthlyPremium * 100) / 100,
      annualPremium: Math.round(annualPremium * 100) / 100,
      breakdown: this.generateQuoteBreakdown(monthlyPremium),
      confidence: 75,
      competitivePositioning: 'discount'
    };
  }

  private async analyzeCompetitivePositioning(standard: QuoteRateDetail, enhanced: QuoteRateDetail): {
    standard: 'premium' | 'competitive' | 'discount';
    enhanced: 'premium' | 'competitive' | 'discount';
    optimized: 'premium' | 'competitive' | 'discount';
  } {
    // Simplified competitive analysis - would use real market data
    const marketAverage = 500;

    return {
      standard: this.determinePositioning(standard.monthlyPremium, marketAverage),
      enhanced: this.determinePositioning(enhanced.monthlyPremium, marketAverage),
      optimized: this.determinePositioning(standard.monthlyPremium * 0.9, marketAverage) // Assume optimized is 10% less
    };
  }

  private determinePositioning(rate: number, marketAverage: number): 'premium' | 'competitive' | 'discount' {
    if (rate > marketAverage * 1.1) return 'premium';
    if (rate < marketAverage * 0.9) return 'discount';
    return 'competitive';
  }

  private generateQuoteBreakdown(monthlyPremium: number): PremiumBreakdown {
    return {
      baseRate: monthlyPremium * 0.7,
      demographicAdjustments: { age: 0.1, family: 0.05, geographic: 0.05 },
      riskAdjustments: { overallRisk: 0, individualFactors: 0 },
      geographicAdjustments: { region: 0, costIndex: 0 },
      benefitDesignAdjustments: { network: 0, deductible: 0, coinsurance: 0 },
      loadings: {
        administrative: 0.12,
        profit: 0.05,
        riskCharge: 0.05,
        commission: 0.04,
        reinsurance: 0.015,
        total: 0.275
      },
      taxes: monthlyPremium * 0.08,
      totalAdjustments: monthlyPremium * 0.3
    };
  }

  private async aggregatePremiumResults(premiums: (schema.InsertPremium | PremiumResult)[]): Promise<AggregatedPremiumResults> {
    let totalStandard = 0;
    let totalEnhanced = 0;
    const riskScores: number[] = [];
    const distribution = { lowRisk: 0, moderateRisk: 0, highRisk: 0, criticalRisk: 0 };

    for (const premium of premiums) {
      if ('total' in premium) {
        totalStandard += premium.total;
        totalEnhanced += premium.total; // Assume same for standard calculation
      } else {
        totalStandard += premium.basePremium;
        totalEnhanced += premium.adjustedPremium;

        // Risk score distribution (simplified)
        const riskScore = Math.random() * 100; // Would use actual risk scores
        riskScores.push(riskScore);

        if (riskScore < 30) distribution.lowRisk++;
        else if (riskScore < 50) distribution.moderateRisk++;
        else if (riskScore < 75) distribution.highRisk++;
        else distribution.criticalRisk++;
      }
    }

    const riskScoreDistribution = this.calculateRiskScoreDistribution(riskScores);

    return {
      totalStandardPremium: totalStandard,
      totalEnhancedPremium: totalEnhanced,
      averageDifference: premiums.length > 0 ? (totalEnhanced - totalStandard) / premiums.length : 0,
      memberDistribution: distribution,
      riskScoreDistribution
    };
  }

  private calculateRiskScoreDistribution(scores: number[]): RiskScoreDistribution {
    if (scores.length === 0) {
      return { average: 0, median: 0, min: 0, max: 0, standardDeviation: 0 };
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    // Calculate standard deviation
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      min,
      max,
      standardDeviation: Math.round(standardDeviation * 100) / 100
    };
  }

  private async applyValidationRule(
    rule: ValidationRule,
    premiumData: schema.InsertPremium,
    context: BusinessContext
  ): Promise<ValidationResult> {
    // Simplified validation rule application
    switch (rule.ruleId) {
      case 'minimum_premium':
        const minPremium = rule.parameters.minimum || BUSINESS_RULES.minimumPremium.individual;
        return {
          ruleId: rule.ruleId,
          ruleType: rule.ruleType,
          status: premiumData.total >= minPremium ? 'passed' : 'failed',
          message: `Premium ${premiumData.total} compared to minimum ${minPremium}`,
          details: { premium: premiumData.total, minimum: minPremium },
          impact: 'Premium must meet minimum business requirements',
          remediation: premiumData.total < minPremium ? 'Adjust premium rates or review member composition' : undefined
        };

      case 'maximum_premium':
        const maxPremium = rule.parameters.maximum || BUSINESS_RULES.maximumPremium.individual;
        return {
          ruleId: rule.ruleId,
          ruleType: rule.ruleType,
          status: premiumData.total <= maxPremium ? 'passed' : 'warning',
          message: `Premium ${premiumData.total} compared to maximum ${maxPremium}`,
          details: { premium: premiumData.total, maximum: maxPremium },
          impact: 'Premium may not be competitive if too high',
          remediation: premiumData.total > maxPremium ? 'Consider competitive positioning' : undefined
        };

      default:
        return {
          ruleId: rule.ruleId,
          ruleType: rule.ruleType,
          status: 'passed',
          message: 'Validation rule passed',
          details: {},
          impact: 'No impact'
        };
    }
  }

  private async checkRegulatoryCompliance(
    premiumData: schema.InsertPremium,
    context: BusinessContext
  ): Promise<ComplianceStatus> {
    // Simplified compliance check
    return {
      federalCompliance: true, // Would check ACA requirements
      stateCompliance: true, // Would check state-specific requirements
      regulatoryViolations: [],
      requiredFilings: ['state_rate_filing', 'actuarial_certification'],
      approvalStatus: 'pending_review'
    };
  }

  private calculateValidationScore(validations: ValidationResult[]): number {
    if (validations.length === 0) return 100;

    let totalScore = 0;
    validations.forEach(validation => {
      switch (validation.status) {
        case 'passed': totalScore += 100; break;
        case 'warning': totalScore += 70; break;
        case 'failed': totalScore += 0; break;
      }
    });

    return Math.round(totalScore / validations.length);
  }

  private determinePriority(severity: string, status: string): 'urgent' | 'high' | 'medium' | 'low' {
    if (status === 'failed' && severity === 'error') return 'urgent';
    if (status === 'failed' || severity === 'error') return 'high';
    if (status === 'warning' || severity === 'warning') return 'medium';
    return 'low';
  }
}

// Export service instance factory
export function createPremiumCalculationService(storage: IStorage): PremiumCalculationService {
  return new PremiumCalculationService(storage);
}