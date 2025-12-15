/**
 * Commissions Module
 * Finance Module 3: Commission Management & Tracking
 */

import { CommissionsModule } from './CommissionsModule';

// Export module class
export { CommissionsModule };

// Export module configuration
export { commissionsConfig } from './config/module.config';

// Export module factory function
export function createCommissionsModule() {
  return new CommissionsModule();
}

// Default export
export default CommissionsModule;