/**
 * Premium Calculation Type Definitions
 *
 * Comprehensive type definitions for the premium calculation module
 * Including all interfaces, enums, and utility types
 */

// Pricing Methodology Enum
export enum PricingMethodology {
  COMMUNITY_RATED = 'community_rated',
  EXPERIENCE_RATED = 'experience_rated',
  ADJUSTED_COMMUNITY_RATED = 'adjusted_community_rated',
  BENEFIT_RATED = 'benefit_rated'
}

// Risk Adjustment Tiers
export enum RiskAdjustmentTier {
  LOW_RISK = 'low_risk',
  AVERAGE_RISK = 'average_risk',
  MODERATE_RISK = 'moderate_risk',
  HIGH_RISK = 'high_risk',
  VERY_HIGH_RISK = 'very_high_risk'
}

// Inflation Categories
export enum InflationCategory {
  MEDICAL_TREND = 'medical_trend',
  UTILIZATION_TREND = 'utilization_trend',
  COST_SHIFTING = 'cost_shifting',
  TECHNOLOGY_ADVANCEMENT = 'technology_advancement',
  REGULATORY_IMPACT = 'regulatory_impact'
}

// Core Interfaces
export interface PremiumCalculationRequest {
  id?: string;
  memberId: number;
  companyId: number;
  periodId: number;
  planType: string;
  coverageLevel: string;
  effectiveDate: Date;
  memberDemographics: MemberDemographics;
  riskAdjustment?: RiskAdjustmentData;
  marketFactors?: MarketFactors;
  calculationOptions?: CalculationOptions;
}

export interface MemberDemographics {
  age: number;
  gender: 'male' | 'female' | 'all';
  familyComposition: {
    principal: number;
    spouse: number;
    children: number;
    dependents: number;
  };
  location: {
    regionId: string;
    zipCode?: string;
    county?: string;
  };
  occupation?: string;
  smokerStatus: boolean;
  hasDisability: boolean;
}

export interface RiskAdjustmentData {
  healthScore: number;
  lifestyleScore: number;
  occupationalRisk: 'low' | 'medium' | 'high';
  medicalConditions: MedicalCondition[];
  familyHistory: FamilyHistoryRisk;
}

export interface MedicalCondition {
  conditionId: string;
  severity: 'mild' | 'moderate' | 'severe';
  treatmentCostMultiplier: number;
  chronicCondition: boolean;
}

export interface FamilyHistoryRisk {
  cardiovascular: boolean;
  diabetes: boolean;
  cancer: boolean;
  geneticDisorders: boolean;
  overallRiskScore: number;
}

export interface MarketFactors {
  competitiveIndex: number;
  marketSegment: string;
  companySize: number;
  industryType: string;
  geographicAdjustment: number;
  trendFactors: TrendFactors;
}

export interface TrendFactors {
  medicalInflation: number;
  utilizationTrend: number;
  technologyImpact: number;
  regulatoryChanges: number;
  demographicShifts: number;
}

export interface CalculationOptions {
  pricingMethodology: PricingMethodology;
  riskAdjustmentEnabled: boolean;
  competitiveOptimization: boolean;
  actuarialCompliance: boolean;
  includeConfidenceIntervals: boolean;
  sensitivityAnalysis: boolean;
}

// Result Interfaces
export interface PremiumCalculationResult {
  id: string;
  calculationDate: Date;
  memberId: number;
  companyId: number;
  periodId: number;
  pricingMethodology: PricingMethodology;
  basePremium: number;
  riskAdjustments: RiskAdjustmentBreakdown;
  demographicAdjustments: DemographicAdjustment;
  geographicAdjustments: GeographicAdjustment;
  trendAdjustments: TrendAdjustment;
  finalPremium: number;
  memberPremium: number;
  monthlyPremium: number;
  annualPremium: number;
  confidenceIntervals: ConfidenceIntervals;
  compliance: ComplianceAnalysis;
  auditData: AuditData;
}

export interface RiskAdjustmentBreakdown {
  healthConditionAdjustment: number;
  lifestyleAdjustment: number;
  occupationalAdjustment: number;
  familyHistoryAdjustment: number;
  overallRiskMultiplier: number;
  riskTier: RiskAdjustmentTier;
  riskScore: number;
}

export interface DemographicAdjustment {
  ageBandAdjustment: number;
  genderAdjustment: number;
  familySizeAdjustment: number;
  smokerAdjustment: number;
  disabilityAdjustment: number;
  overallMultiplier: number;
}

export interface GeographicAdjustment {
  baseCostIndex: number;
  medicalCostIndex: number;
  utilizationIndex: number;
  providerDensityIndex: number;
  regionalMultiplier: number;
  stateRegulations: StateRegulationImpact;
}

export interface TrendAdjustment {
  medicalInflationAdjustment: number;
  utilizationTrendAdjustment: number;
  technologyImpactAdjustment: number;
  regulatoryImpactAdjustment: number;
  overallTrendMultiplier: number;
  trendProjectionPeriod: number;
}

export interface ConfidenceIntervals {
  lower95: number;
  upper95: number;
  lower90: number;
  upper90: number;
  confidenceLevel: number;
  standardDeviation: number;
  varianceExplained: number;
}

export interface ComplianceAnalysis {
  acaCompliance: ACAComplianceStatus;
  stateCompliance: StateComplianceStatus;
  lossRatioProjection: LossRatioProjection;
  regulatoryConstraints: RegulatoryConstraint[];
  complianceWarnings: ComplianceWarning[];
}

export interface ACAComplianceStatus {
  minimumLossRatio: number;
  projectedLossRatio: number;
  isCompliant: boolean;
  complianceMargin: number;
  reportingRequirements: string[];
}

export interface StateComplianceStatus {
  stateId: string;
  ratingRestrictions: RatingRestrictions;
  isCompliant: boolean;
  requiredFilings: string[];
  approvalRequirements: string[];
}

export interface RatingRestrictions {
  ageRatingAllowed: boolean;
  genderRatingAllowed: boolean;
  healthStatusRatingAllowed: boolean;
  geographicRatingAllowed: boolean;
  tobaccoRatingAllowed: boolean;
}

export interface LossRatioProjection {
  targetLossRatio: number;
  projectedLossRatio: number;
  confidenceInterval: [number, number];
  sensitivityFactors: Record<string, number>;
}

export interface RegulatoryConstraint {
  constraintType: string;
  constraintValue: number;
  currentValue: number;
  isConstraintMet: boolean;
  description: string;
}

export interface ComplianceWarning {
  warningType: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  recommendation: string;
  deadline?: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AuditData {
  calculationId: string;
  calculationTimestamp: Date;
  userId: number;
  ipAddress: string;
  userAgent: string;
  calculationVersion: string;
  dataSourceVersion: string;
  calculationSteps: CalculationStep[];
  dataIntegrityHash: string;
}

export interface CalculationStep {
  stepId: string;
  stepName: string;
  stepType: 'INPUT' | 'CALCULATION' | 'ADJUSTMENT' | 'OUTPUT';
  inputValue: any;
  outputValue: any;
  calculationFormula: string;
  executionTime: number;
  timestamp: Date;
}

// Batch Calculation Interfaces
export interface BatchPremiumCalculationRequest {
  batchId: string;
  companyId: number;
  periodId: number;
  memberIds: number[];
  calculationOptions: CalculationOptions;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  notificationSettings: NotificationSettings;
}

export interface BatchPremiumCalculationResult {
  batchId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  totalMembers: number;
  processedMembers: number;
  failedMembers: number;
  results: PremiumCalculationResult[];
  errors: BatchCalculationError[];
  processingStartTime: Date;
  processingEndTime?: Date;
  totalProcessingTime: number;
}

export interface NotificationSettings {
  emailOnCompletion: boolean;
  emailOnFailure: boolean;
  webhookUrl?: string;
  recipientEmails: string[];
}

export interface BatchCalculationError {
  memberId: number;
  errorType: string;
  errorMessage: string;
  errorDetails?: any;
  timestamp: Date;
}

// API Request/Response Types
export interface PremiumQuoteRequest {
  memberId?: number;
  companyId: number;
  periodId: number;
  quoteData: QuoteData;
  calculationOptions?: Partial<CalculationOptions>;
}

export interface QuoteData {
  memberCount: number;
  ageDistribution: Array<{ age: number; count: number }>;
  familyComposition: {
    principal: number;
    spouse: number;
    children: number;
  };
  planType: string;
  coverageLevel: string;
  effectiveDate: Date;
  regionId: string;
}

export interface PremiumQuoteResponse {
  quoteId: string;
  validUntil: Date;
  quotedPremium: PremiumQuoteResult;
  alternativeOptions: AlternativePricingOption[];
  assumptions: QuoteAssumptions;
  confidenceLevel: number;
}

export interface PremiumQuoteResult {
  monthlyPremium: number;
  annualPremium: number;
  memberPremium: number;
  breakdown: QuoteBreakdown;
  factors: QuoteFactors;
}

export interface QuoteBreakdown {
  baseRate: number;
  riskAdjustment: number;
  demographicAdjustment: number;
  geographicAdjustment: number;
  trendAdjustment: number;
  totalAdjustments: number;
}

export interface QuoteFactors {
  methodology: PricingMethodology;
  riskScore: number;
  riskTier: RiskAdjustmentTier;
  costIndex: number;
  competitiveIndex: number;
}

export interface AlternativePricingOption {
  planType: string;
  coverageLevel: string;
  monthlyPremium: number;
  annualPremium: number;
  differenceFromBase: number;
  valueScore: number;
}

export interface QuoteAssumptions {
  medicalInflationRate: number;
  utilizationTrend: number;
  competitiveMarketFactors: number;
  regulatoryAssumptions: string[];
  dataAccuracy: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: ValidationRecommendation[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'ERROR' | 'CRITICAL';
  value: any;
  allowedValues?: any[];
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  severity: 'INFO' | 'WARNING';
  value: any;
}

export interface ValidationRecommendation {
  category: string;
  recommendation: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  potentialSavings?: number;
}

// Configuration Types
export interface ModuleConfiguration {
  calculationEngine: CalculationEngineConfig;
  dataSources: DataSourceConfig;
  integrationSettings: IntegrationSettings;
  performanceSettings: PerformanceSettings;
  securitySettings: SecuritySettings;
}

export interface CalculationEngineConfig {
  maxConcurrentCalculations: number;
  timeoutMs: number;
  cacheEnabled: boolean;
  cacheTTLSeconds: number;
  retryAttempts: number;
  batchSize: number;
}

export interface DataSourceConfig {
  primaryDataSource: string;
  backupDataSources: string[];
  dataRefreshIntervalHours: number;
  dataValidationEnabled: boolean;
  externalAPIs: ExternalAPIConfig[];
}

export interface ExternalAPIConfig {
  name: string;
  endpoint: string;
  authentication: AuthConfig;
  rateLimitPerSecond: number;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
}

export interface AuthConfig {
  type: 'API_KEY' | 'OAUTH2' | 'BASIC';
  credentials: Record<string, string>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  maxBackoffMs: number;
}

export interface IntegrationSettings {
  enabledIntegrations: string[];
  webhookEndpoints: WebhookConfig[];
  scheduledTasks: ScheduledTaskConfig[];
}

export interface WebhookConfig {
  name: string;
  url: string;
  events: string[];
  authentication: AuthConfig;
  retryPolicy: RetryPolicy;
}

export interface ScheduledTaskConfig {
  name: string;
  schedule: string; // Cron expression
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface PerformanceSettings {
  enableCaching: boolean;
  cacheSize: number;
  enableCompression: boolean;
  enableMetrics: boolean;
  loggingLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

export interface SecuritySettings {
  enableEncryption: boolean;
  encryptionKeyRotationDays: number;
  accessControl: AccessControlConfig;
  auditLogging: boolean;
  dataRetentionDays: number;
}

export interface AccessControlConfig {
  roleBasedAccess: boolean;
  defaultRole: string;
  permissions: RolePermission[];
}

export interface RolePermission {
  role: string;
  permissions: string[];
  allowedOperations: string[];
}