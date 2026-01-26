import { Request, Response, NextFunction } from 'express';
import { CircuitBreaker, CircuitBreakerConfig } from '../CircuitBreaker';
import { createLogger } from '../config/logger';

const logger = createLogger();

interface CircuitBreakerMiddlewareOptions {
  config: CircuitBreakerConfig;
  timeout?: number;
  fallback?: (req: Request, res: Response) => void;
  onStateChange?: (state: string, circuitBreaker: CircuitBreaker) => void;
}

interface RequestWithCircuitBreaker extends Request {
  circuitBreaker?: CircuitBreaker;
}

export const circuitBreakerMiddleware = (options: CircuitBreakerMiddlewareOptions) => {
  const circuitBreaker = new CircuitBreaker(options.config);

  // Set up state change listener
  if (options.onStateChange) {
    circuitBreaker.on('state_changed', (event) => {
      options.onStateChange!(event.to, circuitBreaker);
    });
  }

  return (req: RequestWithCircuitBreaker, res: Response, next: NextFunction) => {
    // Store circuit breaker in request for potential use in route handlers
    req.circuitBreaker = circuitBreaker;

    // Check if circuit breaker is open
    if (circuitBreaker.getState() === 'open') {
      logger.warn('Circuit breaker is open, rejecting request', {
        circuitBreakerName: options.config.name,
        path: req.path,
        method: req.method
      });

      if (options.fallback) {
        return options.fallback(req, res);
      }

      return res.status(503).json({
        error: 'Service Temporarily Unavailable',
        message: 'The service is currently experiencing issues and is temporarily unavailable',
        circuitBreakerName: options.config.name,
        retryAfter: Math.ceil(options.config.recoveryTimeout / 1000)
      });
    }

    // Override res.json to track successful responses
    const originalJson = res.json;
    const originalSend = res.send;

    res.json = function(data: any) {
      trackSuccess();
      return originalJson.call(this, data);
    };

    res.send = function(data: any) {
      trackSuccess();
      return originalSend.call(this, data);
    };

    // Override res.status to track error responses
    const originalStatus = res.status;

    res.status = function(code: number) {
      if (code >= 400) {
        trackFailure();
      }
      return originalStatus.call(this, code);
    };

    let successTracked = false;
    let failureTracked = false;

    function trackSuccess() {
      if (!successTracked && !failureTracked) {
        successTracked = true;
        // Success will be tracked when the operation completes
      }
    }

    function trackFailure() {
      if (!successTracked && !failureTracked) {
        failureTracked = true;
        // Record failure through the circuit breaker
        circuitBreaker.recordFailure();
      }
    }

    // Continue with the request
    next();
  };
};

// Factory function to create circuit breaker middleware with default configuration
export const createCircuitBreakerMiddleware = (
  name: string,
  options: Partial<CircuitBreakerMiddlewareOptions> = {}
) => {
  const defaultConfig: CircuitBreakerConfig = {
    name,
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
    expectedErrorRate: 0.5,
    successThreshold: 3,
    timeout: 30000,
    slidingWindow: true
  };

  const config = { ...defaultConfig, ...options.config };
  const middlewareOptions = {
    config,
    timeout: options.timeout,
    fallback: options.fallback,
    onStateChange: options.onStateChange
  };

  return circuitBreakerMiddleware(middlewareOptions);
};

// Rate limiting circuit breaker middleware
export const rateLimitingCircuitBreaker = (
  name: string,
  maxRequests: number,
  windowMs: number
) => {
  const config: CircuitBreakerConfig = {
    name,
    failureThreshold: Math.ceil(maxRequests * 0.8), // Trip at 80% of limit
    recoveryTimeout: windowMs,
    monitoringPeriod: windowMs,
    expectedErrorRate: 0.6,
    timeout: 5000
  };

  return createCircuitBreakerMiddleware(name, { config });
};

// Database circuit breaker middleware
export const databaseCircuitBreaker = (name: string) => {
  const config: CircuitBreakerConfig = {
    name: `db-${name}`,
    failureThreshold: 3,
    recoveryTimeout: 10000,
    monitoringPeriod: 30000,
    expectedErrorRate: 0.5,
    successThreshold: 2,
    timeout: 5000,
    fallback: async (req: Request, res: Response) => {
      res.status(503).json({
        error: 'Database Service Unavailable',
        message: 'Database is temporarily unavailable. Please try again later.',
        circuitBreakerName: `db-${name}`
      });
    }
  };

  return createCircuitBreakerMiddleware(name, { config });
};

// External API circuit breaker middleware
export const externalApiCircuitBreaker = (
  apiName: string,
  options: {
    failureThreshold?: number;
    recoveryTimeout?: number;
    timeout?: number;
    fallbackResponse?: any;
  } = {}
) => {
  const config: CircuitBreakerConfig = {
    name: `api-${apiName}`,
    failureThreshold: options.failureThreshold || 5,
    recoveryTimeout: options.recoveryTimeout || 30000,
    monitoringPeriod: 60000,
    expectedErrorRate: 0.4,
    successThreshold: 3,
    timeout: options.timeout || 10000,
    fallback: async (req: Request, res: Response) => {
      const fallbackResponse = options.fallbackResponse || {
        error: 'External Service Unavailable',
        message: `External API '${apiName}' is temporarily unavailable`,
        circuitBreakerName: `api-${apiName}`
      };

      res.status(503).json(fallbackResponse);
    }
  };

  return createCircuitBreakerMiddleware(apiName, { config });
};

// Composite circuit breaker middleware for multiple services
export const compositeCircuitBreaker = (
  circuitBreakers: Array<{
    name: string;
    config: CircuitBreakerConfig;
    fallback?: (req: Request, res: Response) => void;
  }>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const circuitBreakerInstances = circuitBreakers.map(cb => ({
      name: cb.name,
      circuitBreaker: new CircuitBreaker(cb.config),
      fallback: cb.fallback
    }));

    // Check if any circuit breakers are open
    const openCircuitBreakers = circuitBreakerInstances.filter(
      cb => cb.circuitBreaker.getState() === 'open'
    );

    if (openCircuitBreakers.length > 0) {
      logger.warn('Multiple circuit breakers are open', {
        openCircuitBreakers: openCircuitBreakers.map(cb => cb.name),
        path: req.path,
        method: req.method
      });

      // Use the first available fallback
      const fallback = openCircuitBreakers.find(cb => cb.fallback)?.fallback;

      if (fallback) {
        return fallback(req, res);
      }

      return res.status(503).json({
        error: 'Multiple Services Unavailable',
        message: 'Multiple dependent services are currently unavailable',
        openCircuitBreakers: openCircuitBreakers.map(cb => cb.name)
      });
    }

    // Attach circuit breakers to request for use in route handlers
    (req as any).circuitBreakers = circuitBreakerInstances.reduce((acc, cb) => {
      acc[cb.name] = cb.circuitBreaker;
      return acc;
    }, {});

    next();
  };
};

// Health check endpoint for circuit breakers
export const circuitBreakerHealthCheck = (req: Request, res: Response) => {
  const circuitBreakers = (req as any).circuitBreakers || {};

  const healthData = Object.entries(circuitBreakers).map(([name, cb]: [string, CircuitBreaker]) => {
    const metrics = cb.getMetrics();
    const healthStatus = cb.getHealthStatus();

    return {
      name,
      state: metrics.state,
      healthy: healthStatus.healthy,
      errorRate: metrics.errorRate,
      totalRequests: metrics.totalRequests,
      failures: metrics.failures,
      successes: metrics.successes,
      uptime: metrics.uptime,
      downtime: metrics.downtime,
      lastFailureTime: metrics.lastFailureTime,
      recommendations: healthStatus.recommendations
    };
  });

  const overallHealth = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    circuitBreakers: healthData,
    summary: {
      total: healthData.length,
      healthy: healthData.filter(cb => cb.healthy).length,
      degraded: healthData.filter(cb => !cb.healthy && cb.state === 'half-open').length,
      unhealthy: healthData.filter(cb => !cb.healthy && cb.state === 'open').length
    }
  };

  if (overallHealth.summary.unhealthy > 0) {
    overallHealth.status = 'unhealthy';
  } else if (overallHealth.summary.degraded > 0) {
    overallHealth.status = 'degraded';
  }

  res.status(overallHealth.status === 'healthy' ? 200 : 503).json(overallHealth);
};

// Metrics endpoint for circuit breakers
export const circuitBreakerMetrics = (req: Request, res: Response) => {
  const circuitBreakers = (req as any).circuitBreakers || {};

  const metrics = Object.entries(circuitBreakers).map(([name, cb]: [string, CircuitBreaker]) => ({
    name,
    metrics: cb.getMetrics(),
    config: cb.getConfig()
  }));

  res.json({
    timestamp: new Date().toISOString(),
    circuitBreakers: metrics,
    summary: {
      total: metrics.length,
      open: metrics.filter(cb => cb.metrics.state === 'open').length,
      closed: metrics.filter(cb => cb.metrics.state === 'closed').length,
      halfOpen: metrics.filter(cb => cb.metrics.state === 'half-open').length
    }
  });
};

export default circuitBreakerMiddleware;