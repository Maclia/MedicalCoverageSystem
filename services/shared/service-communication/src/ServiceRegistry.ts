import { redisManager } from '../config/redis';
import { createLogger } from '../config/logger';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  health: 'healthy' | 'unhealthy' | 'unknown';
  metadata: Record<string, any>;
  registeredAt: Date;
  lastHeartbeat: Date;
  weight: number; // For load balancing
}

export interface ServiceHealth {
  endpoint?: string;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  expectedStatus: number;
}

export interface ServiceConfig {
  name: string;
  instances: ServiceInstance[];
  healthCheck?: ServiceHealth;
  loadBalancing: 'round-robin' | 'weighted' | 'least-connections';
  circuitBreaker?: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };
}

interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  responseTimeSum: number;
  lastRequest?: Date;
  circuitBreakerTrips: number;
}

class ServiceRegistry extends EventEmitter {
  private services: Map<string, ServiceConfig> = new Map();
  private metrics: Map<string, Map<string, ServiceMetrics>> = new Map(); // service -> instance -> metrics
  private healthCheckInterval: NodeJS.Timeout[] = [];
  private circuitBreakerState: Map<string, { state: 'closed' | 'open' | 'half-open'; tripTime?: number; failures: number }> = new Map();

  constructor() {
    super();
    this.setupHeartbeatMonitoring();
  }

  // Service registration
  async registerService(instance: Omit<ServiceInstance, 'registeredAt' | 'lastHeartbeat'>): Promise<void> {
    const serviceConfig = this.services.get(instance.name);
    const serviceInstance: ServiceInstance = {
      ...instance,
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
      health: 'unknown'
    };

    if (!serviceConfig) {
      // New service
      this.services.set(instance.name, {
        name: instance.name,
        instances: [serviceInstance],
        loadBalancing: 'round-robin'
      });

      // Initialize metrics
      this.metrics.set(instance.name, new Map([
        [instance.id, { requestCount: 0, errorCount: 0, responseTimeSum: 0, circuitBreakerTrips: 0 }]
      ]));

      logger.info('New service registered', {
        name: instance.name,
        instanceId: instance.id,
        host: `${instance.host}:${instance.port}`
      });

    } else {
      // Add instance to existing service
      const existingInstance = serviceConfig.instances.find(i => i.id === instance.id);
      if (existingInstance) {
        // Update existing instance
        Object.assign(existingInstance, serviceInstance, {
          registeredAt: existingInstance.registeredAt // Keep original registration time
        });
      } else {
        // Add new instance
        serviceConfig.instances.push(serviceInstance);
        this.metrics.get(instance.name)!.set(instance.id, {
          requestCount: 0,
          errorCount: 0,
          responseTimeSum: 0,
          circuitBreakerTrips: 0
        });
      }

      logger.info('Service instance updated', {
        name: instance.name,
        instanceId: instance.id,
        host: `${instance.host}:${instance.port}`
      });
    }

    this.emit('service:registered', serviceInstance);

    // Start health check for this service if configured
    if (serviceConfig?.healthCheck) {
      this.startHealthCheck(instance.name);
    }
  }

  // Service deregistration
  async deregisterService(serviceName: string, instanceId?: string): Promise<void> {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      return;
    }

    if (instanceId) {
      // Remove specific instance
      serviceConfig.instances = serviceConfig.instances.filter(i => i.id !== instanceId);
      this.metrics.get(serviceName)?.delete(instanceId);

      logger.info('Service instance deregistered', {
        serviceName,
        instanceId
      });
    } else {
      // Remove entire service
      this.services.delete(serviceName);
      this.metrics.delete(serviceName);

      logger.info('Service deregistered', { serviceName });
    }

    this.emit('service:deregistered', { serviceName, instanceId });
  }

  // Service discovery
  async discoverService(serviceName: string, options: {
    onlyHealthy?: boolean;
    protocol?: 'http' | 'https';
  } = {}): Promise<ServiceInstance[]> {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      return [];
    }

    let instances = serviceConfig.instances;

    if (options.onlyHealthy) {
      instances = instances.filter(i => i.health === 'healthy');
    }

    if (options.protocol) {
      instances = instances.filter(i => i.protocol === options.protocol);
    }

    return instances;
  }

  // Load balancing
  async selectInstance(serviceName: string, options: {
    strategy?: 'round-robin' | 'weighted' | 'least-connections';
    onlyHealthy?: boolean;
  } = {}): Promise<ServiceInstance | null> {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig || serviceConfig.instances.length === 0) {
      return null;
    }

    const strategy = options.strategy || serviceConfig.loadBalancing;
    let instances = serviceConfig.instances;

    if (options.onlyHealthy) {
      instances = instances.filter(i => i.health === 'healthy');
    }

    // Check circuit breaker
    instances = instances.filter(instance => !this.isCircuitBreakerOpen(serviceName, instance.id));

    if (instances.length === 0) {
      logger.warn('No healthy instances available', { serviceName });
      return null;
    }

    let selectedInstance: ServiceInstance;

    switch (strategy) {
      case 'round-robin':
        selectedInstance = this.selectRoundRobin(instances);
        break;
      case 'weighted':
        selectedInstance = this.selectWeighted(instances);
        break;
      case 'least-connections':
        selectedInstance = this.selectLeastConnections(serviceName, instances);
        break;
      default:
        selectedInstance = instances[0];
    }

    logger.debug('Instance selected', {
      serviceName,
      instanceId: selectedInstance.id,
      host: `${selectedInstance.host}:${selectedInstance.port}`,
      strategy
    });

    return selectedInstance;
  }

  private selectRoundRobin(instances: ServiceInstance[]): ServiceInstance {
    // Simple round-robin based on request count
    const instanceWithLeastRequests = instances.reduce((min, current) => {
      const minMetrics = this.getMetrics(current.name, min.id);
      const currentMetrics = this.getMetrics(current.name, current.id);
      return currentMetrics.requestCount < minMetrics.requestCount ? current : min;
    });

    return instanceWithLeastRequests;
  }

  private selectWeighted(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let random = Math.random() * totalWeight;

    for (const instance of instances) {
      random -= instance.weight;
      if (random <= 0) {
        return instance;
      }
    }

    return instances[0]; // Fallback
  }

  private selectLeastConnections(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const instanceWithLeastConnections = instances.reduce((min, current) => {
      const minMetrics = this.getMetrics(serviceName, min.id);
      const currentMetrics = this.getMetrics(serviceName, current.id);
      const minActive = minMetrics.requestCount - minMetrics.errorCount;
      const currentActive = currentMetrics.requestCount - currentMetrics.errorCount;
      return currentActive < minActive ? current : min;
    });

    return instanceWithLeastConnections;
  }

  // Health check management
  private setupHeartbeatMonitoring(): void {
    // Clean up stale instances every 30 seconds
    setInterval(() => {
      this.cleanupStaleInstances();
    }, 30000);

    // Update circuit breaker states every 10 seconds
    setInterval(() => {
      this.updateCircuitBreakerStates();
    }, 10000);
  }

  private startHealthCheck(serviceName: string): void {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig?.healthCheck) {
      return;
    }

    const healthCheck = serviceConfig.healthCheck;
    const interval = setInterval(async () => {
      const instances = serviceConfig.instances;

      for (const instance of instances) {
        try {
          await this.performHealthCheck(instance, healthCheck);
        } catch (error) {
          logger.error('Health check failed', error as Error, {
            serviceName,
            instanceId: instance.id
          });
        }
      }
    }, healthCheck.interval);

    this.healthCheckInterval.push(interval);
  }

  private async performHealthCheck(instance: ServiceInstance, healthCheck: ServiceHealth): Promise<void> {
    const endpoint = healthCheck.endpoint || '/health';
    const url = `${instance.protocol}://${instance.host}:${instance.port}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), healthCheck.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'service-registry/health-check'
        }
      });

      clearTimeout(timeoutId);

      const isHealthy = response.status === (healthCheck.expectedStatus || 200);
      const previousHealth = instance.health;
      instance.health = isHealthy ? 'healthy' : 'unhealthy';
      instance.lastHeartbeat = new Date();

      if (previousHealth !== instance.health) {
        logger.info('Instance health changed', {
          instanceId: instance.id,
          serviceName: instance.name,
          previousHealth,
          currentHealth: instance.health
        });

        this.emit('instance:health_changed', instance);
      }

    } catch (error) {
      clearTimeout(timeoutId);
      instance.health = 'unhealthy';
      instance.lastHeartbeat = new Date();

      logger.debug('Health check error', error as Error, {
        instanceId: instance.id,
        serviceName: instance.name
      });
    }
  }

  private cleanupStaleInstances(): void {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute without heartbeat

    for (const [serviceName, serviceConfig] of this.services) {
      const initialCount = serviceConfig.instances.length;

      serviceConfig.instances = serviceConfig.instances.filter(instance => {
        const timeSinceLastHeartbeat = now - instance.lastHeartbeat.getTime();
        const isStale = timeSinceLastHeartbeat > staleThreshold;

        if (isStale) {
          logger.warn('Removing stale instance', {
            serviceName,
            instanceId: instance.id,
            timeSinceLastHeartbeat
          });

          this.emit('instance:stale', instance);
        }

        return !isStale;
      });

      if (serviceConfig.instances.length !== initialCount) {
        logger.info('Stale instances cleaned up', {
          serviceName,
          removed: initialCount - serviceConfig.instances.length,
          remaining: serviceConfig.instances.length
        });
      }
    }
  }

  // Circuit breaker implementation
  private isCircuitBreakerOpen(serviceName: string, instanceId: string): boolean {
    const key = `${serviceName}:${instanceId}`;
    const state = this.circuitBreakerState.get(key);

    if (!state) {
      return false;
    }

    if (state.state === 'open') {
      // Check if recovery timeout has passed
      const serviceConfig = this.services.get(serviceName);
      const recoveryTimeout = serviceConfig?.circuitBreaker?.recoveryTimeout || 30000;

      if (state.tripTime && Date.now() - state.tripTime > recoveryTimeout) {
        // Move to half-open state
        state.state = 'half-open';
        logger.info('Circuit breaker half-open', { serviceName, instanceId });
        return false;
      }

      return true;
    }

    return false;
  }

  private updateCircuitBreakerStates(): void {
    for (const [serviceName, serviceConfig] of this.services) {
      if (!serviceConfig.circuitBreaker) {
        continue;
      }

      const { failureThreshold, monitoringPeriod } = serviceConfig.circuitBreaker;
      const now = Date.now();

      for (const instance of serviceConfig.instances) {
        const key = `${serviceName}:${instance.id}`;
        const metrics = this.getMetrics(serviceName, instance.id);
        const state = this.circuitBreakerState.get(key) || {
          state: 'closed' as const,
          failures: 0
        };

        // Calculate recent failures within monitoring period
        const recentErrors = this.getRecentErrors(serviceName, instance.id, monitoringPeriod);

        if (state.state === 'closed' && recentErrors >= failureThreshold) {
          // Trip the circuit breaker
          state.state = 'open';
          state.tripTime = now;
          state.failures = recentErrors;

          const instanceMetrics = this.metrics.get(serviceName)?.get(instance.id);
          if (instanceMetrics) {
            instanceMetrics.circuitBreakerTrips++;
          }

          logger.warn('Circuit breaker opened', {
            serviceName,
            instanceId,
            failures: recentErrors,
            threshold: failureThreshold
          });

          this.emit('circuit_breaker:opened', { serviceName, instanceId });

        } else if (state.state === 'half-open') {
          // Check if requests are succeeding
          const recentSuccess = this.getRecentSuccesses(serviceName, instance.id, monitoringPeriod / 2);

          if (recentSuccess > 0) {
            // Close the circuit breaker
            state.state = 'closed';
            state.failures = 0;

            logger.info('Circuit breaker closed', {
              serviceName,
              instanceId,
              successes: recentSuccess
            });

            this.emit('circuit_breaker:closed', { serviceName, instanceId });
          } else {
            // Re-open the circuit breaker
            state.state = 'open';
            state.tripTime = now;

            logger.warn('Circuit breaker re-opened', {
              serviceName,
              instanceId
            });
          }
        }

        this.circuitBreakerState.set(key, state);
      }
    }
  }

  private getRecentErrors(serviceName: string, instanceId: string, periodMs: number): number {
    // This would be implemented with proper metrics storage
    // For now, return current error count
    return this.getMetrics(serviceName, instanceId).errorCount;
  }

  private getRecentSuccesses(serviceName: string, instanceId: string, periodMs: number): number {
    // This would be implemented with proper metrics storage
    const metrics = this.getMetrics(serviceName, instanceId);
    return Math.max(0, metrics.requestCount - metrics.errorCount);
  }

  // Metrics tracking
  recordRequest(serviceName: string, instanceId: string, responseTime: number, success: boolean): void {
    const metrics = this.getMetrics(serviceName, instanceId);
    metrics.requestCount++;
    metrics.responseTimeSum += responseTime;
    metrics.lastRequest = new Date();

    if (!success) {
      metrics.errorCount++;
    }
  }

  private getMetrics(serviceName: string, instanceId: string): ServiceMetrics {
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, new Map());
    }

    const serviceMetrics = this.metrics.get(serviceName)!;
    if (!serviceMetrics.has(instanceId)) {
      serviceMetrics.set(instanceId, {
        requestCount: 0,
        errorCount: 0,
        responseTimeSum: 0,
        circuitBreakerTrips: 0
      });
    }

    return serviceMetrics.get(instanceId)!;
  }

  // Service management operations
  getServiceConfig(serviceName: string): ServiceConfig | undefined {
    return this.services.get(serviceName);
  }

  getAllServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }

  getServiceMetrics(serviceName: string): Map<string, ServiceMetrics> | undefined {
    return this.metrics.get(serviceName);
  }

  async updateInstanceWeight(serviceName: string, instanceId: string, weight: number): Promise<boolean> {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      return false;
    }

    const instance = serviceConfig.instances.find(i => i.id === instanceId);
    if (!instance) {
      return false;
    }

    instance.weight = weight;

    logger.info('Instance weight updated', {
      serviceName,
      instanceId,
      weight
    });

    return true;
  }

  // Statistics and monitoring
  getRegistryStats(): {
    totalServices: number;
    totalInstances: number;
    healthyInstances: number;
    unhealthyInstances: number;
    circuitBreakerStats: {
      total: number;
      open: number;
      halfOpen: number;
      closed: number;
    };
  } {
    let totalInstances = 0;
    let healthyInstances = 0;
    let unhealthyInstances = 0;

    for (const serviceConfig of this.services.values()) {
      totalInstances += serviceConfig.instances.length;
      healthyInstances += serviceConfig.instances.filter(i => i.health === 'healthy').length;
      unhealthyInstances += serviceConfig.instances.filter(i => i.health === 'unhealthy').length;
    }

    const circuitBreakerStates = Array.from(this.circuitBreakerState.values());
    const circuitBreakerStats = {
      total: circuitBreakerStates.length,
      open: circuitBreakerStates.filter(s => s.state === 'open').length,
      halfOpen: circuitBreakerStates.filter(s => s.state === 'half-open').length,
      closed: circuitBreakerStates.filter(s => s.state === 'closed').length
    };

    return {
      totalServices: this.services.size,
      totalInstances,
      healthyInstances,
      unhealthyInstances,
      circuitBreakerStats
    };
  }
}

export const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;