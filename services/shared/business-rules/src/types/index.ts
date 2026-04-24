/**
 * Business Rule Execution Mode
 */
export enum ExecutionMode {
  LOCAL = 'local',           // Execute rule implementation locally in this service
  PROXY = 'proxy',           // Proxy execution to Core Service over HTTP
  DUAL = 'dual',             // Execute both locations and compare results
}

/**
 * Business Rule Result with execution metadata
 */
export interface RuleResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    executionMode: ExecutionMode;
    executionTimeMs: number;
    executedAt: Date;
    serviceName: string;
    fallback?: boolean;
  };
  validation?: {
    matched?: boolean;
    diff?: string[];
  };
}

/**
 * Feature Flag Configuration
 */
export interface RuleFeatureFlags {
  cardRules: ExecutionMode;
  claimRules: ExecutionMode;
  financialRules: ExecutionMode;
}

/**
 * Base interface for all business rule modules
 */
export interface IBusinessRuleModule {
  getExecutionMode(): ExecutionMode;
  setExecutionMode(mode: ExecutionMode): void;
}

// Rule specific interfaces

export interface ICardRulesService extends IBusinessRuleModule {
  validateCardEligibility(memberId: number): Promise<RuleResult<boolean>>;
  calculateCardExpiryDate(memberId: number): Promise<RuleResult<Date>>;
  validateReplacementPolicy(cardId: number, reason: string): Promise<RuleResult<boolean>>;
}

export interface IClaimRulesService extends IBusinessRuleModule {
  validateClaimEligibility(claimData: any): Promise<RuleResult<boolean>>;
  checkWaitingPeriod(memberId: number, diagnosisCode: string): Promise<RuleResult<boolean>>;
  validatePolicyExclusions(claimData: any): Promise<RuleResult<string[]>>;
  checkPreAuthorizationRequired(claimData: any): Promise<RuleResult<boolean>>;
}

export interface IFinancialRulesService extends IBusinessRuleModule {
  calculatePremiumAllocation(amount: number): Promise<RuleResult<Record<string, number>>>;
  validateCompanyBalance(companyId: number, claimAmount: number): Promise<RuleResult<boolean>>;
  calculateCommission(transactionAmount: number): Promise<RuleResult<number>>;
  calculateSettlementAmount(claimAmount: number): Promise<RuleResult<number>>;
}

export interface IBusinessRulesEngine {
  cards: ICardRulesService;
  claims: IClaimRulesService;
  financial: IFinancialRulesService;
}