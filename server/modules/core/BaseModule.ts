/**
 * Base Module Class
 * Abstract base class that all modules should extend for consistency
 */

import type { Express } from 'express';
import {
  IModule,
  ModuleConfig,
  ModuleHealth,
  ModuleStatus,
  ModuleMetrics
} from './ModuleRegistry.js';

export abstract class BaseModule implements IModule {
  public readonly name: string;
  public readonly version: string;
  public readonly config: ModuleConfig;

  protected initialized: boolean = false;
  protected active: boolean = false;
  protected startTime: number = 0;
  protected requestCount: number = 0;
  protected errorCount: number = 0;
  protected customMetrics: Record<string, any> = {};

  constructor(config: ModuleConfig) {
    this.config = config;
    this.name = config.name;
    this.version = config.version;
  }

  // Abstract methods that must be implemented by concrete modules
  abstract initialize(): Promise<void>;
  abstract registerServices(): void;
  abstract registerTypes(): void;

  // Optional methods with default implementations
  async activate(): Promise<void> {
    this.active = true;
    this.startTime = Date.now();
    console.log(`🟢 Module activated: ${this.name}`);
  }

  async deactivate(): Promise<void> {
    this.active = false;
    console.log(`🟡 Module deactivated: ${this.name}`);
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
    this.active = false;
    console.log(`🧹 Module cleaned up: ${this.name}`);
  }

  // Default route registration - can be overridden
  registerRoutes(app: Express): void {
    if (!this.config.routes) {
      return;
    }

    // Register default health endpoint for the module
    const prefix = this.config.routes.prefix;
    app.get(`${prefix}/health`, async (req, res) => {
      try {
        const health = await this.healthCheck();
        const statusCode = health.status === 'healthy' ? 200 :
                         health.status === 'degraded' ? 206 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Register module info endpoint
    app.get(`${prefix}/info`, (req, res) => {
      res.json({
        name: this.name,
        version: this.version,
        description: this.config.description,
        features: this.config.features,
        status: this.getStatus()
      });
    });

    // Register metrics endpoint
    app.get(`${prefix}/metrics`, async (req, res) => {
      try {
        const metrics = await this.getMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to get metrics'
        });
      }
    });

    console.log(`🛣️  Routes registered for module: ${this.name} with prefix ${prefix}`);
  }

  // Health check implementation
  async healthCheck(): Promise<ModuleHealth> {
    const services: Record<string, boolean> = {};
    const dependencies: Record<string, boolean> = {};
    const errors: string[] = [];

    // Check module-specific health
    try {
      await this.performModuleHealthCheck();
      services.module = true;
    } catch (error) {
      services.module = false;
      errors.push(`Module health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check dependencies
    const { moduleRegistry } = await import('./ModuleRegistry.js');
    for (const dependency of this.config.dependencies) {
      try {
        const depModule = moduleRegistry.getModule(dependency);
        if (depModule) {
          const depHealth = await depModule.healthCheck();
          dependencies[dependency] = depHealth.status !== 'unhealthy';
        } else {
          dependencies[dependency] = false;
          errors.push(`Dependency ${dependency} not found`);
        }
      } catch (error) {
        dependencies[dependency] = false;
        errors.push(`Dependency ${dependency} health check failed: ${error}`);
      }
    }

    const allHealthy = Object.values(services).every(Boolean) && Object.values(dependencies).every(Boolean);
    const someHealthy = Object.values(services).some(Boolean) || Object.values(dependencies).some(Boolean);

    return {
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
      services,
      dependencies,
      lastCheck: new Date(),
      errors
    };
  }

  // Status implementation
  getStatus(): ModuleStatus {
    return {
      name: this.name,
      version: this.version,
      enabled: this.config.enabled,
      active: this.active,
      initialized: this.initialized,
      dependencies: this.config.dependencies,
      lastUpdated: new Date()
    };
  }

  // Metrics implementation
  async getMetrics(): Promise<ModuleMetrics> {
    const memoryUsage = process.memoryUsage();

    return {
      name: this.name,
      uptime: this.active ? Date.now() - this.startTime : 0,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      responseTime: this.calculateAverageResponseTime(),
      memoryUsage: memoryUsage.heapUsed,
      customMetrics: this.customMetrics
    };
  }

  // Utility methods for concrete modules
  protected setInitialized(value: boolean = true): void {
    this.initialized = value;
  }

  protected incrementRequestCount(): void {
    this.requestCount++;
  }

  protected incrementErrorCount(): void {
    this.errorCount++;
  }

  protected setCustomMetric(key: string, value: any): void {
    this.customMetrics[key] = value;
  }

  protected getCustomMetric(key: string): any {
    return this.customMetrics[key];
  }

  // Abstract method for module-specific health checks
  protected abstract performModuleHealthCheck(): Promise<void>;

  // Method to calculate average response time (can be overridden)
  protected calculateAverageResponseTime(): number {
    // Default implementation - modules can override with actual timing
    return 0;
  }

  // Method to log module events with consistent formatting
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      module: this.name,
      level,
      message,
      data
    };

    console.log(`[${timestamp}] [${this.name}] [${level.toUpperCase()}] ${message}`, data || '');
  }

  // Method to validate module configuration
  protected validateConfig(): void {
    if (!this.config.name) {
      throw new Error('Module name is required');
    }

    if (!this.config.version) {
      throw new Error('Module version is required');
    }

    if (this.config.routes && !this.config.routes.prefix) {
      throw new Error('Route prefix is required when routes are configured');
    }
  }

  // Method to check if a feature is enabled
  protected isFeatureEnabled(feature: string): boolean {
    return this.config.features[feature] || false;
  }

  // Method to get module database tables (if configured)
  protected getDatabaseTables(): string[] {
    return this.config.database?.tables || [];
  }
}

export default BaseModule;