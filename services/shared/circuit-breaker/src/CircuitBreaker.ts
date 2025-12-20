import { EventEmitter } from 'events';
import { createLogger } from '../config/logger';

const logger = createLogger();

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrorRate?: number;
  successThreshold?: number;
  timeout?: number;
  fallback?: () => any;
  resetTimeout?: number;
  slidingWindow?: boolean;
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  timeouts: number;
  totalRequests: number;
  errorRate: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateChangedTime: Date;
  uptime: number;
  downtime: number;
}

interface RequestRecord {
  timestamp: Date;
  success: boolean;
  timeout?: boolean;
}

class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private timeouts: number = 0;
  private totalRequests: number = 0;
  private stateChangedTime: Date = new Date();
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private requestHistory: RequestRecord[] = [];
  private openTime?: Date;
  private halfOpenRequests: number = 0;
  private privateUptime: number = 0;
  private privateDowntime: number = 0;

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
    this.startUptimeTracking();
  }

  async execute<T = any>(
    operation: () => Promise<T>,
    context?: {
      timeout?: number;
      retryCount?: number;
    }
  ): Promise<T> {
    this.totalRequests++;

    const startTime = Date.now();

    try {
      // Check if circuit is open
      if (this.state === CircuitBreakerState.OPEN) {
        if (this.shouldAttemptReset()) {
          this.transitionToHalfOpen();
        } else {
          throw new Error(`Circuit breaker '${this.config.name}' is OPEN`);
        }
      }

      // Execute operation with timeout
      const timeout = context?.timeout || this.config.timeout;
      let result: T;

      if (timeout) {
        result = await this.executeWithTimeout(operation, timeout);
      } else {
        result = await operation();
      }

      // Record success
      this.recordSuccess();

      // Transition from half-open to closed if success threshold reached
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        const successThreshold = this.config.successThreshold || 1;
        if (this.successes >= successThreshold) {
          this.transitionToClosed();
        }
      }

      const duration = Date.now() - startTime;
      this.emit('success', {
        name: this.config.name,
        duration,
        state: this.state,
        metrics: this.getMetrics()
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Check if it's a timeout
      const isTimeout = (error as Error).message.includes('timeout');

      if (isTimeout) {
        this.timeouts++;
      } else {
        this.failures++;
      }

      this.lastFailureTime = new Date();

      // Handle state transitions
      if (this.state === CircuitBreakerState.CLOSED) {
        if (this.shouldOpenCircuit()) {
          this.transitionToOpen();
        }
      } else if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.transitionToOpen();
      }

      // Log failure event
      logger.warn('Circuit breaker operation failed', {
        name: this.config.name,
        state: this.state,
        error: (error as Error).message,
        isTimeout,
        duration,
        metrics: this.getMetrics()
      });

      this.emit('failure', {
        name: this.config.name,
        error,
        duration,
        isTimeout,
        state: this.state,
        metrics: this.getMetrics()
      });

      // Try fallback if available
      if (this.config.fallback) {
        try {
          logger.info('Executing fallback operation', {
            name: this.config.name
          });
          return await this.config.fallback();
        } catch (fallbackError) {
          logger.error('Fallback operation failed', fallbackError as Error, {
            name: this.config.name
          });
          throw fallbackError;
        }
      }

      throw error;
    }
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private shouldOpenCircuit(): boolean {
    if (this.config.slidingWindow) {
      return this.shouldOpenCircuitSlidingWindow();
    } else {
      // Simple threshold-based opening
      return this.failures >= this.config.failureThreshold;
    }
  }

  private shouldOpenCircuitSlidingWindow(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.monitoringPeriod;

    // Count failures within the monitoring period
    const recentFailures = this.requestHistory
      .filter(record => record.timestamp >= new Date(windowStart) && !record.success)
      .length;

    const recentRequests = this.requestHistory
      .filter(record => record.timestamp >= new Date(windowStart))
      .length;

    const errorRate = recentRequests > 0 ? (recentFailures / recentRequests) : 0;
    const expectedErrorRate = this.config.expectedErrorRate || 0.5;

    return errorRate >= expectedErrorRate && recentFailures >= this.config.failureThreshold;
  }

  private shouldAttemptReset(): boolean {
    if (!this.openTime) {
      return false;
    }

    const timeSinceOpen = Date.now() - this.openTime.getTime();
    return timeSinceOpen >= this.config.recoveryTimeout;
  }

  private recordSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    // Add to history
    this.addToHistory(true);
  }

  private addToHistory(success: boolean, timeout?: boolean): void {
    this.requestHistory.push({
      timestamp: new Date(),
      success,
      timeout
    });

    // Maintain sliding window size
    const windowSize = Math.ceil(this.config.monitoringPeriod * 2); // Keep enough for monitoring period
    if (this.requestHistory.length > windowSize) {
      this.requestHistory.splice(0, this.requestHistory.length - windowSize);
    }
  }

  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = CircuitBreakerState.CLOSED;
    this.stateChangedTime = new Date();

    // Reset counters
    this.failures = 0;
    this.successes = 0;
    this.timeouts = 0;
    this.halfOpenRequests = 0;
    this.openTime = undefined;

    this.updateDowntime();

    logger.info('Circuit breaker transitioned to CLOSED', {
      name: this.config.name,
      previousState,
      metrics: this.getMetrics()
    });

    this.emit('state_changed', {
      name: this.config.name,
      from: previousState,
      to: CircuitBreakerState.CLOSED,
      metrics: this.getMetrics()
    });
  }

  private transitionToOpen(): void {
    const previousState = this.state;
    this.state = CircuitBreakerState.OPEN;
    this.stateChangedTime = new Date();
    this.openTime = new Date();

    this.updateUptime();
    this.privateDowntime += Date.now() - this.stateChangedTime.getTime();

    logger.warn('Circuit breaker transitioned to OPEN', {
      name: this.config.name,
      previousState,
      failures: this.failures,
      timeouts: this.timeouts,
      metrics: this.getMetrics()
    });

    this.emit('state_changed', {
      name: this.config.name,
      from: previousState,
      to: CircuitBreakerState.OPEN,
      metrics: this.getMetrics()
    });

    // Set up reset timeout if configured
    if (this.config.resetTimeout) {
      setTimeout(() => {
        if (this.state === CircuitBreakerState.OPEN) {
          this.transitionToHalfOpen();
        }
      }, this.config.resetTimeout);
    }
  }

  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = CircuitBreakerState.HALF_OPEN;
    this.stateChangedTime = new Date();

    // Reset counters for half-open state
    this.successes = 0;
    this.halfOpenRequests = 0;

    logger.info('Circuit breaker transitioned to HALF_OPEN', {
      name: this.config.name,
      previousState,
      timeSinceOpen: this.openTime ? Date.now() - this.openTime.getTime() : 0
    });

    this.emit('state_changed', {
      name: this.config.name,
      from: previousState,
      to: CircuitBreakerState.HALF_OPEN,
      metrics: this.getMetrics()
    });
  }

  private startUptimeTracking(): void {
    setInterval(() => {
      if (this.state === CircuitBreakerState.CLOSED || this.state === CircuitBreakerState.HALF_OPEN) {
        this.privateUptime += 1000; // Add 1 second
      }
    }, 1000);
  }

  private updateUptime(): void {
    this.privateUptime += Date.now() - this.stateChangedTime.getTime();
  }

  private updateDowntime(): void {
    if (this.state === CircuitBreakerState.OPEN) {
      this.privateDowntime += Date.now() - this.stateChangedTime.getTime();
    }
  }

  // Public API methods
  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    const errorRate = this.totalRequests > 0 ? (this.failures + this.timeouts) / this.totalRequests : 0;
    const now = new Date();

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      timeouts: this.timeouts,
      totalRequests: this.totalRequests,
      errorRate,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedTime: this.stateChangedTime,
      uptime: this.privateUptime,
      downtime: this.privateDowntime
    };
  }

  forceOpen(): void {
    if (this.state !== CircuitBreakerState.OPEN) {
      this.transitionToOpen();
    }
  }

  forceClose(): void {
    if (this.state !== CircuitBreakerState.CLOSED) {
      this.transitionToClosed();
    }
  }

  reset(): void {
    this.transitionToClosed();
    this.totalRequests = 0;
    this.requestHistory = [];
    this.privateUptime = 0;
    this.privateDowntime = 0;
  }

  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Circuit breaker config updated', {
      name: this.config.name,
      newConfig: config
    });
  }

  // Health check
  isHealthy(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  getHealthStatus(): {
    healthy: boolean;
    state: CircuitBreakerState;
    errorRate: number;
    timeSinceLastFailure?: number;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const healthy = this.isHealthy();
    const recommendations: string[] = [];

    if (metrics.state === CircuitBreakerState.OPEN) {
      recommendations.push('Circuit is open - investigate underlying service issues');
    }

    if (metrics.errorRate > 0.5) {
      recommendations.push('High error rate detected - consider scaling or fixing upstream issues');
    }

    if (metrics.downtime > 300000) { // 5 minutes
      recommendations.push('Extended downtime detected - service may be critically degraded');
    }

    const timeSinceLastFailure = metrics.lastFailureTime
      ? Date.now() - metrics.lastFailureTime.getTime()
      : undefined;

    return {
      healthy,
      state: metrics.state,
      errorRate: metrics.errorRate,
      timeSinceLastFailure,
      recommendations
    };
  }
}

// Circuit breaker registry for managing multiple circuit breakers
export class CircuitBreakerRegistry {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  register(config: CircuitBreakerConfig): CircuitBreaker {
    const circuitBreaker = new CircuitBreaker(config);
    this.circuitBreakers.set(config.name, circuitBreaker);

    logger.info('Circuit breaker registered', {
      name: config.name,
      failureThreshold: config.failureThreshold,
      recoveryTimeout: config.recoveryTimeout
    });

    return circuitBreaker;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  remove(name: string): boolean {
    const removed = this.circuitBreakers.delete(name);
    if (removed) {
      logger.info('Circuit breaker removed', { name });
    }
    return removed;
  }

  getStats(): {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    details: Array<{
      name: string;
      state: CircuitBreakerState;
      metrics: CircuitBreakerMetrics;
    }>;
  } {
    const details = Array.from(this.circuitBreakers.values()).map(cb => ({
      name: cb.getConfig().name,
      state: cb.getState(),
      metrics: cb.getMetrics()
    }));

    const healthy = details.filter(d => d.state === CircuitBreakerState.CLOSED).length;
    const degraded = details.filter(d => d.state === CircuitBreakerState.HALF_OPEN).length;
    const unhealthy = details.filter(d => d.state === CircuitBreakerState.OPEN).length;

    return {
      total: details.length,
      healthy,
      degraded,
      unhealthy,
      details
    };
  }

  async executeAll<T>(
    operations: Array<{
      name: string;
      operation: () => Promise<T>;
      context?: any;
    }>
  ): Promise<Array<{
    name: string;
    success: boolean;
    result?: T;
    error?: Error;
    state: CircuitBreakerState;
  }>> {
    const promises = operations.map(async ({ name, operation, context }) => {
      const circuitBreaker = this.get(name);
      if (!circuitBreaker) {
        throw new Error(`Circuit breaker '${name}' not found`);
      }

      try {
        const result = await circuitBreaker.execute(operation, context);
        return {
          name,
          success: true,
          result,
          state: circuitBreaker.getState()
        };
      } catch (error) {
        return {
          name,
          success: false,
          error: error as Error,
          state: circuitBreaker.getState()
        };
      }
    });

    return Promise.all(promises);
  }

  healthCheck(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Array<{
      name: string;
      healthy: boolean;
      state: CircuitBreakerState;
      errorRate: number;
    }>;
  } {
    const services = Array.from(this.circuitBreakers.entries()).map(([name, cb]) => {
      const healthStatus = cb.getHealthStatus();
      return {
        name,
        healthy: healthStatus.healthy,
        state: healthStatus.state,
        errorRate: healthStatus.errorRate
      };
    });

    const unhealthyCount = services.filter(s => !s.healthy).length;
    const totalCount = services.length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount === 0) {
      overall = 'healthy';
    } else if (unhealthyCount < totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      services
    };
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
export default circuitBreakerRegistry;