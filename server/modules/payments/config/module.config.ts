/**
 * Payments Module Configuration
 * Finance Module 2: Payment Processing Configuration
 */

import { ModuleConfig } from '../../core/registry/ModuleRegistry';

export const paymentsConfig: ModuleConfig = {
  name: 'payments',
  version: '1.0.0',
  description: 'Payment Management - Multi-gateway payment processing and reconciliation',
  enabled: true,
  dependencies: ['billing', 'core'],
  routes: {
    prefix: '/api/payments',
    middleware: ['auth', 'rateLimit']
  },
  features: {
    multiGateway: true,
    autoReconciliation: true,
    fraudDetection: true,
    recurringPayments: true,
    refundProcessing: true,
    reporting: true,
    internationalPayments: true,
    currencyConversion: true
  },
  database: {
    tables: ['payments', 'refunds', 'transactions', 'payment_methods']
  },
  health: {
    endpoint: '/health',
    timeout: 10000,
    retries: 3
  }
};