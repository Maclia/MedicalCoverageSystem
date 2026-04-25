/**
 * ✅ BUSINESS RULES MODULE INDEX
 * 
 * Public exports for modular business rules engine
 * All services should import from this index file
 */

import { FinancialRulesService } from './FinancialRulesService';
import { ClaimRulesService } from './ClaimRulesService';
import { CardRulesService } from './CardRulesService';
export { FinancialRulesService } from './FinancialRulesService';
export { ClaimRulesService } from './ClaimRulesService';
export { CardRulesService } from './CardRulesService';
export { DomainServiceClient } from '../DomainServiceClient';

// Facade pattern - single entry point for all business rules
export const BusinessRules = {
  Financial: FinancialRulesService,
  Claim: ClaimRulesService,
  Card: CardRulesService
};
