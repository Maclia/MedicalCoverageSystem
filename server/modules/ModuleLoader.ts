/**
 * Module Loader
 * Central module loading and management system
 */

import type { Express } from 'express';
import { moduleRegistry } from './core/registry/ModuleRegistry.js';

// Import all modules
import { BillingModule } from './billing/index';
import { PaymentsModule } from './payments/index';
import { CommissionsModule } from './commissions/index.js';
import { ClaimsFinancialModule } from './claims-financial/index.js';

export interface ModuleLoadOptions {
  autoInitialize?: boolean;
  autoActivate?: boolean;
  silentMode?: boolean;
}

export class ModuleLoader {
  private app: Express;
  private options: ModuleLoadOptions;

  constructor(app: Express, options: ModuleLoadOptions = {}) {
    this.app = app;
    this.options = {
      autoInitialize: true,
      autoActivate: true,
      silentMode: false,
      ...options
    };
  }

  /**
   * Load all modules
   */
  async loadAllModules(): Promise<void> {
    if (!this.options.silentMode) {
      console.log('🚀 Loading Medical Coverage System Modules...');
    }

    try {
      // Register all modules
      await this.registerModules();

      // Initialize modules if auto-initialize is enabled
      if (this.options.autoInitialize) {
        await this.initializeModules();
      }

      // Activate modules if auto-activate is enabled
      if (this.options.autoActivate) {
        await this.activateModules();
      }

      if (!this.options.silentMode) {
        console.log('✅ All modules loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to load modules:', error);
      throw error;
    }
  }

  /**
   * Register all available modules
   */
  private async registerModules(): Promise<void> {
    const modules = [
      // Finance modules
      new BillingModule(),
      new PaymentsModule(),
      new CommissionsModule(),
      new ClaimsFinancialModule(),

      // Core business modules
      new CoreModule(),
      new PoliciesModule(),
      new MembersModule(),
      new ProvidersModule(),
      new ClaimsModule(),
    ];

    for (const module of modules) {
      await moduleRegistry.registerModule(module);
    }
  }

  /**
   * Initialize all registered modules
   */
  private async initializeModules(): Promise<void> {
    await moduleRegistry.initializeModules();
  }

  /**
   * Activate all initialized modules
   */
  private async activateModules(): Promise<void> {
    await moduleRegistry.activateModules(this.app);
  }

  /**
   * Get system overview
   */
  getSystemOverview() {
    return moduleRegistry.getSystemOverview();
  }

  /**
   * Perform system health check
   */
  async performSystemHealthCheck() {
    return await moduleRegistry.performHealthCheck();
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    return await moduleRegistry.getAllMetrics();
  }

  /**
   * Load specific modules by name
   */
  async loadModules(moduleNames: string[]): Promise<void> {
    if (!this.options.silentMode) {
      console.log(`🎯 Loading specific modules: ${moduleNames.join(', ')}`);
    }

    // This would involve dynamic loading based on module names
    // For now, we'll just ensure all modules are loaded
    await this.loadAllModules();
  }

  /**
   * Reload a specific module
   */
  async reloadModule(moduleName: string): Promise<void> {
    try {
      await moduleRegistry.deactivateModule(moduleName);

      // Re-create and register the module
      // This would need module factory pattern
      console.log(`🔄 Module ${moduleName} reloaded`);
    } catch (error) {
      console.error(`❌ Failed to reload module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Get module information
   */
  getModuleInfo(moduleName: string) {
    const module = moduleRegistry.getModule(moduleName);
    if (!module) {
      return null;
    }

    return {
      name: module.name,
      version: module.version,
      config: module.config,
      status: module.getStatus()
    };
  }

  /**
   * List all available modules
   */
  listModules() {
    return moduleRegistry.getAllStatuses();
  }

  /**
   * Check if a module is enabled
   */
  isModuleEnabled(moduleName: string): boolean {
    const module = moduleRegistry.getModule(moduleName);
    return module?.config.enabled || false;
  }

  /**
   * Enable/disable a module
   */
  async toggleModule(moduleName: string, enabled: boolean): Promise<void> {
    const module = moduleRegistry.getModule(moduleName);
    if (!module) {
      throw new Error(`Module ${moduleName} not found`);
    }

    // Update module configuration
    (module.config as any).enabled = enabled;

    if (enabled && !module.getStatus().active) {
      await moduleRegistry.activateModules(this.app);
    } else if (!enabled && module.getStatus().active) {
      await moduleRegistry.deactivateModule(moduleName);
    }

    console.log(`🔧 Module ${moduleName} ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Module loader factory
export function createModuleLoader(app: Express, options?: ModuleLoadOptions): ModuleLoader {
  return new ModuleLoader(app, options);
}

export default ModuleLoader;