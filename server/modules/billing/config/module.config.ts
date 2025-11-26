/**
 * Billing Module Configuration
 */

import { ModuleConfig } from '../../core/registry/ModuleRegistry.js';

export const billingConfig: ModuleConfig = {
  name: 'billing',
  version: '1.0.0',
  description: 'Premium Billing & Invoicing - Automated billing processes for individuals and corporate clients',
  enabled: true,
  dependencies: ['core', 'policies', 'members'],
  routes: {
    prefix: '/api/billing',
    middleware: ['auth', 'rateLimit']
  },
  database: {
    tables: [
      'invoices',
      'invoice_line_items',
      'accounts_receivable',
      'billing_communications',
      'account_statements'
    ]
  },
  features: {
    automatedInvoicing: true,
    corporateBilling: true,
    individualBilling: true,
    agingReports: true,
    paymentReminders: true,
    taxCalculations: true,
    multiCurrency: true,
    prorationSupport: true,
    batchProcessing: true,
    reporting: true
  }
};