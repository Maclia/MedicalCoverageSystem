import { serviceRegistry } from './ServiceRegistry';
import { createLogger } from '../config/logger';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface ServiceRequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  loadBalancing?: 'round-robin' | 'weighted' | 'least-connections';
  onlyHealthy?: boolean;
  fallback?: () => Promise<any>;
}

export interface ServiceResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  responseTime: number;
  instanceId: string;
  success: boolean;
}

interface RequestMetrics {
  requestId: string;
  serviceName: string;
  instanceId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
}

class HttpClient extends EventEmitter {
  private requestMetrics: RequestMetrics[] = [];
  private maxMetricsSize = 10000;

  async request<T = any>(
    serviceName: string,
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      data?: any;
      headers?: Record<string, string>;
      params?: Record<string, string>;
      timeout?: number;
      retries?: number;
      retryDelay?: number;
      loadBalancing?: 'round-robin' | 'weighted' | 'least-connections';
      onlyHealthy?: boolean;
      fallback?: () => Promise<any>;
      correlationId?: string;
    } = {}
  ): Promise<ServiceResponse<T>> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Select service instance
      const instance = await serviceRegistry.selectInstance(serviceName, {
        strategy: options.loadBalancing,
        onlyHealthy: options.onlyHealthy !== false
      });

      if (!instance) {
        throw new Error(`No healthy instances available for service: ${serviceName}`);
      }

      // Build URL
      const url = new URL(path, `${instance.protocol}://${instance.host}:${instance.port}`);

      // Add query parameters
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'service-communication-client/1.0',
        'X-Request-ID': requestId,
        'X-Correlation-ID': options.correlationId || requestId,
        'X-Calling-Service': process.env.SERVICE_NAME || 'unknown',
        ...options.headers,
        ...instance.metadata?.defaultHeaders
      };

      // Make request with retry logic
      const response = await this.makeRequestWithRetry<T>(
        url.toString(),
        {
          method: options.method || 'GET',
          headers,
          body: options.data ? JSON.stringify(options.data) : undefined
        },
        {
          timeout: options.timeout || 30000,
          retries: options.retries || 3,
          retryDelay: options.retryDelay || 1000
        },
        serviceName,
        instance.id
      );

      const responseTime = Date.now() - startTime;

      // Record successful request metrics
      this.recordRequestMetrics({
        requestId,
        serviceName,
        instanceId: instance.id,
        method: options.method || 'GET',
        path,
        statusCode: response.status,
        responseTime,
        timestamp: new Date()
      });

      // Update service registry metrics
      serviceRegistry.recordRequest(serviceName, instance.id, responseTime, response.status < 500);

      logger.debug('Service request completed', {
        requestId,
        serviceName,
        instanceId: instance.id,
        method: options.method || 'GET',
        path,
        statusCode: response.status,
        responseTime
      });

      this.emit('request:completed', {
        requestId,
        serviceName,
        instanceId: instance.id,
        success: true,
        responseTime,
        statusCode: response.status
      });

      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
        responseTime,
        instanceId: instance.id,
        success: true
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Try fallback if available
      if (options.fallback) {
        try {
          logger.info('Using fallback for service request', {
            serviceName,
            path,
            error: (error as Error).message
          });

          const fallbackResult = await options.fallback();

          return {
            data: fallbackResult,
            status: 200,
            headers: {},
            responseTime,
            instanceId: 'fallback',
            success: true
          };
        } catch (fallbackError) {
          logger.error('Fallback failed', fallbackError as Error, {
            serviceName,
            path
          });
        }
      }

      // Record failed request metrics
      this.recordRequestMetrics({
        requestId,
        serviceName,
        instanceId: 'failed',
        method: options.method || 'GET',
        path,
        statusCode: 0,
        responseTime,
        timestamp: new Date()
      });

      logger.error('Service request failed', error as Error, {
        requestId,
        serviceName,
        path,
        responseTime
      });

      this.emit('request:failed', {
        requestId,
        serviceName,
        error: (error as Error).message,
        responseTime
      });

      throw error;
    }
  }

  private async makeRequestWithRetry<T>(
    url: string,
    fetchOptions: RequestInit,
    retryOptions: {
      timeout: number;
      retries: number;
      retryDelay: number;
    },
    serviceName: string,
    instanceId: string
  ): Promise<{ data: T; status: number; headers: Record<string, string> }> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryOptions.retries + 1; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), retryOptions.timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const headers: Record<string, string> = {};

        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        return {
          data,
          status: response.status,
          headers
        };

      } catch (error) {
        lastError = error as Error;

        if (attempt <= retryOptions.retries) {
          const delay = retryOptions.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          logger.warn('Request failed, retrying', {
            serviceName,
            instanceId,
            attempt,
            maxRetries: retryOptions.retries,
            delay,
            error: lastError.message
          });

          await this.sleep(delay);
        }
      }
    }

    // Update service registry with failure
    serviceRegistry.recordRequest(serviceName, instanceId, 0, false);

    throw lastError || new Error('Request failed after retries');
  }

  // Convenience methods for common HTTP operations
  async get<T = any>(
    serviceName: string,
    path: string,
    options?: Omit<ServiceRequestOptions, 'method'>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, path, { ...options, method: 'GET' });
  }

  async post<T = any>(
    serviceName: string,
    path: string,
    data?: any,
    options?: Omit<ServiceRequestOptions, 'method'>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, path, { ...options, method: 'POST', data });
  }

  async put<T = any>(
    serviceName: string,
    path: string,
    data?: any,
    options?: Omit<ServiceRequestOptions, 'method'>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, path, { ...options, method: 'PUT', data });
  }

  async delete<T = any>(
    serviceName: string,
    path: string,
    options?: Omit<ServiceRequestOptions, 'method'>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, path, { ...options, method: 'DELETE' });
  }

  async patch<T = any>(
    serviceName: string,
    path: string,
    data?: any,
    options?: Omit<ServiceRequestOptions, 'method'>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, path, { ...options, method: 'PATCH', data });
  }

  // Bulk operations
  async requestBulk<T = any>(
    requests: Array<{
      serviceName: string;
      path: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      data?: any;
      options?: ServiceRequestOptions;
    }>
  ): Promise<ServiceResponse<T>[]> {
    const promises = requests.map(req =>
      this.request<T>(req.serviceName, req.path, {
        method: req.method,
        data: req.data,
        ...req.options
      })
    );

    return Promise.allSettled(promises).then(results =>
      results.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          throw result.reason;
        }
      })
    );
  }

  // Metrics and monitoring
  private recordRequestMetrics(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics);

    // Maintain metrics size limit
    if (this.requestMetrics.length > this.maxMetricsSize) {
      this.requestMetrics.splice(0, this.requestMetrics.length - this.maxMetricsSize);
    }
  }

  getRequestMetrics(limit?: number): RequestMetrics[] {
    if (limit) {
      return this.requestMetrics.slice(-limit);
    }
    return [...this.requestMetrics];
  }

  getServiceMetrics(serviceName: string, timeRange?: { start: Date; end: Date }): {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    errorRate: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    let relevantMetrics = this.requestMetrics.filter(m => m.serviceName === serviceName);

    if (timeRange) {
      relevantMetrics = relevantMetrics.filter(m =>
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    const requestCount = relevantMetrics.length;
    const errorCount = relevantMetrics.filter(m => m.statusCode >= 400).length;
    const responseTimes = relevantMetrics.map(m => m.responseTime).sort((a, b) => a - b);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    return {
      requestCount,
      errorCount,
      averageResponseTime,
      errorRate: requestCount > 0 ? (errorCount / requestCount) * 100 : 0,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0
    };
  }

  // Performance analysis
  getPerformanceAnalysis(timeRange?: { start: Date; end: Date }): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    slowestServices: Array<{
      serviceName: string;
      averageResponseTime: number;
      requestCount: number;
    }>;
    errorProneServices: Array<{
      serviceName: string;
      errorRate: number;
      requestCount: number;
    }>;
  } {
    let relevantMetrics = this.requestMetrics;

    if (timeRange) {
      relevantMetrics = relevantMetrics.filter(m =>
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    const totalRequests = relevantMetrics.length;
    const successCount = relevantMetrics.filter(m => m.statusCode < 400).length;
    const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
    const averageResponseTime = totalRequests > 0
      ? relevantMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
      : 0;

    // Group metrics by service
    const serviceMetrics = new Map<string, RequestMetrics[]>();
    for (const metric of relevantMetrics) {
      if (!serviceMetrics.has(metric.serviceName)) {
        serviceMetrics.set(metric.serviceName, []);
      }
      serviceMetrics.get(metric.serviceName)!.push(metric);
    }

    // Calculate per-service metrics
    const slowestServices: Array<{
      serviceName: string;
      averageResponseTime: number;
      requestCount: number;
    }> = [];

    const errorProneServices: Array<{
      serviceName: string;
      errorRate: number;
      requestCount: number;
    }> = [];

    for (const [serviceName, metrics] of serviceMetrics) {
      const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
      const errorCount = metrics.filter(m => m.statusCode >= 400).length;
      const errorRate = (errorCount / metrics.length) * 100;

      slowestServices.push({
        serviceName,
        averageResponseTime: avgResponseTime,
        requestCount: metrics.length
      });

      errorProneServices.push({
        serviceName,
        errorRate,
        requestCount: metrics.length
      });
    }

    // Sort and take top 5
    slowestServices.sort((a, b) => b.averageResponseTime - a.averageResponseTime).splice(5);
    errorProneServices.sort((a, b) => b.errorRate - a.errorRate).splice(5);

    return {
      totalRequests,
      successRate,
      averageResponseTime,
      slowestServices,
      errorProneServices
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup old metrics
  cleanupOldMetrics(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAge;
    const initialCount = this.requestMetrics.length;

    this.requestMetrics = this.requestMetrics.filter(
      metric => metric.timestamp.getTime() > cutoffTime
    );

    const removedCount = initialCount - this.requestMetrics.length;
    if (removedCount > 0) {
      logger.info('Old metrics cleaned up', {
        removedCount,
        remainingCount: this.requestMetrics.length
      });
    }
  }
}

export const httpClient = new HttpClient();
export default httpClient;