/**
 * Billing Module Implementation
 * Finance Module 1: Premium Billing & Invoicing
 */

import type { Express } from 'express';
import BaseModule from '../core/BaseModule';
import { billingConfig } from './config/module.config';

// Import services
import { BillingService } from './services/BillingService';
import { AccountsReceivableService } from './services/AccountsReceivableService';
import { BillingNotificationService } from './services/BillingNotificationService';

// Import routes
import { billingRoutes } from './routes/index';

export class BillingModule extends BaseModule {
  // Service instances
  private billingService?: BillingService;
  private accountsReceivableService?: AccountsReceivableService;
  private notificationService?: BillingNotificationService;

  constructor() {
    super(billingConfig);
    // Note: validateConfig is not in BaseModule, will be added later if needed
  }

  async initialize(): Promise<void> {
    this.log('info', 'Initializing Billing Module...');

    try {
      // Initialize services
      this.billingService = new BillingService();
      this.accountsReceivableService = new AccountsReceivableService();
      this.notificationService = new BillingNotificationService();

      // Initialize service dependencies
      await this.billingService.initialize();
      await this.accountsReceivableService.initialize();
      await this.notificationService.initialize();

      this.setInitialized(true);
      this.log('info', 'Billing Module initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize Billing Module', error);
      throw error;
    }
  }

  async activate(): Promise<void> {
    this.log('info', 'Activating Billing Module...');

    try {
      // Activate services
      await this.billingService?.activate();
      await this.accountsReceivableService?.activate();
      await this.notificationService?.activate();

      // Start background tasks if enabled
      if (this.isFeatureEnabled('batchProcessing')) {
        this.startBatchProcessor();
      }

      await super.activate();
      this.log('info', 'Billing Module activated successfully');
    } catch (error) {
      this.log('error', 'Failed to activate Billing Module', error);
      throw error;
    }
  }

  async deactivate(): Promise<void> {
    this.log('info', 'Deactivating Billing Module...');

    try {
      // Stop background tasks
      this.stopBatchProcessor();

      // Deactivate services
      await this.billingService?.deactivate();
      await this.accountsReceivableService?.deactivate();
      await this.notificationService?.deactivate();

      await super.deactivate();
      this.log('info', 'Billing Module deactivated successfully');
    } catch (error) {
      this.log('error', 'Failed to deactivate Billing Module', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.log('info', 'Cleaning up Billing Module...');

    try {
      // Cleanup services
      await this.billingService?.cleanup();
      await this.accountsReceivableService?.cleanup();
      await this.notificationService?.cleanup();

      await super.cleanup();
      this.log('info', 'Billing Module cleaned up successfully');
    } catch (error) {
      this.log('error', 'Failed to cleanup Billing Module', error);
      throw error;
    }
  }

  registerServices(): void {
    this.log('info', 'Registering Billing Module services...');

    // Register services in service registry
    const serviceRegistry = {
      billingService: this.billingService,
      accountsReceivableService: this.accountsReceivableService,
      notificationService: this.notificationService
    };

    // Make services available globally (if global exists)
    if (typeof global !== 'undefined') {
      (global as any).billingServices = serviceRegistry;
    }

    this.log('info', 'Billing Module services registered');
  }

  registerTypes(): void {
    this.log('info', 'Registering Billing Module types...');

    // Types are automatically registered through imports
    // Additional type registration logic can go here

    this.log('info', 'Billing Module types registered');
  }

  registerRoutes(app: Express): void {
    this.log('info', 'Registering Billing Module routes...');

    // Register base module routes
    super.registerRoutes(app);

    // Register billing-specific routes
    billingRoutes(app, {
      billingService: this.billingService!,
      accountsReceivableService: this.accountsReceivableService!,
      notificationService: this.notificationService!
    });

    this.log('info', 'Billing Module routes registered');
  }

  protected async performModuleHealthCheck(): Promise<void> {
    // Check billing service health
    if (this.billingService) {
      await this.billingService.healthCheck();
    }

    // Check accounts receivable service health
    if (this.accountsReceivableService) {
      await this.accountsReceivableService.healthCheck();
    }

    // Check notification service health
    if (this.notificationService) {
      await this.notificationService.healthCheck();
    }
  }

  // Get service instances
  getBillingService(): BillingService | undefined {
    return this.billingService;
  }

  getAccountsReceivableService(): AccountsReceivableService | undefined {
    return this.accountsReceivableService;
  }

  getNotificationService(): BillingNotificationService | undefined {
    return this.notificationService;
  }

  // Module-specific methods
  private batchProcessorInterval?: any;

  private startBatchProcessor(): void {
    this.log('info', 'Starting billing batch processor...');

    // Run batch processing every hour
    this.batchProcessorInterval = setInterval(async () => {
      try {
        this.log('info', 'Running billing batch processing...');
        await this.runBatchProcessing();
        this.log('info', 'Billing batch processing completed');
      } catch (error) {
        this.log('error', 'Billing batch processing failed', error);
        this.incrementErrorCount();
      }
    }, 60 * 60 * 1000); // 1 hour

    this.setCustomMetric('batchProcessorActive', true);
  }

  private stopBatchProcessor(): void {
    if (this.batchProcessorInterval) {
      clearInterval(this.batchProcessorInterval);
      this.batchProcessorInterval = undefined;
      this.setCustomMetric('batchProcessorActive', false);
      this.log('info', 'Billing batch processor stopped');
    }
  }

  private async runBatchProcessing(): Promise<void> {
    if (!this.billingService || !this.accountsReceivableService) {
      throw new Error('Billing services not initialized');
    }

    // Update accounts receivable
    await this.accountsReceivableService.updateAccountsReceivable();

    // Process overdue accounts
    await this.accountsReceivableService.processOverdueAccounts();

    // Generate billing reports
    if (this.isFeatureEnabled('reporting')) {
      await this.billingService.generateDailyReports();
    }
  }

  // Module metrics
  protected calculateAverageResponseTime(): number {
    // Return cached response time or calculate from services
    const serviceResponseTime = this.getCustomMetric('serviceResponseTime');
    return serviceResponseTime || 0;
  }
}

export default BillingModule;