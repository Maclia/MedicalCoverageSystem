/**
 * Billing Module
 * Finance Module 1: Premium Billing & Invoicing
 */

import { BillingModule } from './BillingModule';

// Export module class
export { BillingModule };

// Export module configuration
export { billingConfig } from './config/module.config';

// Export services
export * from './services/index';

// Export types
export * from './types/index';

// Export routes
export * from './routes/index';

// Module factory function
export function createBillingModule() {
  return new BillingModule();
}

// Default export
export default BillingModule;