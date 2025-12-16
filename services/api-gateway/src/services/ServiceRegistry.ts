import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config';
import { createLogger, generateCorrelationId } from '../utils/logger';
import { CircuitBreaker } from './CircuitBreaker';

const logger = createLogger();

export interface ServiceHealth {
  url: string;
  healthy: boolean;
  lastChecked: Date;
  responseTime: number;
  errorCount: number;
  circuitBreakerOpen: boolean;
}

export interface ServiceConfig {
  url: string;
  timeout: number;
  retries: number;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, ServiceConfig> = new Map();
  private healthStatus: Map<string, ServiceHealth> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeServices();
    this.startHealthChecks();
  }

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  private initializeServices(): void {
    // Register all services from configuration
    Object.entries(config.services).forEach(([name, serviceConfig]) => {
      this.services.set(name, serviceConfig);

      // Initialize circuit breaker for each service
      this.circuitBreakers.set(name, new CircuitBreaker(
        5, // failure threshold
        60000, // recovery timeout (1 minute)
        10000 // monitoring period (10 seconds)
      ));

      // Initialize health status
      this.healthStatus.set(name, {
        url: serviceConfig.url,
        healthy: false,
        lastChecked: new Date(),
        responseTime: 0,
        errorCount: 0,
        circuitBreakerOpen: false
      });
    });

    logger.info('Service registry initialized', {
      services: Array.from(this.services.keys()),
      count: this.services.size
    });
  }

  private startHealthChecks(): void {
    // Initial health check
    this.performHealthChecks();

    // Schedule recurring health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, config.healthCheck.interval);

    logger.info('Health check monitoring started', {
      interval: config.healthCheck.interval
    });
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.services.keys()).map(
      serviceName => this.checkServiceHealth(serviceName)
    );

    try {
      await Promise.allSettled(healthCheckPromises);
    } catch (error) {
      logger.error('Health check batch failed', error as Error);
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<void> {
    const serviceConfig = this.services.get(serviceName);
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    const healthStatus = this.healthStatus.get(serviceName);

    if (!serviceConfig || !circuitBreaker || !healthStatus) {
      return;
    }

    // Skip health check if circuit breaker is open
    if (circuitBreaker.isOpen()) {
      healthStatus.circuitBreakerOpen = true;
      return;
    }

    const startTime = Date.now();

    try {
      const healthUrl = `${serviceConfig.url}/health`;
      const response: AxiosResponse = await axios.get(healthUrl, {
        timeout: config.healthCheck.timeout,
        headers: {
          'User-Agent': 'API-Gateway-Health-Check/1.0'
        }
      });

      const responseTime = Date.now() - startTime;

      // Update health status
      healthStatus.healthy = response.status === 200;
      healthStatus.lastChecked = new Date();
      healthStatus.responseTime = responseTime;
      healthStatus.errorCount = 0;
      healthStatus.circuitBreakerOpen = false;

      // Reset circuit breaker on success
      circuitBreaker.recordSuccess();

      logger.debug('Service health check passed', {
        serviceName,
        responseTime,
        status: response.status
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update health status
      healthStatus.healthy = false;
      healthStatus.lastChecked = new Date();
      healthStatus.responseTime = responseTime;
      healthStatus.errorCount += 1;

      // Record failure in circuit breaker
      circuitBreaker.recordFailure();

      if (circuitBreaker.isOpen()) {
        healthStatus.circuitBreakerOpen = true;
        logger.warn('Service circuit breaker opened', {
          serviceName,
          errorCount: healthStatus.errorCount
        });
      }

      logger.warn('Service health check failed', {
        serviceName,
        error: (error as Error).message,
        responseTime,
        consecutiveFailures: healthStatus.errorCount
      });
    }
  }

  public getServiceUrl(serviceName: string): string | null {
    const serviceConfig = this.services.get(serviceName);
    const healthStatus = this.healthStatus.get(serviceName);
    const circuitBreaker = this.circuitBreakers.get(serviceName);

    if (!serviceConfig || !healthStatus || !circuitBreaker) {
      logger.warn('Service not found in registry', { serviceName });
      return null;
    }

    // Check if service is healthy
    if (!healthStatus.healthy || circuitBreaker.isOpen()) {
      logger.warn('Service unavailable', {
        serviceName,
        healthy: healthStatus.healthy,
        circuitBreakerOpen: circuitBreaker.isOpen()
      });
      return null;
    }

    return serviceConfig.url;
  }

  public createServiceClient(serviceName: string): AxiosInstance | null {
    const serviceUrl = this.getServiceUrl(serviceName);

    if (!serviceUrl) {
      return null;
    }

    const serviceConfig = this.services.get(serviceName);
    const circuitBreaker = this.circuitBreakers.get(serviceName);

    if (!serviceConfig || !circuitBreaker) {
      return null;
    }

    const client = axios.create({
      baseURL: serviceUrl,
      timeout: serviceConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Gateway/1.0'
      }
    });

    // Add request interceptor for correlation ID and authentication
    client.interceptors.request.use(
      (config) => {
        // Add correlation ID
        const correlationId = generateCorrelationId();
        config.headers['X-Correlation-ID'] = correlationId;

        logger.debug('Service request initiated', {
          serviceName,
          method: config.method?.toUpperCase(),
          url: config.url,
          correlationId
        });

        return config;
      },
      (error) => {
        logger.error('Service request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and circuit breaker
    client.interceptors.response.use(
      (response) => {
        const correlationId = response.config.headers['X-Correlation-ID'];

        logger.debug('Service request successful', {
          serviceName,
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          responseTime: response.headers['x-response-time'],
          correlationId
        });

        // Record success in circuit breaker
        circuitBreaker.recordSuccess();

        return response;
      },
      (error) => {
        const correlationId = error.config?.headers?.['X-Correlation-ID'];

        logger.warn('Service request failed', {
          serviceName,
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          correlationId
        });

        // Record failure in circuit breaker
        circuitBreaker.recordFailure();

        return Promise.reject(error);
      }
    );

    return client;
  }

  public getServiceHealth(serviceName?: string): ServiceHealth | Map<string, ServiceHealth> {
    if (serviceName) {
      return this.healthStatus.get(serviceName) || null;
    }
    return new Map(this.healthStatus);
  }

  public getAllServices(): string[] {
    return Array.from(this.services.keys());
  }

  public isServiceHealthy(serviceName: string): boolean {
    const healthStatus = this.healthStatus.get(serviceName);
    const circuitBreaker = this.circuitBreakers.get(serviceName);

    return !!(healthStatus && circuitBreaker &&
              healthStatus.healthy && !circuitBreaker.isOpen());
  }

  public getHealthyServices(): string[] {
    return Array.from(this.services.keys()).filter(serviceName =>
      this.isServiceHealthy(serviceName)
    );
  }

  public retryServiceRequest<T>(
    serviceName: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const serviceConfig = this.services.get(serviceName);

    if (!serviceConfig) {
      return Promise.reject(new Error(`Service ${serviceName} not found`));
    }

    let lastError: Error;

    const attemptRequest = async (attempt: number): Promise<T> => {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < serviceConfig.retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff

          logger.debug('Retrying service request', {
            serviceName,
            attempt: attempt + 1,
            maxRetries: serviceConfig.retries,
            delay,
            error: lastError.message
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptRequest(attempt + 1);
        }

        throw lastError;
      }
    };

    return attemptRequest(0);
  }

  public shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.info('Service registry shutdown completed');
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();