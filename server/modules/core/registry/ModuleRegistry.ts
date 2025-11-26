/**
 * Module Registry
 * Central registry for all system modules with dynamic loading and management
 */

import type { Express } from 'express';
import { z } from 'zod';

// Module configuration schema
export const ModuleConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  enabled: z.boolean().default(true),
  dependencies: z.array(z.string()).default([]),
  routes: z.object({
    prefix: z.string(),
    middleware: z.array(z.string()).default([]),
  }).optional(),
  database: z.object({
    tables: z.array(z.string()).default([]),
    migrations: z.array(z.string()).default([]),
  }).optional(),
  features: z.record(z.boolean()).default({}),
});

export type ModuleConfig = z.infer<typeof ModuleConfigSchema>;

// Module interface
export interface IModule {
  readonly config: ModuleConfig;
  readonly name: string;
  readonly version: string;

  // Lifecycle hooks
  initialize(): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  cleanup(): Promise<void>;

  // Registration
  registerRoutes(app: Express): void;
  registerServices(): void;
  registerTypes(): void;

  // Health and status
  healthCheck(): Promise<ModuleHealth>;
  getStatus(): ModuleStatus;
  getMetrics(): ModuleMetrics;
}

// Module health status
export interface ModuleHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, boolean>;
  dependencies: Record<string, boolean>;
  lastCheck: Date;
  errors: string[];
}

// Module status
export interface ModuleStatus {
  name: string;
  version: string;
  enabled: boolean;
  active: boolean;
  initialized: boolean;
  dependencies: string[];
  lastUpdated: Date;
}

// Module metrics
export interface ModuleMetrics {
  name: string;
  uptime: number;
  requestCount: number;
  errorCount: number;
  responseTime: number;
  memoryUsage: number;
  customMetrics?: Record<string, any>;
}

// Module registry
export class ModuleRegistry {
  private modules: Map<string, IModule> = new Map();
  private moduleConfigs: Map<string, ModuleConfig> = new Map();
  private loadOrder: string[] = [];

  /**
   * Register a module
   */
  async registerModule(module: IModule): Promise<void> {
    const { name, config } = module;

    // Validate module configuration
    try {
      ModuleConfigSchema.parse(config);
    } catch (error) {
      throw new Error(`Invalid configuration for module ${name}: ${error}`);
    }

    // Check dependencies
    for (const dependency of config.dependencies) {
      if (!this.modules.has(dependency)) {
        throw new Error(`Module ${name} depends on ${dependency} which is not registered`);
      }
    }

    // Store module
    this.modules.set(name, module);
    this.moduleConfigs.set(name, config);

    // Update load order
    this.updateLoadOrder();

    console.log(`✅ Module registered: ${name} v${config.version}`);
  }

  /**
   * Initialize all enabled modules
   */
  async initializeModules(): Promise<void> {
    console.log('🚀 Initializing modules...');

    for (const moduleName of this.loadOrder) {
      const module = this.modules.get(moduleName);
      const config = this.moduleConfigs.get(moduleName);

      if (!module || !config?.enabled) {
        continue;
      }

      try {
        await module.initialize();
        console.log(`✅ Module initialized: ${moduleName}`);
      } catch (error) {
        console.error(`❌ Failed to initialize module ${moduleName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Activate all initialized modules
   */
  async activateModules(app: Express): Promise<void> {
    console.log('🔧 Activating modules...');

    for (const moduleName of this.loadOrder) {
      const module = this.modules.get(moduleName);
      const config = this.moduleConfigs.get(moduleName);

      if (!module || !config?.enabled) {
        continue;
      }

      try {
        // Register services and types
        module.registerServices();
        module.registerTypes();

        // Register routes if configured
        if (config.routes) {
          module.registerRoutes(app);
        }

        // Activate the module
        await module.activate();
        console.log(`✅ Module activated: ${moduleName}`);
      } catch (error) {
        console.error(`❌ Failed to activate module ${moduleName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Deactivate a module
   */
  async deactivateModule(moduleName: string): Promise<void> {
    const module = this.modules.get(moduleName);

    if (!module) {
      throw new Error(`Module ${moduleName} not found`);
    }

    // Check for dependent modules
    const dependents = this.getDependents(moduleName);
    if (dependents.length > 0) {
      throw new Error(`Cannot deactivate ${moduleName}: it has active dependents: ${dependents.join(', ')}`);
    }

    try {
      await module.deactivate();
      console.log(`✅ Module deactivated: ${moduleName}`);
    } catch (error) {
      console.error(`❌ Failed to deactivate module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Get module by name
   */
  getModule(moduleName: string): IModule | undefined {
    return this.modules.get(moduleName);
  }

  /**
   * Get all modules
   */
  getAllModules(): IModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get all module statuses
   */
  getAllStatuses(): ModuleStatus[] {
    return Array.from(this.modules.values()).map(module => module.getStatus());
  }

  /**
   * Perform health check on all modules
   */
  async performHealthCheck(): Promise<Record<string, ModuleHealth>> {
    const results: Record<string, ModuleHealth> = {};

    for (const [name, module] of this.modules) {
      try {
        results[name] = await module.healthCheck();
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          services: {},
          dependencies: {},
          lastCheck: new Date(),
          errors: [error instanceof Error ? error.message : 'Unknown error']
        };
      }
    }

    return results;
  }

  /**
   * Get all module metrics
   */
  async getAllMetrics(): Promise<Record<string, ModuleMetrics>> {
    const results: Record<string, ModuleMetrics> = {};

    for (const [name, module] of this.modules) {
      try {
        results[name] = await module.getMetrics();
      } catch (error) {
        results[name] = {
          name,
          uptime: 0,
          requestCount: 0,
          errorCount: 0,
          responseTime: 0,
          memoryUsage: 0
        };
      }
    }

    return results;
  }

  /**
   * Get modules that depend on a given module
   */
  private getDependents(moduleName: string): string[] {
    const dependents: string[] = [];

    for (const [name, config] of this.moduleConfigs) {
      if (config.dependencies.includes(moduleName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }

  /**
   * Update module load order based on dependencies
   */
  private updateLoadOrder(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (moduleName: string) => {
      if (visited.has(moduleName)) return;
      if (visiting.has(moduleName)) {
        throw new Error(`Circular dependency detected involving module ${moduleName}`);
      }

      visiting.add(moduleName);

      const config = this.moduleConfigs.get(moduleName);
      if (config) {
        for (const dependency of config.dependencies) {
          visit(dependency);
        }
      }

      visiting.delete(moduleName);
      visited.add(moduleName);
      order.push(moduleName);
    };

    for (const moduleName of this.modules.keys()) {
      visit(moduleName);
    }

    this.loadOrder = order;
  }

  /**
   * Get system overview
   */
  getSystemOverview(): {
    totalModules: number;
    enabledModules: number;
    activeModules: number;
    modules: ModuleStatus[];
    loadOrder: string[];
  } {
    const statuses = this.getAllStatuses();
    const enabledModules = statuses.filter(s => s.enabled).length;
    const activeModules = statuses.filter(s => s.active).length;

    return {
      totalModules: this.modules.size,
      enabledModules,
      activeModules,
      modules: statuses,
      loadOrder: this.loadOrder
    };
  }
}

// Global module registry instance
export const moduleRegistry = new ModuleRegistry();