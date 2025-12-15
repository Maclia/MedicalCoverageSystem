/**
 * Commissions Module Configuration
 * Finance Module 3: Commission Management Configuration
 */

import { ModuleConfig } from '../../core/registry/ModuleRegistry';

export const commissionsConfig: ModuleConfig = {
  name: 'commissions',
  version: '1.0.0',
  description: 'Commission Management - Agent performance tracking and tier management',
  enabled: true,
  dependencies: ['billing', 'core'],
  routes: {
    prefix: '/api/commissions',
    middleware: ['auth', 'rateLimit']
  },
  features: {
    tierManagement: true,
    performanceTracking: true,
    automatedPayments: true,
    realTimeCalculation: true,
    batchProcessing: true,
    reporting: true,
    analytics: true
  },
  database: {
    tables: ['commissions', 'commission_payments', 'agent_performance', 'agent_tiers', 'commission_statements']
  },
  health: {
    endpoint: '/health',
    timeout: 10000,
    retries: 3
  }
};