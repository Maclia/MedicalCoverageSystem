/**
 * Premium Calculation Module
 *
 * Comprehensive module for enhanced medical insurance premium calculations
 * including risk-adjusted pricing, actuarial compliance, and competitive optimization.
 *
 * Module exports:
 * - Core calculation functions
 * - Actuarial engines
 * - Service layer
 * - Configuration management
 * - Type definitions
 */

// Core calculation functions
export {
  calculateRiskAdjustedPremium,
  calculateRiskAdjustmentFactor,
  generateActuarialProjections,
  PremiumCalculationInput,
  FamilyComposition,
  DemographicData,
  AgeBandDistribution,
  GeographicData,
  HistoricalClaimsData,
  PremiumResult,
  PremiumBreakdown,
  PremiumMetadata,
  RiskAdjustmentMatrix,
  HealthcareInflationFactors,
} from './core/premiumCalculator';

// Actuarial engines
export {
  calculateActuarialRates,
  calculateLossRatioTargets,
  determineExpenseLoadings,
  calculateProfitMargins,
  applyRegulatoryConstraints,
  generatePricingCertification,
  ActuarialRateInput,
  BaseRateStructure,
  ComplianceAnalysis,
  PricingCertification,
} from './engines/actuarialEngine';

export {
  optimizePremiumStructure,
  analyzeCompetitivePositioning,
  analyzePriceElasticity,
  segmentPricingAnalysis,
  competitorRateComparison,
  OptimizationInput,
  OptimizationResult,
  CompetitiveAnalysis,
  PriceElasticityAnalysis,
} from './engines/premiumOptimizer';

// Service layer
export {
  PremiumCalculationService,
  calculateMemberPremium,
  calculateGroupPremium,
  batchCalculatePremiums,
  validateCalculationRequest,
  getPremiumQuote,
  CalculationRequest,
  CalculationResult,
  ValidationResult,
} from './services/premiumCalculationService';

// Configuration
export {
  ActuarialConfigManager,
  defaultActuarialConfig,
  ActuarialConfig,
  StressTestScenario,
} from './config/actuarialConfig';

// Type definitions
export * from './types/premiumTypes';

// Legacy exports for backward compatibility
export {
  PremiumCalculator,
  calculatePremium,
  validatePremiumData,
} from './core/legacyCalculator';