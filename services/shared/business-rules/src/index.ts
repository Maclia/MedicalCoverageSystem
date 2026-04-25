/**
 * Decentralized Business Rules Engine
 * 
 * This library provides zero-downtime migration path from centralized Core Service
 * business rules to decentralized domain implementation.
 */

export * from './types/index.js';
export * from './BaseRuleModule.js';

import { ExecutionMode, RuleFeatureFlags } from './types/index.js';

// Explicitly export interfaces and types that are being used by consuming services
export type { IClaimRulesService, ICardRulesService, IFinancialRulesService, IBusinessRulesEngine, IBusinessRuleModule, RuleResult, RuleFeatureFlags } from './types/index.js';
export { ExecutionMode } from './types/index.js';

/**
 * Global feature flag configuration
 * Can be updated at runtime without restart
 */
export const BusinessRuleFlags: RuleFeatureFlags = {
  cardRules: ExecutionMode.PROXY,
  claimRules: ExecutionMode.PROXY,
  financialRules: ExecutionMode.PROXY,
};

/**
 * Configure execution mode for all rule modules
 */
export function configureRuleExecution(flags: Partial<RuleFeatureFlags>): void {
  Object.assign(BusinessRuleFlags, flags);
}

/**
 * Get current feature flag configuration
 */
export function getRuleConfiguration(): RuleFeatureFlags {
  return { ...BusinessRuleFlags };
}