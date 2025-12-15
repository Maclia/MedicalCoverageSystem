/**
 * Claims Financial Module Configuration
 * Finance Module 4: Claims Financial Processing Configuration
 */

import { ModuleConfig } from '../../core/registry/ModuleRegistry';

export const claimsFinancialConfig: ModuleConfig = {
  name: 'claims-financial',
  version: '1.0.0',
  description: 'Claims Financial Processing - Financial adjudication and reserve management',
  enabled: true,
  dependencies: ['claims', 'billing'],
  routes: {
    prefix: '/api/claims-financial',
    middleware: ['auth', 'rateLimit']
  },
  features: {
    financialAdjudication: true,
    fraudDetection: true,
    reserveManagement: true,
    paymentProcessing: true,
    automatedProcessing: true,
    realTimeAnalysis: true,
    reserveTracking: true,
    complianceMonitoring: true,
    reporting: true
  },
  database: {
    tables: ['claims_financial', 'claim_payments', 'reserves', 'fraud_analysis', 'audit_trails']
  },
  health: {
    endpoint: '/health',
    timeout: 15000,
    retries: 3
  }
};