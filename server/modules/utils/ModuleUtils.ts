/**
 * Module Utilities
 * Helper functions for module management
 */

import { moduleRegistry } from '../core/registry/ModuleRegistry.js';

/**
 * Get module by name with type safety
 */
export function getModule<T = any>(moduleName: string): T | undefined {
  return moduleRegistry.getModule(moduleName) as T;
}

/**
 * Check if all modules are healthy
 */
export async function areAllModulesHealthy(): Promise<boolean> {
  const healthChecks = await moduleRegistry.performHealthCheck();
  return Object.values(healthChecks).every(health => health.status === 'healthy');
}

/**
 * Get enabled modules count
 */
export function getEnabledModulesCount(): number {
  const modules = moduleRegistry.getAllModules();
  return modules.filter(module => module.config.enabled).length;
}

/**
 * Get active modules count
 */
export function getActiveModulesCount(): number {
  const statuses = moduleRegistry.getAllStatuses();
  return statuses.filter(status => status.active).length;
}

/**
 * Format module health status for logging
 */
export function formatHealthStatus(healthChecks: Record<string, any>): string {
  const entries = Object.entries(healthChecks);
  const healthy = entries.filter(([_, health]) => health.status === 'healthy').length;
  const degraded = entries.filter(([_, health]) => health.status === 'degraded').length;
  const unhealthy = entries.filter(([_, health]) => health.status === 'unhealthy').length;

  return `Healthy: ${healthy}, Degraded: ${degraded}, Unhealthy: ${unhealthy}`;
}

/**
 * Get module dependency graph
 */
export function getDependencyGraph(): Record<string, string[]> {
  const modules = moduleRegistry.getAllModules();
  const graph: Record<string, string[]> = {};

  modules.forEach(module => {
    graph[module.name] = module.config.dependencies || [];
  });

  return graph;
}

/**
 * Check for circular dependencies
 */
export function checkCircularDependencies(): string[] {
  const graph = getDependencyGraph();
  const visited = new Set();
  const recursionStack = new Set();
  const cycles: string[] = [];

  function dfs(node: string, path: string[]): void {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart).concat(node).join(' -> '));
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);

    const dependencies = graph[node] || [];
    for (const dep of dependencies) {
      dfs(dep, [...path, node]);
    }

    recursionStack.delete(node);
  }

  Object.keys(graph).forEach(node => {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  });

  return cycles;
}

/**
 * Get module load order
 */
export function getModuleLoadOrder(): string[] {
  const overview = moduleRegistry.getSystemOverview();
  return overview.loadOrder;
}

/**
 * Calculate system health score (0-100)
 */
export function calculateSystemHealthScore(): number {
  const healthChecks = moduleRegistry.performHealthCheck();
  const scores = Object.values(healthChecks).map(health => {
    switch (health.status) {
      case 'healthy': return 100;
      case 'degraded': return 50;
      case 'unhealthy': return 0;
      default: return 0;
    }
  });

  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

/**
 * Get module statistics
 */
export function getModuleStatistics() {
  const overview = moduleRegistry.getSystemOverview();
  const healthScore = calculateSystemHealthScore();

  return {
    totalModules: overview.totalModules,
    enabledModules: overview.enabledModules,
    activeModules: overview.activeModules,
    loadOrder: overview.loadOrder,
    healthScore,
    systemStatus: healthScore >= 80 ? 'excellent' :
                  healthScore >= 60 ? 'good' :
                  healthScore >= 40 ? 'fair' : 'poor'
  };
}

/**
 * Validate module configuration
 */
export function validateModuleConfig(config: any): boolean {
  const required = ['name', 'version', 'description'];
  return required.every(field => config[field]);
}

/**
 * Create module health report
 */
export async function createModuleHealthReport(): Promise<{
  timestamp: Date;
  summary: any;
  modules: Record<string, any>;
  recommendations: string[];
}> {
  const healthChecks = await moduleRegistry.performHealthCheck();
  const metrics = await moduleRegistry.getAllMetrics();
  const statistics = getModuleStatistics();

  const recommendations: string[] = [];

  // Analyze health and generate recommendations
  Object.entries(healthChecks).forEach(([moduleName, health]) => {
    if (health.status === 'unhealthy') {
      recommendations.push(`Urgent: Fix ${moduleName} module - critical issues detected`);
    } else if (health.status === 'degraded') {
      recommendations.push(`Monitor ${moduleName} module - performance issues detected`);
    }

    if (health.errors.length > 0) {
      recommendations.push(`Review ${moduleName} error logs for troubleshooting`);
    }
  });

  return {
    timestamp: new Date(),
    summary: statistics,
    modules: Object.keys(healthChecks).reduce((acc, moduleName) => {
      acc[moduleName] = {
        health: healthChecks[moduleName],
        metrics: metrics[moduleName]
      };
      return acc;
    }, {} as Record<string, any>),
    recommendations
  };
}