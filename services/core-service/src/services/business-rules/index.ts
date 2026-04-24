/**
 * ✅ BUSINESS RULES MODULE INDEX
 * 
 * Public exports for modular business rules engine
 * All services should import from this index file
 */

export { FinancialRulesService } from './FinancialRulesService.js';
export { ClaimRulesService } from './ClaimRulesService.js';
export { CardRulesService } from './CardRulesService.js';
export { DomainServiceClient } from '../DomainServiceClient.js';

// Facade pattern - single entry point for all business rules
export const BusinessRules = {
  Financial: FinancialRulesService,
  Claim: ClaimRulesService,
  Card: CardRulesService
};