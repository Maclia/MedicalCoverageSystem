import { WinstonLogger } from '../utils/WinstonLogger.js';

interface ServiceRequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export abstract class BaseServiceClient {
  protected logger: WinstonLogger;
  protected abstract readonly serviceUrl: string;
  protected readonly serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = new WinstonLogger(serviceName);
  }

  protected async get<T>(path: string, options?: ServiceRequestOptions): Promise<T> {
    const timeout = options?.timeout || 10000;
    
    try {
      const url = `${this.serviceUrl}${path}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'finance-service',
          ...options?.headers
        },
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) {
        throw new Error(`${this.serviceName} returned status ${response.status}`);
      }

      return await response.json();

    } catch (error: any) {
      this.logger.warn(`Service request failed: ${path}`, {
        error: error.message,
        service: this.serviceName
      });
      throw error;
    }
  }

  protected async post<T>(path: string, data: any, options?: ServiceRequestOptions): Promise<T> {
    const timeout = options?.timeout || 10000;
    
    try {
      const url = `${this.serviceUrl}${path}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'finance-service',
          ...options?.headers
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) {
        throw new Error(`${this.serviceName} returned status ${response.status}`);
      }

      return await response.json();

    } catch (error: any) {
      this.logger.warn(`Service request failed: ${path}`, {
        error: error.message,
        service: this.serviceName
      });
      throw error;
    }
  }

  protected async put<T>(path: string, data: any, options?: ServiceRequestOptions): Promise<T> {
    const timeout = options?.timeout || 10000;
    
    try {
      const url = `${this.serviceUrl}${path}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'finance-service',
          ...options?.headers
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) {
        throw new Error(`${this.serviceName} returned status ${response.status}`);
      }

      return await response.json();

    } catch (error: any) {
      this.logger.warn(`Service request failed: ${path}`, {
        error: error.message,
        service: this.serviceName
      });
      throw error;
    }
  }
}

export default BaseServiceClient;