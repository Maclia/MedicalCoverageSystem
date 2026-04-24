/**
 * Decentralized Business Rules Engine
 * 
 * This library provides zero-downtime migration path from centralized Core Service
 * business rules to decentralized domain implementation.
 */

export * from './types';
export * from './BaseRuleModule';

import { ExecutionMode, RuleFeatureFlags } from './types';

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