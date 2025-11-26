/**
 * Base Billing Service
 * Abstract base class for all billing services
 */

export class BaseBillingService {
  protected serviceName: string;
  protected initialized: boolean = false;
  protected active: boolean = false;
  protected requestCount: number = 0;
  protected errorCount: number = 0;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // Lifecycle methods
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.serviceName}...`);
    this.initialized = true;
  }

  async activate(): Promise<void> {
    console.log(`Activating ${this.serviceName}...`);
    this.active = true;
  }

  async deactivate(): Promise<void> {
    console.log(`Deactivating ${this.serviceName}...`);
    this.active = false;
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.serviceName}...`);
    this.initialized = false;
  }

  // Health check
  async healthCheck(): Promise<void> {
    if (!this.initialized) {
      throw new Error(`${this.serviceName} not initialized`);
    }
    if (!this.active) {
      throw new Error(`${this.serviceName} not active`);
    }
  }

  // Metrics
  getServiceMetrics() {
    return {
      serviceName: this.serviceName,
      initialized: this.initialized,
      active: this.active,
      requestCount: this.requestCount,
      errorCount: this.errorCount
    };
  }

  // Utility methods
  protected incrementRequestCount(): void {
    this.requestCount++;
  }

  protected incrementErrorCount(): void {
    this.errorCount++;
  }

  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}`, data || '');
  }
}