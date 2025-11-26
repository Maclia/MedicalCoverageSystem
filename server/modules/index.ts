/**
 * Modules System Entry Point
 * Central access point for the module system
 */

// Export core module system
export { ModuleRegistry, moduleRegistry } from './core/registry/ModuleRegistry.js';
export { BaseModule } from './core/BaseModule.js';
export { ModuleLoader, createModuleLoader } from './ModuleLoader.js';

// Export module types
export type {
  IModule,
  ModuleConfig,
  ModuleHealth,
  ModuleStatus,
  ModuleMetrics
} from './core/registry/ModuleRegistry.js';

// Export individual modules
export { BillingModule, billingConfig } from './billing/index.js';
export { PaymentsModule, paymentsConfig } from './payments/index.js';
export { CommissionsModule, commissionsConfig } from './commissions/index.js';
export { ClaimsFinancialModule, claimsFinancialConfig } from './claims-financial/index.js';

// Module system utilities
export * from './utils/ModuleUtils.js';