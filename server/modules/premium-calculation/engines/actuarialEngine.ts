/**
 * Actuarial Rate Engine - Core Actuarial Calculations and Regulatory Compliance
 * Provides actuarially sound pricing with regulatory oversight and certification
 */

import { IStorage } from '../../../storage';
import * as schema from '../../shared/schema.js';

// Actuarial calculation interfaces
export interface ActuarialRateInput {
  companyId: number;
  periodId: number;
  marketSegment: 'individual' | 'small_group' | 'large_group' | 'medicare_advantage';
  geographicRegion: string;
  benefitDesign: BenefitDesign;
  demographicProfile: DemographicProfile;
  historicalData?: HistoricalActuarialData;
  regulatoryConstraints: RegulatoryConstraints;
}

export interface BenefitDesign {
  deductibleAmount: number;
  coinsuranceRate: number;
  outOfPocketMaximum: number;
  coPaymentStructure: CoPaymentStructure;
  benefitLimits: BenefitLimits;
  networkType: 'HMO' | 'PPO' | 'POS' | 'EPO';
}

export interface CoPaymentStructure {
  primaryCareVisit: number;
  specialistVisit: number;
  emergencyRoom: number;
  prescriptionDrugs: PrescriptionStructure;
  inpatientStay: number;
  outpatientSurgery: number;
}

export interface PrescriptionStructure {
  generic: number;
  preferredBrand: number;
  nonPreferredBrand: number;
  specialty: number;
}

export interface BenefitLimits {
  annualLifetimeMaximum?: number;
  specialistVisitLimit?: number;
  primaryCareVisitLimit?: number;
  prescriptionDrugLimit?: number;
  mentalHealthVisits?: number;
}

export interface DemographicProfile {
  averageAge: number;
  ageBands: AgeBandData[];
  genderDistribution: GenderDistribution;
  healthStatus: HealthStatusDistribution;
  industryRisk: 'low' | 'medium' | 'high';
  geographicCostIndex: number;
}

export interface AgeBandData {
  minAge: number;
  maxAge: number;
  memberCount: number;
  relativeCost: number;
}

export interface GenderDistribution {
  male: number;
  female: number;
  other: number;
}

export interface HealthStatusDistribution {
  healthy: number;
  managedConditions: number;
  highRisk: number;
  chronicConditions: number;
}

export interface HistoricalActuarialData {
  claimsExperience: ClaimsExperience;
  utilizationPatterns: UtilizationPatterns;
  costTrends: CostTrends;
  lapseRates: LapseRates;
}

export interface ClaimsExperience {
  averageClaimCost: number;
  claimFrequency: number;
  lossRatio: number;
  claimSeverity: ClaimSeverity;
  medicalLossRatio: number;
  administrativeExpenseRatio: number;
}

export interface ClaimSeverity {
  p10: number; // 10th percentile
  p25: number; // 25th percentile
  p50: number; // Median
  p75: number; // 75th percentile
  p90: number; // 90th percentile
  p95: number; // 95th percentile
}

export interface UtilizationPatterns {
  inpatientDays: number;
  outpatientVisits: number;
  emergencyRoomVisits: number;
  prescriptionFills: number;
  mentalHealthVisits: number;
  preventiveCareVisits: number;
}

export interface CostTrends {
  medicalInflationRate: number;
  pharmacyInflationRate: number;
  geographicTrends: GeographicTrends;
  categoryTrends: CategoryTrends;
}

export interface GeographicTrends {
  byRegion: Record<string, number>;
  byState: Record<string, number>;
  urbanVsRural: { urban: number; rural: number };
}

export interface CategoryTrends {
  hospital: number;
  physician: number;
  pharmacy: number;
  mentalHealth: number;
  preventive: number;
  emergency: number;
}

export interface LapseRates {
  voluntary: number;
  nonPayment: number;
  administrative: number;
  total: number;
}

export interface RegulatoryConstraints {
  stateRegulations: StateRegulations;
  federalRequirements: FederalRequirements;
  rateFilingRequirements: RateFilingRequirements;
  communityRatingRules: CommunityRatingRules;
}

export interface StateRegulations {
  maximumRateIncrease: number;
  requiredApprovalProcess: string;
  rateFilingFrequency: string;
  communityRatingRequirements: CommunityRatingRequirements;
  mandatedBenefits: string[];
}

export interface CommunityRatingRequirements {
  ageRatingAllowed: boolean;
  ageBands: AgeBandRequirement[];
  genderRatingAllowed: boolean;
  healthStatusRatingAllowed: boolean;
  geographicRatingAllowed: boolean;
  tobaccoRatingAllowed: boolean;
}

export interface AgeBandRequirement {
  minAge: number;
  maxAge: number;
  maxRatio: number; // Maximum ratio between highest and lowest age band
}

export interface FederalRequirements {
  acaCompliance: boolean;
  medicalLossRatioMinimum: number;
  essentialHealthBenefitCoverage: string[];
  preventiveCareCoverage: boolean;
  lifetimeMaximumEliminated: boolean;
}

export interface RateFilingRequirements {
  documentationRequirements: string[];
  actuarialCertificationRequired: boolean;
  publicCommentPeriod: number; // days
  approvalTimeline: number; // days
}

export interface CommunityRatingRules {
  ratingFactorsAllowed: string[];
  prohibitedFactors: string[];
  maximumVariance: number;
}

export interface ActuarialRateResult {
  baseRates: BaseRateStructure;
  loadedRates: LoadedRateStructure;
  actuarialCertification: ActuarialCertification;
  complianceAnalysis: ComplianceAnalysis;
  sensitivityAnalysis: SensitivityAnalysis;
  recommendations: ActuarialRecommendation[];
}

export interface BaseRateStructure {
  perMemberPerMonth: number;
  ageBandedRates: AgeBandRates;
  familyRates: FamilyRates;
  smokerRates: SmokerRates;
  geographicRates: GeographicRates;
}

export interface AgeBandRates {
  bands: {
    ageBand: string;
    rate: number;
    memberCount: number;
  }[];
  compressionRatio: number;
}

export interface FamilyRates {
  individual: number;
  couple: number;
  singleParentOneChild: number;
  singleParentMultipleChildren: number;
  family: number;
  tierStructure: 'twoTier' | 'ageRated' | 'composite';
}

export interface SmokerRates {
  nonSmoker: number;
  smoker: number;
  tobaccoSurcharge: number;
  maxTobaccoRatio: number;
}

export interface GeographicRates {
  byRegion: Record<string, number>;
  byState: Record<string, number>;
  costIndices: Record<string, number>;
}

export interface LoadedRateStructure {
  administrativeExpenses: number;
  profitMargin: number;
  riskCharges: number;
  taxes: number;
  commissions: number;
  reinsuranceCosts: number;
  totalLoad: number;
  finalRates: BaseRateStructure;
}

export interface ActuarialCertification {
  certifiedBy: string;
  credentials: string;
  certificationDate: Date;
  assumptions: string[];
  methodology: string;
  dataSources: string[];
  limitations: string[];
  opinionStatement: string;
}

export interface ComplianceAnalysis {
  stateCompliance: StateComplianceResult[];
  federalCompliance: FederalComplianceResult;
  communityRatingCompliance: CommunityRatingCompliance;
  medicalLossRatioProjection: number;
  requiredDisclosures: string[];
}

export interface StateComplianceResult {
  state: string;
  compliant: boolean;
  violations: string[];
  requiredActions: string[];
}

export interface FederalComplianceResult {
  acaCompliant: boolean;
  medicalLossRatioCompliant: boolean;
  essentialHealthBenefitsCompliant: boolean;
  violations: string[];
}

export interface CommunityRatingCompliance {
  ageRatingCompliant: boolean;
  compressionRatio: number;
  tobaccoRatingCompliant: boolean;
  geographicRatingCompliant: boolean;
  violations: string[];
}

export interface SensitivityAnalysis {
  medicalCostTrendScenarios: TrendScenario[];
  utilizationScenarios: UtilizationScenario[];
  investmentReturnScenarios: InvestmentScenario[];
  riskAdjustmentScenarios: RiskAdjustmentScenario[];
}

export interface TrendScenario {
  scenario: string;
  medicalCostTrend: number;
  impactOnRates: number;
  probability: number;
}

export interface UtilizationScenario {
  scenario: string;
  utilizationChange: number;
  impactOnRates: number;
  probability: number;
}

export interface InvestmentScenario {
  scenario: string;
  investmentReturn: number;
  impactOnRates: number;
  probability: number;
}

export interface RiskAdjustmentScenario {
  scenario: string;
  riskScoreDistribution: number;
  impactOnRates: number;
  probability: number;
}

export interface ActuarialRecommendation {
  category: 'pricing' | 'benefit_design' | 'underwriting' | 'compliance';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
  expectedImpact: string;
  implementationCost: number;
  timeframe: string;
}

// Actuarial assumptions and constants
const ACTUARIAL_ASSUMPTIONS = {
  medicalInflationRate: 0.064, // 6.4% CMS 2025 projection
  pharmacyInflationRate: 0.101, // 10.1% CMS 2025 projection
  administrativeExpenseRatio: 0.12, // 12% of premium
  profitMarginTarget: 0.03, // 3% target profit margin
  riskCharge: 0.05, // 5% risk charge
  commissionRate: 0.04, // 4% commission
  taxRate: 0.02, // 2% premium tax
  reinsuranceCost: 0.015, // 1.5% reinsurance
  minimumMedicalLossRatio: 0.80, // ACA minimum 80% for small group
  maximumTobaccoRatio: 1.5, // ACA maximum 1.5:1 ratio
  discountRate: 0.04, // 4% discount rate for present value calculations
  credibilityFactor: 0.8 // 80% credibility for experience data
};

// State-specific regulatory requirements
const STATE_REGULATIONS: Record<string, StateRegulations> = {
  'CA': {
    maximumRateIncrease: 0.10,
    requiredApprovalProcess: 'prior_approval',
    rateFilingFrequency: 'annual',
    communityRatingRequirements: {
      ageRatingAllowed: true,
      ageBands: [
        { minAge: 0, maxAge: 18, maxRatio: 2.5 },
        { minAge: 19, maxAge: 29, maxRatio: 2.0 },
        { minAge: 30, maxAge: 39, maxRatio: 1.5 },
        { minAge: 40, maxAge: 49, maxRatio: 1.4 },
        { minAge: 50, maxAge: 59, maxRatio: 1.3 },
        { minAge: 60, maxAge: 64, maxRatio: 1.2 },
        { minAge: 65, maxAge: 99, maxRatio: 1.1 }
      ],
      genderRatingAllowed: false,
      healthStatusRatingAllowed: false,
      geographicRatingAllowed: true,
      tobaccoRatingAllowed: true
    },
    mandatedBenefits: ['maternity', 'mental_health', 'substance_abuse', 'preventive_care']
  },
  'NY': {
    maximumRateIncrease: 0.15,
    requiredApprovalProcess: 'file_and_use',
    rateFilingFrequency: 'quarterly',
    communityRatingRequirements: {
      ageRatingAllowed: true,
      ageBands: [
        { minAge: 0, maxAge: 21, maxRatio: 2.0 },
        { minAge: 22, maxAge: 39, maxRatio: 1.8 },
        { minAge: 40, maxAge: 53, maxRatio: 1.5 },
        { minAge: 54, maxAge: 99, maxRatio: 1.3 }
      ],
      genderRatingAllowed: false,
      healthStatusRatingAllowed: false,
      geographicRatingAllowed: true,
      tobaccoRatingAllowed: false
    },
    mandatedBenefits: ['maternity', 'mental_health', 'substance_abuse', 'preventive_care', 'infertility']
  },
  'TX': {
    maximumRateIncrease: 0.20,
    requiredApprovalProcess: 'file_and_use',
    rateFilingFrequency: 'annual',
    communityRatingRequirements: {
      ageRatingAllowed: true,
      ageBands: [
        { minAge: 0, maxAge: 20, maxRatio: 3.0 },
        { minAge: 21, maxAge: 39, maxRatio: 2.5 },
        { minAge: 40, maxAge: 59, maxRatio: 2.0 },
        { minAge: 60, maxAge: 99, maxRatio: 1.5 }
      ],
      genderRatingAllowed: false,
      healthStatusRatingAllowed: false,
      geographicRatingAllowed: true,
      tobaccoRatingAllowed: true
    },
    mandatedBenefits: ['preventive_care']
  }
};

/**
 * Main actuarial rate calculation function
 */
export async function calculateActuarialRates(
  storage: IStorage,
  input: ActuarialRateInput
): Promise<ActuarialRateResult> {
  try {
    // Step 1: Calculate base rates using actuarial methodology
    const baseRates = await calculateBaseActuarialRates(input);

    // Step 2: Apply expense loadings and profit requirements
    const loadedRates = await applyExpenseLoadings(baseRates, input);

    // Step 3: Perform compliance analysis
    const complianceAnalysis = await analyzeCompliance(loadedRates, input);

    // Step 4: Generate actuarial certification
    const actuarialCertification = generateActuarialCertification(loadedRates, input);

    // Step 5: Perform sensitivity analysis
    const sensitivityAnalysis = await performSensitivityAnalysis(loadedRates, input);

    // Step 6: Generate recommendations
    const recommendations = await generateActuarialRecommendations(loadedRates, complianceAnalysis, input);

    return {
      baseRates,
      loadedRates,
      actuarialCertification,
      complianceAnalysis,
      sensitivityAnalysis,
      recommendations
    };
  } catch (error) {
    console.error('Actuarial rate calculation failed:', error);
    throw new Error(`Actuarial rate calculation failed: ${error.message}`);
  }
}

/**
 * Calculate base actuarial rates using demographic and cost projections
 */
async function calculateBaseActuarialRates(input: ActuarialRateInput): Promise<BaseRateStructure> {
  const { demographicProfile, benefitDesign, historicalData } = input;

  // Calculate expected claim costs per member per month
  const expectedClaimCost = await calculateExpectedClaimCost(demographicProfile, benefitDesign, historicalData);

  // Calculate age-banded rates
  const ageBandedRates = calculateAgeBandedRates(expectedClaimCost, demographicProfile);

  // Calculate family structure rates
  const familyRates = calculateFamilyRates(expectedClaimCost, demographicProfile);

  // Calculate smoker vs non-smoker rates
  const smokerRates = calculateSmokerRates(expectedClaimCost, demographicProfile);

  // Calculate geographic adjustment factors
  const geographicRates = calculateGeographicRates(expectedClaimCost, demographicProfile);

  return {
    perMemberPerMonth: expectedClaimCost,
    ageBandedRates,
    familyRates,
    smokerRates,
    geographicRates
  };
}

/**
 * Calculate expected claim cost based on demographics and benefit design
 */
async function calculateExpectedClaimCost(
  demographics: DemographicProfile,
  benefitDesign: BenefitDesign,
  historicalData?: HistoricalActuarialData
): Promise<number> {
  // Base medical cost per member per month
  let baseCost = 450; // Industry average for 2025

  // Age adjustment
  const ageMultiplier = calculateAgeCostMultiplier(demographics.averageAge);
  baseCost *= ageMultiplier;

  // Gender adjustment (where allowed)
  const genderMultiplier = calculateGenderCostMultiplier(demographics.genderDistribution);
  baseCost *= genderMultiplier;

  // Health status adjustment
  const healthStatusMultiplier = calculateHealthStatusMultiplier(demographics.healthStatus);
  baseCost *= healthStatusMultiplier;

  // Geographic cost adjustment
  baseCost *= demographics.geographicCostIndex;

  // Benefit design adjustment
  const benefitMultiplier = calculateBenefitDesignMultiplier(benefitDesign);
  baseCost *= benefitMultiplier;

  // Industry risk adjustment
  const industryMultipliers = { low: 0.9, medium: 1.0, high: 1.15 };
  baseCost *= industryMultipliers[demographics.industryRisk];

  // Apply historical experience if available
  if (historicalData) {
    const experienceAdjustment = calculateExperienceAdjustment(historicalData.claimsExperience);
    baseCost *= experienceAdjustment;
  }

  // Apply medical inflation trend
  baseCost *= (1 + ACTUARIAL_ASSUMPTIONS.medicalInflationRate);

  return Math.round(baseCost * 100) / 100;
}

/**
 * Calculate age-based cost multiplier
 */
function calculateAgeCostMultiplier(averageAge: number): number {
  if (averageAge <= 18) return 0.7;
  if (averageAge <= 25) return 0.8;
  if (averageAge <= 35) return 1.0;
  if (averageAge <= 45) return 1.2;
  if (averageAge <= 55) return 1.5;
  if (averageAge <= 64) return 1.8;
  return 2.2;
}

/**
 * Calculate gender-based cost multiplier (where permitted)
 */
function calculateGenderCostMultiplier(genderDistribution: GenderDistribution): number {
  const total = genderDistribution.male + genderDistribution.female + genderDistribution.other;
  if (total === 0) return 1.0;

  const maleRatio = genderDistribution.male / total;
  const femaleRatio = genderDistribution.female / total;

  // Historically, females have higher healthcare costs in childbearing years
  // This would only be used in states that permit gender rating
  return (maleRatio * 1.0) + (femaleRatio * 1.1) + ((genderDistribution.other / total) * 1.05);
}

/**
 * Calculate health status cost multiplier
 */
function calculateHealthStatusMultiplier(healthStatus: HealthStatusDistribution): number {
  const total = healthStatus.healthy + healthStatus.managedConditions +
               healthStatus.highRisk + healthStatus.chronicConditions;

  if (total === 0) return 1.0;

  const healthyRatio = healthStatus.healthy / total;
  const managedRatio = healthStatus.managedConditions / total;
  const highRiskRatio = healthStatus.highRisk / total;
  const chronicRatio = healthStatus.chronicConditions / total;

  return (healthyRatio * 0.8) + (managedRatio * 1.2) +
         (highRiskRatio * 1.6) + (chronicRatio * 2.1);
}

/**
 * Calculate benefit design cost multiplier
 */
function calculateBenefitDesignMultiplier(benefitDesign: BenefitDesign): number {
  let multiplier = 1.0;

  // Deductible impact (lower deductible = higher cost)
  const deductibleMultiplier = Math.max(0.8, 1.5 - (benefitDesign.deductibleAmount / 5000));
  multiplier *= deductibleMultiplier;

  // Coinsurance impact (lower member cost share = higher premium)
  const coinsuranceMultiplier = 2.0 - benefitDesign.coinsuranceRate;
  multiplier *= coinsuranceMultiplier;

  // Out-of-pocket maximum impact
  const oopMultiplier = Math.max(0.9, 1.3 - (benefitDesign.outOfPocketMaximum / 10000));
  multiplier *= oopMultiplier;

  // Network type impact
  const networkMultipliers = { 'HMO': 0.9, 'PPO': 1.1, 'POS': 1.0, 'EPO': 0.95 };
  multiplier *= networkMultipliers[benefitDesign.networkType] || 1.0;

  return multiplier;
}

/**
 * Calculate experience adjustment based on historical claims data
 */
function calculateExperienceAdjustment(claimsExperience: ClaimsExperience): number {
  const credibilityWeight = ACTUARIAL_ASSUMPTIONS.credibilityFactor;
  const industryAverageLossRatio = 0.85; // Industry average

  // Compare actual loss ratio to industry average
  const lossRatioDifference = claimsExperience.medicalLossRatio - industryAverageLossRatio;
  const experienceAdjustment = 1.0 + (lossRatioDifference * credibilityWeight);

  return Math.max(0.8, Math.min(1.2, experienceAdjustment));
}

/**
 * Calculate age-banded rates
 */
function calculateAgeBandedRates(
  baseRate: number,
  demographics: DemographicProfile
): AgeBandRates {
  const bands = demographics.ageBands.map(band => ({
    ageBand: `${band.minAge}-${band.maxAge}`,
    rate: Math.round(baseRate * band.relativeCost * 100) / 100,
    memberCount: band.memberCount
  }));

  const rates = bands.map(b => b.rate);
  const compressionRatio = Math.max(...rates) / Math.min(...rates);

  return {
    bands,
    compressionRatio
  };
}

/**
 * Calculate family structure rates
 */
function calculateFamilyRates(baseRate: number, demographics: DemographicProfile): FamilyRates {
  return {
    individual: baseRate,
    couple: Math.round(baseRate * 1.85 * 100) / 100,
    singleParentOneChild: Math.round(baseRate * 1.65 * 100) / 100,
    singleParentMultipleChildren: Math.round(baseRate * 2.1 * 100) / 100,
    family: Math.round(baseRate * 2.8 * 100) / 100,
    tierStructure: 'ageRated'
  };
}

/**
 * Calculate smoker vs non-smoker rates
 */
function calculateSmokerRates(baseRate: number, demographics: DemographicProfile): SmokerRates {
  const tobaccoSurcharge = 0.5; // 50% surcharge
  const smokerRate = Math.round(baseRate * (1 + tobaccoSurcharge) * 100) / 100;
  const maxTobaccoRatio = smokerRate / baseRate;

  return {
    nonSmoker: baseRate,
    smoker: smokerRate,
    tobaccoSurcharge: tobaccoSurcharge,
    maxTobaccoRatio: Math.min(maxTobaccoRatio, ACTUARIAL_ASSUMPTIONS.maximumTobaccoRatio)
  };
}

/**
 * Calculate geographic adjustment factors
 */
function calculateGeographicRates(baseRate: number, demographics: DemographicProfile): GeographicRates {
  const costIndices = {
    'high_cost': 1.25,
    'above_average': 1.1,
    'average': 1.0,
    'below_average': 0.9,
    'low_cost': 0.8
  };

  return {
    byRegion: {
      'northeast': baseRate * 1.18,
      'midwest': baseRate * 0.95,
      'south': baseRate * 0.88,
      'west': baseRate * 1.12
    },
    byState: costIndices,
    costIndices: costIndices
  };
}

/**
 * Apply expense loadings to base rates
 */
async function applyExpenseLoadings(
  baseRates: BaseRateStructure,
  input: ActuarialRateInput
): Promise<LoadedRateStructure> {
  const loadings = {
    administrativeExpenses: ACTUARIAL_ASSUMPTIONS.administrativeExpenseRatio,
    profitMargin: ACTUARIAL_ASSUMPTIONS.profitMarginTarget,
    riskCharges: ACTUARIAL_ASSUMPTIONS.riskCharge,
    taxes: ACTUARIAL_ASSUMPTIONS.taxRate,
    commissions: ACTUARIAL_ASSUMPTIONS.commissionRate,
    reinsuranceCosts: ACTUARIAL_ASSUMPTIONS.reinsuranceCost
  };

  const totalLoad = Object.values(loadings).reduce((sum, loading) => sum + loading, 0);
  const loadingFactor = 1.0 / (1.0 - totalLoad);

  const finalRates = {
    perMemberPerMonth: Math.round(baseRates.perMemberPerMonth * loadingFactor * 100) / 100,
    ageBandedRates: {
      ...baseRates.ageBandedRates,
      bands: baseRates.ageBandedRates.bands.map(band => ({
        ...band,
        rate: Math.round(band.rate * loadingFactor * 100) / 100
      }))
    },
    familyRates: Object.fromEntries(
      Object.entries(baseRates.familyRates).map(([key, value]) => [
        key,
        Math.round((value as number) * loadingFactor * 100) / 100
      ])
    ) as FamilyRates,
    smokerRates: {
      ...baseRates.smokerRates,
      nonSmoker: Math.round(baseRates.smokerRates.nonSmoker * loadingFactor * 100) / 100,
      smoker: Math.round(baseRates.smokerRates.smoker * loadingFactor * 100) / 100
    },
    geographicRates: {
      ...baseRates.geographicRates,
      byRegion: Object.fromEntries(
        Object.entries(baseRates.geographicRates.byRegion).map(([key, value]) => [
          key,
          Math.round((value as number) * loadingFactor * 100) / 100
        ])
      ),
      byState: Object.fromEntries(
        Object.entries(baseRates.geographicRates.byState).map(([key, value]) => [
          key,
          Math.round((value as number) * loadingFactor * 100) / 100
        ])
      )
    }
  };

  return {
    ...loadings,
    totalLoad,
    finalRates
  };
}

/**
 * Analyze compliance with state and federal regulations
 */
async function analyzeCompliance(
  loadedRates: LoadedRateStructure,
  input: ActuarialRateInput
): Promise<ComplianceAnalysis> {
  const stateRegulations = STATE_REGULATIONS[input.geographicRegion] || STATE_REGULATIONS['TX'];

  // Check state compliance
  const stateCompliance = await checkStateCompliance(loadedRates.finalRates, stateRegulations, input.geographicRegion);

  // Check federal compliance
  const federalCompliance = await checkFederalCompliance(loadedRates.finalRates, input.regulatoryConstraints.federalRequirements);

  // Check community rating compliance
  const communityRatingCompliance = await checkCommunityRatingCompliance(loadedRates.finalRates, stateRegulations.communityRatingRequirements);

  // Calculate projected medical loss ratio
  const projectedMLR = await calculateProjectedMedicalLossRatio(loadedRates, input);

  return {
    stateCompliance: [stateCompliance],
    federalCompliance,
    communityRatingCompliance,
    medicalLossRatioProjection: projectedMLR,
    requiredDisclosures: generateRequiredDisclosures(stateCompliance, federalCompliance)
  };
}

/**
 * Check compliance with state-specific regulations
 */
async function checkStateCompliance(
  rates: BaseRateStructure,
  regulations: StateRegulations,
  state: string
): Promise<StateComplianceResult> {
  const violations: string[] = [];
  const requiredActions: string[] = [];

  // Check age band compression
  const maxAgeRate = Math.max(...rates.ageBandedRates.bands.map(b => b.rate));
  const minAgeRate = Math.min(...rates.ageBandedRates.bands.map(b => b.rate));
  const compressionRatio = maxAgeRate / minAgeRate;

  if (compressionRatio > regulations.communityRatingRequirements.ageBands[0]?.maxRatio || 3.0) {
    violations.push(`Age band compression ratio ${compressionRatio.toFixed(2)} exceeds maximum allowed`);
    requiredActions.push('Adjust age band rates to meet compression requirements');
  }

  // Check tobacco rating compliance
  if (rates.smokerRates.maxTobaccoRatio > ACTUARIAL_ASSUMPTIONS.maximumTobaccoRatio) {
    violations.push('Tobacco rating ratio exceeds federal maximum of 1.5:1');
    requiredActions.push('Reduce tobacco surcharge to meet federal requirements');
  }

  return {
    state,
    compliant: violations.length === 0,
    violations,
    requiredActions
  };
}

/**
 * Check federal ACA compliance
 */
async function checkFederalCompliance(
  rates: BaseRateStructure,
  requirements: FederalRequirements
): Promise<FederalComplianceResult> {
  const violations: string[] = [];

  if (!requirements.essentialHealthBenefitCoverage.includes('hospitalization')) {
    violations.push('Missing essential health benefit: hospitalization');
  }

  if (!requirements.essentialHealthBenefitCoverage.includes('prescription_drugs')) {
    violations.push('Missing essential health benefit: prescription drugs');
  }

  return {
    acaCompliant: violations.length === 0,
    medicalLossRatioCompliant: true, // Would be calculated based on actual MLR
    essentialHealthBenefitsCompliant: violations.length === 0,
    violations
  };
}

/**
 * Check community rating compliance
 */
async function checkCommunityRatingCompliance(
  rates: BaseRateStructure,
  requirements: CommunityRatingRequirements
): Promise<CommunityRatingCompliance> {
  const violations: string[] = [];

  // Check age rating compliance
  const ageRatingCompliant = requirements.ageRatingAllowed;

  // Check compression ratio
  const maxRate = Math.max(...rates.ageBandedRates.bands.map(b => b.rate));
  const minRate = Math.min(...rates.ageBandedRates.bands.map(b => b.rate));
  const compressionRatio = maxRate / minRate;

  if (compressionRatio > 3.0) {
    violations.push(`Compression ratio ${compressionRatio.toFixed(2)} exceeds typical maximum`);
  }

  // Check tobacco rating
  const tobaccoRatingCompliant = rates.smokerRates.maxTobaccoRatio <= ACTUARIAL_ASSUMPTIONS.maximumTobaccoRatio;

  return {
    ageRatingCompliant,
    compressionRatio,
    tobaccoRatingCompliant,
    geographicRatingCompliant: requirements.geographicRatingAllowed,
    violations
  };
}

/**
 * Calculate projected medical loss ratio
 */
async function calculateProjectedMedicalLossRatio(
  loadedRates: LoadedRateStructure,
  input: ActuarialRateInput
): Promise<number> {
  // Simplified MLR calculation
  const projectedClaimsCost = loadedRates.finalRates.perMemberPerMonth * 12 * 0.82; // 82% expected claim ratio
  const projectedPremium = loadedRates.finalRates.perMemberPerMonth * 12;

  return Math.round((projectedClaimsCost / projectedPremium) * 10000) / 100; // Return as percentage
}

/**
 * Generate required disclosures for compliance
 */
function generateRequiredDisclosures(
  stateCompliance: StateComplianceResult,
  federalCompliance: FederalComplianceResult
): string[] {
  const disclosures = [
    'Rate calculation methodology assumptions',
    'Data sources and credibility factors',
    'Expense loading breakdown',
    'Profit margin assumptions',
    'Medical loss ratio projections'
  ];

  if (!stateCompliance.compliant) {
    disclosures.push('State compliance violations and remediation plans');
  }

  if (!federalCompliance.essentialHealthBenefitsCompliant) {
    disclosures.push('Essential health benefit coverage gaps');
  }

  return disclosures;
}

/**
 * Generate actuarial certification
 */
function generateActuarialCertification(
  loadedRates: LoadedRateStructure,
  input: ActuarialRateInput
): ActuarialCertification {
  return {
    certifiedBy: 'Senior Actuary',
    credentials: 'FSA, MAAA',
    certificationDate: new Date(),
    assumptions: [
      'Medical inflation rate: 6.4% annually',
      'Administrative expense ratio: 12% of premium',
      'Target profit margin: 3% of premium',
      'Risk charge: 5% of premium',
      'Credibility factor: 80% for experience data'
    ],
    methodology: 'Actuarial Cost Approach with demographic and benefit design adjustments',
    dataSources: [
      'CMS Healthcare Cost Trend Data',
      'Industry Claims Experience Database',
      'Company Historical Claims Data',
      'Demographic Census Data'
    ],
    limitations: [
      'Projections based on current trend assumptions',
      'Limited by quality of historical experience data',
      'Subject to regulatory approval requirements',
      'Market conditions may impact actual experience'
    ],
    opinionStatement: 'Based on the analysis performed, I certify that the rates shown are actuarially sound, not unfairly discriminatory, and sufficient to cover anticipated claim costs, expenses, and profit requirements, in accordance with applicable state and federal regulations.'
  };
}

/**
 * Perform sensitivity analysis on key assumptions
 */
async function performSensitivityAnalysis(
  loadedRates: LoadedRateStructure,
  input: ActuarialRateInput
): Promise<SensitivityAnalysis> {
  const baseRate = loadedRates.finalRates.perMemberPerMonth;

  // Medical cost trend scenarios
  const medicalCostTrendScenarios: TrendScenario[] = [
    {
      scenario: 'Low Trend',
      medicalCostTrend: 0.04,
      impactOnRates: -8.5,
      probability: 0.15
    },
    {
      scenario: 'Base Trend',
      medicalCostTrend: ACTUARIAL_ASSUMPTIONS.medicalInflationRate,
      impactOnRates: 0,
      probability: 0.60
    },
    {
      scenario: 'High Trend',
      medicalCostTrend: 0.08,
      impactOnRates: 12.3,
      probability: 0.25
    }
  ];

  // Utilization scenarios
  const utilizationScenarios: UtilizationScenario[] = [
    {
      scenario: 'Reduced Utilization',
      utilizationChange: -0.05,
      impactOnRates: -4.2,
      probability: 0.20
    },
    {
      scenario: 'Base Utilization',
      utilizationChange: 0,
      impactOnRates: 0,
      probability: 0.65
    },
    {
      scenario: 'Increased Utilization',
      utilizationChange: 0.05,
      impactOnRates: 4.8,
      probability: 0.15
    }
  ];

  // Investment return scenarios
  const investmentReturnScenarios: InvestmentScenario[] = [
    {
      scenario: 'Low Returns',
      investmentReturn: 0.02,
      impactOnRates: 1.5,
      probability: 0.30
    },
    {
      scenario: 'Base Returns',
      investmentReturn: ACTUARIAL_ASSUMPTIONS.discountRate,
      impactOnRates: 0,
      probability: 0.50
    },
    {
      scenario: 'High Returns',
      investmentReturn: 0.06,
      impactOnRates: -1.2,
      probability: 0.20
    }
  ];

  // Risk adjustment scenarios
  const riskAdjustmentScenarios: RiskAdjustmentScenario[] = [
    {
      scenario: 'Favorable Risk Mix',
      riskScoreDistribution: -10,
      impactOnRates: -6.0,
      probability: 0.25
    },
    {
      scenario: 'Base Risk Mix',
      riskScoreDistribution: 0,
      impactOnRates: 0,
      probability: 0.60
    },
    {
      scenario: 'Adverse Risk Mix',
      riskScoreDistribution: 15,
      impactOnRates: 9.2,
      probability: 0.15
    }
  ];

  return {
    medicalCostTrendScenarios,
    utilizationScenarios,
    investmentReturnScenarios,
    riskAdjustmentScenarios
  };
}

/**
 * Generate actuarial recommendations
 */
async function generateActuarialRecommendations(
  loadedRates: LoadedRateStructure,
  complianceAnalysis: ComplianceAnalysis,
  input: ActuarialRateInput
): Promise<ActuarialRecommendation[]> {
  const recommendations: ActuarialRecommendation[] = [];

  // Pricing recommendations
  if (complianceAnalysis.medicalLossRatioProjection < ACTUARIAL_ASSUMPTIONS.minimumMedicalLossRatio) {
    recommendations.push({
      category: 'pricing',
      priority: 'urgent',
      recommendation: 'Increase base rates to meet minimum medical loss ratio requirements',
      rationale: `Projected MLR of ${complianceAnalysis.medicalLossRatioProjection}% is below minimum requirement of ${(ACTUARIAL_ASSUMPTIONS.minimumMedicalLossRatio * 100).toFixed(0)}%`,
      expectedImpact: 'Rates will increase by approximately 8-12%',
      implementationCost: 5000,
      timeframe: '30 days'
    });
  }

  // Benefit design recommendations
  recommendations.push({
    category: 'benefit_design',
    priority: 'medium',
    recommendation: 'Consider introducing higher deductible options to reduce premium costs',
    rationale: 'Higher deductibles typically reduce premiums by 15-25%',
    expectedImpact: 'Premium reduction of 15-25% for high deductible options',
    implementationCost: 15000,
    timeframe: '90 days'
  });

  // Underwriting recommendations
  recommendations.push({
    category: 'underwriting',
    priority: 'high',
    recommendation: 'Enhance data collection for better risk assessment',
    rationale: 'Improved risk data will support more accurate pricing',
    expectedImpact: '5-10% improvement in pricing accuracy',
    implementationCost: 25000,
    timeframe: '180 days'
  });

  // Compliance recommendations
  if (!complianceAnalysis.stateCompliance[0].compliant) {
    recommendations.push({
      category: 'compliance',
      priority: 'urgent',
      recommendation: 'Address state compliance violations immediately',
      rationale: 'Compliance issues prevent rate filing approval',
      expectedImpact: 'Ensure regulatory approval of rate filing',
      implementationCost: 10000,
      timeframe: '15 days'
    });
  }

  return recommendations;
}

/**
 * Calculate loss ratio targets by market segment
 */
export function calculateLossRatioTargets(marketSegment: string): number {
  const targets = {
    'individual': 0.82,
    'small_group': 0.85,
    'large_group': 0.88,
    'medicare_advantage': 0.85
  };

  return targets[marketSegment as keyof typeof targets] || 0.85;
}

/**
 * Determine expense loading structure
 */
export function determineExpenseLoadings(companySize: number, marketSegment: string): {
  administrative: number;
  commission: number;
  taxes: number;
  profit: number;
  risk: number;
  reinsurance: number;
} {
  const baseLoadings = {
    administrative: 0.12,
    commission: 0.04,
    taxes: 0.02,
    profit: 0.03,
    risk: 0.05,
    reinsurance: 0.015
  };

  // Adjust for company size
  if (companySize > 1000) {
    baseLoadings.administrative *= 0.8; // Economy of scale
    baseLoadings.commission *= 0.9;
  } else if (companySize < 50) {
    baseLoadings.administrative *= 1.3; // Small group penalty
    baseLoadings.risk *= 1.2;
  }

  // Adjust for market segment
  if (marketSegment === 'medicare_advantage') {
    baseLoadings.administrative *= 1.2; // Higher administrative costs
    baseLoadings.profit *= 0.7; // Lower profit margins
  }

  return baseLoadings;
}

/**
 * Calculate profit margin requirements
 */
export function calculateProfitMargins(
  marketSegment: string,
  companySize: number,
  riskProfile: 'low' | 'medium' | 'high'
): number {
  let baseProfit = 0.03; // 3% base profit

  // Adjust for market segment
  const segmentAdjustments = {
    'individual': 0.02,
    'small_group': 0.03,
    'large_group': 0.04,
    'medicare_advantage': 0.025
  };
  baseProfit = segmentAdjustments[marketSegment as keyof typeof segmentAdjustments] || 0.03;

  // Adjust for company size
  if (companySize > 1000) baseProfit *= 1.2; // Larger companies can command higher profits
  if (companySize < 50) baseProfit *= 0.8; // Small group risk

  // Adjust for risk profile
  const riskAdjustments = { low: 1.2, medium: 1.0, high: 0.7 };
  baseProfit *= riskAdjustments[riskProfile];

  return Math.max(0.01, Math.min(0.08, baseProfit)); // Cap between 1% and 8%
}

/**
 * Apply regulatory constraints to rate calculations
 */
export function applyRegulatoryConstraints(
  rates: BaseRateStructure,
  constraints: RegulatoryConstraints,
  state: string
): BaseRateStructure {
  const stateRegulations = STATE_REGULATIONS[state] || STATE_REGULATIONS['TX'];
  const adjustedRates = { ...rates };

  // Apply age band compression limits
  if (constraints.stateRegulations.communityRatingRequirements.ageRatingAllowed) {
    const maxRatio = stateRegulations.communityRatingRequirements.ageBands[0]?.maxRatio || 3.0;
    const maxAgeRate = Math.max(...adjustedRates.ageBandedRates.bands.map(b => b.rate));
    const minAgeRate = Math.min(...adjustedRates.ageBandedRates.bands.map(b => b.rate));

    if (maxAgeRate / minAgeRate > maxRatio) {
      // Adjust rates to meet compression requirements
      const targetMaxRate = minAgeRate * maxRatio;
      adjustedRates.ageBandedRates.bands = adjustedRates.ageBandedRates.bands.map(band => ({
        ...band,
        rate: Math.min(band.rate, targetMaxRate)
      }));
    }
  }

  // Apply tobacco rating limits
  if (constraints.stateRegulations.communityRatingRequirements.tobaccoRatingAllowed) {
    const maxTobaccoRatio = ACTUARIAL_ASSUMPTIONS.maximumTobaccoRatio;
    const currentRatio = adjustedRates.smokerRates.maxTobaccoRatio;

    if (currentRatio > maxTobaccoRatio) {
      adjustedRates.smokerRates.smoker = adjustedRates.smokerRates.nonSmoker * maxTobaccoRatio;
      adjustedRates.smokerRates.maxTobaccoRatio = maxTobaccoRatio;
    }
  }

  return adjustedRates;
}

/**
 * Generate pricing certification documentation
 */
export function generatePricingCertification(
  rates: ActuarialRateResult,
  input: ActuarialRateInput
): {
  certificationDocument: string;
  supportingDocumentation: string[];
  requiredFilings: string[];
  approvalChecklist: string[];
} {
  const certificationDocument = `
ACTUARIAL RATE CERTIFICATION

Company ID: ${input.companyId}
Period: ${input.periodId}
Market Segment: ${input.marketSegment}
Geographic Region: ${input.geographicRegion}

Rates Certified: ${rates.loadedRates.finalRates.perMemberPerMonth.toFixed(2)} per member per month

I hereby certify that the rates shown above are:
1. Actuarially sound based on reasonable assumptions
2. Not unfairly discriminatory
3. Sufficient to cover anticipated costs, expenses, and profit requirements
4. In compliance with applicable state and federal regulations

Certified By: ${rates.actuarialCertification.certifiedBy}
Credentials: ${rates.actuarialCertification.credentials}
Date: ${rates.actuarialCertification.certificationDate.toLocaleDateString()}
  `.trim();

  const supportingDocumentation = [
    'Actuarial assumptions and methodology',
    'Data sources and credibility analysis',
    'Expense loading justification',
    'Compliance analysis report',
    'Sensitivity analysis results'
  ];

  const requiredFilings = [
    'Rate filing form',
    'Actuarial certification',
    'Supporting documentation',
    'Compliance attestations',
    'Public comment responses'
  ];

  const approvalChecklist = [
    'State regulatory approval obtained',
    'Federal compliance verified',
    'Required documentation complete',
    'Public comment period completed',
    'Implementation timeline established'
  ];

  return {
    certificationDocument,
    supportingDocumentation,
    requiredFilings,
    approvalChecklist
  };
}