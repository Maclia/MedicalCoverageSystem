/**
 * Billing Module
 * Finance Module 1: Premium Billing & Invoicing
 */

import { BillingModule } from './BillingModule.js';

// Export module class
export { BillingModule };

// Export module configuration
export { billingConfig } from './config/module.config.js';

// Export services
export * from './services/index.js';

// Export types
export * from './types/index.js';

// Export routes
export * from './routes/index.js';

// Module factory function
export function createBillingModule() {
  return new BillingModule();
}

// Default export
export default BillingModule;