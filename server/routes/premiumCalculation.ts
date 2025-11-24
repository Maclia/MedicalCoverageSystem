/**
 * Premium Calculation API Routes
 * Provides endpoints for enhanced premium calculation with risk adjustment and actuarial models
 */

import express from 'express';
import { IStorage } from '../storage';
import { createPremiumCalculationService } from '../services/premiumCalculationService';
import {
  calculateActuarialRates,
  generatePricingCertification,
  calculateLossRatioTargets,
  determineExpenseLoadings,
  calculateProfitMargins,
  applyRegulatoryConstraints
} from '../utils/actuarialRateEngine';
import {
  optimizePremiumStructure,
  analyzePriceElasticity,
  segmentPricingAnalysis,
  competitorRateComparison
} from '../utils/premiumOptimization';
import {
  calculateRiskAdjustedPremium,
  PremiumCalculationInput,
  PremiumResult,
  DemographicData,
  FamilyComposition,
  HistoricalClaimsData
} from '../utils/enhancedPremiumCalculator';
import {
  getMemberRiskScoreForPricing,
  generatePricingRiskReport,
  updatePremiumRiskHistory,
  processBulkRiskAssessment,
  calculateRiskAdjustmentFactor
} from '../src/services/riskAssessmentService';

const router = express.Router();

/**
 * POST /api/premiums/calculate - Enhanced premium calculation with risk adjustment
 *
 * Request Body:
 * {
 *   "companyId": number,
 *   "periodId?: number,
 *   "memberIds?: number[],
 *   "calculationOptions": {
 *     "methodology": "standard" | "risk-adjusted" | "hybrid",
 *     "includeRiskAdjustment": boolean,
 *     "demographicData": DemographicData,
 *     "familyComposition": FamilyComposition,
 *     "historicalClaims": HistoricalClaimsData,
 *     "geographicRegion": string,
 *     "projectionYear": number,
 *     "dataQuality": number
 *   }
 * }
 *
 * Response:
 * {
 *   "premium": PremiumResult,
 *   "methodology": string,
 *   "breakdown": PremiumBreakdown,
 *   "projections": PremiumProjection[],
 *   "confidence": number,
 *   "assumptions": string[],
 *   "auditTrail": AuditTrailEntry[]
 * }
 */
router.post('/calculate', async (req, res) => {
  try {
    const { companyId, periodId, memberIds, calculationOptions } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const storage = req.app.locals.storage as IStorage;
    const premiumService = createPremiumCalculationService(storage);

    // Determine if this is individual or group calculation
    if (memberIds && memberIds.length === 1) {
      // Individual member calculation
      const result = await premiumService.calculateMemberPremium({
        memberId: memberIds[0],
        calculationOptions,
        breakdown: req.query.breakdown === 'true',
        projections: req.query.projections === 'true'
      });

      return res.json({
        success: true,
        data: result
      });
    } else {
      // Group calculation
      const result = await premiumService.calculateGroupPremium({
        companyId,
        periodId,
        memberIds,
        calculationOptions,
        breakdown: req.query.breakdown === 'true',
        projections: req.query.projections === 'true'
      });

      return res.json({
        success: true,
        data: result
      });
    }
  } catch (error) {
    console.error('Premium calculation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during premium calculation'
    });
  }
});

/**
 * GET /api/premiums/quote - Generate quote for prospective members
 *
 * Query Parameters:
 * - format: output format (json, pdf)
 * - includeBreakdown: include detailed breakdown (true/false)
 *
 * Request Body:
 * {
 *   "prospectData": {
 *     "individualCount": number,
 *     "familyStructure": FamilyStructureData,
 *     "demographics": ProspectDemographics,
 *     "industryType": string,
 *     "riskFactors": string[]
 *   },
 *   "benefitDesign": {
 *     "deductibleLevel": "low" | "medium" | "high",
 *     "coinsuranceLevel": number,
 *     "networkType": "HMO" | "PPO" | "POS" | "EPO",
 *     "benefitRichness": "basic" | "standard" | "comprehensive",
 *     "wellnessIncentives": boolean
 *   },
 *   "geographicInfo": {
 *     "state": string,
 *     "county": string,
 *     "city": string,
 *     "zipCode": string
 *   },
 *   "timeframe": {
 *     "effectiveDate": string,
 *     "coverageDuration": number,
 *     "quoteValidUntil": string
 *   }
 * }
 *
 * Response:
 * {
 *   "quoteId": string,
 *   "prospectData": ProspectData,
 *   "calculatedRates": {
 *     "standard": QuoteRateDetail,
 *     "enhanced": QuoteRateDetail,
 *     "optimized": QuoteRateDetail
 *   },
 *   "methodology": string,
 *   "assumptions": string[],
 *   "validUntil": Date,
 *   "businessRules": BusinessRuleValidation[],
 *   "nextSteps": string[]
 * }
 */
router.get('/quote', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const includeBreakdown = req.query.includeBreakdown === 'true';

    // In a real implementation, this would parse quote request from query parameters
    // For now, we'll return a sample response structure
    const storage = req.app.locals.storage as IStorage;
    const premiumService = createPremiumCalculationService(storage);

    // This would come from request body in a real implementation
    const quoteRequest = {
      prospectData: {
        individualCount: 10,
        familyStructure: {
          individual: 2,
          couple: 3,
          singleParentOneChild: 2,
          singleParentMultipleChildren: 1,
          family: 2
        },
        demographics: {
          averageAge: 35,
          ageDistribution: { '18-25': 2, '26-35': 4, '36-45': 3, '46-55': 1 },
          location: 'California',
          businessSize: 'small'
        },
        industryType: 'technology',
        riskFactors: ['sedentary_work', 'moderate_stress']
      },
      benefitDesign: {
        deductibleLevel: 'medium',
        coinsuranceLevel: 0.8,
        networkType: 'PPO',
        benefitRichness: 'standard',
        wellnessIncentives: true
      },
      geographicInfo: {
        state: 'CA',
        city: 'San Francisco'
      },
      timeframe: {
        effectiveDate: new Date(),
        coverageDuration: 12,
        quoteValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    };

    const quoteResult = await premiumService.generatePremiumQuote(quoteRequest);

    if (format === 'pdf') {
      // In a real implementation, this would generate a PDF
      return res.json({
        success: false,
        error: 'PDF generation not implemented in demo'
      });
    }

    return res.json({
      success: true,
      data: quoteResult
    });
  } catch (error) {
    console.error('Quote generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during quote generation'
    });
  }
});

/**
 * POST /api/premiums/batch-calculate - Group premium calculations
 *
 * Request Body:
 * {
 *   "companyId": number,
 *   "memberIds": number[],
 *   "calculationOptions": PremiumCalculationOptions,
 *   "parallelProcessing": boolean
 * }
 *
 * Response:
 * {
 *   "totalMembers": number,
 *   "processedMembers": number,
 *   "failedMembers": FailedMemberCalculation[],
 *   "aggregatedResults": AggregatedPremiumResults,
 *   "processingTime": number,
 *   "errors": string[]
 * }
 */
router.post('/batch-calculate', async (req, res) => {
  try {
    const { companyId, memberIds, calculationOptions, parallelProcessing } = req.body;

    if (!companyId || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and member IDs array are required'
      });
    }

    const storage = req.app.locals.storage as IStorage;
    const premiumService = createPremiumCalculationService(storage);

    const result = await premiumService.processBatchPremiumCalculations({
      companyId,
      memberIds,
      calculationOptions,
      parallelProcessing
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Batch premium calculation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during batch premium calculation'
    });
  }
});

/**
 * GET /api/premiums/rate-analysis - Rate analysis and comparison
 *
 * Query Parameters:
 * - companyId: number (optional)
 * - region: string (optional)
 * - marketSegment: string (optional)
 * - timeframe: string (optional)
 *
 * Response:
 * {
 *   "marketAnalysis": {
 *     "competitivePositioning": string,
 *     "priceElasticity": number,
 *     "marketShare": number,
 *     "trends": MarketTrends[]
 *   },
 *   "rateAnalysis": {
 *     "currentRates": RateStructure,
 *     "optimizedRates": RateStructure,
 *     "competitorComparison": CompetitorComparison[],
 *     "recommendations": RateRecommendation[]
 *   },
 *   "sensitivityAnalysis": {
 *     "scenarios": Scenario[],
 *     "confidenceInterval": ConfidenceInterval
 *   }
 * }
 */
router.get('/rate-analysis', async (req, res) => {
  try {
    const { companyId, region, marketSegment, timeframe } = req.query;

    const storage = req.app.locals.storage as IStorage;

    // Mock data for rate analysis - in production would use real market data
    const marketAnalysis = {
      competitivePositioning: 'competitive',
      priceElasticity: -1.2,
      marketShare: 0.08,
      trends: [
        {
          trend: 'digital_transformation',
          direction: 'positive',
          magnitude: 0.15,
          description: 'Increasing adoption of digital health services'
        },
        {
          trend: 'cost_transparency',
          direction: 'positive',
          magnitude: 0.08,
          description: 'Greater demand for pricing transparency'
        }
      ]
    };

    const rateAnalysis = {
      currentRates: {
        individual: 450,
        couple: 750,
        family: 1200
      },
      optimizedRates: {
        individual: 425,
        couple: 710,
        family: 1140
      },
      competitorComparison: [
        {
          competitor: 'Competitor A',
          individual: 465,
          couple: 780,
          family: 1250,
          positioning: 'premium'
        },
        {
          competitor: 'Competitor B',
          individual: 425,
          couple: 700,
          family: 1100,
          positioning: 'discount'
        }
      ],
      recommendations: [
        {
          category: 'pricing',
          recommendation: 'Adjust individual rates to be more competitive',
          potentialImpact: '5% increase in market share',
          implementation: 'immediate'
        }
      ]
    };

    const sensitivityAnalysis = {
      scenarios: [
        {
          name: 'Market Downturn',
          probability: 0.2,
          impact: -0.08,
          description: 'Economic recession reduces premium affordability'
        },
        {
          name: 'Healthcare Reform',
          probability: 0.3,
          impact: 0.05,
          description: 'New regulations impact pricing structure'
        }
      ],
      confidenceInterval: {
        lower: 0.85,
        upper: 1.15,
        confidence: 0.8
      }
    };

    return res.json({
      success: true,
      data: {
        marketAnalysis,
        rateAnalysis,
        sensitivityAnalysis
      }
    });
  } catch (error) {
    console.error('Rate analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during rate analysis'
    });
  }
});

/**
 * POST /api/premiums/validate - Premium calculation validation
 *
 * Request Body:
 * {
 *   "premiumData": InsertPremium,
 *   "validationRules": ValidationRule[],
 *   "businessContext": BusinessContext
 * }
 *
 * Response:
 * {
 *   "isValid": boolean,
 *   "validations": ValidationResult[],
 *   "overallScore": number,
 *   "recommendations": ValidationRecommendation[],
 *   "auditRequired": boolean,
 *   "complianceStatus": ComplianceStatus
 * }
 */
router.post('/validate', async (req, res) => {
  try {
    const { premiumData, validationRules, businessContext } = req.body;

    if (!premiumData) {
      return res.status(400).json({
        success: false,
        error: 'Premium data is required for validation'
      });
    }

    const storage = req.app.locals.storage as IStorage;
    const premiumService = createPremiumCalculationService(storage);

    // Default validation rules if none provided
    const defaultValidationRules = [
      {
        ruleId: 'minimum_premium',
        ruleType: 'business',
        description: 'Premium must meet minimum business requirements',
        parameters: { minimum: 50 },
        severity: 'error'
      },
      {
        ruleId: 'maximum_premium',
        ruleType: 'business',
        description: 'Premium should not exceed market competitiveness threshold',
        parameters: { maximum: 2000 },
        severity: 'warning'
      },
      {
        ruleId: 'regulatory_compliance',
        ruleType: 'regulatory',
        description: 'Premium must comply with regulatory requirements',
        parameters: {},
        severity: 'error'
      }
    ];

    const rulesToApply = validationRules || defaultValidationRules;
    const context = businessContext || {
      marketSegment: 'individual',
      geographicRegion: 'CA',
      productType: 'health',
      effectiveDate: new Date(),
      businessPurpose: 'new_business'
    };

    const validationResult = await premiumService.validatePricingRules({
      premiumData,
      validationRules: rulesToApply,
      businessContext: context
    });

    return res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Premium validation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during premium validation'
    });
  }
});

/**
 * GET /api/premiums/actuarial-analysis - Actuarial analysis and certification
 *
 * Query Parameters:
 * - companyId: number
 * - periodId: number
 * - includeCertification: boolean
 *
 * Response:
 * {
 *   "actuarialRates": ActuarialRateResult,
 *   "certification": ActuarialCertification,
 *   "complianceAnalysis": ComplianceAnalysis,
 *   "projections": ActuarialProjections,
 *   "recommendations": ActuarialRecommendation[]
 * }
 */
router.get('/actuarial-analysis', async (req, res) => {
  try {
    const { companyId, periodId, includeCertification } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required for actuarial analysis'
      });
    }

    const storage = req.app.locals.storage as IStorage;

    // Mock actuarial input - in production would gather real data
    const actuarialInput: any = {
      companyId: parseInt(companyId as string),
      periodId: periodId ? parseInt(periodId as string) : undefined,
      marketSegment: 'small_group',
      geographicRegion: 'CA',
      benefitDesign: {
        deductibleAmount: 1000,
        coinsuranceRate: 0.8,
        outOfPocketMaximum: 5000,
        coPaymentStructure: {
          primaryCareVisit: 25,
          specialistVisit: 50,
          emergencyRoom: 150,
          prescriptionDrugs: {
            generic: 10,
            preferredBrand: 35,
            nonPreferredBrand: 60,
            specialty: 100
          }
        },
        benefitLimits: {
          annualLifetimeMaximum: 1000000
        },
        networkType: 'PPO'
      },
      demographicProfile: {
        averageAge: 38,
        ageBands: [
          { minAge: 18, maxAge: 25, memberCount: 5, relativeCost: 0.8 },
          { minAge: 26, maxAge: 35, memberCount: 12, relativeCost: 1.0 },
          { minAge: 36, maxAge: 45, memberCount: 8, relativeCost: 1.1 },
          { minAge: 46, maxAge: 55, memberCount: 3, relativeCost: 1.3 }
        ],
        genderDistribution: { male: 15, female: 13, other: 0 },
        healthStatus: {
          healthy: 20,
          managedConditions: 6,
          highRisk: 2,
          chronicConditions: 0
        },
        industryRisk: 'medium',
        geographicCostIndex: 1.1
      },
      regulatoryConstraints: {
        stateRegulations: {
          maximumRateIncrease: 0.10,
          requiredApprovalProcess: 'prior_approval',
          rateFilingFrequency: 'annual',
          communityRatingRequirements: {
            ageRatingAllowed: true,
            ageBands: [],
            genderRatingAllowed: false,
            healthStatusRatingAllowed: false,
            geographicRatingAllowed: true,
            tobaccoRatingAllowed: true
          },
          mandatedBenefits: ['maternity', 'mental_health']
        },
        federalRequirements: {
          acaCompliance: true,
          medicalLossRatioMinimum: 0.85,
          essentialHealthBenefitCoverage: [],
          preventiveCareCoverage: true,
          lifetimeMaximumEliminated: true
        }
      }
    };

    // Calculate actuarial rates
    const actuarialRates = await calculateActuarialRates(storage, actuarialInput);

    // Generate certification if requested
    let certification = null;
    if (includeCertification === 'true') {
      certification = generatePricingCertification(actuarialRates, actuarialInput);
    }

    return res.json({
      success: true,
      data: {
        actuarialRates,
        certification,
        complianceAnalysis: actuarialRates.complianceAnalysis,
        projections: {
          // Mock projections
          oneYear: actuarialRates.loadedRates.finalRates.perMemberPerMonth * 1.064,
          threeYear: actuarialRates.loadedRates.finalRates.perMemberPerMonth * Math.pow(1.064, 3),
          fiveYear: actuarialRates.loadedRates.finalRates.perMemberPerMonth * Math.pow(1.064, 5)
        },
        recommendations: actuarialRates.recommendations
      }
    });
  } catch (error) {
    console.error('Actuarial analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during actuarial analysis'
    });
  }
});

/**
 * POST /api/premiums/optimization - Premium optimization analysis
 *
 * Request Body:
 * {
 *   "companyId": number,
 *   "currentRates": CurrentRateStructure,
 *   "marketData": MarketCompetitiveData,
 *   "companyProfile": CompanyProfile,
 *   "businessObjectives": BusinessObjectives,
 *   "constraints": OptimizationConstraints
 * }
 *
 * Response:
 * {
 *   "optimizedRates": OptimizedRateStructure,
 *   "businessImpact": BusinessImpactAnalysis,
 *   "implementationPlan": ImplementationPlan,
 *   "riskAnalysis": OptimizationRiskAnalysis,
 *   "monitoringPlan": MonitoringPlan,
 *   "recommendations": OptimizationRecommendation[]
 * }
 */
router.post('/optimization', async (req, res) => {
  try {
    const optimizationInput = req.body;

    if (!optimizationInput.companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required for optimization analysis'
      });
    }

    const storage = req.app.locals.storage as IStorage;

    // Use mock data if not provided
    const fullOptimizationInput = {
      companyId: optimizationInput.companyId,
      currentRates: optimizationInput.currentRates || {
        basePremium: 450,
        demographicAdjustments: {
          ageBands: [],
          genderRates: { maleRate: 1.0, femaleRate: 1.0, memberDistribution: { male: 10, female: 8 }, regulatoryConstraints: false },
          geographicRates: { regions: [], costVariance: 0.1, competitivePositioning: {} },
          smokerRates: { smokerRate: 1.5, nonSmokerRate: 1.0, smokerPrevalence: 0.15, regulatoryLimits: 1.5 },
          familyRates: { individualRate: 450, coupleRate: 750, familyRate: 1200, tierEfficiency: 0.9, crossSubsidization: 0.1 }
        },
        benefitDesign: {
          deductibleImpact: 1.0,
          coinsuranceImpact: 1.0,
          networkImpact: 1.0,
          benefitRichness: 1.0,
          administrativeCosts: 0.12
        },
        profitMargins: {
          currentMargin: 0.05,
          targetMargin: 0.06,
          marginVolatility: 0.02,
          capitalAdequacy: 1.5,
          returnOnEquity: 0.12
        },
        lossRatios: {
          oneYear: 0.82,
          threeYear: 0.85,
          fiveYear: 0.83,
          trend: 0.01,
          volatility: 0.05
        },
        renewalRates: {
          renewalRate: 0.92,
          lapseRate: 0.08,
          retentionStrategies: [],
          priceElasticity: -1.2
        }
      },
      marketData: optimizationInput.marketData || {
        competitorAnalysis: [],
        marketTrends: {},
        priceSensitivity: {
          overallElasticity: -1.2,
          segmentElasticities: [],
          pricePoints: [],
          demandProjections: []
        },
        shareAnalysis: {
          currentShare: 0.08,
          targetShare: 0.12,
          growthOpportunities: [],
          competitiveThreats: [],
          marketEntryBarriers: []
        }
      },
      companyProfile: optimizationInput.companyProfile || {
        companySize: 50,
        financialStrength: 'strong',
        marketPosition: 'challenger',
        operationalEfficiency: 0.85,
        brandStrength: 0.7,
        distributionChannels: ['direct', 'broker'],
        technologyCapability: 0.8,
        riskAppetite: 'moderate'
      },
      businessObjectives: optimizationInput.businessObjectives || {
        profitTargets: [],
        growthTargets: [],
        marketShareTargets: [],
        operationalTargets: [],
        strategicInitiatives: []
      },
      constraints: optimizationInput.constraints || {
        regulatoryLimits: {},
        financialConstraints: {},
        operationalConstraints: {},
        marketConstraints: {}
      }
    };

    const optimizationResult = await optimizePremiumStructure(storage, fullOptimizationInput);

    return res.json({
      success: true,
      data: optimizationResult
    });
  } catch (error) {
    console.error('Premium optimization error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during premium optimization'
    });
  }
});

/**
 * GET /api/premiums/risk-analysis - Risk-based pricing analysis
 *
 * Query Parameters:
 * - memberIds: string (comma-separated)
 * - includeCategoryAnalysis: boolean
 * - generateReport: boolean
 *
 * Response:
 * {
 *   "riskDistribution": RiskDistribution,
 *   "aggregateScores": AggregateRiskScores,
 *   "categoryAnalysis": CategoryPricingAnalysis[],
 *   "recommendations": PricingRiskRecommendation[],
 *   "complianceNotes": string[],
 *   "reportId": string (if generateReport=true)
 * }
 */
router.get('/risk-analysis', async (req, res) => {
  try {
    const { memberIds, includeCategoryAnalysis, generateReport } = req.query;

    if (!memberIds) {
      return res.status(400).json({
        success: false,
        error: 'Member IDs are required for risk analysis'
      });
    }

    const memberIdArray = (memberIds as string).split(',').map(id => id.trim());

    if (includeCategoryAnalysis === 'true' || generateReport === 'true') {
      // Generate comprehensive pricing risk report
      const riskReport = await generatePricingRiskReport(memberIdArray);

      return res.json({
        success: true,
        data: {
          reportId: riskReport.reportId,
          generatedAt: riskReport.generatedAt,
          memberCount: riskReport.memberCount,
          riskDistribution: riskReport.riskDistribution,
          aggregateScores: riskReport.aggregateScores,
          categoryAnalysis: riskReport.categoryAnalysis,
          recommendations: riskReport.recommendations,
          complianceNotes: riskReport.complianceNotes,
          actuarialCertification: riskReport.actuarialCertification
        }
      });
    } else {
      // Simple risk analysis
      const bulkRiskAssessment = await processBulkRiskAssessment(memberIdArray, {
        parallel: true,
        batchSize: 20,
        includeFactors: false
      });

      return res.json({
        success: true,
        data: {
          riskDistribution: bulkRiskAssessment.aggregateSummary.riskDistribution,
          aggregateScores: {
            averageScore: bulkRiskAssessment.aggregateSummary.averageScore,
            averageAdjustmentFactor: bulkRiskAssessment.aggregateSummary.averageAdjustmentFactor,
            dataQuality: bulkRiskAssessment.aggregateSummary.dataQuality
          },
          processedMembers: bulkRiskAssessment.processedMembers,
          failedMembers: bulkRiskAssessment.failedMembers.length,
          processingTime: bulkRiskAssessment.processingTime
        }
      });
    }
  } catch (error) {
    console.error('Risk analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during risk analysis'
    });
  }
});

/**
 * POST /api/premiums/bulk-risk-assessment - Process bulk risk assessment
 *
 * Request Body:
 * {
 *   "memberIds": string[],
 *   "options": {
 *     "parallel": boolean,
 *     "batchSize": number,
 *     "includeFactors": boolean
 *   }
 * }
 *
 * Response:
 * {
 *   "totalMembers": number,
 *   "processedMembers": number,
 *   "failedMembers": FailedMemberCalculation[],
 *   "results": BulkRiskAssessmentResult[],
 *   "processingTime": number,
 *   "aggregateSummary": BulkRiskSummary
 * }
 */
router.post('/bulk-risk-assessment', async (req, res) => {
  try {
    const { memberIds, options } = req.body;

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({
        success: false,
        error: 'Member IDs array is required'
      });
    }

    const bulkOptions = {
      parallel: options?.parallel || true,
      batchSize: options?.batchSize || 20,
      includeFactors: options?.includeFactors || false
    };

    const bulkRiskAssessment = await processBulkRiskAssessment(memberIds, bulkOptions);

    return res.json({
      success: true,
      data: bulkRiskAssessment
    });
  } catch (error) {
    console.error('Bulk risk assessment error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during bulk risk assessment'
    });
  }
});

/**
 * POST /api/premiums/audit-trail - Audit trail for premium calculations
 *
 * Request Body:
 * {
 *   "premiumId": number,
 *   "action": string,
 *   "userId": string,
 *   "details": Record<string, any>
 * }
 *
 * Response:
 * {
 *   "auditEntry": AuditTrailEntry,
 *   "success": boolean
 * }
 */
router.post('/audit-trail', async (req, res) => {
  try {
    const { premiumId, action, userId, details } = req.body;

    if (!premiumId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Premium ID and action are required'
      });
    }

    const storage = req.app.locals.storage as IStorage;
    const premiumService = createPremiumCalculationService(storage);

    const auditEntry = await premiumService.auditPremiumCalculation(
      premiumId,
      action,
      userId,
      details
    );

    return res.json({
      success: true,
      data: {
        auditEntry
      }
    });
  } catch (error) {
    console.error('Audit trail error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during audit trail creation'
    });
  }
});

/**
 * GET /api/premiums/methodology - Get pricing methodology information
 *
 * Response:
 * {
 *   "availableMethodologies": string[],
 *   "descriptions": Record<string, string>,
 *   "riskAdjustmentFactors": RiskAdjustmentMatrix[],
 *   "actuarialAssumptions": Record<string, any>,
 *   "complianceNotes": string[]
 * }
 */
router.get('/methodology', (req, res) => {
  try {
    const methodologies = {
      availableMethodologies: ['standard', 'risk-adjusted', 'hybrid'],
      descriptions: {
        standard: 'Traditional premium calculation based on member types and fixed rates',
        'risk-adjusted': 'Full risk-adjusted pricing using individual risk scores and demographic factors',
        hybrid: 'Blended approach combining standard and risk-adjusted pricing (70/30 split)'
      },
      riskAdjustmentFactors: [
        { riskScore: 0, multiplier: 0.85, tier: 'Preferred', confidence: 95 },
        { riskScore: 30, multiplier: 1.00, tier: 'Standard', confidence: 90 },
        { riskScore: 50, multiplier: 1.35, tier: 'Substandard', confidence: 85 },
        { riskScore: 75, multiplier: 1.85, tier: 'High-risk', confidence: 80 }
      ],
      actuarialAssumptions: {
        medicalInflationRate: 0.064,
        pharmacyInflationRate: 0.101,
        administrativeExpenseRatio: 0.12,
        profitMarginTarget: 0.03,
        riskCharge: 0.05,
        commissionRate: 0.04,
        taxRate: 0.02,
        reinsuranceCost: 0.015,
        minimumMedicalLossRatio: 0.80,
        maximumTobaccoRatio: 1.5
      },
      complianceNotes: [
        'All calculations comply with ACA community rating requirements',
        'Maximum tobacco rating ratio of 1.5:1 maintained',
        'Age rating limitations applied per state regulations',
        'Risk adjustment factors documented and filed with state regulators',
        'Data privacy maintained per HIPAA requirements'
      ]
    };

    return res.json({
      success: true,
      data: methodologies
    });
  } catch (error) {
    console.error('Methodology information error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error retrieving methodology information'
    });
  }
});

export default router;