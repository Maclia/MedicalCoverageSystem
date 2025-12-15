/**
 * Payments Module
 * Finance Module 2: Payment Management
 */

import { PaymentsModule } from './PaymentsModule';

// Export module class
export { PaymentsModule };

// Export module configuration
export { paymentsConfig } from './config/module.config';

// Module factory function
export function createPaymentsModule() {
  return new PaymentsModule();
}

// Default export
export default PaymentsModule;